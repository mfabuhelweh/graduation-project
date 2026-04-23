import { env } from '../config/env.js';
import { memoryStore } from '../data/memoryStore.js';
import { query, usePostgres } from '../db/pool.js';

function percent(part: number, total: number) {
  return total > 0 ? Number(((part / total) * 100).toFixed(1)) : 0;
}

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

function getEmptySummary() {
  return {
    activeElection: null,
    totalVotes: 0,
    totalVoters: 0,
    turnout: 0,
    verifiedVoters: 0,
    votedVoters: 0,
    issuedTokens: 0,
    usedTokens: 0,
    districtTurnout: [],
    seatsDistribution: {
      totalSeats: 0,
      localSeats: 0,
      partySeats: 0,
      quotas: [],
    },
    topCandidates: [],
    leadingLists: [],
    demographics: {
      genderAvailable: false,
      ageAvailable: false,
      genderBreakdown: [],
      ageGroups: [],
    },
    systemHealth: {
      serverStatus: 'healthy',
      pendingVerificationRequests: 0,
      suspiciousAttempts: 0,
      blockedVoters: 0,
      securityAlerts: 0,
      activeVotingTokens: 0,
      tokenUsageRate: 0,
    },
    recentActivity: [],
    lastUpdatedAt: new Date().toISOString(),
  };
}

export async function getDashboardSummary() {
  if (env.enableMemoryStore) {
    const elections = Array.from(memoryStore.elections.values());
    const voters = Array.from(memoryStore.voters.values());
    const votes = Array.from(memoryStore.votes.values());
    const activeElection =
      elections.find((election: any) => ['Active', 'Voting Open', 'active'].includes(String(election.status))) ||
      elections[0] ||
      null;
    const electionVotes = activeElection ? votes.filter((vote: any) => vote.electionId === activeElection.id) : votes;

    return {
      ...getEmptySummary(),
      activeElection,
      totalVotes: electionVotes.length,
      totalVoters: voters.length,
      turnout: percent(electionVotes.length, voters.length),
      verifiedVoters: voters.filter((voter: any) => voter.verifiedFace).length,
      votedVoters: voters.filter((voter: any) => voter.hasVoted).length,
      recentActivity: Array.from(memoryStore.auditLogs.values())
        .slice(-5)
        .reverse()
        .map((entry: any) => ({
          id: entry.id,
          event: entry.event,
          actorType: 'system',
          time: entry.time,
        })),
      lastUpdatedAt: new Date().toISOString(),
    };
  }

  if (!usePostgres) {
    return getEmptySummary();
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
     ORDER BY
       CASE e.status
         WHEN 'active' THEN 0
         WHEN 'scheduled' THEN 1
         WHEN 'draft' THEN 2
         WHEN 'closed' THEN 3
         ELSE 4
       END,
       CASE
         WHEN e.start_at IS NULL THEN 1
         WHEN e.start_at <= now() THEN 0
         ELSE 1
       END,
       e.start_at ASC NULLS LAST,
       (SELECT COUNT(*) FROM districts d WHERE d.election_id = e.id) DESC,
       (SELECT COUNT(*) FROM voters v WHERE v.election_id = e.id) DESC,
       e.created_at DESC
     LIMIT 1`,
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
  const issuedTokens = Number(totals?.issued_tokens || 0);
  const usedTokens = Number(totals?.used_tokens || 0);

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

  const leadingListsResult = await query(
    `WITH ranked_lists AS (
       SELECT
         'party' AS type,
         p.id,
         p.party_name AS name,
         COUNT(pv.id)::int AS votes
       FROM parties p
       LEFT JOIN party_votes pv ON pv.party_id = p.id
       WHERE ($1::uuid IS NULL OR p.election_id = $1::uuid)
       GROUP BY p.id
       UNION ALL
       SELECT
         'district_list' AS type,
         dl.id,
         dl.list_name AS name,
         COUNT(dlv.id)::int AS votes
       FROM district_lists dl
       LEFT JOIN district_list_votes dlv ON dlv.district_list_id = dl.id
       WHERE ($1::uuid IS NULL OR dl.election_id = $1::uuid)
       GROUP BY dl.id
     )
     SELECT type, id, name, votes
     FROM ranked_lists
     ORDER BY votes DESC, name
     LIMIT 4`,
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
       WHERE ($1::uuid IS NULL OR election_id = $1::uuid)
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
         WHERE ($1::uuid IS NULL OR election_id = $1::uuid)
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

  const systemHealthResult = await query<{
    pending_sanad_requests: string;
    pending_face_reviews: string;
    blocked_voters: string;
    suspicious_attempts: string;
    active_voting_tokens: string;
  }>(
    `SELECT
       (
         SELECT COUNT(*)::int
         FROM sanad_auth_requests sar
         JOIN voters v ON v.id = sar.voter_id
         WHERE ($1::uuid IS NULL OR v.election_id = $1::uuid)
           AND sar.status IN ('pending_otp', 'otp_verified')
       )::text AS pending_sanad_requests,
       (
         SELECT COUNT(*)::int
         FROM voters
         WHERE ($1::uuid IS NULL OR election_id = $1::uuid)
           AND status = 'pending_verification'
       )::text AS pending_face_reviews,
       (
         SELECT COUNT(*)::int
         FROM voters
         WHERE ($1::uuid IS NULL OR election_id = $1::uuid)
           AND status = 'blocked'
       )::text AS blocked_voters,
       (
         SELECT COUNT(*)::int
         FROM sanad_auth_requests sar
         JOIN voters v ON v.id = sar.voter_id
         WHERE ($1::uuid IS NULL OR v.election_id = $1::uuid)
           AND sar.status = 'pending_otp'
           AND sar.attempts_count >= 3
       )::text AS suspicious_attempts,
       (
         SELECT COUNT(*)::int
         FROM voting_tokens
         WHERE ($1::uuid IS NULL OR election_id = $1::uuid)
           AND status = 'active'
           AND token_expires_at > now()
       )::text AS active_voting_tokens`,
    [electionId],
  );

  const recentActivityResult = await query(
    `SELECT id,
            action_type AS event,
            actor_type AS "actorType",
            created_at AS time
     FROM audit_logs
     ORDER BY created_at DESC
     LIMIT 5`,
  );

  const localSeats = Number(seatsResult.rows[0]?.local_seats || 0);
  const partySeats = Number(seatsResult.rows[0]?.party_seats || 0);
  const pendingVerificationRequests =
    Number(systemHealthResult.rows[0]?.pending_sanad_requests || 0) +
    Number(systemHealthResult.rows[0]?.pending_face_reviews || 0);
  const blockedVoters = Number(systemHealthResult.rows[0]?.blocked_voters || 0);
  const suspiciousAttempts = Number(systemHealthResult.rows[0]?.suspicious_attempts || 0);
  const securityAlerts = blockedVoters + suspiciousAttempts;

  let serverStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
  if (securityAlerts >= 3) {
    serverStatus = 'critical';
  } else if (pendingVerificationRequests >= 5 || securityAlerts > 0) {
    serverStatus = 'warning';
  }

  return {
    activeElection,
    totalVotes,
    totalVoters,
    turnout: percent(totalVotes, totalVoters),
    verifiedVoters: Number(totals?.verified_voters || 0),
    votedVoters: Number(totals?.voted_voters || 0),
    issuedTokens,
    usedTokens,
    districtTurnout: districtTurnoutResult.rows.map((row: any) => ({
      ...row,
      registeredVoters: Number(row.registeredVoters || 0),
      votes: Number(row.votes || 0),
      turnout: Number(row.turnout || 0),
    })),
    seatsDistribution: {
      totalSeats: localSeats + partySeats,
      localSeats,
      partySeats,
      quotas: quotaResult.rows,
    },
    topCandidates: topCandidatesResult.rows,
    leadingLists: leadingListsResult.rows.map((row: any) => ({
      ...row,
      votes: Number(row.votes || 0),
    })),
    demographics: {
      genderAvailable: demographicsMetadata.hasGender,
      ageAvailable: Boolean(demographicsMetadata.birthDateColumn || demographicsMetadata.ageColumn),
      genderBreakdown,
      ageGroups,
    },
    systemHealth: {
      serverStatus,
      pendingVerificationRequests,
      suspiciousAttempts,
      blockedVoters,
      securityAlerts,
      activeVotingTokens: Number(systemHealthResult.rows[0]?.active_voting_tokens || 0),
      tokenUsageRate: percent(usedTokens, issuedTokens),
    },
    recentActivity: recentActivityResult.rows,
    lastUpdatedAt: new Date().toISOString(),
  };
}
