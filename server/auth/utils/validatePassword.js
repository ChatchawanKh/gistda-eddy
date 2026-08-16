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

// escape อักขระพิเศษของคำใน BLACKLIST ก่อนเอาไปสร้าง RegExp (กันกรณีในอนาคตมีคำที่มีอักขระพิเศษ)
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// เช็คว่า password มีคำใน BLACKLIST ปรากฏแบบ "เป็นคำ" (มี word boundary คั่นทั้งสองฝั่ง)
// ไม่ใช่แค่เป็น substring ที่แฝงอยู่ในคำอื่น เช่น "superadmin123" ต้องไม่โดนบล็อกเพราะมีคำว่า "admin" ซ้อนอยู่
// แต่ "admin123" หรือ "my-admin-pass" ยังต้องโดนบล็อกเหมือนเดิม
function containsBlacklistedWord(password) {
  return BLACKLIST.some((word) => {
    const pattern = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i');
    return pattern.test(password);
  });
}

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

  if (containsBlacklistedWord(password)) {
    errors.push('รหัสผ่านง่ายเกินไป');
  }

  return errors;
}

/**
 * ใช้เป็น helperText สั้น ๆ ใต้ช่อง password (ก่อนเริ่มพิมพ์ / ยังผ่านไม่ครบ)
 */
export const PASSWORD_HELPER_TEXT =
  'มากกว่า 10 ตัวอักษร มีทั้งพิมพ์ใหญ่ พิมพ์เล็ก ตัวเลข และอักขระพิเศษ';