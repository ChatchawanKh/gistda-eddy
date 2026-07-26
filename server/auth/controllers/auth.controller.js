// server/auth/controllers/auth.controller.js
import crypto from 'crypto';
import pool from '../db/pool.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/token.js';
import { isAllowedEmail } from '../utils/emailDomain.js';

// hash refresh token ก่อนเก็บลง DB (ไม่เก็บ token จริงแบบ plain text)
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * POST /api/auth/register
 * สมัครสมาชิกใหม่ — สิทธิ์เริ่มต้นคือ "user" เสมอ (การเลื่อนเป็น admin ทำผ่านหน้า User Management เท่านั้น)
 */
export async function register(req, res) {
  const { email, password, full_name } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'กรุณากรอกอีเมลและรหัสผ่าน' });
  }
  if (password.length < 8) {
    return res.status(400).json({ message: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' });
  }
  if (!isAllowedEmail(email)) {
    return res.status(400).json({
      message: `ระบบอนุญาตเฉพาะอีเมลโดเมน @${process.env.ALLOWED_EMAIL_DOMAIN} เท่านั้น`,
    });
  }

  const client = await pool.connect();
  try {
    const existing = await client.query('SELECT user_id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'อีเมลนี้ถูกใช้งานแล้ว' });
    }

    const passwordHash = await hashPassword(password);
    const roleResult = await client.query("SELECT role_id FROM roles WHERE role_name = 'user'");
    const roleId = roleResult.rows[0].role_id;

    const insertResult = await client.query(
      `INSERT INTO users (email, password_hash, full_name, role_id)
       VALUES ($1, $2, $3, $4)
       RETURNING user_id, email, full_name, is_active, created_at`,
      [email, passwordHash, full_name || null, roleId]
    );

    return res.status(201).json({
      message: 'สมัครสมาชิกสำเร็จ',
      user: insertResult.rows[0],
    });
  } catch (err) {
    console.error('[register]', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
  } finally {
    client.release();
  }
}

/**
 * POST /api/auth/login
 */
export async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'กรุณากรอกอีเมลและรหัสผ่าน' });
  }

  try {
    const result = await pool.query(
      `SELECT u.user_id, u.email, u.password_hash, u.full_name, u.is_active,
              r.role_name
       FROM users u
       JOIN roles r ON r.role_id = u.role_id
       WHERE u.email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ message: 'บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ' });
    }

    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // เก็บ refresh token (แบบ hash) ลง DB เพื่อรองรับการ revoke/logout
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // ควรอิงจาก JWT_REFRESH_EXPIRES_IN จริง ๆ

    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [user.user_id, hashToken(refreshToken), expiresAt]
    );

    await pool.query('UPDATE users SET last_login_at = NOW() WHERE user_id = $1', [user.user_id]);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      message: 'เข้าสู่ระบบสำเร็จ',
      accessToken,
      user: {
        user_id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        role: user.role_name,
      },
    });
  } catch (err) {
    console.error('[login]', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
  }
}

/**
 * POST /api/auth/refresh
 * ใช้ refresh token (จาก httpOnly cookie) เพื่อขอ access token ใหม่
 */
export async function refresh(req, res) {
  const token = req.cookies?.refreshToken;
  if (!token) {
    return res.status(401).json({ message: 'ไม่พบ refresh token' });
  }

  try {
    const decoded = verifyRefreshToken(token);
    const tokenHash = hashToken(token);

    const stored = await pool.query(
      `SELECT * FROM refresh_tokens
       WHERE user_id = $1 AND token_hash = $2 AND revoked = FALSE AND expires_at > NOW()`,
      [decoded.user_id, tokenHash]
    );

    if (stored.rows.length === 0) {
      return res.status(403).json({ message: 'Refresh token ไม่ถูกต้องหรือหมดอายุ' });
    }

    const userResult = await pool.query(
      `SELECT u.user_id, u.email, u.is_active, r.role_name
       FROM users u JOIN roles r ON r.role_id = u.role_id
       WHERE u.user_id = $1`,
      [decoded.user_id]
    );

    const user = userResult.rows[0];
    if (!user || !user.is_active) {
      return res.status(403).json({ message: 'บัญชีผู้ใช้ไม่พร้อมใช้งาน' });
    }

    const newAccessToken = generateAccessToken(user);
    return res.json({ accessToken: newAccessToken });
  } catch (err) {
    return res.status(403).json({ message: 'Refresh token ไม่ถูกต้องหรือหมดอายุ' });
  }
}

/**
 * POST /api/auth/logout
 * เพิกถอน refresh token ปัจจุบัน
 */
export async function logout(req, res) {
  const token = req.cookies?.refreshToken;
  if (token) {
    try {
      await pool.query(
        'UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = $1',
        [hashToken(token)]
      );
    } catch (err) {
      console.error('[logout]', err);
    }
  }
  res.clearCookie('refreshToken');
  return res.json({ message: 'ออกจากระบบสำเร็จ' });
}

/**
 * GET /api/auth/me
 * คืนข้อมูลผู้ใช้ปัจจุบัน (ต้องผ่าน verifyToken middleware ก่อน)
 */
export async function me(req, res) {
  try {
    const result = await pool.query(
      `SELECT u.user_id, u.email, u.full_name, u.is_active, u.last_login_at, r.role_name
       FROM users u JOIN roles r ON r.role_id = u.role_id
       WHERE u.user_id = $1`,
      [req.user.user_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบผู้ใช้งาน' });
    }
    return res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('[me]', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
  }
}
