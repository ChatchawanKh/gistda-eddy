// src/App.auth-example.jsx
// ตัวอย่างการเชื่อม routing + AuthProvider + Theme เข้ากับ App.jsx เดิมของโปรเจกต์
// คัดลอกส่วนที่เกี่ยวข้องไปรวมกับ src/App.jsx จริงของคุณ
// ต้องติดตั้งก่อน: npm install react-router-dom axios
//
// หมายเหตุ:
// - แก้ path ของ import Theme ด้านล่างให้ตรงกับตำแหน่งไฟล์ theme.jsx จริงของคุณ
//   (เช่น ถ้าไฟล์อยู่ที่ src/style/Theme.jsx ให้ใช้ './style/Theme')
// - เมนู "จัดการผู้ใช้งาน" ไม่ได้แยกเป็น route ต่างหาก
//   (ยุบรวมเข้าไปเป็น section หนึ่งภายใน Dashboard.jsx แล้ว โชว์เฉพาะ role admin)
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Theme from './style/Theme'; // ← แก้ path ให้ตรงกับที่คุณเก็บไฟล์ theme.jsx จริง
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import ForgotPassword from './pages/Auth/ForgotPassword';
import ResetPassword from './pages/Auth/ResetPassword';
import Dashboard from './pages/Dashboard/Dashboard';

function Unauthorized() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <Typography variant="h6" color="text.secondary">
        คุณไม่มีสิทธิ์เข้าถึงหน้านี้ (403)
      </Typography>
    </Box>
  );
}

export default function App() {
  return (
    <Theme>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* ต้อง login เท่านั้น (role: user หรือ admin ก็เข้าได้ — ข้อ 5.7.3.2) */}
            {/* Dashboard.jsx เช็ค isAdmin เองภายใน เพื่อโชว์/ซ่อนเมนู "จัดการผู้ใช้งาน" (ข้อ 5.7.2 / 5.7.3.1) */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Dashboard />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </Theme>
  );
}
