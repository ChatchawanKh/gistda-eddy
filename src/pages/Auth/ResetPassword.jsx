// src/pages/Auth/ResetPassword.jsx
// เข้าถึงหน้านี้ผ่านลิงก์จากอีเมล เช่น /reset-password?token=xxxxxxxx
import { useState } from 'react';
import { useNavigate, useSearchParams, Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';

import axiosClient from '../../api/axiosClient';
import AuthLayout from './AuthLayout';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('ลิงก์ไม่ถูกต้อง กรุณาขอลิงก์รีเซ็ตรหัสผ่านใหม่');
      return;
    }
    if (newPassword.length < 8) {
      setError('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('รหัสผ่านทั้งสองช่องไม่ตรงกัน');
      return;
    }

    setSubmitting(true);
    try {
      await axiosClient.post('/auth/reset-password', { token, newPassword });
      setSuccess(true);
      setTimeout(() => navigate('/login', { replace: true }), 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'ตั้งรหัสผ่านใหม่ไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="ตั้งรหัสผ่านใหม่">
      {!token && (
        <Alert severity="error" sx={{ mb: 2 }}>
          ไม่พบ token ในลิงก์ กรุณาเปิดผ่านลิงก์จากอีเมลที่ได้รับ หรือ{' '}
          <Link component={RouterLink} to="/forgot-password">ขอลิงก์ใหม่</Link>
        </Alert>
      )}

      {success && <Alert severity="success">ตั้งรหัสผ่านใหม่สำเร็จ กำลังพาไปหน้าเข้าสู่ระบบ...</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {token && !success && (
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <TextField
              label="รหัสผ่านใหม่"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="อย่างน้อย 8 ตัวอักษร"
              required
              fullWidth
              slotProps={{ htmlInput: { minLength: 8 } }}
            />

            <TextField
              label="ยืนยันรหัสผ่านใหม่"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              fullWidth
            />

            <Button type="submit" variant="contained" size="large" fullWidth disabled={submitting}>
              {submitting ? 'กำลังบันทึก...' : 'ยืนยันรหัสผ่านใหม่'}
            </Button>
          </Stack>
        </Box>
      )}
    </AuthLayout>
  );
}
