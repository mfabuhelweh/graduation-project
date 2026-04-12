import type { Request, Response } from 'express';
import {
  createElection,
  deleteElection,
  getBallotOptions,
  getElection,
  listElections,
  updateElection,
} from '../services/election.service.js';

export async function getElections(_req: Request, res: Response) {
  res.json({success: true, data: await listElections()});
}

export async function getElectionById(req: Request, res: Response) {
  const election = await getElection(req.params.id);
  if (!election) return res.status(404).json({success: false, message: 'Election not found'});
  res.json({success: true, data: election});
}

export async function getElectionBallot(req: Request, res: Response) {
  const voterNationalId =
    typeof req.query.voterNationalId === 'string' ? req.query.voterNationalId : undefined;
  res.json({ success: true, data: await getBallotOptions(req.params.id, voterNationalId) });
}

export async function postElection(req: Request, res: Response) {
  const election = await createElection(req.body, req.user?.email || req.user?.uid);
  res.status(201).json({success: true, data: election});
}

export async function patchElection(req: Request, res: Response) {
  const election = await updateElection(req.params.id, req.body, req.user?.email || req.user?.uid);
  res.json({success: true, data: election});
}

export async function removeElection(req: Request, res: Response) {
  res.json({success: true, data: await deleteElection(req.params.id, req.user?.email || req.user?.uid)});
}
