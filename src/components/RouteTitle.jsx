import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const APP_NAME = 'GISTDA Eddy';

// ชื่อหน้าตาม route — แสดงใน tab ของเบราว์เซอร์เป็น "GISTDA Eddy | <ชื่อหน้า>"
// ตั้งชื่อเป็นภาษาอังกฤษให้ตรงกับ path
const PAGE_TITLES = {
  '/': 'Dashboard', // redirect ไป /dashboard
  '/dashboard': 'Dashboard',
  '/alerts': 'Alerts',
  '/settings': 'Settings',
  '/settings/account': 'Account',
  '/settings/manage-user': 'Manage User',
  '/login': 'Login',
  '/register': 'Register',
  '/forgot-password': 'Forgot Password',
  '/reset-password': 'Reset Password',
  '/unauthorized': 'Unauthorized',
};

export default function RouteTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    // ตัด / ท้าย path ออก (เช่น /alerts/ -> /alerts)
    const page = PAGE_TITLES[pathname.replace(/(.)\/+$/, '$1')];
    // path ที่ไม่อยู่ในรายการ = route "*" (หน้า 404)
    document.title = `${APP_NAME} | ${page || 'Not Found'}`;
  }, [pathname]);

  return null;
}
