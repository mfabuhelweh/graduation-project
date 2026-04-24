import { adminDb } from '../config/firebaseAdmin.js';
import { env } from '../config/env.js';
import { memoryStore } from '../data/memoryStore.js';
import { query, usePostgres } from '../db/pool.js';
import { canViewSensitiveResults } from '../middleware/adminMiddleware.js';
import type { AuthenticatedUser } from '../middleware/authMiddleware.js';
import { canExposeResults } from '../utils/electionState.js';

async function getVoterDemographicsMetadata() {
  const columnsResult = await query<{ column_name: string }>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'voters'
       AND column_name IN ('gender', 'birth_date', 'date_of_birth', 'age')`,
  );

  const availableColumns = new Set(columnsResult.rows.map((row) => row.column_name));
  return {
    hasGender: availableColumns.has('gender'),
    birthDateColumn: availableColumns.has('birth_date')
      ? 'birth_date'
      : availableColumns.has('date_of_birth')
        ? 'date_of_birth'
        : null,
    ageColumn: availableColumns.has('age') ? 'age' : null,
  };
}

function assertResultsVisibility(
  election:
    | {
        status?: string | null;
        startAt?: string | null;
        endAt?: string | null;
        allowResultsVisibilityBeforeClose?: boolean | null;
      }
    | undefined
    | null,
  user?: AuthenticatedUser,
) {
  if (!election) {
    throw new Error('Election not found');
  }

  if (user?.role === 'admin') {
    if (!canViewSensitiveResults(user)) {
      throw new Error('Your admin role is not allowed to access sensitive results');
    }
    return election;
  }

  if (canExposeResults(election)) {
    return election;
  }

  throw new Error('Results are hidden until the election is closed');
}

async function assertResultsAccess(electionId: string, user?: AuthenticatedUser) {
  if (env.enableMemoryStore) {
    const election = memoryStore.elections.get(electionId) as
      | {
          status?: string;
          startAt?: string;
          endAt?: string;
          allowResultsVisibilityBeforeClose?: boolean;
        }
      | undefined;
    return assertResultsVisibility(election, user);
  }

  if (!usePostgres) {
    const snapshot = await adminDb.collection('elections').doc(electionId).get();
    const election = snapshot.exists
      ? {
          status: snapshot.get('status'),
          startAt: snapshot.get('startAt'),
          endAt: snapshot.get('endAt'),
          allowResultsVisibilityBeforeClose: snapshot.get('allowResultsVisibilityBeforeClose'),
        }
      : null;
    return assertResultsVisibility(election, user);
  }

  const result = await query<{
    status: string;
    start_at: string | null;
    end_at: string | null;
    allow_results_visibility_before_close: boolean;
  }>(
    `SELECT status, start_at, end_at, allow_results_visibility_before_close
     FROM elections
     WHERE id = $1
     LIMIT 1`,
    [electionId],
  );

  return assertResultsVisibility(
    result.rows[0]
      ? {
          status: result.rows[0].status,
          startAt: result.rows[0].start_at,
          endAt: result.rows[0].end_at,
          allowResultsVisibilityBeforeClose: result.rows[0].allow_results_visibility_before_close,
        }
      : null,
    user,
  );
}

export async function getElectionResults(electionId: string, user?: AuthenticatedUser) {
  await assertResultsAccess(electionId, user);

  if (env.enableMemoryStore) {
    const votes = Array.from(memoryStore.votes.values()).filter((vote: any) => vote.electionId === electionId);
    const parties = new Map<string, number>();
    const districtLists = new Map<string, number>();
    const districtCandidates = new Map<string, number>();

    votes.forEach((vote: any) => {
      parties.set(vote.partyId, (parties.get(vote.partyId) || 0) + 1);
      districtLists.set(vote.districtListId, (districtLists.get(vote.districtListId) || 0) + 1);
      vote.districtCandidateIds?.forEach((candidateId: string) => {
        districtCandidates.set(candidateId, (districtCandidates.get(candidateId) || 0) + 1);
      });
    });

    return {
      totalVotes: votes.length,
      parties: Array.from(parties.entries()).map(([id, votes]) => ({ id, votes })),
      districtLists: Array.from(districtLists.entries()).map(([id, votes]) => ({ id, votes })),
      districtCandidates: Array.from(districtCandidates.entries()).map(([id, votes]) => ({ id, votes })),
      partyWinners: [],
      analytics: {
        districtTurnout: [],
        demographics: {
          genderAvailable: false,
          ageAvailable: false,
          genderBreakdown: [],
          ageGroups: [],
        },
      },
    };
  }

  if (!usePostgres) {
    const votesSnapshot = await adminDb.collection('votes').where('electionId', '==', electionId).get();
    return {
      totalVotes: votesSnapshot.size,
      parties: [],
      districtLists: [],
      districtCandidates: [],
      partyWinners: [],
      analytics: {
        districtTurnout: [],
        demographics: {
          genderAvailable: false,
          ageAvailable: false,
          genderBreakdown: [],
          ageGroups: [],
        },
      },
    };
  }

  const totalResult = await query<{ total: string }>(
    `SELECT COUNT(*)::text AS total
     FROM ballots
     WHERE election_id = $1`,
    [electionId],
  );

  const partiesResult = await query(
    `SELECT p.id,
            p.party_name AS name,
            p.party_code AS code,
            COUNT(pv.id)::int AS votes
     FROM parties p
     LEFT JOIN party_votes pv ON pv.party_id = p.id
     WHERE p.election_id = $1
     GROUP BY p.id
     ORDER BY votes DESC, p.party_name`,
    [electionId],
  );

  const districtListsResult = await query(
    `SELECT dl.id,
            dl.list_name AS name,
            dl.list_code AS code,
            d.name AS "districtName",
            COUNT(dlv.id)::int AS votes
     FROM district_lists dl
     JOIN districts d ON d.id = dl.district_id
     LEFT JOIN district_list_votes dlv ON dlv.district_list_id = dl.id
     WHERE dl.election_id = $1
     GROUP BY dl.id, d.id
     ORDER BY d.name, votes DESC, dl.list_name`,
    [electionId],
  );

  const districtCandidatesResult = await query(
    `SELECT dlc.id,
            dlc.full_name AS name,
            dl.list_name AS "listName",
            d.name AS "districtName",
            COUNT(dcv.id)::int AS votes
     FROM district_list_candidates dlc
     JOIN district_lists dl ON dl.id = dlc.district_list_id
     JOIN districts d ON d.id = dl.district_id
     LEFT JOIN district_candidate_votes dcv ON dcv.candidate_id = dlc.id
     WHERE dl.election_id = $1
     GROUP BY dlc.id, dl.list_name, d.name
     ORDER BY d.name, dl.list_name, votes DESC, dlc.candidate_order`,
    [electionId],
  );

  const partyWinnersResult = await query(
    `WITH party_vote_totals AS (
       SELECT p.id,
              p.party_name,
              COUNT(pv.id)::int AS total_votes
       FROM parties p
       LEFT JOIN party_votes pv ON pv.party_id = p.id
       WHERE p.election_id = $1
       GROUP BY p.id
     ),
     ranked_parties AS (
       SELECT pvt.*,
              ROW_NUMBER() OVER (ORDER BY pvt.total_votes DESC, pvt.party_name) AS party_rank
       FROM party_vote_totals pvt
     ),
     ranked_candidates AS (
       SELECT pc.id,
              pc.full_name AS name,
              pc.candidate_order AS "candidateOrder",
              p.party_name AS "partyName",
              rp.total_votes AS "partyVotes",
              ROW_NUMBER() OVER (
                ORDER BY pc.candidate_order, rp.party_rank, p.party_name, pc.full_name
              ) AS overall_rank
       FROM ranked_parties rp
       JOIN parties p ON p.id = rp.id
       JOIN party_candidates pc ON pc.party_id = p.id
     ),
     party_seat_limit AS (
       SELECT total_national_party_seats
       FROM elections
       WHERE id = $1
     )
     SELECT rc.id,
            rc.name,
            rc."candidateOrder",
            rc."partyName",
            rc."partyVotes"
     FROM ranked_candidates rc
     CROSS JOIN party_seat_limit psl
     WHERE rc.overall_rank <= psl.total_national_party_seats
     ORDER BY rc.overall_rank`,
    [electionId],
  );

  const districtTurnoutResult = await query(
    `SELECT d.id,
            d.name,
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
       WHERE election_id = $1
       GROUP BY district_id
     ) voters ON voters.district_id = d.id
     LEFT JOIN (
       SELECT district_id, COUNT(*)::int AS cast_votes
       FROM district_list_votes
       WHERE election_id = $1
       GROUP BY district_id
     ) votes ON votes.district_id = d.id
     WHERE d.election_id = $1
     ORDER BY votes DESC, d.name`,
    [electionId],
  );

  const demographicsMetadata = await getVoterDemographicsMetadata();
  let genderBreakdown: Array<{ key: string; label: string; count: number }> = [];
  let ageGroups: Array<{ key: string; label: string; count: number }> = [];

  if (demographicsMetadata.hasGender) {
    const genderResult = await query<{ key: string; count: number }>(
      `SELECT CASE
                WHEN lower(gender::text) IN ('male', 'm', 'ذكر') THEN 'male'
                WHEN lower(gender::text) IN ('female', 'f', 'أنثى', 'انثى') THEN 'female'
                ELSE 'unknown'
              END AS key,
              COUNT(*)::int AS count
       FROM voters
       WHERE election_id = $1
         AND has_voted = true
         AND gender IS NOT NULL
       GROUP BY 1
       ORDER BY count DESC`,
      [electionId],
    );

    genderBreakdown = genderResult.rows.map((row) => ({
      key: row.key,
      label: row.key === 'male' ? 'ذكور' : row.key === 'female' ? 'إناث' : 'غير محدد',
      count: Number(row.count || 0),
    }));
  }

  if (demographicsMetadata.birthDateColumn || demographicsMetadata.ageColumn) {
    const ageGroupsResult = await query<{ key: string; count: number }>(
      `WITH voters_age AS (
         SELECT ${
           demographicsMetadata.birthDateColumn
             ? `EXTRACT(YEAR FROM AGE(CURRENT_DATE, ${demographicsMetadata.birthDateColumn}))::int`
             : `${demographicsMetadata.ageColumn}::int`
         } AS age_years
         FROM voters
         WHERE election_id = $1
           AND has_voted = true
           AND ${
             demographicsMetadata.birthDateColumn
               ? `${demographicsMetadata.birthDateColumn} IS NOT NULL`
               : `${demographicsMetadata.ageColumn} IS NOT NULL`
           }
       )
       SELECT CASE
                WHEN age_years < 18 THEN 'under_18'
                WHEN age_years BETWEEN 18 AND 24 THEN '18_24'
                WHEN age_years BETWEEN 25 AND 34 THEN '25_34'
                WHEN age_years BETWEEN 35 AND 44 THEN '35_44'
                WHEN age_years BETWEEN 45 AND 59 THEN '45_59'
                ELSE '60_plus'
              END AS key,
              COUNT(*)::int AS count
       FROM voters_age
       GROUP BY 1
       ORDER BY 1`,
      [electionId],
    );

    const labels: Record<string, string> = {
      under_18: 'أقل من 18',
      '18_24': '18 - 24',
      '25_34': '25 - 34',
      '35_44': '35 - 44',
      '45_59': '45 - 59',
      '60_plus': '60+',
    };

    ageGroups = ageGroupsResult.rows.map((row) => ({
      key: row.key,
      label: labels[row.key] || row.key,
      count: Number(row.count || 0),
    }));
  }

  return {
    totalVotes: Number(totalResult.rows[0]?.total || 0),
    parties: partiesResult.rows,
    districtLists: districtListsResult.rows,
    districtCandidates: districtCandidatesResult.rows,
    partyWinners: partyWinnersResult.rows,
    analytics: {
      districtTurnout: districtTurnoutResult.rows.map((row: any) => ({
        ...row,
        registeredVoters: Number(row.registeredVoters || 0),
        votes: Number(row.votes || 0),
        turnout: Number(row.turnout || 0),
      })),
      demographics: {
        genderAvailable: demographicsMetadata.hasGender,
        ageAvailable: Boolean(demographicsMetadata.birthDateColumn || demographicsMetadata.ageColumn),
        genderBreakdown,
        ageGroups,
      },
    },
  };
}
