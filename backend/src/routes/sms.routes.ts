import {Router} from 'express';
import {sendSms} from '../controllers/sms.controller.js';

export const smsRoutes = Router();

smsRoutes.post('/send', sendSms);
