// server/auth/config/validateEnv.js
// ตรวจค่า env ที่จำเป็นต่อความปลอดภัยตอน start — ถ้าไม่ผ่านให้หยุด server ทันที
// ดีกว่าปล่อยให้รันด้วย secret ว่าง/ค่าตัวอย่าง ซึ่งใครก็ปลอม JWT เป็น admin ได้

const MIN_SECRET_LENGTH = 32;
const PLACEHOLDER_PATTERN = /change|replace|secret|example|your_/i;

export default function validateEnv() {
  const errors = [];

  for (const key of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET']) {
    const value = process.env[key];
    if (!value) {
      errors.push(`${key} ยังไม่ได้ตั้งค่า`);
    } else if (value.length < MIN_SECRET_LENGTH) {
      errors.push(`${key} ต้องยาวอย่างน้อย ${MIN_SECRET_LENGTH} ตัวอักษร`);
    } else if (PLACEHOLDER_PATTERN.test(value)) {
      errors.push(`${key} ยังเป็นค่าตัวอย่าง กรุณาสร้างค่าสุ่มใหม่`);
    }
  }

  if (
    process.env.JWT_ACCESS_SECRET &&
    process.env.JWT_ACCESS_SECRET === process.env.JWT_REFRESH_SECRET
  ) {
    errors.push('JWT_ACCESS_SECRET และ JWT_REFRESH_SECRET ต้องไม่ซ้ำกัน');
  }

  if (errors.length > 0) {
    console.error('[Config] ค่า environment ไม่ปลอดภัย — หยุดการทำงาน:');
    errors.forEach((e) => console.error(`  - ${e}`));
    console.error(
      `  สร้าง secret ใหม่ด้วย: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
    );
    process.exit(1);
  }
}
