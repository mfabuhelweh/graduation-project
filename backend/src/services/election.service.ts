import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '../config/firebaseAdmin.js';
import { env } from '../config/env.js';
import { createId, memoryStore } from '../data/memoryStore.js';
import { query, usePostgres, withTransaction } from '../db/pool.js';
import type { Election, ElectionStatus } from '../models/election.model.js';
import { addAuditLog } from './audit.service.js';

type ElectionInput = Partial<Election> & {
  startDate?: string;
  endDate?: string;
  showTurnoutToVoters?: boolean;
  totalNationalPartySeats?: number;
};

const FIXED_SYSTEM_ELECTIONS = [
  {
    title: 'انتخابات مجلس النواب الأردني 2024 - الدوائر المحلية',
    description: 'انتخابات تجريبية لمجلس النواب الأردني تشمل القوائم المحلية في جميع الدوائر الانتخابية لاختبار نظام التصويت الإلكتروني',
    status: 'active' as ElectionStatus,
    enableParties: true,
    enableDistrictLists: true,
    districtCandidateSelectionCount: 3,
    totalNationalPartySeats: 41,
    showTurnoutPublicly: true,
    allowResultsVisibilityBeforeClose: false,
  },
  {
    title: 'انتخابات مجلس النواب الأردني 2024 - القوائم الحزبية',
    description: 'انتخابات تجريبية لمجلس النواب الأردني تشمل الأحزاب الوطنية على مستوى المملكة لاختبار نظام التصويت الإلكتروني',
    status: 'active' as ElectionStatus,
    enableParties: true,
    enableDistrictLists: true,
    districtCandidateSelectionCount: 3,
    totalNationalPartySeats: 41,
    showTurnoutPublicly: true,
    allowResultsVisibilityBeforeClose: false,
  },
] as const;

const legacyStatusToDb: Record<string, ElectionStatus> = {
  Draft: 'draft',
  Active: 'active',
  'Voting Open': 'active',
  Closed: 'closed',
  'Results Published': 'archived',
};

function normalizeStatus(status?: string): ElectionStatus {
  if (!status) return 'draft';
  const normalized = legacyStatusToDb[status] || status.toLowerCase();
  if (['draft', 'scheduled', 'active', 'closed', 'archived'].includes(normalized)) {
    return normalized as ElectionStatus;
  }
  return 'draft';
}

function normalizeElectionInput(data: ElectionInput) {
  const startAt = data.startAt || data.startDate;
  const endAt = data.endAt || data.endDate;
  if (!data.title?.trim()) {
    throw new Error('Election title is required');
  }
  if (!startAt || !endAt) {
    throw new Error('Election start and end dates are required');
  }

  return {
    title: data.title.trim(),
    description: data.description?.trim() || null,
    startAt,
    endAt,
    status: normalizeStatus(data.status),
    enableParties: data.enableParties ?? true,
    enableDistrictLists: data.enableDistrictLists ?? true,
    districtCandidateSelectionCount: data.districtCandidateSelectionCount ?? null,
    totalNationalPartySeats: data.totalNationalPartySeats ?? 41,
    showTurnoutPublicly: data.showTurnoutPublicly ?? data.showTurnoutToVoters ?? true,
    allowResultsVisibilityBeforeClose: data.allowResultsVisibilityBeforeClose ?? false,
  };
}

function mapElectionRow(row: any) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    startAt: row.start_at,
    endAt: row.end_at,
    startDate: row.start_at,
    endDate: row.end_at,
    enableParties: row.enable_parties,
    enableDistrictLists: row.enable_district_lists,
    districtCandidateSelectionCount: row.district_candidate_selection_count,
    totalNationalPartySeats: Number(row.total_national_party_seats || 41),
    showTurnoutPublicly: row.show_turnout_publicly,
    allowResultsVisibilityBeforeClose: row.allow_results_visibility_before_close,
    createdByAdminId: row.created_by_admin_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    districtsCount: Number(row.districts_count || 0),
    partiesCount: Number(row.parties_count || 0),
    districtListsCount: Number(row.district_lists_count || 0),
    votersCount: Number(row.voters_count || 0),
    ballotsCount: Number(row.ballots_count || 0),
  };
}

export async function resolveAdminId(actor?: string) {
  if (!usePostgres) return undefined;

  if (actor) {
    const byEmail = await query<{ id: string }>('SELECT id FROM admins WHERE email = $1 LIMIT 1', [actor]);
    if (byEmail.rows[0]?.id) return byEmail.rows[0].id;
  }

  const fallback = await query<{ id: string }>('SELECT id FROM admins ORDER BY created_at ASC LIMIT 1');
  return fallback.rows[0]?.id;
}

async function ensureFixedSystemElections() {
  if (!usePostgres) return;

  const adminId = await resolveAdminId();
  if (!adminId) return;

  const existingResult = await query<{ title: string }>(
    `SELECT title
     FROM elections
     WHERE title = ANY($1::text[])`,
    [FIXED_SYSTEM_ELECTIONS.map((item) => item.title)],
  );

  const existingTitles = new Set(existingResult.rows.map((row) => row.title));
  const startAt = new Date('2026-04-11T08:00:00+03:00').toISOString();
  const endAt = new Date('2026-12-31T19:00:00+03:00').toISOString();

  for (const election of FIXED_SYSTEM_ELECTIONS) {
    if (existingTitles.has(election.title)) continue;

    await query(
      `INSERT INTO elections (
         title,
         description,
         start_at,
         end_at,
         status,
         enable_parties,
         enable_district_lists,
         district_candidate_selection_count,
         total_national_party_seats,
         show_turnout_publicly,
         allow_results_visibility_before_close,
         created_by_admin_id
       )
       VALUES ($1, $2, $3, $4, $5::election_status, $6, $7, $8, $9, $10, $11, $12)`,
      [
        election.title,
        election.description,
        startAt,
        endAt,
        election.status,
        election.enableParties,
        election.enableDistrictLists,
        election.districtCandidateSelectionCount,
        election.totalNationalPartySeats,
        election.showTurnoutPublicly,
        election.allowResultsVisibilityBeforeClose,
        adminId,
      ],
    );
  }
}

export async function listElections() {
  if (env.enableMemoryStore) {
    return Array.from(memoryStore.elections.values()).sort((a, b) =>
      String(b.createdAt).localeCompare(String(a.createdAt)),
    );
  }

  if (!usePostgres) {
    const snapshot = await adminDb.collection('elections').orderBy('createdAt', 'desc').get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  await ensureFixedSystemElections();

  const result = await query(
    `SELECT e.*,
            (SELECT COUNT(*) FROM districts d WHERE d.election_id = e.id) AS districts_count,
            (SELECT COUNT(*) FROM parties p WHERE p.election_id = e.id) AS parties_count,
            (SELECT COUNT(*) FROM district_lists dl WHERE dl.election_id = e.id) AS district_lists_count,
            (SELECT COUNT(*) FROM voters v WHERE v.election_id = e.id) AS voters_count,
            (SELECT COUNT(*) FROM ballots b WHERE b.election_id = e.id) AS ballots_count
     FROM elections e
     WHERE e.title = ANY($1::text[])
     ORDER BY e.created_at DESC`,
    [FIXED_SYSTEM_ELECTIONS.map((item) => item.title)],
  );

  return result.rows.map(mapElectionRow);
}

export async function getElection(id: string) {
  if (env.enableMemoryStore) {
    return memoryStore.elections.get(id) || null;
  }

  if (!usePostgres) {
    const doc = await adminDb.collection('elections').doc(id).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  }

  const result = await query(
    `SELECT e.*,
            (SELECT COUNT(*) FROM districts d WHERE d.election_id = e.id) AS districts_count,
            (SELECT COUNT(*) FROM parties p WHERE p.election_id = e.id) AS parties_count,
            (SELECT COUNT(*) FROM district_lists dl WHERE dl.election_id = e.id) AS district_lists_count,
            (SELECT COUNT(*) FROM voters v WHERE v.election_id = e.id) AS voters_count,
            (SELECT COUNT(*) FROM ballots b WHERE b.election_id = e.id) AS ballots_count
     FROM elections e
     WHERE e.id = $1`,
    [id],
  );

  return result.rows[0] ? mapElectionRow(result.rows[0]) : null;
}

export async function createElection(data: ElectionInput, actor = 'system') {
  const payload = normalizeElectionInput(data);

  if (env.enableMemoryStore) {
    const id = createId('election');
    const now = new Date().toISOString();
    const election = {
      id,
      ...payload,
      createdAt: now,
      updatedAt: now,
    };
    memoryStore.elections.set(id, election as any);
    await addAuditLog('election.created', actor, `Created election ${id}`);
    return election;
  }

  if (!usePostgres) {
    const now = Timestamp.now();
    const docRef = await adminDb.collection('elections').add({
      ...payload,
      createdAt: now,
      updatedAt: now,
    });
    await addAuditLog('election.created', actor, `Created election ${docRef.id}`);
    return { id: docRef.id, ...payload, createdAt: now, updatedAt: now };
  }

  const adminId = await resolveAdminId(actor);
  if (!adminId) {
    throw new Error('Create an admin row first, then create elections');
  }

  const createdId = await withTransaction(async (client) => {
    const result = await client.query<{ id: string }>(
      `INSERT INTO elections (
         title,
         description,
         start_at,
         end_at,
         status,
         enable_parties,
         enable_district_lists,
         district_candidate_selection_count,
         total_national_party_seats,
         show_turnout_publicly,
         allow_results_visibility_before_close,
         created_by_admin_id
       )
       VALUES ($1, $2, $3, $4, $5::election_status, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id`,
      [
        payload.title,
        payload.description,
        payload.startAt,
        payload.endAt,
        payload.status,
        payload.enableParties,
        payload.enableDistrictLists,
        payload.districtCandidateSelectionCount,
        payload.totalNationalPartySeats,
        payload.showTurnoutPublicly,
        payload.allowResultsVisibilityBeforeClose,
        adminId,
      ],
    );

    await client.query(
      `INSERT INTO audit_logs (actor_type, actor_id, action_type, target_table, target_id, details_json)
       VALUES ('admin', $1, 'admin_created_election', 'elections', $2, $3::jsonb)`,
      [adminId, result.rows[0].id, JSON.stringify(payload)],
    );

    return result.rows[0].id;
  });

  return getElection(createdId);
}

export async function updateElection(id: string, data: ElectionInput, actor = 'system') {
  const current = await getElection(id);
  if (!current) {
    throw new Error('Election not found');
  }

  const payload = normalizeElectionInput({
    ...current,
    ...data,
    startAt: data.startAt || data.startDate || current.startAt,
    endAt: data.endAt || data.endDate || current.endAt,
  });

  if (!usePostgres) {
    await addAuditLog('election.updated', actor, `Updated election ${id}`);
    return { ...current, ...payload };
  }

  await query(
    `UPDATE elections
     SET title = $2,
         description = $3,
         start_at = $4,
         end_at = $5,
         status = $6::election_status,
         enable_parties = $7,
         enable_district_lists = $8,
         district_candidate_selection_count = $9,
         total_national_party_seats = $10,
         show_turnout_publicly = $11,
         allow_results_visibility_before_close = $12,
         updated_at = now()
     WHERE id = $1`,
    [
      id,
      payload.title,
      payload.description,
      payload.startAt,
      payload.endAt,
      payload.status,
      payload.enableParties,
      payload.enableDistrictLists,
      payload.districtCandidateSelectionCount,
      payload.totalNationalPartySeats,
      payload.showTurnoutPublicly,
      payload.allowResultsVisibilityBeforeClose,
    ],
  );

  await addAuditLog('election.updated', actor, `Updated election ${id}`);
  return getElection(id);
}

export async function updateElectionStatus(id: string, status: string, actor = 'system') {
  const normalizedStatus = normalizeStatus(status);

  if (!usePostgres) {
    await addAuditLog('election.status_updated', actor, `Updated election ${id} status to ${normalizedStatus}`);
    return { id, status: normalizedStatus };
  }

  await query(
    `UPDATE elections
     SET status = $2::election_status,
         updated_at = now()
     WHERE id = $1`,
    [id, normalizedStatus],
  );

  await addAuditLog('election.status_updated', actor, `Updated election ${id} status to ${normalizedStatus}`);
  return getElection(id);
}

export async function deleteElection(id: string, actor = 'system') {
  if (env.enableMemoryStore) {
    memoryStore.elections.delete(id);
    await addAuditLog('election.deleted', actor, `Deleted election ${id}`);
    return { id };
  }

  if (usePostgres) {
    await query('DELETE FROM elections WHERE id = $1', [id]);
    await addAuditLog('election.deleted', actor, `Deleted election ${id}`);
    return { id };
  }

  await adminDb.collection('elections').doc(id).delete();
  await addAuditLog('election.deleted', actor, `Deleted election ${id}`);
  return { id };
}

export async function getElectionSetupSummary(electionId: string) {
  if (!usePostgres) {
    return {
      counts: {
        districts: 0,
        quotas: 0,
        parties: 0,
        partyCandidates: 0,
        districtLists: 0,
        districtListCandidates: 0,
        voters: 0,
      },
      warnings: [],
    };
  }

  const countsResult = await query(
    `SELECT
       (SELECT COUNT(*) FROM districts WHERE election_id = $1)::int AS districts_count,
       (SELECT COUNT(*) FROM quotas WHERE election_id = $1)::int AS quotas_count,
       (SELECT COUNT(*) FROM parties WHERE election_id = $1)::int AS parties_count,
       (
         SELECT COUNT(*)
         FROM party_candidates pc
         JOIN parties p ON p.id = pc.party_id
         WHERE p.election_id = $1
       )::int AS party_candidates_count,
       (SELECT COUNT(*) FROM district_lists WHERE election_id = $1)::int AS district_lists_count,
       (
         SELECT COUNT(*)
         FROM district_list_candidates dlc
         JOIN district_lists dl ON dl.id = dlc.district_list_id
         WHERE dl.election_id = $1
       )::int AS district_list_candidates_count,
       (SELECT COUNT(*) FROM voters WHERE election_id = $1)::int AS voters_count`,
    [electionId],
  );

  const warnings: string[] = [];
  const counts = countsResult.rows[0];

  if (!counts?.districts_count) warnings.push('election has no districts');
  if (!counts?.parties_count) warnings.push('election has no parties');
  if (!counts?.district_lists_count) warnings.push('election has no district lists');
  if (!counts?.voters_count) warnings.push('election has no voters');

  const districtsWithoutLists = await query(
    `SELECT d.name
     FROM districts d
     LEFT JOIN district_lists dl ON dl.district_id = d.id
     WHERE d.election_id = $1
     GROUP BY d.id, d.name
     HAVING COUNT(dl.id) = 0`,
    [electionId],
  );
  warnings.push(...districtsWithoutLists.rows.map((row: any) => `district has no lists: ${row.name}`));

  const listsWithoutCandidates = await query(
    `SELECT dl.list_name
     FROM district_lists dl
     LEFT JOIN district_list_candidates dlc ON dlc.district_list_id = dl.id
     WHERE dl.election_id = $1
     GROUP BY dl.id, dl.list_name
     HAVING COUNT(dlc.id) = 0`,
    [electionId],
  );
  warnings.push(...listsWithoutCandidates.rows.map((row: any) => `list has no candidates: ${row.list_name}`));

  const partiesWithoutCandidates = await query(
    `SELECT p.party_name
     FROM parties p
     LEFT JOIN party_candidates pc ON pc.party_id = p.id
     WHERE p.election_id = $1
     GROUP BY p.id, p.party_name
     HAVING COUNT(pc.id) = 0`,
    [electionId],
  );
  warnings.push(...partiesWithoutCandidates.rows.map((row: any) => `party has no candidates: ${row.party_name}`));

  return {
    counts: {
      districts: Number(counts?.districts_count || 0),
      quotas: Number(counts?.quotas_count || 0),
      parties: Number(counts?.parties_count || 0),
      partyCandidates: Number(counts?.party_candidates_count || 0),
      districtLists: Number(counts?.district_lists_count || 0),
      districtListCandidates: Number(counts?.district_list_candidates_count || 0),
      voters: Number(counts?.voters_count || 0),
    },
    warnings,
  };
}

export async function getElectionDetails(electionId: string) {
  if (!usePostgres) {
    return null;
  }

  const election = await getElection(electionId);
  if (!election) return null;

  const [districts, quotas, parties, partyCandidates, districtLists, districtListCandidates, voters, setupSummary] =
    await Promise.all([
      query(
        `SELECT id, name, code, seats_count AS "seatsCount", created_at AS "createdAt"
         FROM districts
         WHERE election_id = $1
         ORDER BY name`,
        [electionId],
      ),
      query(
        `SELECT q.id,
                q.name,
                q.description,
                q.created_at AS "createdAt",
                q.district_id AS "districtId",
                d.name AS "districtName"
         FROM quotas q
         LEFT JOIN districts d ON d.id = q.district_id
         WHERE q.election_id = $1
         ORDER BY q.name`,
        [electionId],
      ),
      query(
        `SELECT p.id,
                p.party_name AS "partyName",
                p.party_code AS "partyCode",
                p.logo_url AS "logoUrl",
                p.description,
                p.created_at AS "createdAt",
                p.updated_at AS "updatedAt",
                COUNT(pc.id)::int AS "candidatesCount"
         FROM parties p
         LEFT JOIN party_candidates pc ON pc.party_id = p.id
         WHERE p.election_id = $1
         GROUP BY p.id
         ORDER BY p.party_name`,
        [electionId],
      ),
      query(
        `SELECT pc.id,
                pc.party_id AS "partyId",
                p.party_name AS "partyName",
                pc.full_name AS "fullName",
                pc.national_id AS "nationalId",
                pc.candidate_order AS "candidateOrder",
                pc.gender,
                pc.photo_url AS "photoUrl",
                q.name AS "quotaName"
         FROM party_candidates pc
         JOIN parties p ON p.id = pc.party_id
         LEFT JOIN quotas q ON q.id = pc.quota_id
         WHERE p.election_id = $1
         ORDER BY p.party_name, pc.candidate_order`,
        [electionId],
      ),
      query(
        `SELECT dl.id,
                dl.list_name AS "listName",
                dl.list_code AS "listCode",
                dl.description,
                dl.district_id AS "districtId",
                d.name AS "districtName",
                d.code AS "districtCode",
                COUNT(dlc.id)::int AS "candidatesCount"
         FROM district_lists dl
         JOIN districts d ON d.id = dl.district_id
         LEFT JOIN district_list_candidates dlc ON dlc.district_list_id = dl.id
         WHERE dl.election_id = $1
         GROUP BY dl.id, d.id
         ORDER BY d.name, dl.list_name`,
        [electionId],
      ),
      query(
        `SELECT dlc.id,
                dlc.district_list_id AS "districtListId",
                dl.list_name AS "listName",
                d.name AS "districtName",
                dlc.full_name AS "fullName",
                dlc.national_id AS "nationalId",
                dlc.candidate_order AS "candidateOrder",
                dlc.candidate_number AS "candidateNumber",
                dlc.gender,
                dlc.photo_url AS "photoUrl",
                q.name AS "quotaName"
         FROM district_list_candidates dlc
         JOIN district_lists dl ON dl.id = dlc.district_list_id
         JOIN districts d ON d.id = dl.district_id
         LEFT JOIN quotas q ON q.id = dlc.quota_id
         WHERE dl.election_id = $1
         ORDER BY d.name, dl.list_name, dlc.candidate_order`,
        [electionId],
      ),
      query(
        `SELECT id,
                full_name AS "fullName",
                national_id AS "nationalId",
                gender,
                birth_date AS "birthDate",
                phone_number AS "phoneNumber",
                email,
                status,
                has_voted AS "hasVoted",
                verified_face AS "verifiedFace",
                district_id AS "districtId",
                created_at AS "createdAt"
         FROM voters
         WHERE election_id = $1
         ORDER BY created_at DESC`,
        [electionId],
      ),
      getElectionSetupSummary(electionId),
    ]);

  return {
    election,
    districts: districts.rows,
    quotas: quotas.rows,
    parties: parties.rows,
    partyCandidates: partyCandidates.rows,
    districtLists: districtLists.rows,
    districtListCandidates: districtListCandidates.rows,
    voters: voters.rows,
    setupSummary,
  };
}

export async function getBallotOptions(electionId: string, voterNationalId?: string) {
  if (!usePostgres) {
    return {
      election: null,
      voterDistrict: null,
      districtCandidateSelectionCount: 0,
      parties: [],
      districtLists: [],
    };
  }

  const electionResult = await query(
    `SELECT id,
            title,
            status,
            enable_parties AS "enableParties",
            enable_district_lists AS "enableDistrictLists",
            district_candidate_selection_count AS "districtCandidateSelectionCount",
            total_national_party_seats AS "totalNationalPartySeats"
     FROM elections
     WHERE id = $1
     LIMIT 1`,
    [electionId],
  );
  const election = electionResult.rows[0];
  if (!election) {
    throw new Error('Election not found');
  }

  const partiesResult = await query(
    `SELECT p.id,
            p.party_name AS name,
            p.party_code AS code,
            p.logo_url AS "logoUrl",
            p.description,
            COALESCE(
              json_agg(
                json_build_object(
                  'id', pc.id,
                  'fullName', pc.full_name,
                  'candidateOrder', pc.candidate_order,
                  'gender', pc.gender,
                  'photoUrl', pc.photo_url
                )
                ORDER BY pc.candidate_order
              ) FILTER (WHERE pc.id IS NOT NULL),
              '[]'::json
            ) AS candidates
     FROM parties p
     LEFT JOIN party_candidates pc ON pc.party_id = p.id
     WHERE p.election_id = $1
     GROUP BY p.id
     ORDER BY p.party_name`,
    [electionId],
  );

  let voterDistrict: any = null;
  if (voterNationalId) {
    const voterResult = await query(
      `SELECT v.district_id AS id,
              d.name,
              d.code,
              d.seats_count AS "seatsCount",
              v.full_name AS "voterName"
       FROM voters v
       JOIN districts d ON d.id = v.district_id
       WHERE v.election_id = $1 AND v.national_id = $2
       LIMIT 1`,
      [electionId, voterNationalId],
    );
    voterDistrict = voterResult.rows[0] || null;
  }

  const districtListsResult = await query(
    `SELECT dl.id,
            dl.list_name AS name,
            dl.list_code AS code,
            dl.description,
            dl.district_id AS "districtId",
            d.name AS "districtName",
            d.code AS "districtCode",
            d.seats_count AS "districtSeatsCount",
            COALESCE(
              json_agg(
                json_build_object(
                  'id', dlc.id,
                  'fullName', dlc.full_name,
                  'candidateOrder', dlc.candidate_order,
                  'candidateNumber', dlc.candidate_number,
                  'gender', dlc.gender,
                  'photoUrl', dlc.photo_url
                )
                ORDER BY dlc.candidate_order
              ) FILTER (WHERE dlc.id IS NOT NULL),
              '[]'::json
            ) AS candidates
     FROM district_lists dl
     JOIN districts d ON d.id = dl.district_id
     LEFT JOIN district_list_candidates dlc ON dlc.district_list_id = dl.id
     WHERE dl.election_id = $1
       AND ($2::uuid IS NULL OR dl.district_id = $2::uuid)
     GROUP BY dl.id, d.id
     ORDER BY d.name, dl.list_name`,
    [electionId, voterDistrict?.id || null],
  );

  return {
    election,
    voterDistrict,
    districtCandidateSelectionCount:
      election.districtCandidateSelectionCount ||
      voterDistrict?.seatsCount ||
      districtListsResult.rows[0]?.districtSeatsCount ||
      1,
    parties: partiesResult.rows,
    districtLists: districtListsResult.rows,
  };
}
