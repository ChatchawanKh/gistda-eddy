// server/auth/routes/auth.routes.js
import express from 'express';
import * as authController from '../controllers/auth.controller.js';
import verifyToken from '../middleware/verifyToken.js';
import {
  loginIpLimiter,
  loginAccountLimiter,
  registerLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
  changePasswordLimiter,
} from '../middleware/rateLimit.js';

const router = express.Router();

router.post('/register', registerLimiter, authController.register);
router.post('/login', loginIpLimiter, loginAccountLimiter, authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.post('/forgot-password', forgotPasswordLimiter, authController.forgotPassword);
router.post('/reset-password', resetPasswordLimiter, authController.resetPassword);
router.get('/me', verifyToken, authController.me);
router.patch('/me', verifyToken, authController.updateProfile);
router.post('/change-password', verifyToken, changePasswordLimiter, authController.changePassword);

export default router;
