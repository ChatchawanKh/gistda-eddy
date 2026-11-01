// ชั้นขอบเขตการปกครองบน Leaflet (ใช้ภายใน <MapContainer>)
// admin-boundary ซ้อน MapLibre ไว้เป็น layer หนึ่งของ Leaflet (@maplibre/maplibre-gl-leaflet)
// จึงได้เส้นและป้ายภาษาไทยแบบ vector ที่ไม่ทับกัน — โหลดแบบ lazy เพราะ maplibre-gl ใหญ่
// mount = ผูก store กับแผนที่, unmount = ถอด layer ออกทั้งหมด
// ใช้ maplibre-gl 5.x เท่านั้น: 6.x หา worker จาก new URL("./maplibre-gl-worker.mjs", import.meta.url)
// ซึ่งไม่มีอยู่หลัง Vite pre-bundle/build → worker ไม่ทำงาน เส้นขอบเขตไม่ถูกวาดเลย (ไม่มี error ชัดเจน)
import { useMap } from "react-leaflet";
import "maplibre-gl/dist/maplibre-gl.css";
import { maplibreGL } from "@maplibre/maplibre-gl-leaflet";
import { useLeafletBoundary } from "admin-boundary/react";

import {
  BOUNDARY_GLYPHS_URL,
  adminBoundaryDataset,
  boundaryStore,
} from "../utils/boundaryStore";

// bindLeaflet ใช้แค่ L.maplibreGL — ส่ง factory ของ plugin ตรง ๆ ไม่ต้องพึ่ง window.L
const BINDING_OPTIONS = {
  L: { maplibreGL },
  dataset: adminBoundaryDataset,
  glyphs: BOUNDARY_GLYPHS_URL,
};

export default function AdminBoundaryLayer() {
  const map = useMap();
  useLeafletBoundary(map, BINDING_OPTIONS, boundaryStore);
  return null;
}
