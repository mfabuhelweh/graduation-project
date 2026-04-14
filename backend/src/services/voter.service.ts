import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '../config/firebaseAdmin.js';
import { env } from '../config/env.js';
import { createId, memoryStore } from '../data/memoryStore.js';
import { query, usePostgres, withTransaction } from '../db/pool.js';
import type { AuthenticatedUser } from '../middleware/authMiddleware.js';
import type { Voter } from '../models/voter.model.js';
import { addAuditLog } from './audit.service.js';
import { isElectionActiveForVoting } from '../utils/electionState.js';
import { createOpaqueToken, hashToken } from '../utils/token.js';

const collection = adminDb.collection('voters');

function mapVoterRow(row: any) {
  return {
    id: row.id,
    electionId: row.election_id,
    districtId: row.district_id,
    fullName: row.full_name,
    nationalId: row.national_id,
    gender: row.gender || undefined,
    birthDate: row.birth_date || undefined,
    phoneNumber: row.phone_number,
    email: row.email,
    idCardImageUrl: row.id_card_image_url,
    faceTemplateHash: row.face_template_hash,
    hasVoted: row.has_voted,
    verifiedFace: row.verified_face,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listVoters() {
  if (env.enableMemoryStore) {
    return Array.from(memoryStore.voters.values()).sort((a, b) =>
      String(b.createdAt).localeCompare(String(a.createdAt)),
    );
  }

  if (usePostgres) {
    const result = await query('SELECT * FROM voters ORDER BY created_at DESC');
    return result.rows.map(mapVoterRow);
  }

  const snapshot = await collection.orderBy('createdAt', 'desc').get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function getVoterByNationalId(nationalId: string, electionId?: string) {
  if (env.enableMemoryStore) {
    return (
      Array.from(memoryStore.voters.values()).find(
        (voter) => voter.nationalId === nationalId && (!electionId || voter.electionId === electionId),
      ) || null
    );
  }

  if (usePostgres) {
    const result = await query(
      `SELECT *
       FROM voters
       WHERE national_id = $1
         AND ($2::uuid IS NULL OR election_id = $2::uuid)
       ORDER BY created_at DESC
       LIMIT 1`,
      [nationalId, electionId || null],
    );
    return result.rows[0] ? mapVoterRow(result.rows[0]) : null;
  }

  const snapshot = await collection.where('nationalId', '==', nationalId).limit(1).get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
}

export async function getCurrentVoterProfile(authenticatedUser: AuthenticatedUser) {
  if (
    authenticatedUser.role !== "voter" ||
    !authenticatedUser.nationalId ||
    !authenticatedUser.electionId
  ) {
    throw new Error("Voter authentication is required");
  }

  if (!usePostgres) {
    const fallback = await getVoterByNationalId(
      authenticatedUser.nationalId,
      authenticatedUser.electionId
    );
    if (!fallback) return null;

    return {
      ...fallback,
      role: "voter",
      email: fallback.email || authenticatedUser.email || "",
      uid: authenticatedUser.uid,
      electionTitle: undefined,
      districtName: undefined,
      districtCode: undefined
    };
  }

  const result = await query(
    `SELECT v.*,
            d.name AS district_name,
            d.code AS district_code,
            e.title AS election_title
     FROM voters v
     JOIN districts d ON d.id = v.district_id
     JOIN elections e ON e.id = v.election_id
     WHERE v.election_id = $1
       AND v.national_id = $2
     LIMIT 1`,
    [authenticatedUser.electionId, authenticatedUser.nationalId]
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    ...mapVoterRow(row),
    uid: authenticatedUser.uid,
    role: "voter",
    email: row.email || authenticatedUser.email || "",
    districtName: row.district_name,
    districtCode: row.district_code,
    electionTitle: row.election_title
  };
}

export async function createVoter(data: Voter, actor = 'system') {
  const existing = await getVoterByNationalId(data.nationalId, data.electionId);
  if (existing) {
    throw new Error('Voter already exists');
  }

  if (env.enableMemoryStore) {
    const id = createId('voter');
    const now = new Date().toISOString();
    const voter = { ...data, id, hasVoted: data.hasVoted ?? false, createdAt: now, updatedAt: now };
    memoryStore.voters.set(id, voter);
    await addAuditLog('voter.created', actor, `Created voter ${data.nationalId}`);
    return voter;
  }

  if (usePostgres) {
    if (!data.electionId || !data.districtId) {
      throw new Error('electionId and districtId are required to create a voter');
    }

    const result = await query(
      `INSERT INTO voters (
         election_id, district_id, full_name, national_id, gender, birth_date, phone_number, email,
         id_card_image_url, face_template_hash, has_voted, verified_face, status
       )
       VALUES ($1, $2, $3, $4, $5::candidate_gender, $6::date, $7, $8, $9, $10, COALESCE($11, false), COALESCE($12, false), COALESCE($13::voter_status, 'eligible'))
       RETURNING *`,
      [
        data.electionId,
        data.districtId,
        data.fullName,
        data.nationalId,
        (data as any).gender || null,
        (data as any).birthDate || null,
        (data as any).phoneNumber || null,
        (data as any).email || null,
        (data as any).idCardImageUrl || null,
        (data as any).faceTemplateHash || null,
        data.hasVoted ?? false,
        (data as any).verifiedFace ?? false,
        (data as any).status || 'eligible',
      ],
    );

    await addAuditLog('voter.created', actor, `Created voter ${data.nationalId}`);
    return mapVoterRow(result.rows[0]);
  }

  const now = Timestamp.now();
  const docRef = await collection.add({
    ...data,
    hasVoted: data.hasVoted ?? false,
    createdAt: now,
    updatedAt: now,
  });

  await addAuditLog('voter.created', actor, `Created voter ${data.nationalId}`);
  return { id: docRef.id, ...(await docRef.get()).data() };
}

export async function updateVoter(id: string, data: Partial<Voter>, actor = 'system') {
  if (env.enableMemoryStore) {
    const current = memoryStore.voters.get(id);
    if (!current) return null;
    const updated = { ...current, ...data, updatedAt: new Date().toISOString() };
    memoryStore.voters.set(id, updated);
    await addAuditLog('voter.updated', actor, `Updated voter ${id}`);
    return updated;
  }

  if (usePostgres) {
    const result = await query(
      `UPDATE voters
       SET full_name = COALESCE($2, full_name),
           national_id = COALESCE($3, national_id),
           gender = COALESCE($4::candidate_gender, gender),
           birth_date = COALESCE($5::date, birth_date),
           phone_number = COALESCE($6, phone_number),
           email = COALESCE($7, email),
           id_card_image_url = COALESCE($8, id_card_image_url),
           face_template_hash = COALESCE($9, face_template_hash),
           has_voted = COALESCE($10, has_voted),
           verified_face = COALESCE($11, verified_face),
           status = COALESCE($12::voter_status, status),
           updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [
        id,
        data.fullName || null,
        data.nationalId || null,
        (data as any).gender || null,
        (data as any).birthDate || null,
        (data as any).phoneNumber || null,
        (data as any).email || null,
        (data as any).idCardImageUrl || null,
        (data as any).faceTemplateHash || null,
        data.hasVoted ?? null,
        (data as any).verifiedFace ?? null,
        (data as any).status || null,
      ],
    );
    if (!result.rows[0]) return null;
    await addAuditLog('voter.updated', actor, `Updated voter ${id}`);
    return mapVoterRow(result.rows[0]);
  }

  await collection.doc(id).update({
    ...data,
    updatedAt: Timestamp.now(),
  });

  await addAuditLog('voter.updated', actor, `Updated voter ${id}`);
  const doc = await collection.doc(id).get();
  return { id: doc.id, ...doc.data() };
}

export async function verifyFaceAndIssueToken(
  data: {
    electionId: string;
    nationalId: string;
    idCardImageUrl?: string;
    liveCaptureImageUrl?: string;
  },
  authenticatedUser: AuthenticatedUser,
  actor = 'system',
) {
  if (!data.electionId || !data.nationalId) {
    throw new Error('electionId and nationalId are required');
  }

  if (
    authenticatedUser.role !== 'voter' ||
    !authenticatedUser.nationalId ||
    !authenticatedUser.electionId
  ) {
    throw new Error('Voter authentication is required');
  }

  if (
    authenticatedUser.nationalId !== data.nationalId ||
    authenticatedUser.electionId !== data.electionId
  ) {
    throw new Error('Authenticated voter does not match the requested ballot');
  }

  if (!env.enableDevAuth) {
    throw new Error('Face verification is not configured on the server');
  }

  if (env.enableMemoryStore) {
    const voter = await getVoterByNationalId(data.nationalId, data.electionId);
    if (!voter) throw new Error('Voter is not registered');

    if ((voter as any).hasVoted) throw new Error('Voter has already voted');
    if ((voter as any).status === 'blocked') throw new Error('Voter is blocked');

    const rawToken = createOpaqueToken();
    await updateVoter((voter as any).id, { verifiedFace: true, status: 'verified' } as any, actor);
    await addAuditLog('token.issued', actor, `Issued memory voting token for ${data.electionId}`);
    return {
      success: true,
      score: 96,
      votingToken: rawToken,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };
  }

  if (!usePostgres) {
    throw new Error('Face verification token issuing requires PostgreSQL or memory mode');
  }

  const rawToken = createOpaqueToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  const score = 96;
  const passed = true;

  const result = await withTransaction(async (client) => {
    const voterResult = await client.query(
      `SELECT v.*,
              e.status AS election_status,
              e.start_at,
              e.end_at,
              d.name AS district_name,
              d.code AS district_code,
              d.seats_count
       FROM voters v
       JOIN elections e ON e.id = v.election_id
       JOIN districts d ON d.id = v.district_id
       WHERE v.election_id = $1 AND v.national_id = $2
       FOR UPDATE`,
      [data.electionId, data.nationalId],
    );
    const voter = voterResult.rows[0];

    if (!voter) throw new Error('Voter is not registered');
    if (
      !isElectionActiveForVoting({
        status: voter.election_status,
        startAt: voter.start_at,
        endAt: voter.end_at,
      })
    ) {
      throw new Error('Election is not active');
    }
    if (voter.status === 'blocked') throw new Error('Voter is blocked');
    if (voter.has_voted) throw new Error('Voter has already voted');

    await client.query(
      `INSERT INTO face_verifications (
         voter_id, id_card_image_url, live_capture_image_url, similarity_score, verification_result, verified_at
       )
       VALUES ($1, $2, $3, $4, $5::face_verification_result, CASE WHEN $5::text = 'passed' THEN now() ELSE NULL END)`,
      [
        voter.id,
        data.idCardImageUrl || voter.id_card_image_url || 'data:image/jpeg;base64,/9j/',
        data.liveCaptureImageUrl || 'data:image/jpeg;base64,/9j/',
        score,
        passed ? 'passed' : 'failed',
      ],
    );

    if (!passed) {
      await client.query(
        `INSERT INTO audit_logs (actor_type, actor_id, action_type, target_table, target_id, details_json)
         VALUES ('voter', $1, 'voter_face_failed', 'voters', $1, $2::jsonb)`,
        [voter.id, JSON.stringify({ score })],
      );
      return { issued: false };
    }

    await client.query(
      `UPDATE voting_tokens
       SET status = 'revoked', invalidated_at = now()
       WHERE voter_id = $1 AND election_id = $2 AND status = 'active'`,
      [voter.id, data.electionId],
    );

    await client.query(
      `UPDATE voters
       SET verified_face = true,
           status = 'verified',
           id_card_image_url = COALESCE($2, id_card_image_url),
           updated_at = now()
       WHERE id = $1`,
      [voter.id, data.idCardImageUrl || null],
    );

    await client.query(
      `INSERT INTO voting_tokens (voter_id, election_id, token_hash, token_expires_at, status)
       VALUES ($1, $2, $3, $4, 'active')`,
      [voter.id, data.electionId, tokenHash, expiresAt],
    );

    await client.query(
      `INSERT INTO audit_logs (actor_type, actor_id, action_type, target_table, target_id, details_json)
       VALUES ('voter', $1, 'token_issued', 'voting_tokens', NULL, $2::jsonb)`,
      [
        voter.id,
        JSON.stringify({
          electionId: data.electionId,
          expiresAt,
          districtId: voter.district_id,
          districtCode: voter.district_code,
        }),
      ],
    );

    return {
      issued: true,
      voterContext: {
        districtId: voter.district_id,
        districtName: voter.district_name,
        districtCode: voter.district_code,
        seatsCount: voter.seats_count,
      },
    };
  });

  if (!result.issued) {
    return { success: false, score, message: 'Face verification failed' };
  }

  return {
    success: true,
    score,
    votingToken: rawToken,
    expiresAt: expiresAt.toISOString(),
    voterContext: result.voterContext,
  };
}
