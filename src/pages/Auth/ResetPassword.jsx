// src/pages/Auth/ResetPassword.jsx
// เข้าถึงหน้านี้ผ่านลิงก์จากอีเมล เช่น /reset-password?token=xxxxxxxx
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams, Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded';
import { useTheme } from '@mui/material/styles';

import axiosClient from '../../api/axiosClient';
import AuthLayout from './AuthLayout';
import { validatePassword } from '../../../server/auth/utils/validatePassword';

// เงื่อนไขรหัสผ่านที่โชว์เป็น checklist สด ๆ ระหว่างพิมพ์
// หมายเหตุ: หน้านี้ไม่รู้ email เจ้าของ token (server เป็นคนรู้และเช็คให้อีกชั้นตอน submit)
// checklist ฝั่งนี้จึงไม่รวมกฎ "ห้ามพ้องกับอีเมล" — ถ้า server เจอ error ข้อนี้จะโชว์ผ่าน Alert แทน
const PASSWORD_RULES = [
  { key: 'length', label: 'มากกว่า 10 ตัวอักษร', test: (v) => v.length >= 10 && v.length <= 15 },
  { key: 'upper', label: 'มีตัวพิมพ์ใหญ่ (A-Z)', test: (v) => /[A-Z]/.test(v) },
  { key: 'lower', label: 'มีตัวพิมพ์เล็ก (a-z)', test: (v) => /[a-z]/.test(v) },
  { key: 'digit', label: 'มีตัวเลข (0-9)', test: (v) => /[0-9]/.test(v) },
  {
    key: 'special',
    label: 'มีอักขระพิเศษ (เช่น ! @ # $)',
    test: (v) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(v),
  },
];

function PasswordChecklist({ password }) {
  const theme = useTheme();
  return (
    <Stack spacing={0.5} sx={{ pl: 0.5 }}>
      {PASSWORD_RULES.map((rule) => {
        const passed = rule.test(password);
        return (
          <Box key={rule.key} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            {passed ? (
              <CheckCircleRoundedIcon sx={{ fontSize: 16, color: theme.palette.success.main }} />
            ) : (
              <RadioButtonUncheckedRoundedIcon
                sx={{ fontSize: 16, color: theme.palette.text.secondary, opacity: 0.5 }}
              />
            )}
            <Typography
              variant="caption"
              sx={{ color: passed ? theme.palette.success.main : 'text.secondary' }}
            >
              {rule.label}
            </Typography>
          </Box>
        );
      })}
    </Stack>
  );
}

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  // เช็คเฉพาะกฎที่ client รู้ได้ครบ (ไม่รวมกฎผูกกับอีเมล เพราะหน้านี้ไม่มี email ในมือ)
  const passwordErrors = useMemo(() => validatePassword(newPassword), [newPassword]);
  const isPasswordValid = newPassword.length > 0 && passwordErrors.length === 0;
  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('ลิงก์ไม่ถูกต้อง กรุณาขอลิงก์รีเซ็ตรหัสผ่านใหม่');
      return;
    }
    if (!isPasswordValid) {
      setError(passwordErrors[0] || 'รหัสผ่านไม่ตรงตามเงื่อนไข');
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
            <Box>
              <TextField
                label="รหัสผ่านใหม่"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                fullWidth
                slotProps={{ htmlInput: { minLength: 10 } }}
              />
              <Box sx={{ mt: 1 }}>
                <PasswordChecklist password={newPassword} />
              </Box>
            </Box>

            <TextField
              label="ยืนยันรหัสผ่านใหม่"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              fullWidth
              slotProps={{ htmlInput: { minLength: 10 } }}
              error={confirmPassword.length > 0 && !passwordsMatch}
              helperText={
                confirmPassword.length > 0 && !passwordsMatch ? 'รหัสผ่านไม่ตรงกัน' : ' '
              }
            />

            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={submitting || !isPasswordValid || !passwordsMatch}
            >
              {submitting ? 'กำลังบันทึก...' : 'ยืนยันรหัสผ่านใหม่'}
            </Button>
          </Stack>
        </Box>
      )}
    </AuthLayout>
  );
}