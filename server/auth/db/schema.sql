-- =========================================================
-- GISTDA-FLUXSUITE : Authentication & Authorization Schema
-- Database: PostgreSQL (ทดสอบกับ PG Admin 17)
-- =========================================================
-- แนวคิดการออกแบบ:
--   1) roles        : เก็บระดับสิทธิ์ (อย่างน้อย Admin / User) แยกตารางเพื่อให้เพิ่ม Role ใหม่ในอนาคตได้
--                      โดยไม่ต้องแก้โครงสร้างตาราง users (รองรับข้อ 5.7.3 ที่บอกว่า "อย่างน้อย 2 ระดับ")
--   2) users         : เก็บบัญชีผู้ใช้งาน ผูกกับ roles ผ่าน role_id (Foreign Key)
--   3) refresh_tokens: เก็บ refresh token เพื่อให้ระบบ logout / revoke สิทธิ์การใช้งานได้จริง
--                      และรองรับการต่ออายุ access token (JWT) แบบปลอดภัย
--   4) audit_logs     : (เสริม) บันทึกการกระทำที่สำคัญด้าน user management เพื่อ traceability
-- =========================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- สำหรับ gen_random_uuid()

-- ---------------------------------------------------------
-- 1) ตาราง roles
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
    role_id     SMALLSERIAL PRIMARY KEY,
    role_name   VARCHAR(50) NOT NULL UNIQUE,   -- 'admin' | 'user'
    description VARCHAR(255),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO roles (role_name, description)
VALUES
    ('admin', 'ผู้ดูแลระบบ สามารถบริหารจัดการสิทธิ์ผู้ใช้งานทั้งหมด'),
    ('user',  'ผู้ใช้งานทั่วไป สามารถ login เข้าใช้งานระบบได้')
ON CONFLICT (role_name) DO NOTHING;

-- ---------------------------------------------------------
-- 2) ตาราง users
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    user_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email          VARCHAR(150) NOT NULL UNIQUE,
    password_hash  VARCHAR(255) NOT NULL,
    full_name      VARCHAR(150),
    role_id        SMALLINT NOT NULL REFERENCES roles(role_id) ON DELETE RESTRICT,
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,     -- ใช้สำหรับ "ลบ" แบบ soft delete / ระงับสิทธิ์
    last_login_at  TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- บังคับโดเมนอีเมลระดับฐานข้อมูล (โปรดักชัน) — ปิดไว้ก่อนช่วงพัฒนา ให้เปิดใช้งานตอนขึ้นระบบจริง
-- ALTER TABLE users
--     ADD CONSTRAINT chk_users_email_domain
--     CHECK (email ILIKE '%@gistda.or.th');

CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_email   ON users(email);

-- trigger สำหรับอัปเดต updated_at อัตโนมัติ
CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON users;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION trg_set_updated_at();

-- ---------------------------------------------------------
-- 3) ตาราง refresh_tokens (สำหรับ logout / revoke / refresh JWT)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS refresh_tokens (
    token_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    token_hash  VARCHAR(255) NOT NULL,   -- เก็บ hash ของ refresh token ไม่เก็บ plain text
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);

-- ---------------------------------------------------------
-- 4) ตาราง audit_logs (เสริม เพื่อความโปร่งใสในการบริหารจัดการสิทธิ์)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    log_id      BIGSERIAL PRIMARY KEY,
    actor_id    UUID REFERENCES users(user_id) ON DELETE SET NULL, -- ใครเป็นคนทำ
    action      VARCHAR(100) NOT NULL,   -- เช่น 'CREATE_USER', 'DELETE_USER', 'CHANGE_ROLE'
    target_id   UUID,                    -- ทำกับ user คนไหน
    detail      JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------
-- Seed: บัญชี Admin เริ่มต้นสำหรับพัฒนา/ทดสอบ
-- password: Admin@123  (bcrypt hash ด้านล่างเป็นตัวอย่าง ให้ generate ใหม่ก่อนใช้งานจริง)
-- รันสคริปต์ server/auth/utils/hashPassword.js เพื่อสร้าง hash ของรหัสผ่านที่ต้องการ
-- ---------------------------------------------------------
-- INSERT INTO users (email, password_hash, full_name, role_id)
-- VALUES (
--   'admin@gistda.or.th',
--   '$2b$10$REPLACE_WITH_GENERATED_HASH',
--   'System Administrator',
--   (SELECT role_id FROM roles WHERE role_name = 'admin')
-- );
