import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Theme from './style/Theme';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import ForgotPassword from './pages/Auth/ForgotPassword';
import ResetPassword from './pages/Auth/ResetPassword';
import DashboardLayout from './pages/Dashboard/DashboardLayout';
import DashboardPage from './pages/Dashboard/DashboardPage';
import AlertsPage from './pages/Dashboard/AlertsPage';
import SettingsLayout, { SettingsMenu } from './pages/Dashboard/SettingsPage';
import SettingsSection from './pages/Dashboard/SettingsSection';
import UserManagementSection from './pages/Dashboard/UserManagementSection';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/ProtectedRoute';
import RouteTitle from './components/RouteTitle';

function Unauthorized() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', px: 2 }}>
      <Typography variant="h6" color="text.secondary" sx={{ textAlign: 'center' }}>
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
          <RouteTitle />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/alerts" element={<AlertsPage />} />
                <Route path="/settings" element={<SettingsLayout />}>
                  <Route index element={<SettingsMenu />} />
                  <Route path="account" element={<SettingsSection />} />
                  <Route element={<ProtectedRoute requiredRole="admin" />}>
                    <Route path="manage-user" element={<UserManagementSection />} />
                  </Route>
                </Route>
              </Route>
            </Route>

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </Theme>
  );
}
