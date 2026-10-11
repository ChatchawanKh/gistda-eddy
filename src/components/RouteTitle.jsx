import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const APP_NAME = 'GISTDA Eddy';

// ชื่อหน้าตาม route — แสดงใน tab ของเบราว์เซอร์เป็น "GISTDA Eddy | <ชื่อหน้า>"
const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/login': 'Login',
  '/register': 'Register',
  '/forgot-password': 'Forgot Password',
  '/reset-password': 'Reset Password',
  '/unauthorized': 'Unauthorized',
};

export default function RouteTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    const page = PAGE_TITLES[pathname];
    document.title = page ? `${APP_NAME} | ${page}` : APP_NAME;
  }, [pathname]);

  return null;
}
