import {Router} from 'express';
import {getAuditLogs} from '../controllers/audit.controller.js';
import {adminMiddleware} from '../middleware/adminMiddleware.js';
import {authMiddleware} from '../middleware/authMiddleware.js';
import {asyncHandler} from '../utils/asyncHandler.js';

export const auditRoutes = Router();

auditRoutes.get('/', authMiddleware, adminMiddleware, asyncHandler(getAuditLogs));
