-- server/auth/db/migrations/003_add_is_approved.sql
-- ใช้กรณีฐานข้อมูลรัน schema.sql เวอร์ชันเก่าไปแล้ว และไม่อยากรันใหม่ทั้งหมด
-- รันไฟล์นี้แทนใน PG Admin 17 (Query Tool บน database gistda_eddy)

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_approved BOOLEAN NOT NULL DEFAULT TRUE;

-- หมายเหตุ: บัญชีที่มีอยู่แล้วในระบบก่อนหน้านี้ทั้งหมดจะได้ is_approved = TRUE ทันที (ไม่กระทบ user เดิม)
-- มีผลเฉพาะบัญชีใหม่ที่สมัครเองผ่าน /api/auth/register หลังจากนี้เท่านั้น ที่จะเริ่มด้วย FALSE
