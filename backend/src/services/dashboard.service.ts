import { env } from '../config/env.js';
import { LOCAL_SYSTEM_ELECTION_TITLE, isVisibleSystemElectionTitle } from '../constants/systemElections.js';
import { memoryStore } from '../data/memoryStore.js';
import { query, usePostgres } from '../db/pool.js';

function percent(part: number, total: number) {
  return total > 0 ? Number(((part / total) * 100).toFixed(1)) : 0;
}

export async function getDashboardSummary() {
  if (env.enableMemoryStore) {
    const elections = Array.from(memoryStore.elections.values());
    const visibleElections = elections.filter((election: any) => isVisibleSystemElectionTitle(election.title));
    const voters = Array.from(memoryStore.voters.values());
    const votes = Array.from(memoryStore.votes.values());
    const activeElection =
      visibleElections.find((election: any) => ['Active', 'Voting Open', 'active'].includes(String(election.status))) ||
      visibleElections[0] ||
      null;
    const electionVotes = activeElection ? votes.filter((vote: any) => vote.electionId === activeElection.id) : votes;

    return {
      activeElection,
      totalVotes: electionVotes.length,
      totalVoters: voters.length,
      turnout: percent(electionVotes.length, voters.length),
      verifiedVoters: voters.filter((voter: any) => voter.verifiedFace).length,
      votedVoters: voters.filter((voter: any) => voter.hasVoted).length,
      issuedTokens: 0,
      usedTokens: 0,
      hourlyVotes: [],
      seatsDistribution: {
        totalSeats: 0,
        localSeats: 0,
        partySeats: 0,
        quotas: [],
      },
      topCandidates: [],
      districtTurnout: [],
      lastUpdatedAt: new Date().toISOString(),
    };
  }

  if (!usePostgres) {
    return {
      activeElection: null,
      totalVotes: 0,
      totalVoters: 0,
      turnout: 0,
      verifiedVoters: 0,
      votedVoters: 0,
      issuedTokens: 0,
      usedTokens: 0,
      hourlyVotes: [],
      seatsDistribution: { totalSeats: 0, localSeats: 0, partySeats: 0, quotas: [] },
      topCandidates: [],
      districtTurnout: [],
      lastUpdatedAt: new Date().toISOString(),
    };
  }

  const activeElectionResult = await query(
    `SELECT e.id,
            e.title,
            e.status,
            e.start_at AS "startAt",
            e.end_at AS "endAt",
            e.total_national_party_seats AS "totalNationalPartySeats",
            e.show_turnout_publicly AS "showTurnoutPublicly",
            (SELECT COUNT(*) FROM voters v WHERE v.election_id = e.id) AS "votersCount",
            (SELECT COUNT(*) FROM districts d WHERE d.election_id = e.id) AS "districtsCount"
     FROM elections e
     WHERE e.title = $1
     ORDER BY
       CASE e.status
         WHEN 'active' THEN 1
         WHEN 'scheduled' THEN 2
         WHEN 'draft' THEN 3
         WHEN 'closed' THEN 4
         ELSE 5
       END,
       -- Prefer election with more data (districts/voters) when multiple active elections exist
       (SELECT COUNT(*) FROM districts d WHERE d.election_id = e.id) DESC,
       (SELECT COUNT(*) FROM voters v WHERE v.election_id = e.id) DESC,
       e.created_at DESC
     LIMIT 1`,
    [LOCAL_SYSTEM_ELECTION_TITLE],
  );

  const activeElection = activeElectionResult.rows[0] || null;
  const electionId = activeElection?.id || null;

  const totalsResult = await query<{
    total_voters: string;
    voted_voters: string;
    verified_voters: string;
    total_votes: string;
    issued_tokens: string;
    used_tokens: string;
  }>(
    `SELECT
       (SELECT COUNT(*) FROM voters WHERE ($1::uuid IS NULL OR election_id = $1::uuid))::text AS total_voters,
       (SELECT COUNT(*) FROM voters WHERE has_voted = true AND ($1::uuid IS NULL OR election_id = $1::uuid))::text AS voted_voters,
       (SELECT COUNT(*) FROM voters WHERE verified_face = true AND ($1::uuid IS NULL OR election_id = $1::uuid))::text AS verified_voters,
       (SELECT COUNT(*) FROM ballots WHERE ($1::uuid IS NULL OR election_id = $1::uuid))::text AS total_votes,
       (SELECT COUNT(*) FROM voting_tokens WHERE ($1::uuid IS NULL OR election_id = $1::uuid))::text AS issued_tokens,
       (SELECT COUNT(*) FROM voting_tokens WHERE status = 'used' AND ($1::uuid IS NULL OR election_id = $1::uuid))::text AS used_tokens`,
    [electionId],
  );

  const totals = totalsResult.rows[0];
  const totalVoters = Number(totals?.total_voters || 0);
  const totalVotes = Number(totals?.total_votes || 0);

  const hourlyResult = await query(
    `SELECT to_char(date_trunc('hour', submitted_at), 'HH24:00') AS time,
            COUNT(*)::int AS votes
     FROM ballots
     WHERE ($1::uuid IS NULL OR election_id = $1::uuid)
     GROUP BY date_trunc('hour', submitted_at)
     ORDER BY date_trunc('hour', submitted_at)`,
    [electionId],
  );

  const seatsResult = await query<{ local_seats: string; party_seats: string }>(
    `SELECT
       COALESCE((SELECT SUM(seats_count) FROM districts WHERE ($1::uuid IS NULL OR election_id = $1::uuid)), 0)::text AS local_seats,
       COALESCE((SELECT total_national_party_seats FROM elections WHERE id = $1), 41)::text AS party_seats`,
    [electionId],
  );

  const quotaResult = await query(
    `WITH quota_candidates AS (
       SELECT q.name, pc.id AS candidate_id
       FROM quotas q
       LEFT JOIN party_candidates pc ON pc.quota_id = q.id
       WHERE ($1::uuid IS NULL OR q.election_id = $1::uuid)
       UNION ALL
       SELECT q.name, dlc.id AS candidate_id
       FROM quotas q
       LEFT JOIN district_list_candidates dlc ON dlc.quota_id = q.id
       WHERE ($1::uuid IS NULL OR q.election_id = $1::uuid)
     )
     SELECT qc.name,
            COUNT(DISTINCT qc.candidate_id)::int AS candidates,
            COUNT(dcv.id)::int AS votes
     FROM quota_candidates qc
     LEFT JOIN district_candidate_votes dcv ON dcv.candidate_id = qc.candidate_id
     GROUP BY qc.name
     ORDER BY qc.name`,
    [electionId],
  );

  const topCandidatesResult = await query(
    `WITH candidate_scores AS (
       SELECT
         'district_candidate' AS kind,
         dlc.id,
         dlc.full_name AS name,
         dl.list_name AS list_name,
         COUNT(dcv.id)::int AS votes
       FROM district_list_candidates dlc
       JOIN district_lists dl ON dl.id = dlc.district_list_id
       LEFT JOIN district_candidate_votes dcv ON dcv.candidate_id = dlc.id
       WHERE ($1::uuid IS NULL OR dl.election_id = $1::uuid)
       GROUP BY dlc.id, dl.list_name
       UNION ALL
       SELECT
         'party_candidate' AS kind,
         pc.id,
         pc.full_name AS name,
         p.party_name AS list_name,
         COUNT(pv.id)::int AS votes
       FROM party_candidates pc
       JOIN parties p ON p.id = pc.party_id
       LEFT JOIN party_votes pv ON pv.party_id = p.id
       WHERE ($1::uuid IS NULL OR p.election_id = $1::uuid)
       GROUP BY pc.id, p.party_name
     )
     SELECT id,
            name,
            kind,
            list_name AS "listName",
            votes
     FROM candidate_scores
     ORDER BY votes DESC, name
     LIMIT 8`,
    [electionId],
  );

  const localSeats = Number(seatsResult.rows[0]?.local_seats || 0);
  const partySeats = Number(seatsResult.rows[0]?.party_seats || 0);
  const districtTurnoutResult = await query(
    `SELECT d.id,
            d.name,
            d.code,
            COALESCE(voters.registered_voters, 0)::int AS "registeredVoters",
            COALESCE(votes.cast_votes, 0)::int AS votes,
            CASE
              WHEN COALESCE(voters.registered_voters, 0) = 0 THEN 0
              ELSE ROUND((COALESCE(votes.cast_votes, 0)::numeric / voters.registered_voters::numeric) * 100, 1)
            END AS turnout
     FROM districts d
     LEFT JOIN (
       SELECT district_id, COUNT(*)::int AS registered_voters
       FROM voters
       WHERE ($1::uuid IS NULL OR election_id = $1::uuid)
       GROUP BY district_id
     ) voters ON voters.district_id = d.id
     LEFT JOIN (
       SELECT district_id, COUNT(*)::int AS cast_votes
       FROM district_list_votes
       WHERE ($1::uuid IS NULL OR election_id = $1::uuid)
       GROUP BY district_id
     ) votes ON votes.district_id = d.id
     WHERE ($1::uuid IS NULL OR d.election_id = $1::uuid)
     ORDER BY turnout DESC, d.name`,
    [electionId],
  );

  return {
    activeElection,
    totalVotes,
    totalVoters,
    turnout: percent(totalVotes, totalVoters),
    verifiedVoters: Number(totals?.verified_voters || 0),
    votedVoters: Number(totals?.voted_voters || 0),
    issuedTokens: Number(totals?.issued_tokens || 0),
    usedTokens: Number(totals?.used_tokens || 0),
    hourlyVotes: hourlyResult.rows,
    seatsDistribution: {
      totalSeats: localSeats + partySeats,
      localSeats,
      partySeats,
      quotas: quotaResult.rows,
    },
    topCandidates: topCandidatesResult.rows,
    districtTurnout: districtTurnoutResult.rows.map((row: any) => ({
      ...row,
      registeredVoters: Number(row.registeredVoters || 0),
      votes: Number(row.votes || 0),
      turnout: Number(row.turnout || 0),
    })),
    lastUpdatedAt: new Date().toISOString(),
  };
}
