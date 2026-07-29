// src/utils/validatePassword.js
// เช็ค policy รหัสผ่านฝั่ง client ให้ตรงกับ server (server/auth/utils/password.js)
// ใช้เพื่อ feedback ทันทีให้ผู้ใช้เห็นก่อน submit — server ยังคง validate ซ้ำเสมอ (อย่าเชื่อ client ฝ่ายเดียว)

const BLACKLIST = [
  'password',
  'password123',
  'admin',
  'administrator',
  'qwerty',
  '123456',
  '12345678',
  '111111',
  'abcdef',
];

/**
 * @param {string} password
 * @param {string} email
 * @returns {string[]} errors
 */
export function validatePassword(password, email = '') {
  const errors = [];

  if (!password) {
    errors.push('กรุณากรอกรหัสผ่าน');
    return errors;
  }

  if (password.length < 10) {
    errors.push('รหัสผ่านต้องมีความยาว 10 ตัวอักษร ขึ้นไป');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('ต้องมีตัวอักษรภาษาอังกฤษตัวพิมพ์ใหญ่');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('ต้องมีตัวอักษรภาษาอังกฤษตัวพิมพ์เล็ก');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('ต้องมีตัวเลขอย่างน้อย 1 ตัว');
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.push('ต้องมีอักขระพิเศษอย่างน้อย 1 ตัว');
  }
  if (/\s/.test(password)) {
    errors.push('ห้ามมีช่องว่างในรหัสผ่าน');
  }
  if (/(.)\1{2,}/.test(password)) {
    errors.push('ห้ามใช้ตัวอักษรซ้ำติดกัน เช่น aaa หรือ 111');
  }

  const lower = password.toLowerCase();
  if (BLACKLIST.some((item) => lower.includes(item))) {
    errors.push('รหัสผ่านง่ายเกินไป');
  }

  if (email) {
    const username = email.split('@')[0]?.toLowerCase();
    if (username && lower.includes(username)) {
      errors.push('รหัสผ่านต้องไม่เกี่ยวข้องกับอีเมล');
    }
  }

  return errors;
}

/**
 * ใช้เป็น helperText สั้น ๆ ใต้ช่อง password (ก่อนเริ่มพิมพ์ / ยังผ่านไม่ครบ)
 */
export const PASSWORD_HELPER_TEXT =
  'มากกว่า 10 ตัวอักษร มีทั้งพิมพ์ใหญ่ พิมพ์เล็ก ตัวเลข และอักขระพิเศษ';