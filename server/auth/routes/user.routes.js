// server/auth/routes/user.routes.js
import express from 'express';
import * as userController from '../controllers/user.controller.js';
import verifyToken from '../middleware/verifyToken.js';
import checkRole from '../middleware/checkRole.js';

const router = express.Router();

// ทุก endpoint ในไฟล์นี้ต้อง login และเป็น admin เท่านั้น
router.use(verifyToken, checkRole('admin'));

router.get('/', userController.listUsers);
router.post('/', userController.createUser);
router.patch('/:id/role', userController.updateUserRole);
router.patch('/:id/status', userController.updateUserStatus);
router.delete('/:id', userController.deleteUser);

export default router;
