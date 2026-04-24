import type {Request, Response} from 'express';
import {createVoter, getCurrentVoterProfile, getVoterByNationalId, listVoters, updateVoter, verifyFaceAndIssueToken} from '../services/voter.service.js';
import type {AuthenticatedUser} from '../middleware/authMiddleware.js';
import { canUseDemoMode } from '../utils/requestGuards.js';

export async function getVoters(_req: Request, res: Response) {
  res.json({success: true, data: await listVoters()});
}

export async function getVoter(req: Request, res: Response) {
  const voter = await getVoterByNationalId(req.params.nationalId);
  if (!voter) return res.status(404).json({success: false, message: 'Voter not found'});
  res.json({success: true, data: voter});
}

export async function getMyVoterProfile(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Authentication is required" });
  }

  const voter = await getCurrentVoterProfile(req.user);
  if (!voter) {
    return res.status(404).json({ success: false, message: "Voter profile not found" });
  }

  res.json({ success: true, data: voter });
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
  const allowDemoVerification = canUseDemoMode(req, 'face-verification');
  const requestedElectionId = String(req.body?.electionId || '');
  const requestedNationalId = String(req.body?.nationalId || '');

  let authenticatedUser: AuthenticatedUser | undefined = req.user;

  if (
    allowDemoVerification &&
    (!authenticatedUser?.nationalId || !authenticatedUser?.electionId || authenticatedUser.role !== 'voter')
  ) {
    authenticatedUser = {
      uid: 'demo-face-verification',
      role: 'voter',
      nationalId: requestedNationalId,
      electionId: requestedElectionId,
      fullName: 'Demo Voter',
    };
  }

  if (authenticatedUser?.role !== 'voter' || !authenticatedUser.nationalId || !authenticatedUser.electionId) {
    return res.status(403).json({success: false, message: 'Voter authentication is required for face verification'});
  }

  if (requestedElectionId !== authenticatedUser.electionId || requestedNationalId !== authenticatedUser.nationalId) {
    return res.status(403).json({success: false, message: 'You can only verify your own voter identity'});
  }

  const result = await verifyFaceAndIssueToken(req.body, authenticatedUser, authenticatedUser.email || authenticatedUser.uid, {
    allowDemoVerification,
  });
  if (!result.success) {
    return res.status(403).json({success: false, message: result.message || 'Face verification failed', data: result});
  }
  res.status(201).json({success: true, data: result});
}
