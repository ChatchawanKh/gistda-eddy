// src/pages/Auth/Register.jsx
// หน้าลงทะเบียนสมัครสมาชิกเอง — บัญชีที่สมัครผ่านหน้านี้จะ "รอการอนุมัติ" จาก admin ก่อนเสมอ
// (ยังเข้าสู่ระบบไม่ได้จนกว่า admin จะกดอนุมัติที่หน้า "จัดการผู้ใช้งาน")
import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';

import axiosClient from '../../api/axiosClient';
import AuthLayout from './AuthLayout';

export default function Register() {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
      return;
    }
    if (password !== confirmPassword) {
      setError('รหัสผ่านทั้งสองช่องไม่ตรงกัน');
      return;
    }

    setSubmitting(true);
    try {
      await axiosClient.post('/auth/register', {
        email,
        password,
        full_name: fullName,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="สมัครสมาชิก" subtitle="สมัครด้วยอีเมลองค์กร — ต้องรอผู้ดูแลระบบอนุมัติก่อนเข้าใช้งานได้">
      {success ? (
        <Stack spacing={2}>
          <Alert severity="success">
            สมัครสมาชิกสำเร็จ! บัญชีของคุณอยู่ระหว่างรอการอนุมัติจากผู้ดูแลระบบ
            จะเข้าสู่ระบบได้หลังได้รับการอนุมัติแล้วเท่านั้น
          </Alert>
          <Button variant="contained" fullWidth onClick={() => navigate('/login', { replace: true })}>
            กลับไปหน้าเข้าสู่ระบบ
          </Button>
        </Stack>
      ) : (
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}

            <TextField
              label="อีเมล"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@gistda.or.th"
              required
              fullWidth
            />

            <TextField
              label="ชื่อ-นามสกุล"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              fullWidth
            />

            <TextField
              label="รหัสผ่าน"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
              slotProps={{ htmlInput: { minLength: 8 } }}
              helperText="อย่างน้อย 8 ตัวอักษร"
            />

            <TextField
              label="ยืนยันรหัสผ่าน"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              fullWidth
              error={confirmPassword.length > 0 && password !== confirmPassword}
              helperText={
                confirmPassword.length > 0 && password !== confirmPassword
                  ? 'รหัสผ่านไม่ตรงกัน'
                  : ' '
              }
            />

            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={submitting || password.length < 8 || password !== confirmPassword}
            >
              {submitting ? 'กำลังสมัครสมาชิก...' : 'สมัครสมาชิก'}
            </Button>

            <Box sx={{ textAlign: 'center' }}>
              <Link component={RouterLink} to="/login" variant="body2">
                มีบัญชีอยู่แล้ว? เข้าสู่ระบบ
              </Link>
            </Box>
          </Stack>
        </Box>
      )}
    </AuthLayout>
  );
}
