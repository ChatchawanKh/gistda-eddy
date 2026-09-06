import bcrypt from "bcrypt";
import { fileURLToPath } from "url";

// policy validator เดียวกับที่ frontend ใช้ — เก็บ implementation ไว้ที่เดียว
import { validatePassword } from "./validatePassword.js";
export { validatePassword };

const SALT_ROUNDS = 12;

/**
 * Generate bcrypt hash
 */
export async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

/**
 * Compare password
 */
export async function comparePassword(plainPassword, passwordHash) {
  return bcrypt.compare(plainPassword, passwordHash);
}

// ------------------------------------------------------------------
// Manual hash generator
// Usage:
// node server/auth/utils/password.js "Admin@123456"
// ------------------------------------------------------------------
const isDirectRun = process.argv[1] === fileURLToPath(import.meta.url);

if (isDirectRun) {
  const plain = process.argv[2];

  if (!plain) {
    console.log('Usage: node password.js "<your-password>"');
    process.exit(1);
  }

  const errors = validatePassword(plain);

  if (errors.length > 0) {
    console.error("Password validation failed:");
    errors.forEach((err) => {
      console.error("-", err);
    });
    process.exit(1);
  }

  hashPassword(plain).then((hash) => {
    console.log("Bcrypt hash:\n", hash);
  });
}