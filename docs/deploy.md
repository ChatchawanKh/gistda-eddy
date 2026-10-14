# Deploy ขึ้น cloud แบบฟรี (Vercel + Neon)

| ส่วน | บริการ | ไฟล์ |
|---|---|---|
| Frontend (React/Vite) | Vercel (static) | `vercel.json` |
| Auth API (`server/auth`) | Vercel Serverless Function | `api/index.js` → `server/auth/app.js` |
| PostgreSQL | Neon (free) | — |

Frontend และ API อยู่โดเมนเดียวกัน: `vercel.json` rewrite `/api/*` ไปที่ function `api/index.js`
ซึ่งเรียก Express app ตัวเดียวกับตอน dev (`server/auth/app.js`) refresh cookie (`sameSite: 'strict'`) จึงใช้ได้ตามปกติ
และ function ตั้งให้รันที่ region `sin1` (Singapore) ใกล้กับ Neon

ตอน dev บนเครื่องยังใช้ `npm run dev:all` เหมือนเดิม (`server/auth/server.js` → listen port 5000)

> dependency ที่ API ใช้ (express, pg, nodemailer ฯลฯ) ต้องอยู่ใน `package.json` ที่ root ด้วย
> เพราะ Vercel ติดตั้ง package จาก root เท่านั้น — ถ้าเพิ่ม package ใหม่ใน `server/auth` ให้เพิ่มที่ root ด้วย

## 1) ฐานข้อมูล — Neon

1. สร้าง project ที่ <https://neon.tech> (region Singapore)
2. SQL Editor → รัน `server/auth/db/schema.sql` แล้วตามด้วย `server/auth/db/migrations/003_add_is_approved.sql`
3. สร้างบัญชี admin คนแรกตาม `server/auth/README.md` (หรือย้ายข้อมูลจาก DB เดิมด้วย `pg_dump --data-only`)

## 2) Environment Variables บน Vercel (Settings → Environment Variables)

| ชื่อ | ค่า |
|---|---|
| `VITE_API_URL` | `/api` |
| `VITE_FROST_URL` | URL ของ FROST-Server |
| `DATABASE_URL` | connection string จาก Neon (แบบ `-pooler`, ใช้ `sslmode=verify-full`) |
| `DB_SSL` | `true` |
| `NODE_ENV` | `production` |
| `TRUST_PROXY` | `1` |
| `CLIENT_ORIGIN` | URL ของเว็บ เช่น `https://gistda-eddy.vercel.app` |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | ค่าสุ่มคนละค่า: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | `15m` / `7d` |
| `REMEMBER_ME_EXPIRES_IN` / `SESSION_EXPIRES_IN` | `30d` / `1d` |
| `ENFORCE_EMAIL_DOMAIN` / `ALLOWED_EMAIL_DOMAIN` | `true` / `gistda.or.th` |
| `SMTP_HOST` `SMTP_PORT` `SMTP_SECURE` `SMTP_USER` `SMTP_PASS` `SMTP_FROM` | ค่าของผู้ให้บริการอีเมล (เว้นได้ — ลิงก์ reset จะไปอยู่ใน Logs ของ function แทน) |

ตัวแปรที่ไม่ขึ้นต้นด้วย `VITE_` จะไม่ถูกฝังลง frontend จึงเก็บค่าลับได้อย่างปลอดภัย
แก้ env แล้วต้อง **Redeploy** ทุกครั้ง

## 3) ตรวจสอบ

- `https://<โดเมน>/api/health` → `{"status":"ok"}`
- เปิด `/login` ตรง ๆ แล้ว refresh หน้าได้ (ไม่ 404)
- login → refresh หน้า → ยังอยู่ในระบบ

## ข้อจำกัดของ Vercel แผน Hobby (ฟรี)

- ใช้สำหรับงานส่วนตัว/ไม่เชิงพาณิชย์ — ถ้าจะใช้งานจริงในองค์กรควรพิจารณาแผน Pro หรือ server ของหน่วยงาน
- rate limit (`middleware/rateLimit.js`) ใช้ memory store นับแยกต่อ function instance จึงหลวมกว่าตอนรัน server เดียว
- cold start ครั้งแรกหลังว่างนานราว 1–2 วินาที (ไม่ต้องตั้ง keep-alive)
- เงื่อนไขแพ็กเกจฟรีเปลี่ยนได้ ควรตรวจหน้า pricing ก่อนใช้งานจริง
