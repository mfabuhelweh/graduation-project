import type { Request, Response } from 'express';
import {
  completeSanadLogin,
  loginAdminWithGoogle,
  loginByEmailPassword,
  loginWithGoogle,
  registerVoterAccount,
  startSanadLogin,
  verifySanadOtp,
} from '../services/auth.service.js';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const nationalIdPattern = /^[0-9]{10}$/;
const otpPattern = /^[0-9]{6}$/;

export async function getMe(req: Request, res: Response) {
  res.json({
    success: true,
    data: {
      uid: req.user?.uid,
      email: req.user?.email,
      role: req.user?.role || 'voter',
      fullName: req.user?.fullName,
      adminRole: req.user?.adminRole,
      nationalId: req.user?.nationalId,
      electionId: req.user?.electionId,
    },
  });
}

export async function postLogin(req: Request, res: Response) {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }

  if (typeof email !== 'string' || !emailPattern.test(email.trim().toLowerCase())) {
    return res.status(400).json({ success: false, message: 'Enter a valid email address' });
  }

  const result = await loginByEmailPassword(email.trim().toLowerCase(), password);
  res.json({ success: true, data: result });
}

export async function postGoogleLogin(req: Request, res: Response) {
  const { credential } = req.body || {};
  if (!credential || typeof credential !== 'string') {
    return res.status(400).json({ success: false, message: 'Google credential is required' });
  }

  const result = await loginWithGoogle(credential);
  res.json({ success: true, data: result });
}

export async function postAdminGoogleLogin(req: Request, res: Response) {
  const { credential } = req.body || {};
  if (!credential || typeof credential !== 'string') {
    return res.status(400).json({ success: false, message: 'Google credential is required' });
  }

  const result = await loginAdminWithGoogle(credential);
  res.json({ success: true, data: result });
}

export async function postRegister(req: Request, res: Response) {
  const {
    fullName,
    email,
    password,
    nationalId,
    electionId,
    districtId,
    phoneNumber,
  } = req.body || {};

  if (!fullName || !email || !password || !nationalId || !electionId || !districtId) {
    return res.status(400).json({ success: false, message: 'All required registration fields must be provided' });
  }

  if (typeof email !== 'string' || !emailPattern.test(email.trim().toLowerCase())) {
    return res.status(400).json({ success: false, message: 'Enter a valid email address' });
  }

  if (typeof nationalId !== 'string' || !nationalIdPattern.test(nationalId.trim())) {
    return res.status(400).json({ success: false, message: 'National ID must contain exactly 10 digits' });
  }

  if (typeof password !== 'string' || password.trim().length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
  }

  const result = await registerVoterAccount({
    fullName: String(fullName).trim(),
    email: email.trim().toLowerCase(),
    password,
    nationalId: nationalId.trim(),
    electionId: String(electionId),
    districtId: String(districtId),
    phoneNumber: phoneNumber ? String(phoneNumber).trim() : undefined,
  });

  res.status(201).json({ success: true, data: result });
}

export async function postSanadStart(req: Request, res: Response) {
  const { nationalId } = req.body || {};
  if (typeof nationalId !== 'string' || !nationalIdPattern.test(nationalId.trim())) {
    return res.status(400).json({ success: false, message: 'National ID must contain exactly 10 digits' });
  }

  const result = await startSanadLogin(nationalId.trim());
  res.status(201).json({ success: true, data: result });
}

export async function postSanadVerifyOtp(req: Request, res: Response) {
  const { challengeId, otp } = req.body || {};
  if (!challengeId || typeof challengeId !== 'string') {
    return res.status(400).json({ success: false, message: 'Challenge ID is required' });
  }

  if (typeof otp !== 'string' || !otpPattern.test(otp.trim())) {
    return res.status(400).json({ success: false, message: 'OTP must contain exactly 6 digits' });
  }

  const result = await verifySanadOtp(challengeId, otp.trim());
  res.json({ success: true, data: result });
}

export async function postSanadComplete(req: Request, res: Response) {
  const { challengeId, accepted } = req.body || {};
  if (!challengeId || typeof challengeId !== 'string') {
    return res.status(400).json({ success: false, message: 'Challenge ID is required' });
  }

  if (!accepted) {
    return res.status(400).json({ success: false, message: 'You must accept the consent terms to continue' });
  }

  const result = await completeSanadLogin(challengeId);
  res.json({ success: true, data: result });
}
