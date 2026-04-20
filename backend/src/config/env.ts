import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, '../../..');

loadDotenv({
  path: path.join(projectRoot, '.env'),
  override: true,
});

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || 'dev-jwt-secret-change-me',
  googleClientId: (process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '').trim(),
  firebaseServiceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
  enableDevAuth: process.env.ENABLE_DEV_AUTH !== 'false' && process.env.NODE_ENV !== 'production',
  enableMemoryStore:
    process.env.ENABLE_MEMORY_STORE === 'true' ||
    (!process.env.DATABASE_URL && process.env.NODE_ENV !== 'production'),
};
