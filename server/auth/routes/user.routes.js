// server/auth/routes/user.routes.js
import express from 'express';
import * as userController from '../controllers/user.controller.js';
import verifyToken from '../middleware/verifyToken.js';
import checkRole from '../middleware/checkRole.js';

const router = express.Router();

// ทุก endpoint ในไฟล์นี้ต้อง login และเป็น admin เท่านั้น (ข้อ 5.7.2 / 5.7.3.1)
router.use(verifyToken, checkRole('admin'));

router.get('/', userController.listUsers);
router.post('/', userController.createUser);
router.patch('/:id/approve', userController.approveUser);
router.patch('/:id/role', userController.updateUserRole);
router.patch('/:id/status', userController.updateUserStatus);
router.patch('/:id/reset-password', userController.adminResetPassword);
router.delete('/:id', userController.deleteUser);

router.post('/bulk-delete', userController.bulkDeleteUsers);
router.patch('/bulk-status', userController.bulkUpdateStatus);

export default router;
