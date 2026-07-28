// server/auth/utils/password.js
import bcrypt from 'bcrypt';
import { fileURLToPath } from 'url';

const SALT_ROUNDS = 12;

/**
 * Validate password policy
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

  // ความยาวขั้นต่ำ
  if (password.length < 12) {
    errors.push('รหัสผ่านต้องมีอย่างน้อย 12 ตัวอักษร');
  }

  // ต้องมีตัวพิมพ์ใหญ่
  if (!/[A-Z]/.test(password)) {
    errors.push('ต้องมีตัวอักษรภาษาอังกฤษตัวพิมพ์ใหญ่');
  }

  // ต้องมีตัวพิมพ์เล็ก
  if (!/[a-z]/.test(password)) {
    errors.push('ต้องมีตัวอักษรภาษาอังกฤษตัวพิมพ์เล็ก');
  }

  // ต้องมีตัวเลข
  if (!/[0-9]/.test(password)) {
    errors.push('ต้องมีตัวเลขอย่างน้อย 1 ตัว');
  }

  // ต้องมี special character
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.push('ต้องมีอักขระพิเศษอย่างน้อย 1 ตัว');
  }

  // ห้ามมี whitespace
  if (/\s/.test(password)) {
    errors.push('ห้ามมีช่องว่างในรหัสผ่าน');
  }

  // block password ซ้ำ
  if (/(.)\1{2,}/.test(password)) {
    errors.push('ห้ามใช้ตัวอักษรซ้ำติดกัน เช่น aaa หรือ 111');
  }

  // block password ที่เดาง่าย
  const blacklist = [
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

  const lower = password.toLowerCase();

  if (blacklist.some((item) => lower.includes(item))) {
    errors.push('รหัสผ่านง่ายเกินไป');
  }

  // ห้ามมี email username
  if (email) {
    const username = email.split('@')[0]?.toLowerCase();

    if (username && lower.includes(username)) {
      errors.push('รหัสผ่านต้องไม่เกี่ยวข้องกับอีเมล');
    }
  }

  return errors;
}


/**
 * Generate bcrypt hash
 */
export async function hashPassword(plainPassword) {
  return bcrypt.hash(
    plainPassword,
    SALT_ROUNDS
  );
}


/**
 * Compare password
 */
export async function comparePassword(
  plainPassword,
  passwordHash
) {
  return bcrypt.compare(
    plainPassword,
    passwordHash
  );
}


// ------------------------------------------------------------------
// Manual hash generator
// Usage:
// node server/auth/utils/password.js "Admin@123456"
// ------------------------------------------------------------------
const isDirectRun =
  process.argv[1] === fileURLToPath(import.meta.url);


if (isDirectRun) {
  const plain = process.argv[2];

  if (!plain) {
    console.log(
      'Usage: node password.js "<your-password>"'
    );
    process.exit(1);
  }


  const errors = validatePassword(plain);

  if (errors.length > 0) {
    console.error(
      'Password validation failed:'
    );

    errors.forEach((err) => {
      console.error('-', err);
    });

    process.exit(1);
  }


  hashPassword(plain)
    .then((hash) => {
      console.log(
        'Bcrypt hash:\n',
        hash
      );
    });
}