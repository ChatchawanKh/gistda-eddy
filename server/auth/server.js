// server/auth/server.js
// จุดเริ่มต้นของ Auth API server (แยกรันจาก Vite dev server ของฝั่ง React)
// รัน: node server/auth/server.js  (หรือกำหนด script "server" ใน package.json)
// ตอน deploy บน Vercel จะไม่ใช้ไฟล์นี้ แต่ใช้ api/index.js ที่ import app ตัวเดียวกัน
import app from './app.js';

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`[Auth API] running at http://localhost:${PORT}`);
});
