// server/auth/middleware/rateLimit.js
// จำกัดจำนวนครั้งที่เรียก endpoint สาธารณะ (ไม่ต้อง login) เพื่อกัน brute-force รหัสผ่าน
// และกันการใช้ระบบยิงอีเมล reset / สมัครสมาชิกรัว ๆ
//
// หมายเหตุ: ใช้ memory store (นับแยกต่อ process) — ถ้ารันหลาย instance ให้เปลี่ยนเป็น Redis store
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;

function limiter({ windowMs, limit, message, ...rest }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { message },
    ...rest,
  });
}

// ต่อ IP: รวมทุกบัญชี กันการไล่เดารหัสผ่านจากเครื่องเดียว
export const loginIpLimiter = limiter({
  windowMs: FIFTEEN_MINUTES,
  limit: 20,
  message: 'มีการพยายามเข้าสู่ระบบมากเกินไป กรุณารอ 15 นาทีแล้วลองใหม่',
});

// ต่ออีเมล: กันการเดารหัสผ่านของบัญชีเดียวจากหลาย IP
// นับเฉพาะครั้งที่ล้มเหลว (login สำเร็จไม่ถูกนับ) -> ผู้ใช้จริงที่พิมพ์ถูกไม่โดนล็อก
export const loginAccountLimiter = limiter({
  windowMs: FIFTEEN_MINUTES,
  limit: 5,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    return email ? `email:${email}` : `ip:${ipKeyGenerator(req.ip)}`;
  },
  message: 'ใส่รหัสผ่านผิดหลายครั้งเกินไป บัญชีนี้ถูกล็อกชั่วคราว กรุณารอ 15 นาทีแล้วลองใหม่',
});

export const forgotPasswordLimiter = limiter({
  windowMs: ONE_HOUR,
  limit: 5,
  message: 'ขอลิงก์ตั้งรหัสผ่านใหม่บ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่',
});

export const resetPasswordLimiter = limiter({
  windowMs: FIFTEEN_MINUTES,
  limit: 10,
  message: 'มีการพยายามตั้งรหัสผ่านใหม่มากเกินไป กรุณารอสักครู่แล้วลองใหม่',
});

export const registerLimiter = limiter({
  windowMs: ONE_HOUR,
  limit: 10,
  message: 'มีการสมัครสมาชิกจากเครื่องนี้มากเกินไป กรุณารอสักครู่แล้วลองใหม่',
});

// ยืนยันรหัสผ่านปัจจุบันตอนเปลี่ยนรหัส (ต้อง login แล้ว แต่ยังเป็นช่องทางเดารหัสได้ถ้า token หลุด)
export const changePasswordLimiter = limiter({
  windowMs: FIFTEEN_MINUTES,
  limit: 10,
  message: 'มีการพยายามเปลี่ยนรหัสผ่านมากเกินไป กรุณารอสักครู่แล้วลองใหม่',
});
