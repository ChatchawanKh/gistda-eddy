# Deploy ขึ้น cloud แบบฟรี (Vercel + Render + Neon)

| ส่วน | บริการ | ไฟล์ config |
|---|---|---|
| Frontend (React/Vite) | Vercel | `vercel.json` |
| Auth API (`server/auth`) | Render (free web service) | `render.yaml` |
| PostgreSQL | Neon (free) | — |
| Keep-alive | cron-job.org หรือ UptimeRobot | — |

Frontend เรียก API ผ่าน path `/api/*` บนโดเมนเดียวกัน แล้ว Vercel ส่งต่อ (rewrite) ไปยัง Render
เบราว์เซอร์จึงมองเป็น same-site และ refresh cookie (`sameSite: 'strict'`) ใช้งานได้โดยไม่ต้องแก้โค้ด

## 1) ฐานข้อมูล — Neon

1. สมัคร <https://neon.tech> → สร้าง project (เลือก region ที่ใกล้ที่สุด เช่น Singapore)
2. คัดลอก connection string (`postgresql://...?sslmode=require`) ไว้ใช้ในขั้นที่ 2
3. เปิด SQL Editor แล้วรันตามลำดับ:
   - `server/auth/db/schema.sql`
   - `server/auth/db/migrations/003_add_is_approved.sql` (schema.sql ยังไม่มีคอลัมน์ `is_approved`)
4. สร้างบัญชี admin คนแรกตามขั้นตอนใน `server/auth/README.md`

## 2) API — Render

1. สมัคร <https://render.com> → **New → Blueprint** → เลือก repo นี้ (Render อ่าน `render.yaml` ให้เอง)
2. กรอกค่าที่ Render ถาม:
   - `DATABASE_URL` = connection string จาก Neon
   - `CLIENT_ORIGIN` = URL ของ frontend บน Vercel เช่น `https://gistda-fluxsuite.vercel.app`
     (ใช้สร้างลิงก์ในอีเมล reset password)
   - `SMTP_*` = ค่าของผู้ให้บริการอีเมล (เช่น Gmail + App Password: `smtp.gmail.com`)
   - `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` Render สุ่มให้อัตโนมัติ
3. Deploy แล้วเปิด `https://<ชื่อ service>.onrender.com/api/health` ต้องได้ `{"status":"ok"}`
4. ถ้าชื่อ service ไม่ใช่ `gistda-fluxsuite-api` ให้แก้ URL ปลายทางใน `vercel.json` ให้ตรง

## 3) Frontend — Vercel

1. สมัคร <https://vercel.com> → **Add New → Project** → เลือก repo นี้ (Vercel ตรวจเจอ Vite เอง)
2. ตั้ง Environment Variables:
   - `VITE_API_URL` = `/api`
   - `VITE_FROST_URL` = URL ของ FROST-Server
3. Deploy — `vercel.json` จัดการทั้ง proxy `/api/*` และ fallback ของ React Router (`/reset-password` ฯลฯ)

## 4) กัน API หลับ (Render free หลับเมื่อไม่มี request 15 นาที)

ตั้ง cron-job.org หรือ UptimeRobot ให้เรียก `https://<ชื่อ service>.onrender.com/api/health` ทุก 10–14 นาที
(1 service รันตลอดเดือน ≈ 744 ชม. ยังอยู่ในโควตาฟรี 750 ชม./เดือนของ Render)

## หมายเหตุ

- ทุกครั้งที่ push ขึ้น branch `main` ทั้ง Vercel และ Render จะ deploy ใหม่ให้อัตโนมัติ
- เงื่อนไขแพ็กเกจฟรีของแต่ละเจ้าเปลี่ยนได้ ควรตรวจสอบหน้า pricing อีกครั้งก่อนใช้งานจริง
