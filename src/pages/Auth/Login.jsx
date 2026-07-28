// src/pages/Auth/Login.jsx
import { useState } from 'react';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';

import { useAuth } from '../../context/AuthContext';
import AuthLayout from './AuthLayout';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname || '/';
  const infoMessage = location.state?.message || '';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password, rememberMe);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="เข้าสู่ระบบ" subtitle="เข้าสู่ระบบด้วยอีเมลองค์กร">
      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={2}>
          {infoMessage && <Alert severity="info">{infoMessage}</Alert>}
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
            label="รหัสผ่าน"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            fullWidth
          />

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  size="small"
                />
              }
              label={<Typography variant="body2">จดจำการเข้าสู่ระบบ</Typography>}
            />
            <Link component={RouterLink} to="/forgot-password" variant="body2">
              ลืมรหัสผ่าน?
            </Link>
          </Box>

          <Button type="submit" variant="contained" size="large" fullWidth disabled={submitting}>
            {submitting ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </Button>

          <Divider sx={{ my: 0.5 }} />

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary" component="span">
              ยังไม่มีบัญชี?{' '}
            </Typography>
            <Link component={RouterLink} to="/register" variant="body2">
              สมัครสมาชิก
            </Link>
          </Box>
        </Stack>
      </Box>
    </AuthLayout>
  );
}
