// server/auth/controllers/auth.controller.js
import crypto from 'crypto';
import pool from '../db/pool.js';
import { hashPassword, comparePassword, validatePassword } from '../utils/password.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/token.js';
import { isAllowedEmail } from '../utils/emailDomain.js';
import { generateResetToken, hashResetToken, RESET_TOKEN_TTL_MINUTES } from '../utils/resetToken.js';
import { sendPasswordResetEmail } from '../utils/mailer.js';

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

  // ตรวจสอบ policy รหัสผ่านแบบเต็ม (ความยาว 10-15, ตัวพิมพ์ใหญ่/เล็ก, ตัวเลข, อักขระพิเศษ, ไม่ผูกกับอีเมล ฯลฯ)
  const passwordErrors = validatePassword(password, email);
  if (passwordErrors.length > 0) {
    return res.status(400).json({
      message: passwordErrors.join(', '),
      errors: passwordErrors,
    });
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

    // สมัครเองผ่านหน้า Login เสมอเริ่มที่ is_approved = FALSE
    // ต้องรอ admin กดอนุมัติที่หน้า "จัดการผู้ใช้งาน" ก่อน ถึงจะ login เข้าระบบได้ (ข้อ 5.7.2)
    const insertResult = await client.query(
      `INSERT INTO users (email, password_hash, full_name, role_id, is_approved)
       VALUES ($1, $2, $3, $4, FALSE)
       RETURNING user_id, email, full_name, is_active, is_approved, created_at`,
      [email, passwordHash, full_name || null, roleId]
    );

    return res.status(201).json({
      message: 'สมัครสมาชิกสำเร็จ กรุณารอผู้ดูแลระบบอนุมัติสิทธิ์ก่อนจึงจะเข้าสู่ระบบได้',
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
  const { email, password, rememberMe } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'กรุณากรอกอีเมลและรหัสผ่าน' });
  }

  try {
    const result = await pool.query(
      `SELECT u.user_id, u.email, u.password_hash, u.full_name, u.is_active, u.is_approved,
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

    // เช็ค "รอการอนุมัติ" ก่อนเช็ค "ถูกระงับ" เสมอ เพราะเป็นคนละสถานะกัน
    // (ไม่ใช้ password ยืนยันก่อนเช็คสถานะ เพื่อไม่ให้เดารหัสผ่านมั่ว ๆ แล้วรู้สถานะบัญชีคนอื่นได้)
    if (!user.is_approved) {
      return res.status(403).json({
        message: 'บัญชีนี้ยังไม่ได้รับการอนุมัติจากผู้ดูแลระบบ กรุณารอการอนุมัติก่อนเข้าสู่ระบบ',
      });
    }
    if (!user.is_active) {
      return res.status(403).json({ message: 'บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ' });
    }

    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    }

    const accessToken = generateAccessToken(user);

    // "จดจำการเข้าสู่ระบบ": ติ๊ก -> refresh token อายุยาว (30 วัน) + cookie คงอยู่ข้ามการปิดเบราว์เซอร์
    //                        ไม่ติ๊ก -> refresh token อายุสั้น (1 วัน) + cookie เป็น session cookie (หายเมื่อปิดเบราว์เซอร์)
    const isRememberMe = Boolean(rememberMe);
    const refreshExpiresIn = isRememberMe
      ? process.env.REMEMBER_ME_EXPIRES_IN || '30d'
      : process.env.SESSION_EXPIRES_IN || '1d';
    const refreshToken = generateRefreshToken(user, refreshExpiresIn);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (isRememberMe ? 30 : 1));

    // เก็บ refresh token (แบบ hash) ลง DB เพื่อรองรับการ revoke/logout
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
      // ไม่ใส่ maxAge เมื่อไม่ติ๊ก remember me -> กลายเป็น session cookie (เบราว์เซอร์ลบให้เองตอนปิด)
      ...(isRememberMe ? { maxAge: 30 * 24 * 60 * 60 * 1000 } : {}),
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
  } catch {
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
 * POST /api/auth/forgot-password
 * User กรอกอีเมลของตัวเอง -> ระบบสร้าง reset token และส่งลิงก์ไปทางอีเมล
 *
 * หมายเหตุด้านความปลอดภัย: ตอบ response แบบเดียวกันเสมอ ไม่ว่าอีเมลจะมีอยู่จริงหรือไม่
 * เพื่อป้องกันการเดา/ไล่เช็คว่าอีเมลไหนมีในระบบ (user enumeration)
 */
export async function forgotPassword(req, res) {
  const { email } = req.body;
  const genericMessage = 'หากอีเมลนี้มีอยู่ในระบบ เราได้ส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปให้แล้ว';

  if (!email) {
    return res.status(400).json({ message: 'กรุณากรอกอีเมล' });
  }

  try {
    const userResult = await pool.query(
      'SELECT user_id, email, is_active FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].is_active) {
      // ไม่บอกตรง ๆ ว่าไม่พบอีเมล/บัญชีถูกระงับ -> ตอบข้อความเดียวกันเสมอ
      return res.json({ message: genericMessage });
    }

    const user = userResult.rows[0];
    const rawToken = generateResetToken();
    const tokenHash = hashResetToken(rawToken);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + RESET_TOKEN_TTL_MINUTES);

    // ยกเลิก token เก่าที่ยังไม่หมดอายุของ user คนนี้ทั้งหมด (กันมีหลาย token ค้าง)
    await pool.query(
      'UPDATE password_reset_tokens SET used = TRUE WHERE user_id = $1 AND used = FALSE',
      [user.user_id]
    );

    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [user.user_id, tokenHash, expiresAt]
    );

    const frontendUrl = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;

    await sendPasswordResetEmail(user.email, resetUrl);

    return res.json({ message: genericMessage });
  } catch (err) {
    console.error('[forgotPassword]', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
  }
}

/**
 * POST /api/auth/reset-password
 * User คลิกลิงก์จากอีเมล (มี token แนบมาใน query) แล้วส่ง token + รหัสผ่านใหม่มาที่นี่
 */
export async function resetPassword(req, res) {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ message: 'ข้อมูลไม่ครบถ้วน' });
  }

  const client = await pool.connect();
  try {
    const tokenHash = hashResetToken(token);

    // join กับ users เพื่อดึง email เจ้าของ token มาเช็ค policy รหัสผ่าน (ห้ามผูกกับ email)
    const tokenResult = await client.query(
      `SELECT prt.*, u.email AS user_email
       FROM password_reset_tokens prt
       JOIN users u ON u.user_id = prt.user_id
       WHERE prt.token_hash = $1 AND prt.used = FALSE AND prt.expires_at > NOW()`,
      [tokenHash]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ message: 'ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้องหรือหมดอายุแล้ว กรุณาขอลิงก์ใหม่' });
    }

    const resetRecord = tokenResult.rows[0];

    const passwordErrors = validatePassword(newPassword, resetRecord.user_email);
    if (passwordErrors.length > 0) {
      return res.status(400).json({
        message: passwordErrors.join(', '),
        errors: passwordErrors,
      });
    }

    const passwordHash = await hashPassword(newPassword);

    await client.query('BEGIN');

    await client.query('UPDATE users SET password_hash = $1 WHERE user_id = $2', [
      passwordHash,
      resetRecord.user_id,
    ]);

    await client.query('UPDATE password_reset_tokens SET used = TRUE WHERE token_id = $1', [
      resetRecord.token_id,
    ]);

    // เพิกถอน refresh token เดิมทั้งหมด -> บังคับให้ทุก session เดิม login ใหม่ (ป้องกันกรณีรหัสผ่านเดิมหลุด)
    await client.query('UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1', [
      resetRecord.user_id,
    ]);

    await client.query('COMMIT');

    return res.json({ message: 'ตั้งรหัสผ่านใหม่สำเร็จ กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[resetPassword]', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
  } finally {
    client.release();
  }
}

/**
 * PATCH /api/auth/me
 * ให้ผู้ใช้ที่ login อยู่แก้ไขข้อมูลส่วนตัวของตัวเอง (ตอนนี้รองรับแค่ full_name)
 * ไม่อนุญาตให้แก้ email/role ผ่านช่องทางนี้ — การเปลี่ยน role ต้องผ่าน admin เท่านั้น
 */
export async function updateProfile(req, res) {
  const { full_name } = req.body;

  try {
    const result = await pool.query(
      `UPDATE users SET full_name = $1 WHERE user_id = $2
       RETURNING user_id, email, full_name, is_active`,
      [full_name?.trim() || null, req.user.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบผู้ใช้งาน' });
    }

    return res.json({ message: 'บันทึกข้อมูลส่วนตัวสำเร็จ', user: result.rows[0] });
  } catch (err) {
    console.error('[updateProfile]', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
  }
}

/**
 * POST /api/auth/change-password
 * ให้ผู้ใช้ที่ login อยู่เปลี่ยนรหัสผ่านของตัวเอง — ต้องยืนยันรหัสผ่านปัจจุบันก่อนเสมอ
 * (ต่างจาก admin reset ที่ตั้งรหัสผ่านให้คนอื่นได้ตรง ๆ โดยไม่ต้องรู้รหัสเดิม)
 */
export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
  }

  try {
    const userResult = await pool.query(
      'SELECT email, password_hash FROM users WHERE user_id = $1',
      [req.user.user_id]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบผู้ใช้งาน' });
    }

    const { email: userEmail, password_hash: currentHash } = userResult.rows[0];

    const isMatch = await comparePassword(currentPassword, currentHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' });
    }

    const passwordErrors = validatePassword(newPassword, userEmail);
    if (passwordErrors.length > 0) {
      return res.status(400).json({
        message: passwordErrors.join(', '),
        errors: passwordErrors,
      });
    }

    const newHash = await hashPassword(newPassword);
    await pool.query('UPDATE users SET password_hash = $1 WHERE user_id = $2', [
      newHash,
      req.user.user_id,
    ]);

    // เพิกถอน session (refresh token) ทั้งหมด รวมถึงตัวปัจจุบัน -> บังคับ login ใหม่ด้วยรหัสผ่านใหม่เพื่อความปลอดภัย
    await pool.query('UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1', [
      req.user.user_id,
    ]);
    res.clearCookie('refreshToken');

    return res.json({ message: 'เปลี่ยนรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบใหม่ด้วยรหัสผ่านใหม่' });
  } catch (err) {
    console.error('[changePassword]', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
  }
}

/**
 * GET /api/auth/me
 * คืนข้อมูลผู้ใช้ปัจจุบัน (ต้องผ่าน verifyToken middleware ก่อน)
 */
export async function me(req, res) {
  try {
    const result = await pool.query(
      `SELECT u.user_id, u.email, u.full_name, u.is_active, u.last_login_at, r.role_name AS role
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