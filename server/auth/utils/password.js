// server/auth/utils/password.js
import bcrypt from 'bcrypt';
import { fileURLToPath } from 'url';

const SALT_ROUNDS = 10;

export async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

export async function comparePassword(plainPassword, passwordHash) {
  return bcrypt.compare(plainPassword, passwordHash);
}

// ------------------------------------------------------------------
// สคริปต์ช่วยสร้างรหัสผ่าน hash แบบ manual สำหรับ seed ผู้ใช้ admin คนแรก
// วิธีใช้:  node server/auth/utils/password.js "Admin@123"
// ------------------------------------------------------------------
const isDirectRun = process.argv[1] === fileURLToPath(import.meta.url);

if (isDirectRun) {
  const plain = process.argv[2];
  if (!plain) {
    console.log('Usage: node password.js "<your-password>"');
    process.exit(1);
  }
  hashPassword(plain).then((hash) => {
    console.log('Bcrypt hash:\n', hash);
  });
}
