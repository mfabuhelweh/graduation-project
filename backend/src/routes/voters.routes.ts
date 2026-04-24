import {Router} from 'express';
import {getMyVoterProfile, getVoter, getVoters, patchVoter, postFaceVerification, postVoter} from '../controllers/voters.controller.js';
import {adminMiddleware} from '../middleware/adminMiddleware.js';
import {authMiddleware, optionalAuthMiddleware} from '../middleware/authMiddleware.js';
import {asyncHandler} from '../utils/asyncHandler.js';

export const voterRoutes = Router();

voterRoutes.get('/', authMiddleware, adminMiddleware, asyncHandler(getVoters));
voterRoutes.post('/verify-face', optionalAuthMiddleware, asyncHandler(postFaceVerification));
voterRoutes.get('/me', authMiddleware, asyncHandler(getMyVoterProfile));
voterRoutes.get('/:nationalId', authMiddleware, adminMiddleware, asyncHandler(getVoter));
voterRoutes.post('/', authMiddleware, adminMiddleware, asyncHandler(postVoter));
voterRoutes.patch('/:id', authMiddleware, adminMiddleware, asyncHandler(patchVoter));
