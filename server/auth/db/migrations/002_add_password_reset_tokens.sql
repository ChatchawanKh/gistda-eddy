-- server/auth/db/migrations/002_add_password_reset_tokens.sql
-- ใช้กรณีที่ฐานข้อมูลรัน schema.sql (เวอร์ชันเก่า) ไปแล้ว และไม่อยากรันใหม่ทั้งหมด
-- รันไฟล์นี้แทนใน PG Admin 17 (Query Tool บน database gistda_fluxsuite)

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    token_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    token_hash  VARCHAR(255) NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    used        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
