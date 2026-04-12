import cors from 'cors';
import express from 'express';
import {env} from './config/env.js';
import {errorHandler} from './middleware/errorHandler.js';
import {auditRoutes} from './routes/audit.routes.js';
import {adminRoutes} from './routes/admin.routes.js';
import {authRoutes} from './routes/auth.routes.js';
import {dashboardRoutes} from './routes/dashboard.routes.js';
import {electionRoutes} from './routes/elections.routes.js';
import {healthRoutes} from './routes/health.routes.js';
import {resultsRoutes} from './routes/results.routes.js';
import {smsRoutes} from './routes/sms.routes.js';
import {voterRoutes} from './routes/voters.routes.js';
import {voteRoutes} from './routes/votes.routes.js';

function isAllowedLocalOrigin(origin: string) {
  try {
    const {hostname} = new URL(origin);

    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return true;
    }

    return (
      /^192\.168\./.test(hostname) ||
      /^10\./.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
    );
  } catch {
    return false;
  }
}

export function createApp() {
  const app = express();
  const allowedOrigins = env.corsOrigin.split(',').map((origin) => origin.trim()).filter(Boolean);

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin) || isAllowedLocalOrigin(origin)) {
        return callback(null, true);
      }

      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  }));
  app.use(express.json({limit: '1mb'}));

  app.use('/api/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/sms', smsRoutes);
  app.use('/api/elections', electionRoutes);
  app.use('/api/voters', voterRoutes);
  app.use('/api/votes', voteRoutes);
  app.use('/api/results', resultsRoutes);
  app.use('/api/audit', auditRoutes);

  app.use(errorHandler);

  return app;
}
