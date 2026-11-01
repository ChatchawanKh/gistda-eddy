import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createBoundaryMiddleware } from './server/auth/utils/boundaryTiles.js'

// ตอน dev ให้ Vite ตอบ tile ขอบเขตการปกครองเอง (origin เดียวกับหน้าเว็บ)
// production: Express ใน api/index.js ตอบ path เดียวกัน
// hook ต้องไม่ return ค่า — ถ้า return function, Vite จะเรียกมันเป็น post hook (middlewares.use คืน app)
const adminBoundaryTiles = {
  name: 'admin-boundary-tiles',
  configureServer(server) {
    server.middlewares.use(createBoundaryMiddleware())
  },
  configurePreviewServer(server) {
    server.middlewares.use(createBoundaryMiddleware())
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), adminBoundaryTiles],
  // ชั้นขอบเขตโหลดแบบ lazy → Vite เจอ dependency เหล่านี้ทีหลังแล้ว re-optimize กลางคัน
  // ได้ react chunk ใหม่คนละตัวกับ react-dom ที่โหลดไปแล้ว (Invalid hook call) จึง pre-bundle ไว้ตั้งแต่ start
  optimizeDeps: {
    include: [
      'maplibre-gl',
      '@maplibre/maplibre-gl-leaflet',
      'admin-boundary',
      'admin-boundary/react',
    ],
  },
})
