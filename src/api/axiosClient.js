// src/api/axiosClient.js
// ต้องติดตั้งก่อน: npm install axios
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const axiosClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // จำเป็นเพื่อให้ refreshToken cookie ถูกส่งไปด้วย
});

// แนบ access token ทุก request (อ่านจาก localStorage ที่ AuthContext เป็นคนตั้งค่า)
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// เมื่อ access token หมดอายุ (401 + code TOKEN_EXPIRED) ให้ลอง refresh อัตโนมัติ 1 ครั้ง
let isRefreshing = false;
let refreshSubscribers = [];

function onRefreshed(newToken) {
  refreshSubscribers.forEach((cb) => cb(newToken));
  refreshSubscribers = [];
}

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      error.response?.data?.code === 'TOKEN_EXPIRED' &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const { data } = await axios.post(
            `${BASE_URL}/auth/refresh`,
            {},
            { withCredentials: true }
          );
          localStorage.setItem('accessToken', data.accessToken);
          isRefreshing = false;
          onRefreshed(data.accessToken);
        } catch (refreshError) {
          isRefreshing = false;
          localStorage.removeItem('accessToken');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }

      return new Promise((resolve) => {
        refreshSubscribers.push((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          resolve(axiosClient(originalRequest));
        });
      });
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
