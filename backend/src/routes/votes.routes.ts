import {Router} from 'express';
import {postVote} from '../controllers/votes.controller.js';
import {authMiddleware} from '../middleware/authMiddleware.js';
import {asyncHandler} from '../utils/asyncHandler.js';

export const voteRoutes = Router();

voteRoutes.post('/', authMiddleware, asyncHandler(postVote));
