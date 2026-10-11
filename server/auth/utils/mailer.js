// server/auth/utils/mailer.js
// ส่งอีเมลลิงก์ reset password
// ระหว่างพัฒนา (ยังไม่ตั้งค่า SMTP) จะ "พิมพ์ลิงก์ลง console" แทนการส่งอีเมลจริง
// เพื่อให้ทดสอบได้ทันทีโดยไม่ต้องมี SMTP server
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const isSmtpConfigured = Boolean(
  process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
);

let transporter = null;
if (isSmtpConfigured) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true', // true สำหรับ port 465, false สำหรับ port อื่น (STARTTLS)
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/**
 * ส่งอีเมลลิงก์รีเซ็ตรหัสผ่าน
 * @param {string} toEmail
 * @param {string} resetUrl - ลิงก์เต็มที่ frontend สร้างไว้ เช่น http://localhost:5173/reset-password?token=xxxx
 */
export async function sendPasswordResetEmail(toEmail, resetUrl) {
  const subject = 'คำขอตั้งรหัสผ่านใหม่ — GISTDA Eddy';
  const html = `
    <p>เราได้รับคำขอตั้งรหัสผ่านใหม่สำหรับบัญชีนี้</p>
    <p><a href="${resetUrl}">คลิกที่นี่เพื่อตั้งรหัสผ่านใหม่</a></p>
    <p>ลิงก์นี้จะหมดอายุใน 30 นาที หากคุณไม่ได้เป็นผู้ขอ กรุณาเพิกเฉยต่ออีเมลฉบับนี้</p>
  `;

  if (!isSmtpConfigured) {
    // โหมดพัฒนา: ยังไม่ตั้งค่า SMTP -> log ลิงก์ลง console แทนการส่งจริง
    console.log('\n[DEV MAIL] ยังไม่ได้ตั้งค่า SMTP — แสดงลิงก์ reset password แทนการส่งอีเมลจริง');
    console.log(`[DEV MAIL] ถึง: ${toEmail}`);
    console.log(`[DEV MAIL] ลิงก์: ${resetUrl}\n`);
    return { simulated: true };
  }

  return transporter.sendMail({
    from: process.env.SMTP_FROM || '"GISTDA Eddy" <no-reply@gistda.or.th>',
    to: toEmail,
    subject,
    html,
  });
}
