import {Router} from 'express';
import {getAuditLogs} from '../controllers/audit.controller.js';
import {adminMiddleware, sensitiveResultsMiddleware} from '../middleware/adminMiddleware.js';
import {authMiddleware} from '../middleware/authMiddleware.js';
import {asyncHandler} from '../utils/asyncHandler.js';

export const auditRoutes = Router();

auditRoutes.get('/', authMiddleware, adminMiddleware, sensitiveResultsMiddleware, asyncHandler(getAuditLogs));
