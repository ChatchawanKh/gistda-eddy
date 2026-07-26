// server/auth/middleware/checkRole.js
// ใช้งานร่วมกับ verifyToken เสมอ (ต้อง run หลัง verifyToken เพื่อให้มี req.user)
//
// ตัวอย่าง:
//   router.delete('/users/:id', verifyToken, checkRole('admin'), userController.deleteUser);

export default function checkRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'กรุณาเข้าสู่ระบบก่อน' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'คุณไม่มีสิทธิ์เข้าถึงส่วนนี้' });
    }
    next();
  };
}
