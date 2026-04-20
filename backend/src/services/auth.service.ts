import bcrypt from 'bcryptjs';
import { createHash, randomInt } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env.js';
import { VISIBLE_SYSTEM_ELECTION_TITLES } from '../constants/systemElections.js';
import { query, withTransaction } from '../db/pool.js';
import { createDefaultVoterPasswordHash, hashPassword } from '../utils/password.js';

export interface AuthTokenPayload {
  sub: string;
  email: string;
  role: 'admin' | 'voter';
  adminRole?: string;
  fullName?: string;
  nationalId?: string;
  electionId?: string;
}

interface AdminRow {
  id: string;
  email: string;
  full_name: string;
  role: string;
  password_hash: string;
  google_sub: string | null;
}

interface VoterRow {
  id: string;
  email: string;
  full_name: string;
  national_id: string;
  election_id: string;
  phone_number: string | null;
  password_hash: string | null;
  google_sub: string | null;
}

interface RegisterVoterInput {
  fullName: string;
  email: string;
  password: string;
  nationalId: string;
  electionId: string;
  districtId: string;
  phoneNumber?: string;
}

interface SanadAuthRequestRow {
  id: string;
  voter_id: string;
  national_id: string;
  phone_number_snapshot: string | null;
  request_reference: string;
  otp_hash: string;
  status: 'pending_otp' | 'otp_verified' | 'consumed' | 'expired' | 'cancelled';
  attempts_count: number;
  max_attempts: number;
  expires_at: string;
}

const googleClient = new OAuth2Client();

function signAuthToken(payload: AuthTokenPayload) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: '12h' });
}

function verifyPassword(password: string, passwordHash: string) {
  if (passwordHash.startsWith('$2a$') || passwordHash.startsWith('$2b$') || passwordHash.startsWith('$2y$')) {
    return bcrypt.compareSync(password, passwordHash);
  }

  return password === passwordHash;
}

function hashValue(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function maskPhoneNumber(phoneNumber?: string | null) {
  if (!phoneNumber) return '07XXXXXXXX';
  const clean = phoneNumber.replace(/\D/g, '');
  if (clean.length < 4) return '07XXXXXXXX';
  return `${clean.slice(0, 3)}******${clean.slice(-2)}`;
}

function createSanadReference() {
  return `SANAD-${Date.now().toString().slice(-6)}-${randomInt(100, 999)}`;
}

function buildAdminAuthResult(admin: AdminRow) {
  const token = signAuthToken({
    sub: admin.id,
    email: admin.email,
    role: 'admin',
    adminRole: admin.role,
    fullName: admin.full_name,
  });

  return {
    token,
    user: {
      id: admin.id,
      email: admin.email,
      role: 'admin' as const,
      adminRole: admin.role,
      displayName: admin.full_name,
      fullName: admin.full_name,
    },
  };
}

function buildVoterAuthResult(voter: VoterRow) {
  const token = signAuthToken({
    sub: voter.id,
    email: voter.email,
    role: 'voter',
    fullName: voter.full_name,
    nationalId: voter.national_id,
    electionId: voter.election_id,
  });

  return {
    token,
    user: {
      id: voter.id,
      email: voter.email,
      role: 'voter' as const,
      displayName: voter.full_name,
      fullName: voter.full_name,
      nationalId: voter.national_id,
      electionId: voter.election_id,
    },
  };
}

async function findAdminByEmail(email: string) {
  const result = await query<AdminRow>(
    `SELECT id, email, full_name, role, password_hash, google_sub
     FROM admins
     WHERE email = $1
     LIMIT 1`,
    [email],
  );

  return result.rows[0] || null;
}

async function findVoterByEmail(email: string) {
  const result = await query<VoterRow>(
    `SELECT id, email, full_name, national_id, election_id, phone_number, password_hash, google_sub
     FROM voters
     WHERE email = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [email],
  );

  return result.rows[0] || null;
}

async function findVoterForSanad(nationalId: string) {
  const result = await query<VoterRow>(
    `SELECT v.id,
            v.email,
            v.full_name,
            v.national_id,
            v.election_id,
            v.phone_number,
            v.password_hash,
            v.google_sub
     FROM voters v
     JOIN elections e ON e.id = v.election_id
     WHERE v.national_id = $1
     ORDER BY
       CASE
         WHEN e.title = ANY($2::text[]) THEN 0
         ELSE 1
       END,
       CASE e.status
         WHEN 'active' THEN 0
         WHEN 'scheduled' THEN 1
         ELSE 2
       END,
       e.created_at DESC,
       v.created_at DESC
     LIMIT 1`,
    [nationalId, [...VISIBLE_SYSTEM_ELECTION_TITLES]],
  );

  return result.rows[0] || null;
}

async function verifyGoogleIdToken(credential: string) {
  if (!env.googleClientId) {
    throw new Error('Google login is not configured on the server');
  }

  const audience = env.googleClientId
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience,
  });

  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email) {
    throw new Error('Google account payload is incomplete');
  }

  if (!payload.email_verified) {
    throw new Error('Google email is not verified');
  }

  return payload;
}

export async function loginAdmin(email: string, password: string) {
  const admin = await findAdminByEmail(email);
  if (!admin) {
    throw new Error('Invalid email or password');
  }

  if (!verifyPassword(password, admin.password_hash)) {
    throw new Error('Invalid email or password');
  }

  return buildAdminAuthResult(admin);
}

export async function loginByEmailPassword(email: string, password: string) {
  const admin = await findAdminByEmail(email);
  if (admin) {
    throw new Error('Admin accounts must sign in with Google');
  }

  const voter = await findVoterByEmail(email);
  if (!voter || !voter.password_hash) {
    throw new Error('Invalid email or password');
  }

  if (!verifyPassword(password, voter.password_hash)) {
    throw new Error('Invalid email or password');
  }

  return buildVoterAuthResult(voter);
}

export async function registerVoterAccount(input: RegisterVoterInput) {
  const passwordHash = await hashPassword(input.password);

  const voter = await withTransaction(async (client) => {
    const adminConflict = await client.query<{ id: string }>(
      `SELECT id
       FROM admins
       WHERE email = $1
       LIMIT 1`,
      [input.email],
    );
    if (adminConflict.rows[0]) {
      throw new Error('This email is already used by an admin account');
    }

    const voterConflict = await client.query<{ id: string }>(
      `SELECT id
       FROM voters
       WHERE email = $1
       LIMIT 1`,
      [input.email],
    );
    if (voterConflict.rows[0]) {
      throw new Error('This email is already registered');
    }

    const nationalConflict = await client.query<{ id: string }>(
      `SELECT id
       FROM voters
       WHERE election_id = $1 AND national_id = $2
       LIMIT 1`,
      [input.electionId, input.nationalId],
    );
    if (nationalConflict.rows[0]) {
      throw new Error('This national ID is already registered in the selected election');
    }

    const district = await client.query<{ id: string }>(
      `SELECT id
       FROM districts
       WHERE id = $1 AND election_id = $2
       LIMIT 1`,
      [input.districtId, input.electionId],
    );
    if (!district.rows[0]) {
      throw new Error('The selected district does not belong to the selected election');
    }

    const election = await client.query<{ id: string }>(
      `SELECT id
       FROM elections
       WHERE id = $1
       LIMIT 1`,
      [input.electionId],
    );
    if (!election.rows[0]) {
      throw new Error('The selected election was not found');
    }

    const inserted = await client.query<VoterRow>(
      `INSERT INTO voters (
         election_id,
         district_id,
         full_name,
         national_id,
         phone_number,
         email,
         password_hash,
         has_voted,
         verified_face,
         status
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, false, false, 'eligible')
       RETURNING id, email, full_name, national_id, election_id, phone_number, password_hash, google_sub`,
      [
        input.electionId,
        input.districtId,
        input.fullName,
        input.nationalId,
        input.phoneNumber || null,
        input.email,
        passwordHash,
      ],
    );

    await client.query(
      `INSERT INTO audit_logs (actor_type, actor_id, action_type, target_table, target_id, details_json)
       VALUES ('voter', $1, 'voter_registered', 'voters', $1, $2::jsonb)`,
      [
        inserted.rows[0].id,
        JSON.stringify({
          electionId: input.electionId,
          districtId: input.districtId,
          email: input.email,
        }),
      ],
    );

    return inserted.rows[0];
  });

  return buildVoterAuthResult(voter);
}

export async function loginWithGoogle(credential: string) {
  const googlePayload = await verifyGoogleIdToken(credential);
  const googleSub = googlePayload.sub;
  const email = googlePayload.email.toLowerCase();

  const adminByGoogle = await query<AdminRow>(
    `SELECT id, email, full_name, role, password_hash, google_sub
     FROM admins
     WHERE google_sub = $1
     LIMIT 1`,
    [googleSub],
  );
  if (adminByGoogle.rows[0]) {
    return buildAdminAuthResult(adminByGoogle.rows[0]);
  }

  const adminByEmail = await findAdminByEmail(email);
  if (adminByEmail) {
    if (!adminByEmail.google_sub) {
      await query(`UPDATE admins SET google_sub = $2 WHERE id = $1`, [adminByEmail.id, googleSub]);
      adminByEmail.google_sub = googleSub;
    }
    return buildAdminAuthResult(adminByEmail);
  }

  const voterByGoogle = await query<VoterRow>(
    `SELECT id, email, full_name, national_id, election_id, phone_number, password_hash, google_sub
     FROM voters
     WHERE google_sub = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [googleSub],
  );
  if (voterByGoogle.rows[0]) {
    return buildVoterAuthResult(voterByGoogle.rows[0]);
  }

  const voterByEmail = await findVoterByEmail(email);
  if (voterByEmail) {
    if (!voterByEmail.google_sub) {
      await query(`UPDATE voters SET google_sub = $2 WHERE id = $1`, [voterByEmail.id, googleSub]);
      voterByEmail.google_sub = googleSub;
    }
    return buildVoterAuthResult(voterByEmail);
  }

  throw new Error('No account is linked to this Google email. Create an account first.');
}

export async function loginAdminWithGoogle(credential: string) {
  const googlePayload = await verifyGoogleIdToken(credential);
  const googleSub = googlePayload.sub;
  const email = googlePayload.email.toLowerCase();

  const adminByGoogle = await query<AdminRow>(
    `SELECT id, email, full_name, role, password_hash, google_sub
     FROM admins
     WHERE google_sub = $1
     LIMIT 1`,
    [googleSub],
  );
  if (adminByGoogle.rows[0]) {
    return buildAdminAuthResult(adminByGoogle.rows[0]);
  }

  const adminByEmail = await findAdminByEmail(email);
  if (!adminByEmail) {
    throw new Error('This Google account is not authorized for admin access');
  }

  if (!adminByEmail.google_sub) {
    await query(`UPDATE admins SET google_sub = $2 WHERE id = $1`, [adminByEmail.id, googleSub]);
    adminByEmail.google_sub = googleSub;
  }

  return buildAdminAuthResult(adminByEmail);
}

export async function startSanadLogin(
  nationalId: string,
  password: string,
  options?: {
    includeSandboxOtp?: boolean;
  },
) {
  const voter = await findVoterForSanad(nationalId);
  if (!voter) {
    throw new Error('Voter is not registered');
  }

  if (!voter.password_hash) {
    const defaultPasswordHash = await createDefaultVoterPasswordHash();
    const updated = await query<VoterRow>(
      `UPDATE voters
       SET password_hash = $2,
           updated_at = now()
       WHERE id = $1
       RETURNING id, email, full_name, national_id, election_id, phone_number, password_hash, google_sub`,
      [voter.id, defaultPasswordHash],
    );

    voter.password_hash = updated.rows[0]?.password_hash || defaultPasswordHash;
  }

  if (!verifyPassword(password, voter.password_hash)) {
    throw new Error('Invalid national ID or password');
  }

  const otp = String(randomInt(100000, 999999));
  const otpHash = hashValue(otp);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  const requestReference = createSanadReference();

  const challenge = await withTransaction(async (client) => {
    await client.query(
      `UPDATE sanad_auth_requests
       SET status = 'cancelled',
           updated_at = now()
       WHERE voter_id = $1
         AND status IN ('pending_otp', 'otp_verified')`,
      [voter.id],
    );

    const inserted = await client.query<SanadAuthRequestRow>(
      `INSERT INTO sanad_auth_requests (
         voter_id,
         national_id,
         phone_number_snapshot,
         request_reference,
         otp_hash,
         status,
         expires_at
       )
       VALUES ($1, $2, $3, $4, $5, 'pending_otp', $6)
       RETURNING id, voter_id, national_id, phone_number_snapshot, request_reference, otp_hash, status, attempts_count, max_attempts, expires_at`,
      [voter.id, voter.national_id, voter.phone_number || null, requestReference, otpHash, expiresAt],
    );

    await client.query(
      `INSERT INTO audit_logs (actor_type, actor_id, action_type, target_table, target_id, details_json)
       VALUES ('voter', $1, 'sanad_auth_started', 'sanad_auth_requests', $2, $3::jsonb)`,
      [voter.id, inserted.rows[0].id, JSON.stringify({ requestReference })],
    );

    return inserted.rows[0];
  });

  return {
    challengeId: challenge.id,
    requestReference: challenge.request_reference,
    maskedPhoneNumber: maskPhoneNumber(voter.phone_number),
    expiresAt: challenge.expires_at,
    citizenName: voter.full_name,
    nationalId: voter.national_id,
    sandboxOtp: options?.includeSandboxOtp ? otp : undefined,
  };
}

export async function verifySanadOtp(challengeId: string, otp: string) {
  const sanitizedOtp = otp.trim();
  if (!/^[0-9]{6}$/.test(sanitizedOtp)) {
    throw new Error('Invalid OTP code');
  }

  const result = await withTransaction(async (client) => {
    const challengeResult = await client.query<
      SanadAuthRequestRow & {
        voter_email: string;
        voter_full_name: string;
        voter_national_id: string;
      }
    >(
      `SELECT sar.*,
              v.email AS voter_email,
              v.full_name AS voter_full_name,
              v.national_id AS voter_national_id
       FROM sanad_auth_requests sar
       JOIN voters v ON v.id = sar.voter_id
       WHERE sar.id = $1
       FOR UPDATE`,
      [challengeId],
    );

    const challenge = challengeResult.rows[0];
    if (!challenge) {
      throw new Error('Sanad request not found');
    }

    if (challenge.status === 'consumed') {
      throw new Error('Sanad request has already been consumed');
    }

    if (challenge.status === 'cancelled' || challenge.status === 'expired') {
      throw new Error('Sanad request is no longer active');
    }

    if (new Date(challenge.expires_at).getTime() <= Date.now()) {
      await client.query(
        `UPDATE sanad_auth_requests
         SET status = 'expired',
             updated_at = now()
         WHERE id = $1`,
        [challengeId],
      );
      throw new Error('Sanad OTP has expired');
    }

    if (challenge.status !== 'pending_otp') {
      return challenge;
    }

    if (challenge.otp_hash !== hashValue(sanitizedOtp)) {
      const nextAttempts = challenge.attempts_count + 1;
      const nextStatus = nextAttempts >= challenge.max_attempts ? 'cancelled' : 'pending_otp';
      await client.query(
        `UPDATE sanad_auth_requests
         SET attempts_count = $2,
             status = $3,
             updated_at = now()
         WHERE id = $1`,
        [challengeId, nextAttempts, nextStatus],
      );
      throw new Error(nextStatus === 'cancelled' ? 'Sanad request has been cancelled after too many attempts' : 'Invalid OTP code');
    }

    await client.query(
      `UPDATE sanad_auth_requests
       SET status = 'otp_verified',
           verified_at = now(),
           updated_at = now()
       WHERE id = $1`,
      [challengeId],
    );

    await client.query(
      `INSERT INTO audit_logs (actor_type, actor_id, action_type, target_table, target_id, details_json)
       VALUES ('voter', $1, 'sanad_otp_verified', 'sanad_auth_requests', $2, $3::jsonb)`,
      [challenge.voter_id, challengeId, JSON.stringify({ requestReference: challenge.request_reference })],
    );

    return {
      ...challenge,
      status: 'otp_verified' as const,
    };
  });

  return {
    challengeId: result.id,
    requestReference: result.request_reference,
    citizenName: (result as any).voter_full_name,
    nationalId: (result as any).voter_national_id,
    maskedPhoneNumber: maskPhoneNumber(result.phone_number_snapshot),
    expiresAt: result.expires_at,
  };
}

export async function completeSanadLogin(challengeId: string) {
  const voter = await withTransaction(async (client) => {
    const result = await client.query<
      SanadAuthRequestRow & {
        email: string;
        full_name: string;
        national_id: string;
        election_id: string;
        phone_number: string | null;
        password_hash: string | null;
        google_sub: string | null;
      }
    >(
      `SELECT sar.*,
              v.email,
              v.full_name,
              v.national_id,
              v.election_id,
              v.phone_number,
              v.password_hash,
              v.google_sub
       FROM sanad_auth_requests sar
       JOIN voters v ON v.id = sar.voter_id
       WHERE sar.id = $1
       FOR UPDATE`,
      [challengeId],
    );

    const challenge = result.rows[0];
    if (!challenge) {
      throw new Error('Sanad request not found');
    }

    if (new Date(challenge.expires_at).getTime() <= Date.now()) {
      await client.query(
        `UPDATE sanad_auth_requests
         SET status = 'expired',
             updated_at = now()
         WHERE id = $1`,
        [challengeId],
      );
      throw new Error('Sanad request has expired');
    }

    if (challenge.status !== 'otp_verified') {
      throw new Error('Sanad OTP must be verified before completing login');
    }

    await client.query(
      `UPDATE sanad_auth_requests
       SET status = 'consumed',
           consumed_at = now(),
           updated_at = now()
       WHERE id = $1`,
      [challengeId],
    );

    await client.query(
      `INSERT INTO audit_logs (actor_type, actor_id, action_type, target_table, target_id, details_json)
       VALUES ('voter', $1, 'sanad_auth_completed', 'sanad_auth_requests', $2, $3::jsonb)`,
      [challenge.voter_id, challengeId, JSON.stringify({ requestReference: challenge.request_reference })],
    );

    return {
      id: challenge.voter_id,
      email: challenge.email,
      full_name: challenge.full_name,
      national_id: challenge.national_id,
      election_id: challenge.election_id,
      phone_number: challenge.phone_number,
      password_hash: challenge.password_hash,
      google_sub: challenge.google_sub,
    } satisfies VoterRow;
  });

  return buildVoterAuthResult(voter);
}

export function verifyAuthToken(token: string) {
  return jwt.verify(token, env.jwtSecret) as AuthTokenPayload;
}
