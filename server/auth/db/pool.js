// server/auth/db/pool.js
// เชื่อมต่อ PostgreSQL ด้วย connection pool (ใช้ pg)
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

// บน cloud (Neon/Supabase ฯลฯ) ให้ตั้ง DATABASE_URL ค่าเดียวแทน DB_* ทั้งชุด
// และ DB_SSL=true เพราะผู้ให้บริการเหล่านี้บังคับเชื่อมต่อผ่าน SSL
const connection = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'gistda_fluxsuite',
    };

const pool = new Pool({
  ...connection,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : false,
  max: 10,                     // จำนวน connection สูงสุดใน pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client', err);
  process.exit(-1);
});

pool.on('connect', () => {
  console.log('[DB] PostgreSQL connected');
});

export default pool;
