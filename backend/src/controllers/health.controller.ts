import type {Request, Response} from 'express';
import {query, usePostgres} from '../db/pool.js';
import {env} from '../config/env.js';
import {canUseDemoMode, getRequestedDemoModes} from '../utils/requestGuards.js';

export async function getHealth(_req: Request, res: Response) {
  const timestamp = new Date().toISOString();

  if (!usePostgres) {
    return res.json({
      success: true,
      status: 'ok',
      timestamp,
      database: {
        mode: 'memory',
        connected: true,
      },
    });
  }

  try {
    await query('SELECT 1');

    return res.json({
      success: true,
      status: 'ok',
      timestamp,
      database: {
        mode: 'postgres',
        connected: true,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Database health check failed';

    console.error('[Health Check] Database connection failed', error);

    return res.status(503).json({
      success: false,
      status: 'degraded',
      timestamp,
      message,
      database: {
        mode: 'postgres',
        connected: false,
      },
    });
  }
}

export function getDemoAuthHealth(req: Request, res: Response) {
  const requestedModes = [...getRequestedDemoModes(req)];

  res.json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: {
      nodeEnv: env.nodeEnv,
      enableDevAuth: env.enableDevAuth,
      allowSandboxOtpInProduction: env.allowSandboxOtpInProduction,
    },
    request: {
      origin: req.header('Origin') || null,
      referer: req.header('Referer') || null,
      requestedDemoModes: requestedModes,
    },
    evaluation: {
      sanadOtpAllowed: canUseDemoMode(req, 'sanad-otp'),
      smsAllowed: canUseDemoMode(req, 'sms'),
      faceVerificationAllowed: canUseDemoMode(req, 'face-verification'),
    },
  });
}
