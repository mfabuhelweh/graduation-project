import {Router} from 'express';
import {
  postAdminGoogleLogin,
  getMe,
  postGoogleLogin,
  postLogin,
  postRegister,
  postSanadComplete,
  postSanadStart,
  postSanadVerifyOtp,
} from '../controllers/auth.controller.js';
import {authMiddleware} from '../middleware/authMiddleware.js';
import {asyncHandler} from '../utils/asyncHandler.js';

export const authRoutes = Router();

authRoutes.post('/login', asyncHandler(postLogin));
authRoutes.post('/google', asyncHandler(postGoogleLogin));
authRoutes.post('/admin/google', asyncHandler(postAdminGoogleLogin));
authRoutes.post('/register', asyncHandler(postRegister));
authRoutes.post('/sanad/start', asyncHandler(postSanadStart));
authRoutes.post('/sanad/verify-otp', asyncHandler(postSanadVerifyOtp));
authRoutes.post('/sanad/complete', asyncHandler(postSanadComplete));
authRoutes.get('/me', authMiddleware, asyncHandler(getMe));
