export const env = {
  port: Number(process.env.PORT || 3000),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || 'dev-jwt-secret-change-me',
  googleClientId: process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '',
  firebaseServiceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
  enableDevAuth: process.env.ENABLE_DEV_AUTH !== 'false' && process.env.NODE_ENV !== 'production',
  enableMemoryStore:
    process.env.ENABLE_MEMORY_STORE === 'true' ||
    (!process.env.DATABASE_URL && process.env.NODE_ENV !== 'production'),
};
