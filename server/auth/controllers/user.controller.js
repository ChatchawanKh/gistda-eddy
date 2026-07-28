// server/auth/controllers/user.controller.js
// จัดการผู้ใช้งานทั้งหมด — เข้าถึงได้เฉพาะ role admin (บังคับผ่าน checkRole('admin') ใน routes)
import pool from '../db/pool.js';
import { hashPassword, comparePassword  } from '../utils/password.js';
import { isAllowedEmail } from '../utils/emailDomain.js';

/** GET /api/users — รายชื่อผู้ใช้งานทั้งหมด */
export async function listUsers(req, res) {
  try {
    const result = await pool.query(
      `SELECT u.user_id, u.email, u.full_name, u.is_active, u.is_approved, u.last_login_at,
              u.created_at, r.role_name
       FROM users u
       JOIN roles r ON r.role_id = u.role_id
       ORDER BY u.is_approved ASC, u.created_at DESC`
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
      `INSERT INTO users (email, password_hash, full_name, role_id, is_approved)
       VALUES ($1, $2, $3, $4, TRUE)
       RETURNING user_id, email, full_name, is_active, is_approved, created_at`,
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

  // กัน admin เปลี่ยนสิทธิ์ของตัวเอง (ป้องกันกดพลาดจนหลุดจาก admin โดยไม่ได้ตั้งใจ)
  // ต้องให้ admin ท่านอื่นเป็นคนเปลี่ยนสิทธิ์ให้เท่านั้น
  if (req.user.user_id === id) {
    return res.status(403).json({
      message: 'ไม่สามารถเปลี่ยนสิทธิ์ของตัวเองได้ กรุณาให้ผู้ดูแลระบบท่านอื่นเปลี่ยนสิทธิ์ให้',
    });
  }

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

/** PATCH /api/users/:id/approve — Admin อนุมัติผู้ใช้งานที่สมัครเองผ่านหน้า Login (ข้อ 5.7.2) */
export async function approveUser(req, res) {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `UPDATE users SET is_approved = TRUE WHERE user_id = $1
       RETURNING user_id, email, is_approved`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบผู้ใช้งาน' });
    }

    await pool.query(
      `INSERT INTO audit_logs (actor_id, action, target_id, detail)
       VALUES ($1, 'APPROVE_USER', $2, $3)`,
      [req.user.user_id, id, JSON.stringify({ email: result.rows[0].email })]
    );

    return res.json({ message: 'อนุมัติผู้ใช้งานสำเร็จ ผู้ใช้งานสามารถเข้าสู่ระบบได้แล้ว', user: result.rows[0] });
  } catch (err) {
    console.error('[approveUser]', err);
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

/** PATCH /api/users/:id/reset-password — Admin ตั้งรหัสผ่านใหม่ให้ user โดยตรง (ไม่ต้องผ่าน token/อีเมล) */
export async function adminResetPassword(req, res) {
  const { id } = req.params;
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ message: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' });
  }

  try {
    const passwordHash = await hashPassword(newPassword);
    const result = await pool.query(
      `UPDATE users SET password_hash = $1 WHERE user_id = $2
       RETURNING user_id, email`,
      [passwordHash, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบผู้ใช้งาน' });
    }

    // เพิกถอน refresh token เดิมทั้งหมด -> บังคับให้ user คนนี้ login ใหม่ด้วยรหัสผ่านใหม่
    await pool.query('UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1', [id]);

    await pool.query(
      `INSERT INTO audit_logs (actor_id, action, target_id, detail)
       VALUES ($1, 'ADMIN_RESET_PASSWORD', $2, $3)`,
      [req.user.user_id, id, JSON.stringify({ email: result.rows[0].email })]
    );

    return res.json({ message: 'ตั้งรหัสผ่านใหม่ให้ผู้ใช้งานสำเร็จ' });
  } catch (err) {
    console.error('[adminResetPassword]', err);
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

/** POST /api/users/bulk-delete — ลบผู้ใช้งานหลายรายการพร้อมกัน */
export async function bulkDeleteUsers(req, res) {
  const { user_ids, password } = req.body;

  if (!Array.isArray(user_ids) || user_ids.length === 0) {
    return res.status(400).json({ message: 'กรุณาระบุรายชื่อผู้ใช้งานที่ต้องการลบ' });
  }
  if (!password) {
    return res.status(400).json({ message: 'กรุณากรอกรหัสผ่านเพื่อยืนยัน' });
  }
  if (user_ids.includes(req.user.user_id)) {
    return res.status(400).json({ message: 'ไม่สามารถลบบัญชีของตนเองได้' });
  }

  const client = await pool.connect();
  try {
    const adminResult = await client.query('SELECT password_hash FROM users WHERE user_id = $1', [req.user.user_id]);
    if (adminResult.rows.length === 0) {
      return res.status(401).json({ message: 'ไม่พบผู้ใช้งานปัจจุบัน' });
    }
    const isMatch = await comparePassword(password, adminResult.rows[0].password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'รหัสผ่านไม่ถูกต้อง' });
    }

    const result = await client.query(
      'DELETE FROM users WHERE user_id = ANY($1::uuid[]) RETURNING user_id, email',
      [user_ids]
    );

    await client.query(
      `INSERT INTO audit_logs (actor_id, action, target_id, detail)
       VALUES ($1, 'BULK_DELETE_USER', NULL, $2)`,
      [req.user.user_id, JSON.stringify({ deleted: result.rows.map((r) => r.email) })]
    );

    return res.json({ message: `ลบผู้ใช้งานสำเร็จ ${result.rows.length} รายการ` });
  } catch (err) {
    console.error('[bulkDeleteUsers]', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
  } finally {
    client.release();
  }
}

/** PATCH /api/users/bulk-status — เปิด/ปิดการใช้งานบัญชีหลายรายการพร้อมกัน */
export async function bulkUpdateStatus(req, res) {
  const { user_ids, is_active, password } = req.body;

  if (!Array.isArray(user_ids) || user_ids.length === 0) {
    return res.status(400).json({ message: 'กรุณาระบุรายชื่อผู้ใช้งาน' });
  }
  if (!password) {
    return res.status(400).json({ message: 'กรุณากรอกรหัสผ่านเพื่อยืนยัน' });
  }
  if (user_ids.includes(req.user.user_id)) {
    return res.status(400).json({ message: 'ไม่สามารถดำเนินการกับบัญชีของตนเองได้' });
  }

  const client = await pool.connect();
  try {
    const adminResult = await client.query('SELECT password_hash FROM users WHERE user_id = $1', [req.user.user_id]);
    if (adminResult.rows.length === 0) {
      return res.status(401).json({ message: 'ไม่พบผู้ใช้งานปัจจุบัน' });
    }
    const isMatch = await comparePassword(password, adminResult.rows[0].password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'รหัสผ่านไม่ถูกต้อง' });
    }

    const result = await client.query(
      'UPDATE users SET is_active = $1 WHERE user_id = ANY($2::uuid[]) RETURNING user_id, email',
      [is_active, user_ids]
    );

    await client.query(
      `INSERT INTO audit_logs (actor_id, action, target_id, detail)
       VALUES ($1, 'BULK_UPDATE_STATUS', NULL, $2)`,
      [req.user.user_id, JSON.stringify({ is_active, users: result.rows.map((r) => r.email) })]
    );

    return res.json({ message: `อัปเดตสถานะสำเร็จ ${result.rows.length} รายการ` });
  } catch (err) {
    console.error('[bulkUpdateStatus]', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
  } finally {
    client.release();
  }
}
