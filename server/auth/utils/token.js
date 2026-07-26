// server/auth/utils/token.js
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

/**
 * สร้าง Access Token (อายุสั้น) — ใช้แนบใน Authorization header ทุก request
 * payload ที่ฝังไว้: user_id, email, role (ใช้ตรวจสิทธิ์ฝั่ง middleware โดยไม่ต้อง query DB ทุกครั้ง)
 */
export function generateAccessToken(user) {
  return jwt.sign(
    { user_id: user.user_id, email: user.email, role: user.role_name },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' }
  );
}

/**
 * สร้าง Refresh Token (อายุยาว) — ใช้ขอ Access Token ใหม่เมื่อหมดอายุ
 * เก็บเฉพาะ hash ไว้ใน DB (refresh_tokens) เพื่อให้ revoke/logout ได้จริง
 */
export function generateRefreshToken(user) {
  return jwt.sign(
    { user_id: user.user_id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}
