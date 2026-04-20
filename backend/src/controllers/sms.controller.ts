import crypto from 'node:crypto';
import type {Request, Response} from 'express';
import {canUseDemoMode, maskPhoneNumberForLog} from '../utils/requestGuards.js';

export async function sendSms(req: Request, res: Response) {
  const {phoneNumber, message, provider = 'mock'} = req.body || {};

  if (typeof phoneNumber !== 'string' || phoneNumber.trim().length < 8) {
    return res.status(400).json({success: false, message: 'A valid phone number is required'});
  }

  if (typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({success: false, message: 'A message body is required'});
  }

  if (!canUseDemoMode(req, 'sms')) {
    return res.status(503).json({
      success: false,
      message: 'SMS sending is disabled in this environment',
    });
  }

  console.log(
    `[SMS DEMO] provider=${provider} recipient=${maskPhoneNumberForLog(phoneNumber)} length=${message.trim().length}`,
  );

  res.json({
    success: true,
    messageId: crypto.randomUUID(),
    provider: 'demo',
  });
}
