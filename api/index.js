// api/index.js
// Vercel Serverless Function: ทุก request ที่ขึ้นต้นด้วย /api/* ถูก rewrite มาที่นี่ (ดู vercel.json)
// แล้วส่งต่อให้ Express app ตัวเดียวกับที่ใช้ตอน dev — req.url ยังเป็น path เดิม route จึงตรงกัน
import app from '../server/auth/app.js';

export default app;
