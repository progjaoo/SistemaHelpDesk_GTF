import { Router } from 'express';
import {
  forgotPassword,
  login,
  logout,
  me,
  refreshSession,
  register,
  resetPassword,
  updateMe,
  updateMyPassword
} from '../controllers/authController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.post('/register', asyncHandler(register));
router.post('/login', asyncHandler(login));
router.post('/refresh', asyncHandler(refreshSession));
router.post('/forgot-password', asyncHandler(forgotPassword));
router.post('/reset-password', asyncHandler(resetPassword));
router.get('/me', authMiddleware, asyncHandler(me));
router.put('/me', authMiddleware, asyncHandler(updateMe));
router.put('/me/password', authMiddleware, asyncHandler(updateMyPassword));
router.post('/logout', authMiddleware, asyncHandler(logout));

export default router;