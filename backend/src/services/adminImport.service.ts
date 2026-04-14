import * as XLSX from 'xlsx';
import { query, withTransaction } from '../db/pool.js';
import { resolveAdminId } from './election.service.js';

export const IMPORT_FILE_ORDER = [
  'districts',
  'quotas',
  'parties',
  'party_candidates',
  'district_lists',
  'district_list_candidates',
  'voters',
] as const;

export const IMPORT_TEMPLATES: Record<string, string[]> = {
  districts: ['district_name', 'district_code', 'seats_count'],
  quotas: ['district_code', 'quota_name', 'description'],
  parties: ['party_name', 'party_code', 'logo_url', 'description'],
  party_candidates: [
    'party_code',
    'full_name',
    'national_id',
    'candidate_order',
    'gender',
    'quota_name',
    'photo_url',
  ],
  district_lists: ['district_code', 'list_name', 'list_code', 'description'],
  district_list_candidates: [
    'district_code',
    'list_code',
    'full_name',
    'national_id',
    'candidate_order',
    'candidate_number',
    'gender',
    'quota_name',
    'photo_url',
  ],
  voters: ['district_code', 'full_name', 'national_id', 'gender', 'birth_date', 'phone_number', 'email', 'status'],
};

const DELETION_ORDER = [
  'district_candidate_votes',
  'district_list_votes',
  'party_votes',
  'voting_tokens',
  'face_verifications',
  'district_list_candidates',
  'party_candidates',
  'voters',
  'district_lists',
  'parties',
  'quotas',
  'districts',
  'elections',
] as const;

interface UploadedImportFile {
  buffer: Buffer;
  originalname: string;
}

type ImportKind = keyof typeof IMPORT_TEMPLATES;
type RowRecord = Record<string, unknown>;

interface ImportError {
  rowNumber: number;
  message: string;
}

interface ImportSummary {
  entity: ImportKind;
  fileName: string;
  insertedRows: number;
  skippedRows: number;
  errors: ImportError[];
  batchId?: string;
  electionId?: string | null;
}

interface RowImportResult {
  status: 'inserted' | 'skipped';
  targetTable?: string;
  targetId?: string;
  electionId?: string | null;
}

function parseSpreadsheet(file: UploadedImportFile) {
  const workbook = XLSX.read(file.buffer, {
    type: 'buffer',
    raw: false,
    cellDates: true,
  });

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('The uploaded file does not contain any sheet');
  }

  const sheet = workbook.Sheets[firstSheetName];
  return XLSX.utils.sheet_to_json<RowRecord>(sheet, {
    defval: '',
    raw: false,
  });
}

function normalizeValue(value: unknown) {
  return String(value ?? '').trim();
}

function normalizeNullable(value: unknown) {
  const normalized = normalizeValue(value);
  return normalized ? normalized : null;
}

function normalizeInteger(value: unknown) {
  const normalized = normalizeValue(value);
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeVoterStatus(value: unknown) {
  const normalized = normalizeValue(value).toLowerCase();
  if (['eligible', 'pending_verification', 'verified', 'voted', 'blocked'].includes(normalized)) {
    return normalized;
  }
  return 'eligible';
}

function normalizeGender(value: unknown) {
  const normalized = normalizeValue(value).toLowerCase();
  if (['male', 'm', 'ذكر'].includes(normalized)) return 'male';
  if (['female', 'f', 'أنثى', 'انثى'].includes(normalized)) return 'female';
  return null;
}

function normalizeDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  const normalized = normalizeValue(value);
  if (!normalized) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized;

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date value "${normalized}". Use YYYY-MM-DD`);
  }

  return parsed.toISOString().slice(0, 10);
}

async function lookupElectionIdByTitle(client: any, title: string) {
  const result = await client.query(
    `SELECT id
     FROM elections
     WHERE lower(title) = lower($1)
     LIMIT 1`,
    [title],
  );
  return (result.rows[0] as { id: string } | undefined)?.id || null;
}

async function assertElectionExists(client: any, electionId: string) {
  const result = await client.query(
    `SELECT id
     FROM elections
     WHERE id = $1
     LIMIT 1`,
    [electionId],
  );

  if (!result.rows[0]) {
    throw new Error('Selected election was not found');
  }

  return electionId;
}

async function resolveImportElectionId(client: any, row: RowRecord, selectedElectionId?: string | null) {
  if (selectedElectionId) return selectedElectionId;

  const electionTitle = normalizeValue(row.election_title);
  if (!electionTitle) {
    throw new Error('election_title is required when no election is selected for the import');
  }

  const electionId = await lookupElectionIdByTitle(client, electionTitle);
  if (!electionId) throw new Error(`Election "${electionTitle}" was not found`);
  return electionId;
}

async function lookupDistrict(client: any, electionId: string, districtCode: string) {
  const result = await client.query(
    `SELECT id, name
     FROM districts
     WHERE election_id = $1 AND code = $2
     LIMIT 1`,
    [electionId, districtCode],
  );
  return (result.rows[0] as { id: string; name: string } | undefined) || null;
}

async function lookupQuota(client: any, electionId: string, districtId: string | null, quotaName: string | null) {
  if (!quotaName) return null;
  const result = await client.query(
    `SELECT id
     FROM quotas
     WHERE election_id = $1
       AND lower(name) = lower($2)
       AND (
         ($3::uuid IS NULL AND district_id IS NULL)
         OR district_id = $3::uuid
         OR district_id IS NULL
       )
     ORDER BY district_id NULLS LAST
     LIMIT 1`,
    [electionId, quotaName, districtId],
  );
  return (result.rows[0] as { id: string } | undefined)?.id || null;
}

async function lookupParty(client: any, electionId: string, partyCode: string) {
  const result = await client.query(
    `SELECT id
     FROM parties
     WHERE election_id = $1 AND party_code = $2
     LIMIT 1`,
    [electionId, partyCode],
  );
  return (result.rows[0] as { id: string } | undefined)?.id || null;
}

async function lookupDistrictList(client: any, electionId: string, districtId: string, listCode: string) {
  const result = await client.query(
    `SELECT id
     FROM district_lists
     WHERE election_id = $1
       AND district_id = $2
       AND list_code = $3
     LIMIT 1`,
    [electionId, districtId, listCode],
  );
  return (result.rows[0] as { id: string } | undefined)?.id || null;
}

async function processRows(
  kind: ImportKind,
  file: UploadedImportFile,
  actorEmail: string | undefined,
  selectedElectionId: string | null | undefined,
  rowHandler: (
    client: any,
    row: RowRecord,
    rowNumber: number,
    adminId: string,
    resolvedElectionId?: string | null,
  ) => Promise<RowImportResult>,
) {
  const rows = parseSpreadsheet(file);
  const adminId = await resolveAdminId(actorEmail);
  if (!adminId) {
    throw new Error('Create at least one admin before importing election data');
  }

  const summary: ImportSummary = {
    entity: kind,
    fileName: file.originalname,
    insertedRows: 0,
    skippedRows: 0,
    errors: [],
    electionId: null,
  };

  await withTransaction(async (client) => {
    const resolvedElectionId = selectedElectionId
      ? await assertElectionExists(client, selectedElectionId)
      : null;
    const batchInsert = await client.query(
      `INSERT INTO import_batches (entity_type, file_name, actor_admin_id)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [kind, file.originalname, adminId],
    );
    const batchId = batchInsert.rows[0].id as string;
    summary.batchId = batchId;
    const electionIds = new Set<string>();

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const rowNumber = index + 2;
      const savepointName = `import_row_${index + 1}`;
      await client.query(`SAVEPOINT ${savepointName}`);
      try {
        const outcome = await rowHandler(client, row, rowNumber, adminId, resolvedElectionId);
        if (outcome.electionId) {
          electionIds.add(outcome.electionId);
        }

        if (outcome.status === 'inserted') {
          summary.insertedRows += 1;

          if (outcome.targetTable && outcome.targetId) {
            await client.query(
              `INSERT INTO import_batch_items (batch_id, target_table, target_id)
               VALUES ($1, $2, $3)`,
              [batchId, outcome.targetTable, outcome.targetId],
            );
          }
        } else {
          summary.skippedRows += 1;
        }

        await client.query(`RELEASE SAVEPOINT ${savepointName}`);
      } catch (error) {
        await client.query(`ROLLBACK TO SAVEPOINT ${savepointName}`);
        await client.query(`RELEASE SAVEPOINT ${savepointName}`);
        summary.skippedRows += 1;
        summary.errors.push({
          rowNumber,
          message: error instanceof Error ? error.message : 'Unknown import error',
        });
      }
    }

    summary.electionId = electionIds.size === 1 ? Array.from(electionIds)[0] : null;

    await client.query(
      `UPDATE import_batches
       SET inserted_rows = $2,
           skipped_rows = $3,
           errors_json = $4::jsonb,
           election_id = $5
       WHERE id = $1`,
      [batchId, summary.insertedRows, summary.skippedRows, JSON.stringify(summary.errors), summary.electionId],
    );

    await client.query(
      `INSERT INTO audit_logs (actor_type, actor_id, action_type, target_table, target_id, details_json)
       VALUES ('admin', $1, 'admin_import_completed', 'import_batches', $2, $3::jsonb)`,
      [adminId, batchId, JSON.stringify(summary)],
    );
  });

  return summary;
}

export async function importSpreadsheet(
  kind: ImportKind,
  file: UploadedImportFile,
  actorEmail?: string,
  selectedElectionId?: string | null,
) {
  switch (kind) {
    case 'districts':
      return processRows(kind, file, actorEmail, selectedElectionId, async (client, row, _rowNumber, _adminId, resolvedElectionId) => {
        const districtName = normalizeValue(row.district_name);
        const districtCode = normalizeValue(row.district_code);
        const seatsCount = normalizeInteger(row.seats_count);
        if (!districtName || !districtCode || !seatsCount) {
          throw new Error('district_name, district_code, and seats_count are required');
        }

        const electionId = await resolveImportElectionId(client, row, resolvedElectionId);

        const inserted = await client.query(
          `INSERT INTO districts (election_id, name, code, seats_count)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (election_id, code) DO NOTHING
           RETURNING id`,
          [electionId, districtName, districtCode, seatsCount],
        );

        const id = (inserted.rows[0] as { id: string } | undefined)?.id;
        return { status: id ? 'inserted' : 'skipped', targetTable: id ? 'districts' : undefined, targetId: id, electionId };
      });

    case 'quotas':
      return processRows(kind, file, actorEmail, selectedElectionId, async (client, row, _rowNumber, _adminId, resolvedElectionId) => {
        const quotaName = normalizeValue(row.quota_name);
        const districtCode = normalizeNullable(row.district_code);
        if (!quotaName) throw new Error('quota_name is required');

        const electionId = await resolveImportElectionId(client, row, resolvedElectionId);

        let districtId: string | null = null;
        if (districtCode) {
          const district = await lookupDistrict(client, electionId, districtCode);
          if (!district) throw new Error(`District "${districtCode}" was not found`);
          districtId = district.id;
        }

        const inserted = await client.query(
          `INSERT INTO quotas (election_id, district_id, name, description)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT DO NOTHING
           RETURNING id`,
          [electionId, districtId, quotaName, normalizeNullable(row.description)],
        );

        const id = (inserted.rows[0] as { id: string } | undefined)?.id;
        return { status: id ? 'inserted' : 'skipped', targetTable: id ? 'quotas' : undefined, targetId: id, electionId };
      });

    case 'parties':
      return processRows(kind, file, actorEmail, selectedElectionId, async (client, row, _rowNumber, _adminId, resolvedElectionId) => {
        const partyName = normalizeValue(row.party_name);
        const partyCode = normalizeValue(row.party_code);
        if (!partyName || !partyCode) {
          throw new Error('party_name and party_code are required');
        }

        const electionId = await resolveImportElectionId(client, row, resolvedElectionId);

        const inserted = await client.query(
          `INSERT INTO parties (election_id, party_name, party_code, logo_url, description)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (election_id, party_code) DO NOTHING
           RETURNING id`,
          [electionId, partyName, partyCode, normalizeNullable(row.logo_url), normalizeNullable(row.description)],
        );

        const id = (inserted.rows[0] as { id: string } | undefined)?.id;
        return { status: id ? 'inserted' : 'skipped', targetTable: id ? 'parties' : undefined, targetId: id, electionId };
      });

    case 'party_candidates':
      return processRows(kind, file, actorEmail, selectedElectionId, async (client, row, _rowNumber, _adminId, resolvedElectionId) => {
        const partyCode = normalizeValue(row.party_code);
        const fullName = normalizeValue(row.full_name);
        const nationalId = normalizeValue(row.national_id);
        const candidateOrder = normalizeInteger(row.candidate_order);
        const gender = normalizeGender(row.gender);
        if (!partyCode || !fullName || !nationalId || !candidateOrder || !gender) {
          throw new Error('Missing required party candidate fields');
        }

        const electionId = await resolveImportElectionId(client, row, resolvedElectionId);
        const partyId = await lookupParty(client, electionId, partyCode);
        if (!partyId) throw new Error(`Party "${partyCode}" was not found`);
        const quotaId = await lookupQuota(client, electionId, null, normalizeNullable(row.quota_name));

        const inserted = await client.query(
          `INSERT INTO party_candidates (
             party_id, full_name, national_id, candidate_order, gender, quota_id, photo_url
           )
           VALUES ($1, $2, $3, $4, $5::candidate_gender, $6, $7)
           ON CONFLICT DO NOTHING
           RETURNING id`,
          [partyId, fullName, nationalId, candidateOrder, gender, quotaId, normalizeNullable(row.photo_url)],
        );

        const id = (inserted.rows[0] as { id: string } | undefined)?.id;
        return {
          status: id ? 'inserted' : 'skipped',
          targetTable: id ? 'party_candidates' : undefined,
          targetId: id,
          electionId,
        };
      });

    case 'district_lists':
      return processRows(kind, file, actorEmail, selectedElectionId, async (client, row, _rowNumber, _adminId, resolvedElectionId) => {
        const districtCode = normalizeValue(row.district_code);
        const listName = normalizeValue(row.list_name);
        const listCode = normalizeValue(row.list_code);
        if (!districtCode || !listName || !listCode) {
          throw new Error('district_code, list_name, and list_code are required');
        }

        const electionId = await resolveImportElectionId(client, row, resolvedElectionId);
        const district = await lookupDistrict(client, electionId, districtCode);
        if (!district) throw new Error(`District "${districtCode}" was not found`);

        const inserted = await client.query(
          `INSERT INTO district_lists (election_id, district_id, list_name, list_code, description)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (election_id, district_id, list_code) DO NOTHING
           RETURNING id`,
          [electionId, district.id, listName, listCode, normalizeNullable(row.description)],
        );

        const id = (inserted.rows[0] as { id: string } | undefined)?.id;
        return {
          status: id ? 'inserted' : 'skipped',
          targetTable: id ? 'district_lists' : undefined,
          targetId: id,
          electionId,
        };
      });

    case 'district_list_candidates':
      return processRows(kind, file, actorEmail, selectedElectionId, async (client, row, _rowNumber, _adminId, resolvedElectionId) => {
        const districtCode = normalizeValue(row.district_code);
        const listCode = normalizeValue(row.list_code);
        const fullName = normalizeValue(row.full_name);
        const nationalId = normalizeValue(row.national_id);
        const candidateOrder = normalizeInteger(row.candidate_order);
        const candidateNumber = normalizeInteger(row.candidate_number);
        const gender = normalizeGender(row.gender);
        if (!districtCode || !listCode || !fullName || !nationalId || !candidateOrder || !gender) {
          throw new Error('Missing required district list candidate fields');
        }

        const electionId = await resolveImportElectionId(client, row, resolvedElectionId);
        const district = await lookupDistrict(client, electionId, districtCode);
        if (!district) throw new Error(`District "${districtCode}" was not found`);
        const districtListId = await lookupDistrictList(client, electionId, district.id, listCode);
        if (!districtListId) throw new Error(`District list "${listCode}" was not found`);
        const quotaId = await lookupQuota(client, electionId, district.id, normalizeNullable(row.quota_name));

        const inserted = await client.query(
          `INSERT INTO district_list_candidates (
             district_list_id, full_name, national_id, candidate_order, candidate_number, gender, quota_id, photo_url
           )
           VALUES ($1, $2, $3, $4, $5, $6::candidate_gender, $7, $8)
           ON CONFLICT DO NOTHING
           RETURNING id`,
          [
            districtListId,
            fullName,
            nationalId,
            candidateOrder,
            candidateNumber,
            gender,
            quotaId,
            normalizeNullable(row.photo_url),
          ],
        );

        const id = (inserted.rows[0] as { id: string } | undefined)?.id;
        return {
          status: id ? 'inserted' : 'skipped',
          targetTable: id ? 'district_list_candidates' : undefined,
          targetId: id,
          electionId,
        };
      });

    case 'voters':
      return processRows(kind, file, actorEmail, selectedElectionId, async (client, row, _rowNumber, _adminId, resolvedElectionId) => {
        const districtCode = normalizeValue(row.district_code);
        const fullName = normalizeValue(row.full_name);
        const nationalId = normalizeValue(row.national_id);
        const gender = normalizeGender(row.gender);
        const birthDate = normalizeDate(row.birth_date);
        if (!districtCode || !fullName || !nationalId) {
          throw new Error('district_code, full_name, and national_id are required');
        }

        const electionId = await resolveImportElectionId(client, row, resolvedElectionId);
        const district = await lookupDistrict(client, electionId, districtCode);
        if (!district) throw new Error(`District "${districtCode}" was not found`);

        const inserted = await client.query(
          `INSERT INTO voters (
             election_id, district_id, full_name, national_id, gender, birth_date, phone_number, email, status
           )
           VALUES ($1, $2, $3, $4, $5::candidate_gender, $6::date, $7, $8, $9::voter_status)
           ON CONFLICT (election_id, national_id) DO NOTHING
           RETURNING id`,
          [
            electionId,
            district.id,
            fullName,
            nationalId,
            gender,
            birthDate,
            normalizeNullable(row.phone_number),
            normalizeNullable(row.email),
            normalizeVoterStatus(row.status),
          ],
        );

        const id = (inserted.rows[0] as { id: string } | undefined)?.id;
        return { status: id ? 'inserted' : 'skipped', targetTable: id ? 'voters' : undefined, targetId: id, electionId };
      });
  }
}

export async function listImportBatches(electionId?: string) {
  const result = await query(
    `SELECT ib.id,
            ib.entity_type AS "entityType",
            ib.file_name AS "fileName",
            ib.status,
            ib.inserted_rows AS "insertedRows",
            ib.skipped_rows AS "skippedRows",
            ib.errors_json AS errors,
            ib.rollback_note AS "rollbackNote",
            ib.rolled_back_at AS "rolledBackAt",
            ib.created_at AS "createdAt",
            ib.election_id AS "electionId"
     FROM import_batches ib
     WHERE ($1::uuid IS NULL OR ib.election_id = $1::uuid)
     ORDER BY ib.created_at DESC`,
    [electionId || null],
  );

  return result.rows;
}

export async function rollbackImportBatch(batchId: string, actorEmail?: string) {
  const adminId = await resolveAdminId(actorEmail);
  if (!adminId) {
    throw new Error('Admin account is required to rollback an import batch');
  }

  const targetTableWhitelist = new Set(DELETION_ORDER);

  return withTransaction(async (client) => {
    const batchResult = await client.query(
      `SELECT id, entity_type, file_name, status, election_id
       FROM import_batches
       WHERE id = $1
       FOR UPDATE`,
      [batchId],
    );
    const batch = batchResult.rows[0];
    if (!batch) throw new Error('Import batch not found');
    if (batch.status === 'rolled_back') throw new Error('This import batch has already been rolled back');

    const itemsResult = await client.query(
      `SELECT target_table AS "targetTable", target_id AS "targetId"
       FROM import_batch_items
       WHERE batch_id = $1`,
      [batchId],
    );

    const items = itemsResult.rows as Array<{ targetTable: string; targetId: string }>;
    const grouped = new Map<string, string[]>();

    for (const item of items) {
      if (!targetTableWhitelist.has(item.targetTable as (typeof DELETION_ORDER)[number])) continue;
      const current = grouped.get(item.targetTable) || [];
      current.push(item.targetId);
      grouped.set(item.targetTable, current);
    }

    for (const table of DELETION_ORDER) {
      const ids = grouped.get(table);
      if (!ids?.length) continue;
      await client.query(`DELETE FROM ${table} WHERE id = ANY($1::uuid[])`, [ids]);
    }

    await client.query(
      `UPDATE import_batches
       SET status = 'rolled_back',
           rollback_note = $2,
           rolled_back_at = now()
       WHERE id = $1`,
      [batchId, 'Deleted all rows imported by this batch'],
    );

    await client.query(
      `INSERT INTO audit_logs (actor_type, actor_id, action_type, target_table, target_id, details_json)
       VALUES ('admin', $1, 'admin_import_rolled_back', 'import_batches', $2, $3::jsonb)`,
      [
        adminId,
        batchId,
        JSON.stringify({
          entityType: batch.entity_type,
          fileName: batch.file_name,
          electionId: batch.election_id,
          deletedItems: items.length,
        }),
      ],
    );

    return { success: true, batchId, deletedItems: items.length };
  });
}

export async function resetSystemData(actorEmail?: string) {
  const adminId = await resolveAdminId(actorEmail);
  if (!adminId) {
    throw new Error('Admin account is required to reset the database');
  }

  await withTransaction(async (client) => {
    await client.query(
      `TRUNCATE TABLE
         import_batch_items,
         import_batches,
         district_candidate_votes,
         district_list_votes,
         party_votes,
         ballots,
         voting_tokens,
         face_verifications,
         district_list_candidates,
         district_lists,
         party_candidates,
         parties,
         quotas,
         voters,
         districts,
         elections,
         sanad_auth_requests,
         system_settings,
         candidates,
         votes,
         audit_logs
       RESTART IDENTITY CASCADE`,
    );

    await client.query(
      `INSERT INTO audit_logs (actor_type, actor_id, action_type, target_table, target_id, details_json)
       VALUES ('admin', $1, 'admin_reset_system_data', 'audit_logs', NULL, $2::jsonb)`,
      [adminId, JSON.stringify({ preservedTable: 'admins' })],
    );
  });

  return { success: true, preservedTables: ['admins'] };
}
