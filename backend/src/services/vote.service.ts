import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '../config/firebaseAdmin.js';
import { env } from '../config/env.js';
import { createId, memoryStore } from '../data/memoryStore.js';
import { query, usePostgres, withTransaction } from '../db/pool.js';
import type { VotePayload } from '../models/vote.model.js';
import { isElectionActiveForVoting } from '../utils/electionState.js';
import { createBallotReference, hashToken } from '../utils/token.js';
import { addAuditLog } from './audit.service.js';
import { getElection, listElections } from './election.service.js';
import { createVoter, getVoterByNationalId } from './voter.service.js';

async function resolveElection(electionId?: string) {
  if (electionId) {
    return getElection(electionId);
  }

  if (usePostgres) {
    const result = await query<{ id: string }>(
      `SELECT id
       FROM elections
       WHERE status = 'active'
         AND (start_at IS NULL OR start_at <= now())
         AND (end_at IS NULL OR end_at >= now())
       ORDER BY start_at ASC NULLS LAST, created_at DESC
       LIMIT 1`,
    );
    return result.rows[0] ? getElection(result.rows[0].id) : null;
  }

  const elections = await listElections();
  return (
    elections.find((election: any) => ['active', 'Voting Open', 'Active'].includes(String(election.status))) ||
    elections[0] ||
    null
  );
}

function getRawToken(payload: VotePayload) {
  return payload.token || payload.votingToken || payload.biometricToken;
}

export async function castVote(
  payload: VotePayload,
  actorUid?: string,
  options?: {
    allowDemoVoting?: boolean;
  },
) {
  if (
    !payload.voterNationalId ||
    !payload.partyId ||
    !payload.districtListId ||
    !Array.isArray(payload.districtCandidateIds) ||
    payload.districtCandidateIds.length === 0
  ) {
    throw new Error('Missing required ballot fields');
  }

  const election = await resolveElection(payload.electionId);
  if (!election) {
    throw new Error('Election not found');
  }
  if (!options?.allowDemoVoting && !isElectionActiveForVoting(election as any)) {
    throw new Error('Election is not active');
  }
  const electionId = (election as any).id;

  if (!usePostgres) {
    let voter = await getVoterByNationalId(payload.voterNationalId, electionId);
    if (!voter && env.enableMemoryStore) {
      voter = await createVoter(
        {
          nationalId: payload.voterNationalId,
          fullName: `Voter ${payload.voterNationalId}`,
          hasVoted: false,
          electionId,
        } as any,
        actorUid || 'dev',
      );
    }

    if (!voter?.id) {
      throw new Error('Voter is not registered');
    }

    if ((voter as any).hasVoted) {
      throw new Error('Voter has already voted');
    }

    if (env.enableMemoryStore) {
      const voteId = createId('vote');
      memoryStore.votes.set(voteId, {
        id: voteId,
        ...payload,
        electionId,
        voterUid: actorUid,
        createdAt: new Date().toISOString(),
      });
      memoryStore.voters.set(voter.id as string, {
        ...voter,
        hasVoted: true,
        updatedAt: new Date().toISOString(),
      });
      await addAuditLog('vote.cast', actorUid || payload.voterNationalId, `Vote cast for election ${electionId}`);
      return { success: true, data: { electionId } };
    }

    await adminDb.runTransaction(async (transaction) => {
      const voterRef = adminDb.collection('voters').doc(voter.id as string);
      const electionRef = adminDb.collection('elections').doc(payload.electionId);
      const voteRef = adminDb.collection('votes').doc();

      const voterSnap = await transaction.get(voterRef);
      if (voterSnap.data()?.hasVoted) {
        throw new Error('Voter has already voted');
      }

      transaction.set(voteRef, {
        ...payload,
        electionId,
        voterUid: actorUid,
        createdAt: Timestamp.now(),
      });
      transaction.update(voterRef, { hasVoted: true, updatedAt: Timestamp.now() });
      transaction.update(electionRef, { votes: FieldValue.increment(1), updatedAt: Timestamp.now() });
    });

    await addAuditLog('vote.cast', actorUid || payload.voterNationalId, `Vote cast for election ${electionId}`);
    return { success: true, data: { electionId } };
  }

  const rawToken = getRawToken(payload);
  if (!rawToken) {
    throw new Error('Voting token is required. Complete face verification first.');
  }

  const tokenHash = hashToken(rawToken);
  const uniqueCandidateIds = [...new Set(payload.districtCandidateIds)];
  if (uniqueCandidateIds.length !== payload.districtCandidateIds.length) {
    throw new Error('Duplicate district candidate selection is not allowed');
  }

  const result = await withTransaction(async (client) => {
    const tokenResult = await client.query(
      `SELECT vt.id,
              vt.voter_id,
              vt.status,
              vt.token_expires_at,
              v.national_id,
              v.election_id,
              v.district_id,
              v.has_voted,
              v.status AS voter_status,
              v.verified_face,
              e.status AS election_status,
              e.start_at,
              e.end_at,
              e.district_candidate_selection_count,
              d.seats_count
       FROM voting_tokens vt
       JOIN voters v ON v.id = vt.voter_id
       JOIN elections e ON e.id = vt.election_id
       JOIN districts d ON d.id = v.district_id
       WHERE vt.token_hash = $1
         AND vt.election_id = $2
       FOR UPDATE OF vt, v`,
      [tokenHash, electionId],
    );

    const tokenRow = tokenResult.rows[0];
    if (!tokenRow) throw new Error('Invalid token');
    if (tokenRow.status !== 'active') throw new Error('Token is not active');
    if (new Date(tokenRow.token_expires_at).getTime() <= Date.now()) {
      await client.query(
        `UPDATE voting_tokens
         SET status = 'expired', invalidated_at = now()
         WHERE id = $1`,
        [tokenRow.id],
      );
      throw new Error('Expired token');
    }
    if (
      !options?.allowDemoVoting &&
      !isElectionActiveForVoting({
        status: tokenRow.election_status,
        startAt: tokenRow.start_at,
        endAt: tokenRow.end_at,
      })
    ) {
      throw new Error('Election is not active');
    }
    if (tokenRow.has_voted || tokenRow.voter_status === 'voted') throw new Error('Voter has already voted');
    if (!tokenRow.verified_face) throw new Error('Face verification is required before voting');
    if (tokenRow.national_id !== payload.voterNationalId) {
      throw new Error('Token does not belong to this national ID');
    }

    const partyResult = await client.query(
      `SELECT id
       FROM parties
       WHERE id = $1 AND election_id = $2
       LIMIT 1`,
      [payload.partyId, electionId],
    );
    if (!partyResult.rows[0]) {
      throw new Error('Invalid party selection');
    }

    const listResult = await client.query(
      `SELECT dl.id,
              dl.district_id
       FROM district_lists dl
       WHERE dl.id = $1
         AND dl.election_id = $2
         AND dl.district_id = $3
       LIMIT 1`,
      [payload.districtListId, electionId, tokenRow.district_id],
    );
    const selectedList = listResult.rows[0];
    if (!selectedList) {
      throw new Error('Invalid district list selection');
    }

    const maxSelections = Number(tokenRow.district_candidate_selection_count || tokenRow.seats_count || 1);
    if (uniqueCandidateIds.length > maxSelections) {
      throw new Error(`Invalid district candidate selection. Maximum allowed is ${maxSelections}`);
    }

    const candidateResult = await client.query(
      `SELECT dlc.id
       FROM district_list_candidates dlc
       JOIN district_lists dl ON dl.id = dlc.district_list_id
       WHERE dlc.id = ANY($1::uuid[])
         AND dl.election_id = $2
         AND dl.id = $3
         AND dl.district_id = $4`,
      [uniqueCandidateIds, electionId, payload.districtListId, tokenRow.district_id],
    );
    if (candidateResult.rowCount !== uniqueCandidateIds.length) {
      throw new Error('Invalid district candidate selection');
    }

    const ballotResult = await client.query<{ id: string }>(
      `INSERT INTO ballots (election_id, ballot_reference)
       VALUES ($1, $2)
       RETURNING id`,
      [electionId, createBallotReference()],
    );
    const ballotId = ballotResult.rows[0].id;

    await client.query(
      `INSERT INTO party_votes (ballot_id, election_id, party_id)
       VALUES ($1, $2, $3)`,
      [ballotId, electionId, payload.partyId],
    );

    await client.query(
      `INSERT INTO district_list_votes (ballot_id, election_id, district_id, district_list_id)
       VALUES ($1, $2, $3, $4)`,
      [ballotId, electionId, tokenRow.district_id, payload.districtListId],
    );

    for (const candidateId of uniqueCandidateIds) {
      await client.query(
        `INSERT INTO district_candidate_votes (
           ballot_id,
           election_id,
           district_id,
           district_list_id,
           candidate_id
         )
         VALUES ($1, $2, $3, $4, $5)`,
        [ballotId, electionId, tokenRow.district_id, payload.districtListId, candidateId],
      );
    }

    await client.query(
      `UPDATE voting_tokens
       SET status = 'used', used_at = now()
       WHERE id = $1`,
      [tokenRow.id],
    );

    await client.query(
      `UPDATE voters
       SET has_voted = true, status = 'voted', updated_at = now()
       WHERE id = $1`,
      [tokenRow.voter_id],
    );

    await client.query(
      `INSERT INTO audit_logs (actor_type, actor_id, action_type, target_table, target_id, details_json)
       VALUES ('voter', $1, 'vote_cast', 'ballots', $2, $3::jsonb)`,
      [
        tokenRow.voter_id,
        ballotId,
        JSON.stringify({
          electionId,
          partyId: payload.partyId,
          districtListId: payload.districtListId,
          districtCandidateCount: uniqueCandidateIds.length,
        }),
      ],
    );

    return { ballotId };
  });

  return { success: true, data: { electionId, ballotId: result.ballotId } };
}
