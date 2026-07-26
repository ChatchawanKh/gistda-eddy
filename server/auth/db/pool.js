// server/auth/db/pool.js
// เชื่อมต่อ PostgreSQL ด้วย connection pool (ใช้ pg)
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'gistda_fluxsuite',
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
