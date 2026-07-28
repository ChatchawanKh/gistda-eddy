// server/auth/routes/auth.routes.js
import express from 'express';
import * as authController from '../controllers/auth.controller.js';
import verifyToken from '../middleware/verifyToken.js';

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.get('/me', verifyToken, authController.me);
router.patch('/me', verifyToken, authController.updateProfile);
router.post('/change-password', verifyToken, authController.changePassword);

export default router;
