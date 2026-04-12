import type {Request, Response} from 'express';

export function sendSms(req: Request, res: Response) {
  const {phoneNumber, message, provider = 'mock'} = req.body;
  console.log(`[SMS GATEWAY - ${provider}] Sending to ${phoneNumber}: ${message}`);
  res.json({success: true, messageId: Math.random().toString(36).substring(7)});
}
