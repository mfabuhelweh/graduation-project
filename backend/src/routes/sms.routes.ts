import {Router} from 'express';
import {sendSms} from '../controllers/sms.controller.js';
import {adminMiddleware} from '../middleware/adminMiddleware.js';
import {authMiddleware} from '../middleware/authMiddleware.js';
import {asyncHandler} from '../utils/asyncHandler.js';

export const smsRoutes = Router();

smsRoutes.post('/send', authMiddleware, adminMiddleware, asyncHandler(sendSms));
