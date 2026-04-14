import {Router} from 'express';
import {getElectionBallot, getElectionById, getElections, patchElection, postElection, removeElection} from '../controllers/elections.controller.js';
import {adminMiddleware} from '../middleware/adminMiddleware.js';
import {authMiddleware, optionalAuthMiddleware} from '../middleware/authMiddleware.js';
import {asyncHandler} from '../utils/asyncHandler.js';

export const electionRoutes = Router();

electionRoutes.get('/', optionalAuthMiddleware, asyncHandler(getElections));
electionRoutes.get('/:id/ballot', authMiddleware, asyncHandler(getElectionBallot));
electionRoutes.get('/:id', optionalAuthMiddleware, asyncHandler(getElectionById));
electionRoutes.post('/', authMiddleware, adminMiddleware, asyncHandler(postElection));
electionRoutes.patch('/:id', authMiddleware, adminMiddleware, asyncHandler(patchElection));
electionRoutes.delete('/:id', authMiddleware, adminMiddleware, asyncHandler(removeElection));
