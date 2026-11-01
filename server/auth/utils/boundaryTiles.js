// server/auth/utils/boundaryTiles.js
// vector tile ขอบเขตการปกครอง (จังหวัด/อำเภอ/ตำบล) จากข้อมูล GISTDA ผ่าน admin-boundary
// (https://github.com/ChatchawanKh/boundary-service) — ใช้ร่วมกันระหว่าง
//   - vite.config.js : ตอน dev (หน้าเว็บกับ tile อยู่ origin เดียวกันที่ Vite)
//   - app.js         : ตอน deploy (Vercel rewrite /api/* มาที่ Express)
// path ต้องตรงกับ src/pages/Dashboard/utils/boundaryStore.js ฝั่งหน้าเว็บ
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { tileMiddleware } from 'admin-boundary/server';

export const BOUNDARY_TILES_PATH = '/api/boundary-tiles';
export const BOUNDARY_FONTS_PATH = '/api/boundary-fonts';

// cache ข้อมูลที่ดึงจาก GISTDA (~150 MB, อายุ 30 วัน)
// Vercel เขียนได้แค่ /tmp และหายเมื่อ instance ถูกทิ้ง → instance ใหม่ต้องดึงใหม่ (~30 วินาที)
function resolveCacheDir() {
  if (process.env.BOUNDARY_CACHE_DIR) return process.env.BOUNDARY_CACHE_DIR;
  if (process.env.VERCEL) return join(tmpdir(), 'admin-boundary');
  return '.cache/admin-boundary';
}

// preload=false: ยังไม่ดึงข้อมูลจนกว่าจะมีคนขอ tile ครั้งแรก
// (สร้างเส้นใช้หน่วยความจำ ~750 MB — ไม่ให้ทุก cold start ของ auth API ต้องแบกไปด้วย)
export function createBoundaryMiddleware({ preload = false } = {}) {
  return tileMiddleware({
    path: BOUNDARY_TILES_PATH,
    fontsPath: BOUNDARY_FONTS_PATH,
    boundary: { cacheDir: resolveCacheDir() },
    preload,
  });
}
