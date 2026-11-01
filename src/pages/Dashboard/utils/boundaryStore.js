// ชั้นขอบเขตการปกครอง (จังหวัด/อำเภอ/ตำบล) บนแผนที่สถานี — ใช้ admin-boundary
// (https://github.com/ChatchawanKh/boundary-service)
// store เก็บว่าเปิดระดับไหนและความทึบ เมนูบนแผนที่สั่งผ่าน store แล้ว layer วาดตามเอง
import { LEVELS, boundaryDataset, createBoundaryStore } from "admin-boundary";

// ต้องตรงกับ server/auth/utils/boundaryTiles.js (dev: Vite ตอบ, production: Express ใน /api)
const BOUNDARY_TILES_URL = "/api/boundary-tiles";
export const BOUNDARY_GLYPHS_URL = "/api/boundary-fonts/{fontstack}/{range}.pbf";

// ช่วงซูมปรับให้เข้ากับแผนที่สถานี (ค่าเป็นซูมของ MapLibre = ซูม Leaflet − 1)
// ค่าเริ่มต้นของ library ให้ตำบลขึ้นที่ Leaflet 14 แต่เลือกสถานีแล้วซูมไปแค่ 13 จึงไม่เห็นตำบลเลย
//   Leaflet   เส้น                     ป้าย
//   ≤ 8       จังหวัด                   จังหวัด
//   9–10      จังหวัด + อำเภอ           อำเภอ
//   11        จังหวัด + อำเภอ + ตำบล     อำเภอ
//   12+       จังหวัด + อำเภอ + ตำบล     ตำบล
// (server ใส่เส้นตำบลใน tile ตั้งแต่ z10 จึงต่ำกว่านั้นไม่ได้)
const STYLE_OVERRIDES = {
  Province: { labelMaxzoom: 8 },
  Amphoe: { minzoom: 7, labelMinzoom: 8, labelMaxzoom: 11 },
  Tambon: { minzoom: 10, labelMinzoom: 11 },
};

export const boundaryStore = createBoundaryStore({
  styles: STYLE_OVERRIDES,
  persist: { key: "gistda-eddy:boundary" },
});

// ป้ายชื่อแสดงอัตโนมัติตามซูมเสมอ (ไม่มีปุ่มปิดป้าย) — ล้างค่าที่อาจจำไว้จากเวอร์ชันก่อน
for (const level of LEVELS) boundaryStore.setLevelLabels(level, true);

export const adminBoundaryDataset = boundaryDataset({ tiles: BOUNDARY_TILES_URL });

// สวิตช์หลัก เปิด/ปิดทั้งชั้น — store ของ admin-boundary ไม่มีค่านี้จึงจำแยกไว้เอง
// ปิดอยู่ = ยังไม่โหลด maplibre-gl และไม่ขอ tile เลย
const ENABLED_KEY = "gistda-eddy:boundary-enabled";

export function readBoundaryEnabled() {
  try {
    return localStorage.getItem(ENABLED_KEY) === "true";
  } catch {
    return false;
  }
}

export function writeBoundaryEnabled(enabled) {
  try {
    localStorage.setItem(ENABLED_KEY, String(enabled));
  } catch {
    // storage ถูกปิด (private mode) — แค่ไม่จำค่า
  }
}
