import type {Request, Response} from 'express';
import {castVote} from '../services/vote.service.js';

export async function postVote(req: Request, res: Response) {
  const result = await castVote(req.body, req.user?.uid);
  res.status(201).json(result);
}
