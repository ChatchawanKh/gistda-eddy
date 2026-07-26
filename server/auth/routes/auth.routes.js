// server/auth/routes/auth.routes.js
import express from 'express';
import * as authController from '../controllers/auth.controller.js';
import verifyToken from '../middleware/verifyToken.js';

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', verifyToken, authController.me);

export default router;
