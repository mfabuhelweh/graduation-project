import type {Request, Response} from 'express';
import {castVote} from '../services/vote.service.js';
import {canUseDemoMode} from '../utils/requestGuards.js';

export async function postVote(req: Request, res: Response) {
  const result = await castVote(req.body, req.user?.uid, {
    allowDemoVoting: canUseDemoMode(req, 'face-verification'),
  });
  res.status(201).json(result);
}
