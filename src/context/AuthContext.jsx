// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axiosClient from '../api/axiosClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);       // { user_id, email, full_name, role }
  const [loading, setLoading] = useState(true);  // true ระหว่างเช็ค session ตอนโหลดแอปครั้งแรก

  // เช็ค session เดิม (กรณี refresh หน้าเว็บ) — ใช้ refreshToken cookie ขอ access token ใหม่
  const restoreSession = useCallback(async () => {
    try {
      const { data } = await axiosClient.post('/auth/refresh');
      localStorage.setItem('accessToken', data.accessToken);
      const meRes = await axiosClient.get('/auth/me');
      setUser(meRes.data.user);
    } catch {
      localStorage.removeItem('accessToken');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  async function login(email, password, rememberMe = false) {
    const { data } = await axiosClient.post('/auth/login', { email, password, rememberMe });
    localStorage.setItem('accessToken', data.accessToken);
    setUser(data.user);
    return data.user;
  }

  async function logout() {
    try {
      await axiosClient.post('/auth/logout');
    } finally {
      localStorage.removeItem('accessToken');
      setUser(null);
    }
  }

  // ดึงข้อมูล user ล่าสุดจาก server มาอัปเดต state (ใช้หลังแก้โปรไฟล์ในหน้า Settings)
  async function refreshUser() {
    const { data } = await axiosClient.get('/auth/me');
    setUser(data.user);
    return data.user;
  }

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth ต้องถูกเรียกภายใน <AuthProvider>');
  return ctx;
}
