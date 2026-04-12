import crypto from 'node:crypto';

export function createOpaqueToken() {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function createBallotReference() {
  return `ballot_${crypto.randomBytes(18).toString('base64url')}`;
}
