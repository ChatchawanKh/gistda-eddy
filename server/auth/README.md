# GISTDA-FLUXSUITE — Auth API (server/auth)

ระบบยืนยันตัวตนและบริหารจัดการสิทธิ์ผู้ใช้งาน (JWT + PostgreSQL) สำหรับโปรเจกต์ GISTDA-FLUXSUITE

## โครงสร้างโฟลเดอร์

```
server/auth/
├── config/                # (ว่างไว้สำหรับ config เพิ่มเติมในอนาคต)
├── controllers/
│   ├── auth.controller.js     # register, login, refresh, logout, me
│   └── user.controller.js     # จัดการผู้ใช้งาน (admin เท่านั้น)
├── db/
│   ├── pool.js                 # PostgreSQL connection pool
│   └── schema.sql              # โครงสร้างฐานข้อมูล (รันใน PG Admin 17)
├── middleware/
│   ├── verifyToken.js          # ตรวจสอบ JWT access token
│   └── checkRole.js            # ตรวจสอบสิทธิ์ (admin/user)
├── routes/
│   ├── auth.routes.js
│   └── user.routes.js
├── utils/
│   ├── token.js                 # generate/verify JWT
│   ├── password.js              # bcrypt hash/compare + CLI สร้าง hash
│   └── emailDomain.js           # ตรวจโดเมนอีเมล @gistda.or.th
├── .env.example
├── package.json
└── server.js               # entry point (Express app)
```

> หมายเหตุ: โค้ดฝั่ง backend นี้เขียนเป็น **ES Module** (`import`/`export`) — `package.json` มี `"type": "module"` กำกับไว้แล้ว
> ไฟล์ `.js` ทุกไฟล์ในโฟลเดอร์นี้จึงต้องใช้ `import ... from '...'` เท่านั้น (ห้ามผสม `require`)

## 1) ติดตั้งฐานข้อมูล (PG Admin 17 / PostgreSQL)

1. เปิด PG Admin 17 → สร้างฐานข้อมูลใหม่ชื่อ `gistda_fluxsuite`
2. เปิด Query Tool บนฐานข้อมูลนั้น แล้วรันไฟล์ `db/schema.sql` ทั้งหมด
   - จะได้ตาราง `roles`, `users`, `refresh_tokens`, `audit_logs`
   - ตาราง `roles` จะถูก seed ด้วย 2 สิทธิ์: `admin`, `user` (ตรงตามข้อ 5.7.3)
3. สร้างบัญชี Admin คนแรก:
   ```bash
   cd server/auth
   node utils/password.js "Admin@123"
   ```
   คัดลอก hash ที่ได้ไปแทนที่ในคำสั่ง INSERT ท้ายไฟล์ `schema.sql` แล้วรันใน PG Admin
   (ระหว่างพัฒนาใช้อีเมลอะไรก็ได้ เช่น `admin@test.com`)

## 2) ติดตั้งและตั้งค่า Backend

```bash
cd server/auth
npm install
cp .env.example .env
# แก้ค่าต่าง ๆ ใน .env ให้ตรงกับเครื่องของคุณ (DB_USER, DB_PASSWORD, JWT secret ฯลฯ)
npm run dev
```

Server จะรันที่ `http://localhost:5000` และมี endpoint ทดสอบสถานะที่ `GET /api/health`

> 🔐 **JWT secret:** ต้องตั้ง `JWT_ACCESS_SECRET` และ `JWT_REFRESH_SECRET` เป็นค่าสุ่มยาว ≥ 32 ตัวอักษร และห้ามซ้ำกัน
> ไม่งั้น server จะไม่ยอม start (ดู `config/validateEnv.js`) — สร้างค่าได้ด้วย:
> ```bash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```
> ไฟล์ `.env` ถูก ignore ใน Git แล้ว — ห้าม commit ค่าจริง ให้แก้ที่ `.env.example` เมื่อเพิ่มตัวแปรใหม่

> 🚦 **Rate limit:** endpoint สาธารณะ (`login`, `register`, `forgot-password`, `reset-password`) ถูกจำกัดจำนวนครั้ง
> (ดู `middleware/rateLimit.js`) ถ้ารันหลัง reverse proxy ให้ตั้ง `TRUST_PROXY=1` ใน `.env` เพื่อให้นับตาม IP จริงของผู้ใช้

> 💡 แนะนำให้เพิ่ม script ที่ root `package.json` ของโปรเจกต์ Vite เพื่อรัน frontend + backend พร้อมกันด้วย `concurrently`:
> ```json
> "scripts": {
>   "dev": "vite",
>   "server": "node server/auth/server.js",
>   "dev:all": "concurrently \"npm run dev\" \"npm run server\""
> }
> ```

## 3) การตั้งค่าโดเมนอีเมล (@gistda.or.th)

ในไฟล์ `.env`:
```
ENFORCE_EMAIL_DOMAIN=false   # ระหว่างพัฒนา: ใช้อีเมลอะไรก็ได้
ALLOWED_EMAIL_DOMAIN=gistda.or.th
```
เมื่อพร้อมขึ้นระบบจริง ให้เปลี่ยนเป็น `ENFORCE_EMAIL_DOMAIN=true` เพื่อบังคับเฉพาะอีเมล `@gistda.or.th`
(ระบบตรวจที่ทั้ง `register` และ `createUser` — ดูไฟล์ `utils/emailDomain.js`)
สามารถบังคับเพิ่มอีกชั้นในระดับฐานข้อมูลได้ โดยเปิดใช้ constraint ที่คอมเมนต์ไว้ใน `schema.sql`

## 4) API Endpoints

| Method | Endpoint                  | สิทธิ์        | คำอธิบาย |
|--------|----------------------------|---------------|----------|
| POST   | /api/auth/register          | สาธารณะ        | สมัครสมาชิก (role = user เสมอ) |
| POST   | /api/auth/login              | สาธารณะ        | เข้าสู่ระบบ → คืน accessToken + set refreshToken cookie |
| POST   | /api/auth/refresh            | ต้องมี cookie   | ขอ accessToken ใหม่ |
| POST   | /api/auth/logout             | ต้องมี cookie   | ออกจากระบบ (revoke refresh token) |
| GET    | /api/auth/me                  | ต้อง login      | ข้อมูลผู้ใช้ปัจจุบัน |
| GET    | /api/users                    | admin เท่านั้น  | รายชื่อผู้ใช้งานทั้งหมด |
| POST   | /api/users                    | admin เท่านั้น  | เพิ่มผู้ใช้งานใหม่ |
| PATCH  | /api/users/:id/role           | admin เท่านั้น  | เปลี่ยนสิทธิ์ผู้ใช้งาน |
| PATCH  | /api/users/:id/status          | admin เท่านั้น  | เปิด/ปิดการใช้งานบัญชี |
| DELETE | /api/users/:id                 | admin เท่านั้น  | ลบผู้ใช้งาน |

## 5) การไหลของ Token (JWT)

- **Access token**: อายุสั้น (default 15 นาที) ส่งกลับใน response body → เก็บใน memory/React state ฝั่ง frontend แนบไปกับทุก request ผ่าน `Authorization: Bearer <token>`
- **Refresh token**: อายุยาว (default 7 วัน) เก็บใน **httpOnly cookie** (ป้องกัน XSS) และเก็บ hash (SHA-256) ไว้ใน DB เพื่อให้ revoke ได้จริงตอน logout
