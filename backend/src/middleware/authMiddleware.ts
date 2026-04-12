import type {NextFunction, Request, Response} from 'express';
import {env} from '../config/env.js';
import {query, usePostgres} from '../db/pool.js';
import {verifyAuthToken} from '../services/auth.service.js';

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  role?: string;
  fullName?: string;
  adminRole?: string;
  nationalId?: string;
  electionId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.header('Authorization');
    const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;

    if (!token) {
      const devAuthHeader = req.header('X-Dev-Auth') || req.header('x-dev-auth');
      const devRoleHeader = req.header('X-Dev-Role') || req.header('x-dev-role');
      if (env.enableDevAuth && devAuthHeader?.toLowerCase() === 'true') {
        const fallbackEmail = devRoleHeader === 'admin' ? 'local-admin@example.com' : 'local-voter@example.com';
        let role = devRoleHeader === 'admin' ? 'admin' : 'voter';
        if (usePostgres) {
          const admin = await query<{email: string}>('SELECT email FROM admins ORDER BY created_at ASC LIMIT 1');
          if (devRoleHeader === 'admin' && admin.rows[0]?.email) {
            req.user = {
              uid: 'local-dev-admin',
              email: admin.rows[0].email,
              role: 'admin',
              fullName: 'Local Admin',
            };
            return next();
          }
        }
        req.user = {
          uid: `local-dev-${role}`,
          email: fallbackEmail,
          role,
          fullName: role === 'admin' ? 'Local Admin' : 'Local Voter',
          nationalId: role === 'voter' ? '1234567890' : undefined,
        };
        return next();
      }

      return res.status(401).json({success: false, message: 'Missing authorization token'});
    }

    const decoded = verifyAuthToken(token);

    req.user = {
      uid: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      fullName: decoded.fullName,
      adminRole: decoded.adminRole,
      nationalId: decoded.nationalId,
      electionId: decoded.electionId,
    };

    next();
  } catch {
    return res.status(401).json({success: false, message: 'Invalid authorization token'});
  }
}

export function optionalAuthMiddleware(req: Request, _res: Response, next: NextFunction) {
  const header = req.header('Authorization');
  if (!header?.startsWith('Bearer ')) {
    return next();
  }

  return authMiddleware(req, _res, next);
}
