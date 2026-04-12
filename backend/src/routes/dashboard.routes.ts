import {Router} from 'express';
import {getDashboard} from '../controllers/dashboard.controller.js';
import {adminMiddleware} from '../middleware/adminMiddleware.js';
import {authMiddleware} from '../middleware/authMiddleware.js';
import {asyncHandler} from '../utils/asyncHandler.js';

export const dashboardRoutes = Router();

dashboardRoutes.get('/summary', authMiddleware, adminMiddleware, asyncHandler(getDashboard));
