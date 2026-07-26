// server/auth/middleware/verifyToken.js
import { verifyAccessToken } from '../utils/token.js';

/**
 * ตรวจสอบ Access Token จาก header: Authorization: Bearer <token>
 * หากถูกต้อง จะแนบข้อมูลผู้ใช้ไว้ที่ req.user = { user_id, email, role }
 */
export default function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : null;

  if (!token) {
    return res.status(401).json({ message: 'ไม่พบ token กรุณาเข้าสู่ระบบ' });
  }

  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded; // { user_id, email, role }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token หมดอายุ กรุณา refresh token', code: 'TOKEN_EXPIRED' });
    }
    return res.status(403).json({ message: 'Token ไม่ถูกต้อง' });
  }
}
