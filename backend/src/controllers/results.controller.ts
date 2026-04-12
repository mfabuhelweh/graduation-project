import type {Request, Response} from 'express';
import {getElectionResults} from '../services/results.service.js';

export async function getResults(req: Request, res: Response) {
  res.json({success: true, data: await getElectionResults(req.params.electionId)});
}
