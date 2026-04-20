import type {NextFunction, Request, Response} from 'express';
import {usePostgres} from '../db/pool.js';

const adminEmails = new Set(['yousefx940@gmail.com', 'yousefabuhelwa@gmail.com']);
const RESULTS_VIEWER_ROLES = new Set(['super_admin', 'auditor']);
const ELECTION_MANAGER_ROLES = new Set(['super_admin', 'election_admin']);

function getNormalizedAdminRole(req: Request) {
  return String(req.user?.adminRole || '').trim().toLowerCase();
}

function isAdminRequest(req: Request) {
  if (usePostgres) {
    return req.user?.role === 'admin';
  }

  return req.user?.role === 'admin' || (req.user?.email && adminEmails.has(req.user.email));
}

function roleGuard(req: Request, res: Response, next: NextFunction, allowedRoles: Set<string>, message: string) {
  if (!isAdminRequest(req)) {
    return res.status(403).json({success: false, message: 'Admin access required'});
  }

  if (!usePostgres) {
    return next();
  }

  const adminRole = getNormalizedAdminRole(req);
  if (allowedRoles.has(adminRole)) {
    return next();
  }

  return res.status(403).json({success: false, message});
}

export function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  if (isAdminRequest(req)) {
    return next();
  }

  return res.status(403).json({success: false, message: 'Admin access required'});
}

export function electionManagementMiddleware(req: Request, res: Response, next: NextFunction) {
  return roleGuard(
    req,
    res,
    next,
    ELECTION_MANAGER_ROLES,
    'Only super admins and election admins can change election data',
  );
}

export function sensitiveResultsMiddleware(req: Request, res: Response, next: NextFunction) {
  return roleGuard(
    req,
    res,
    next,
    RESULTS_VIEWER_ROLES,
    'Only super admins and auditors can access sensitive results and audit data',
  );
}

export function canViewSensitiveResults(user?: Request['user']) {
  if (!user || user.role !== 'admin') {
    return false;
  }

  if (!usePostgres) {
    return true;
  }

  return RESULTS_VIEWER_ROLES.has(String(user.adminRole || '').trim().toLowerCase());
}

export function canManageElectionData(user?: Request['user']) {
  if (!user || user.role !== 'admin') {
    return false;
  }

  if (!usePostgres) {
    return true;
  }

  return ELECTION_MANAGER_ROLES.has(String(user.adminRole || '').trim().toLowerCase());
}
