import type {Request, Response} from 'express';
import {createVoter, getVoterByNationalId, listVoters, updateVoter, verifyFaceAndIssueToken} from '../services/voter.service.js';

export async function getVoters(_req: Request, res: Response) {
  res.json({success: true, data: await listVoters()});
}

export async function getVoter(req: Request, res: Response) {
  const voter = await getVoterByNationalId(req.params.nationalId);
  if (!voter) return res.status(404).json({success: false, message: 'Voter not found'});
  res.json({success: true, data: voter});
}

export async function postVoter(req: Request, res: Response) {
  const voter = await createVoter(req.body, req.user?.email || req.user?.uid);
  res.status(201).json({success: true, data: voter});
}

export async function patchVoter(req: Request, res: Response) {
  const voter = await updateVoter(req.params.id, req.body, req.user?.email || req.user?.uid);
  res.json({success: true, data: voter});
}

export async function postFaceVerification(req: Request, res: Response) {
  const result = await verifyFaceAndIssueToken(req.body, req.user?.email || req.user?.uid);
  if (!result.success) {
    return res.status(403).json({success: false, message: result.message || 'Face verification failed', data: result});
  }
  res.status(201).json({success: true, data: result});
}
