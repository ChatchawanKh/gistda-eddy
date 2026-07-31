// src/pages/Dashboard/api/frostClient.js
// Client บาง ๆ สำหรับเรียก FROST-Server (SensorThings API)
// แยกออกมาจาก Dashboard.jsx เพื่อให้เปลี่ยน base URL หรือเพิ่ม auth header ได้ที่เดียว

const FROST_BASE =
  "https://frost-server-525761453193.asia-southeast1.run.app/FROST-Server/v1.1";

export async function frostFetch(path) {
  const res = await fetch(`${FROST_BASE}${path}`);
  if (!res.ok) {
    throw new Error(`เรียกข้อมูลจาก FROST-Server ไม่สำเร็จ (HTTP ${res.status})`);
  }
  return res.json();
}
