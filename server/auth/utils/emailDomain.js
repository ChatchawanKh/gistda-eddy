// server/auth/utils/emailDomain.js
// ตรวจสอบว่าอีเมลอยู่ในโดเมนที่อนุญาตหรือไม่
// ระหว่างพัฒนา ตั้ง ENFORCE_EMAIL_DOMAIN=false ใน .env เพื่อให้ใช้อีเมลอะไรก็ได้
import dotenv from 'dotenv';
dotenv.config();

export function isAllowedEmail(email) {
  const enforce = String(process.env.ENFORCE_EMAIL_DOMAIN).toLowerCase() === 'true';
  if (!enforce) return true; // โหมดพัฒนา: อนุญาตทุกโดเมน

  const allowedDomain = (process.env.ALLOWED_EMAIL_DOMAIN || 'gistda.or.th').toLowerCase();
  const domain = String(email).split('@')[1]?.toLowerCase();
  return domain === allowedDomain;
}
