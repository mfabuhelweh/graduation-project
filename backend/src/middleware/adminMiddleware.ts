import type {NextFunction, Request, Response} from 'express';
import {usePostgres} from '../db/pool.js';

const adminEmails = new Set(['yousefx940@gmail.com', 'yousefabuhelwa@gmail.com']);

export function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  if (usePostgres) {
    if (req.user?.role === 'admin') return next();
    return res.status(403).json({success: false, message: 'Admin access required'});
  }

  if (req.user?.role === 'admin' || (req.user?.email && adminEmails.has(req.user.email))) {
    return next();
  }

  return res.status(403).json({success: false, message: 'Admin access required'});
}
