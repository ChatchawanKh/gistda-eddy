// server/auth/controllers/user.controller.js
// จัดการผู้ใช้งานทั้งหมด — เข้าถึงได้เฉพาะ role admin (บังคับผ่าน checkRole('admin') ใน routes)
import pool from '../db/pool.js';
import { hashPassword } from '../utils/password.js';
import { isAllowedEmail } from '../utils/emailDomain.js';

/** GET /api/users — รายชื่อผู้ใช้งานทั้งหมด */
export async function listUsers(req, res) {
  try {
    const result = await pool.query(
      `SELECT u.user_id, u.email, u.full_name, u.is_active, u.last_login_at,
              u.created_at, r.role_name
       FROM users u
       JOIN roles r ON r.role_id = u.role_id
       ORDER BY u.created_at DESC`
    );
    return res.json({ users: result.rows });
  } catch (err) {
    console.error('[listUsers]', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
  }
}

/** POST /api/users — เพิ่มผู้ใช้งานใหม่ (Admin เท่านั้น กำหนด role ได้ตอนสร้าง) */
export async function createUser(req, res) {
  const { email, password, full_name, role_name } = req.body;

  if (!email || !password || !role_name) {
    return res.status(400).json({ message: 'กรุณากรอกอีเมล รหัสผ่าน และสิทธิ์ผู้ใช้งาน' });
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

    const roleResult = await client.query('SELECT role_id FROM roles WHERE role_name = $1', [role_name]);
    if (roleResult.rows.length === 0) {
      return res.status(400).json({ message: 'ไม่พบสิทธิ์ผู้ใช้งานที่ระบุ' });
    }

    const passwordHash = await hashPassword(password);
    const insertResult = await client.query(
      `INSERT INTO users (email, password_hash, full_name, role_id)
       VALUES ($1, $2, $3, $4)
       RETURNING user_id, email, full_name, is_active, created_at`,
      [email, passwordHash, full_name || null, roleResult.rows[0].role_id]
    );

    await client.query(
      `INSERT INTO audit_logs (actor_id, action, target_id, detail)
       VALUES ($1, 'CREATE_USER', $2, $3)`,
      [req.user.user_id, insertResult.rows[0].user_id, JSON.stringify({ email, role_name })]
    );

    return res.status(201).json({ message: 'เพิ่มผู้ใช้งานสำเร็จ', user: insertResult.rows[0] });
  } catch (err) {
    console.error('[createUser]', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
  } finally {
    client.release();
  }
}

/** PATCH /api/users/:id/role — เปลี่ยนสิทธิ์ผู้ใช้งาน */
export async function updateUserRole(req, res) {
  const { id } = req.params;
  const { role_name } = req.body;

  try {
    const roleResult = await pool.query('SELECT role_id FROM roles WHERE role_name = $1', [role_name]);
    if (roleResult.rows.length === 0) {
      return res.status(400).json({ message: 'ไม่พบสิทธิ์ผู้ใช้งานที่ระบุ' });
    }

    const result = await pool.query(
      `UPDATE users SET role_id = $1 WHERE user_id = $2
       RETURNING user_id, email, full_name`,
      [roleResult.rows[0].role_id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบผู้ใช้งาน' });
    }

    await pool.query(
      `INSERT INTO audit_logs (actor_id, action, target_id, detail)
       VALUES ($1, 'CHANGE_ROLE', $2, $3)`,
      [req.user.user_id, id, JSON.stringify({ new_role: role_name })]
    );

    return res.json({ message: 'เปลี่ยนสิทธิ์ผู้ใช้งานสำเร็จ', user: result.rows[0] });
  } catch (err) {
    console.error('[updateUserRole]', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
  }
}

/** PATCH /api/users/:id/status — เปิด/ปิดการใช้งานบัญชี (ระงับสิทธิ์ชั่วคราว) */
export async function updateUserStatus(req, res) {
  const { id } = req.params;
  const { is_active } = req.body;

  try {
    const result = await pool.query(
      `UPDATE users SET is_active = $1 WHERE user_id = $2
       RETURNING user_id, email, is_active`,
      [is_active, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบผู้ใช้งาน' });
    }

    await pool.query(
      `INSERT INTO audit_logs (actor_id, action, target_id, detail)
       VALUES ($1, 'UPDATE_STATUS', $2, $3)`,
      [req.user.user_id, id, JSON.stringify({ is_active })]
    );

    return res.json({ message: 'อัปเดตสถานะผู้ใช้งานสำเร็จ', user: result.rows[0] });
  } catch (err) {
    console.error('[updateUserStatus]', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
  }
}

/** DELETE /api/users/:id — ลบผู้ใช้งาน (Admin เท่านั้น) */
export async function deleteUser(req, res) {
  const { id } = req.params;

  if (req.user.user_id === id) {
    return res.status(400).json({ message: 'ไม่สามารถลบบัญชีของตนเองได้' });
  }

  try {
    const result = await pool.query('DELETE FROM users WHERE user_id = $1 RETURNING user_id, email', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบผู้ใช้งาน' });
    }

    await pool.query(
      `INSERT INTO audit_logs (actor_id, action, target_id, detail)
       VALUES ($1, 'DELETE_USER', $2, $3)`,
      [req.user.user_id, id, JSON.stringify({ email: result.rows[0].email })]
    );

    return res.json({ message: 'ลบผู้ใช้งานสำเร็จ' });
  } catch (err) {
    console.error('[deleteUser]', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
  }
}
