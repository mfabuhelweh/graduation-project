import {Router} from 'express';
import {getResults} from '../controllers/results.controller.js';
import {optionalAuthMiddleware} from '../middleware/authMiddleware.js';
import {asyncHandler} from '../utils/asyncHandler.js';

export const resultsRoutes = Router();

resultsRoutes.get('/:electionId', optionalAuthMiddleware, asyncHandler(getResults));
