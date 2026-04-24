import bcrypt from 'bcryptjs';

export const DEFAULT_VOTER_PASSWORD = '12345';

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function createDefaultVoterPasswordHash() {
  return hashPassword(DEFAULT_VOTER_PASSWORD);
}
