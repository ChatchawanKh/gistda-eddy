# Production — GISTDA Eddy

สถานะระบบที่รันจริง, เครื่องมือที่ใช้, การตั้งค่า และวิธีดูแล
(วิธีตั้งระบบใหม่ตั้งแต่ศูนย์ ดู [`deploy.md`](deploy.md))

> ห้ามใส่ค่าลับ (รหัสผ่าน, connection string, JWT secret) ลงในไฟล์นี้หรือไฟล์ใดที่ commit ขึ้น Git

## ภาพรวม

| | |
|---|---|
| URL | https://gistda-eddy.vercel.app |
| API | https://gistda-eddy.vercel.app/api/* (health: `/api/health`) |
| โดเมนเดิม | `gistda-fluxsuite.vercel.app` → redirect 308 มาที่โดเมนใหม่ |
| Source | GitHub `ChatchawanKh/gistda-fluxsuite` (มีแผนเปลี่ยนชื่อเป็น `gistda-eddy`), branch `main` |
| ค่าใช้จ่าย | 0 บาท — ใช้แผนฟรีทั้งหมด |

```
Browser ──HTTPS──► Vercel (gistda-eddy.vercel.app, region sin1)
                    ├─ /*        → static React build (dist/)  + SPA fallback → index.html
                    └─ /api/*    → Vercel Function api/index.js → Express app (server/auth/app.js)
                                       │  pg (SSL verify-full, pooled)
                                       ▼
                                   Neon PostgreSQL 17 (aws-ap-southeast-1)

Browser ──HTTPS──► FROST-Server (VITE_FROST_URL — ข้อมูลสถานี/observation, ไม่ผ่าน API นี้)
```

Frontend กับ API อยู่โดเมนเดียวกัน → refresh token cookie (`HttpOnly; Secure; SameSite=Strict`) ใช้ได้โดยไม่ต้องตั้ง CORS ข้ามโดเมน

## เครื่องมือ / บริการ

| หน้าที่ | บริการ | แผน | รายละเอียด |
|---|---|---|---|
| Hosting frontend + API | **Vercel** | Hobby (ฟรี) | project `gistda-eddy`, team `ohohoats-projects`, function region `sin1` (Singapore) |
| ฐานข้อมูล | **Neon** | Free | project `gistda-eddy` (id `lucky-band-85744439`), branch `production`, database `gistda_eddy`, role `gistda_eddy_owner`, PostgreSQL 17 |
| Source / CI | **GitHub** | — | push `main` → Vercel build + deploy production อัตโนมัติ |
| CLI (ใช้ตอนดูแล) | `vercel` CLI, `neonctl` | — | รันผ่าน `npx vercel@latest …` / `npx neonctl@latest …` |

## ไฟล์ config ใน repo

| ไฟล์ | หน้าที่ |
|---|---|
| `vercel.json` | `regions: ["sin1"]`, rewrite `/api/(.*)` → function `/api`, rewrite อื่นทั้งหมด → `/index.html` (React Router) |
| `api/index.js` | entry ของ Vercel Function — `export default` Express app |
| `server/auth/app.js` | สร้าง Express app (ใช้ร่วมกันทั้ง dev และ prod) |
| `server/auth/server.js` | ใช้เฉพาะตอน dev (`app.listen` port 5000) — prod ไม่ใช้ |
| `server/auth/db/pool.js` | ใช้ `DATABASE_URL` ถ้ามี (prod) ไม่งั้นใช้ `DB_*` (dev); `DB_SSL=true` เปิด SSL |
| `package.json` (root) | ต้องมี dependency ของ API (`express`, `pg`, `nodemailer`, `bcrypt`, …) เพราะ Vercel ติดตั้งจาก root เท่านั้น |

## Environment Variables (Vercel → Settings → Environment Variables)

ตั้งไว้ทั้ง **Production** และ **Preview** — ค่าจริงดูได้ใน Vercel เท่านั้น

| ตัวแปร | ค่า / รูปแบบ | หมายเหตุ |
|---|---|---|
| `VITE_API_URL` | `/api` | ฝังลง bundle ตอน build |
| `VITE_FROST_URL` | URL ของ FROST-Server | ฝังลง bundle ตอน build |
| `DATABASE_URL` | `postgresql://gistda_eddy_owner:…@ep-jolly-hat-ao1cvxi6-pooler…/gistda_eddy?sslmode=verify-full&channel_binding=require` | sensitive — ใช้ host แบบ `-pooler` |
| `DB_SSL` | `true` | |
| `NODE_ENV` | `production` | ทำให้ cookie เป็น `Secure` |
| `TRUST_PROXY` | `1` | ให้ rate limit เห็น IP จริงของผู้ใช้ |
| `CLIENT_ORIGIN` | `https://gistda-eddy.vercel.app` | CORS + ลิงก์ในอีเมล reset password |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | hex สุ่ม 128 ตัว, คนละค่า | sensitive — server ไม่ยอม start ถ้าสั้นกว่า 32 หรือซ้ำกัน |
| `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | `15m` / `7d` | |
| `REMEMBER_ME_EXPIRES_IN` / `SESSION_EXPIRES_IN` | `30d` / `1d` | |
| `ENFORCE_EMAIL_DOMAIN` | `false` | ⚠ ตอนนี้ปิดไว้ (ข้อมูล mockup) — ใช้งานจริงควรเป็น `true` |
| `ALLOWED_EMAIL_DOMAIN` | `gistda.or.th` | |
| `SMTP_*` | ยังไม่ได้ตั้ง | ลิงก์ reset password จะไปอยู่ใน Vercel → Logs แทนการส่งอีเมล |

**แก้ env แล้วต้อง Redeploy ทุกครั้ง** (`VITE_*` ฝังตอน build, ตัวอื่นโหลดตอน function เริ่ม)

## ฐานข้อมูล (ณ 2026-10-14)

| | |
|---|---|
| ขนาด database `gistda_eddy` | ~7.8 MB (ส่วนใหญ่เป็น system catalog ของ PostgreSQL; ข้อมูลจริง < 0.5 MB) |
| ขนาด branch `production` (logical) | ~30 MB จาก limit 1,024 MB ที่ Neon รายงาน |
| ข้อมูล | users 5, audit_logs 108, refresh_tokens ~60, roles 2 |
| Point-in-time restore | ย้อนหลังได้ 6 ชั่วโมง |
| Schema | `server/auth/db/schema.sql` + `migrations/003_add_is_approved.sql` |

ข้อมูลปัจจุบันเป็น **mockup** (ย้ายมาจาก DB บนเครื่อง dev)

## การ deploy

- **ปกติ:** push ขึ้น `main` → Vercel build และ deploy production เอง (~40 วินาที)
- **Redeploy โดยไม่แก้โค้ด** (เช่น หลังแก้ env): Vercel → Deployments → ⋯ → Redeploy
  หรือ `npx vercel@latest redeploy https://gistda-eddy.vercel.app --target production`
- **ตรวจหลัง deploy:** `/api/health` ต้องได้ `{"status":"ok"}`, เปิด `/login` ตรง ๆ แล้ว refresh ต้องไม่ 404, ลอง login

## งานดูแลที่พบบ่อย

### เปลี่ยนรหัสผ่านฐานข้อมูล
1. Neon Console → project `gistda-eddy` → Branches → `production` → Roles → `gistda_eddy_owner` → Reset password
2. คัดลอก connection string แบบ **Pooled** แล้วเปลี่ยน `sslmode=require` เป็น `sslmode=verify-full`
3. แก้ `DATABASE_URL` ใน Vercel (Production + Preview) → Redeploy
   ช่วงระหว่างข้อ 1–3 API จะ error เพราะรหัสเดิมใช้ไม่ได้ทันที

### เปลี่ยน JWT secret
สร้างค่าใหม่ `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` → แก้ใน Vercel → Redeploy
ผู้ใช้ทุกคนจะถูก logout และต้อง login ใหม่

### บัญชีถูกล็อก (HTTP 429)
ใส่รหัสผิดเกิน 5 ครั้ง/15 นาทีต่ออีเมล หรือ 20 ครั้ง/15 นาทีต่อ IP → รอ 15 นาที
(ตัวนับเก็บใน memory ของ function — redeploy จะล้างตัวนับทั้งหมด)

### รัน migration / SQL
Neon Console → SQL Editor (เลือก database `gistda_eddy`) หรือ `psql` ผ่าน host **แบบ direct (ไม่มี `-pooler`)**

### Backup / ย้ายข้อมูล
- `pg_dump` จาก host แบบ direct เท่านั้น
- **ห้าม restore ไฟล์ dump ผ่าน host `-pooler`** — dump มีคำสั่ง `set_config('search_path', '', false)` ซึ่งจะค้างอยู่ใน connection ของ pooler แล้วทำให้ query ของ API หาตารางไม่เจอ
  ถ้าเผลอทำ: เปิด connection ผ่าน pooler หลาย ๆ อันพร้อมกันแล้วรัน `RESET ALL`
- psql/pg_dump บน Windows ตรวจ cert ของ Neon ไม่ผ่านด้วย `sslrootcert=system` — ให้ส่งไฟล์ root CA เอง
  (`node -e "require('fs').writeFileSync('roots.pem', require('tls').rootCertificates.join('\n'))"` แล้วใช้ `sslrootcert=roots.pem`)

### ดู log / error
Vercel → project `gistda-eddy` → Logs (กรอง `/api`) — error ตอน start เช่น env ไม่ครบจะขึ้นว่า `[Config] ค่า environment ไม่ปลอดภัย` และ API ตอบ `500 FUNCTION_INVOCATION_FAILED`

## ข้อจำกัดของแผนฟรี

- **Vercel Hobby** ใช้ได้เฉพาะงานส่วนตัว/ไม่เชิงพาณิชย์ — ถ้าใช้งานจริงในองค์กรควรย้ายไปแผน Pro หรือ server ของหน่วยงาน
- **Rate limit** นับแยกต่อ function instance (memory store) จึงหลวมกว่ารัน server เดียว — ถ้าต้องการเข้มงวดให้เปลี่ยนเป็น Redis store
- **Cold start** ครั้งแรกหลังว่างนาน ~0.5–2 วินาที; Neon compute หลับเมื่อว่างและตื่นเองเมื่อมี request
- เงื่อนไขแผนฟรีเปลี่ยนได้ — ตรวจหน้า pricing ของ Vercel/Neon เป็นระยะ

## สิ่งที่ยังค้าง / ควรทำก่อนใช้งานจริง

- [ ] เปลี่ยนชื่อ GitHub repo เป็น `gistda-eddy` (Settings → Repository name) แล้วอัปเดต `git remote set-url origin`
- [ ] เปลี่ยน `ENFORCE_EMAIL_DOMAIN=true`
- [ ] ตั้ง SMTP เพื่อส่งอีเมล reset password จริง
- [ ] เปลี่ยนรหัสผ่านบัญชี `superadmin@example.com` (รหัสปัจจุบันเคยถูกส่งในแชต)
- [ ] ล้างข้อมูล mockup ก่อนเปิดให้ผู้ใช้จริง
- [ ] ตรวจนโยบายหน่วยงาน/PDPA เรื่องเก็บข้อมูลบุคลากรบน cloud ต่างประเทศ
