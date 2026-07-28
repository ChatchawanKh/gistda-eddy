// server/auth/utils/resetToken.js
// Token สำหรับ "ลืมรหัสผ่าน" — ไม่ใช้ JWT เพราะ token นี้ต้อง revoke/ใช้ครั้งเดียวได้จริง
// ใช้ random bytes ธรรมดา + เก็บ hash (sha256) ไว้ใน DB เหมือนแพทเทิร์นของ refresh_token
import crypto from 'crypto';

const RESET_TOKEN_BYTES = 32;          // ความยาว token (256 bit)
export const RESET_TOKEN_TTL_MINUTES = 30; // อายุ token (นาที)

export function generateResetToken() {
  return crypto.randomBytes(RESET_TOKEN_BYTES).toString('hex');
}

export function hashResetToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}
