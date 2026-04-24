import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, '../../..');

loadDotenv({
  path: path.join(projectRoot, '.env'),
  override: true,
});

const DEFAULT_CORS_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://frontend-nevs-pk4c.vercel.app',
];

function mergeOrigins(...values: Array<string | undefined>) {
  return [...new Set(values
    .flatMap((value) => (value || '').split(','))
    .map((value) => value.trim())
    .filter(Boolean))].join(',');
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  corsOrigin: mergeOrigins(
    process.env.CORS_ORIGIN,
    process.env.FRONTEND_URL,
    process.env.APP_URL,
    ...DEFAULT_CORS_ORIGINS,
  ),
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || 'dev-jwt-secret-change-me',
  googleClientId: (process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '').trim(),
  firebaseServiceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
  enableDevAuth: process.env.ENABLE_DEV_AUTH !== 'false' && process.env.NODE_ENV !== 'production',
  allowSandboxOtpInProduction: process.env.ALLOW_SANDBOX_OTP_IN_PRODUCTION === 'true',
  enableMemoryStore:
    process.env.ENABLE_MEMORY_STORE === 'true' ||
    (!process.env.DATABASE_URL && process.env.NODE_ENV !== 'production'),
};
