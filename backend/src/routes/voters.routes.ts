import {Router} from 'express';
import {getVoter, getVoters, patchVoter, postFaceVerification, postVoter} from '../controllers/voters.controller.js';
import {adminMiddleware} from '../middleware/adminMiddleware.js';
import {authMiddleware} from '../middleware/authMiddleware.js';
import {asyncHandler} from '../utils/asyncHandler.js';

export const voterRoutes = Router();

voterRoutes.get('/', authMiddleware, adminMiddleware, asyncHandler(getVoters));
voterRoutes.post('/verify-face', authMiddleware, asyncHandler(postFaceVerification));
voterRoutes.get('/:nationalId', authMiddleware, asyncHandler(getVoter));
voterRoutes.post('/', authMiddleware, adminMiddleware, asyncHandler(postVoter));
voterRoutes.patch('/:id', authMiddleware, adminMiddleware, asyncHandler(patchVoter));
