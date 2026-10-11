// server/auth/server.js
// จุดเริ่มต้นของ Auth API server (แยกรันจาก Vite dev server ของฝั่ง React)
// รัน: node server/auth/server.js  (หรือกำหนด script "server" ใน package.json)
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import validateEnv from './config/validateEnv.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';

validateEnv();

const app = express();

// รันหลัง reverse proxy -> ต้องตั้ง TRUST_PROXY ไม่งั้น req.ip จะเป็น IP ของ proxy
// และ rate limit จะนับผู้ใช้ทุกคนรวมเป็นคนเดียว
if (process.env.TRUST_PROXY) {
  const hops = Number(process.env.TRUST_PROXY);
  app.set('trust proxy', Number.isNaN(hops) ? process.env.TRUST_PROXY : hops);
}

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true, // จำเป็นสำหรับส่ง httpOnly cookie (refreshToken)
}));
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'auth-api' }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// 404 handler
app.use((req, res) => res.status(404).json({ message: 'ไม่พบ endpoint ที่ร้องขอ' }));

// Global error handler — ต้องมี 4 args เพื่อให้ Express รู้ว่าเป็น error middleware
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]', err);
  res.status(500).json({ message: 'เกิดข้อผิดพลาดที่ไม่คาดคิดในระบบ' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`[Auth API] running at http://localhost:${PORT}`);
});
