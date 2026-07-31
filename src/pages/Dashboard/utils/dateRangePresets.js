// src/pages/Dashboard/utils/dateRangePresets.js
// สร้างช่วงเวลาสำเร็จรูป (preset) สำหรับ Date Range Picker ของ Dashboard
//
// สำคัญ: preset ทุกตัวคำนวณจาก "anchorDate" ที่ส่งเข้ามา ซึ่ง Dashboard.jsx จะส่ง
// เป็น "วันที่ล่าสุดที่มีข้อมูลจริงในฐานข้อมูล" (Latest Available Data Date)
// ไม่ใช่ new Date() ของเครื่องผู้ใช้ เพราะสถานีตรวจวัดอาจมีข้อมูลอัปเดตล่าช้า —
// ถ้าอิงวันที่ปัจจุบันจริง preset อย่าง "วันนี้" หรือ "7 วันล่าสุด" อาจไม่มี
// ข้อมูลให้เห็นเลยทั้งที่ระบบมีข้อมูลอยู่ (เพียงแต่เป็นของเมื่อวาน/สัปดาห์ก่อน)
export function startOfDayUTC(date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function endOfDayUTC(date) {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

function daysBefore(date, n) {
  return new Date(date.getTime() - n * 24 * 60 * 60 * 1000);
}

function startOfMonthUTC(date) {
  const d = new Date(date);
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function buildDatePresets(anchorDate) {
  const anchor = anchorDate ? new Date(anchorDate) : new Date();
  const today = startOfDayUTC(anchor);
  const yesterday = daysBefore(today, 1);
  const thisMonthStart = startOfMonthUTC(anchor);
  const lastMonthEnd = new Date(thisMonthStart.getTime() - 1);
  const lastMonthStart = startOfMonthUTC(lastMonthEnd);

  return [
    {
      key: "today",
      label: "วันนี้ (ล่าสุด)",
      range: { from: today.toISOString(), to: endOfDayUTC(anchor).toISOString() },
    },
    {
      key: "yesterday",
      label: "เมื่อวาน",
      range: { from: yesterday.toISOString(), to: endOfDayUTC(yesterday).toISOString() },
    },
    {
      key: "7d",
      label: "7 วันล่าสุด",
      range: { from: daysBefore(today, 6).toISOString(), to: endOfDayUTC(anchor).toISOString() },
    },
    {
      key: "30d",
      label: "30 วันล่าสุด",
      range: { from: daysBefore(today, 29).toISOString(), to: endOfDayUTC(anchor).toISOString() },
    },
    {
      key: "90d",
      label: "90 วันล่าสุด",
      range: { from: daysBefore(today, 89).toISOString(), to: endOfDayUTC(anchor).toISOString() },
    },
    {
      key: "thisMonth",
      label: "เดือนนี้",
      range: { from: thisMonthStart.toISOString(), to: endOfDayUTC(anchor).toISOString() },
    },
    {
      key: "lastMonth",
      label: "เดือนที่แล้ว",
      range: { from: lastMonthStart.toISOString(), to: endOfDayUTC(lastMonthEnd).toISOString() },
    },
  ];
}

const TOLERANCE_MS = 60 * 1000;

// หา preset ที่ตรงกับช่วงเวลาปัจจุบันพอดี (เทียบทั้ง from และ to) — ถ้าไม่ตรง
// กับ preset ไหนเลย แปลว่ากำลังอยู่ในโหมด "กำหนดเอง"
export function matchPreset(presets, from, to) {
  if (!from || !to) return null;
  const match = presets.find(
    (p) =>
      Math.abs(new Date(p.range.from).getTime() - new Date(from).getTime()) < TOLERANCE_MS &&
      Math.abs(new Date(p.range.to).getTime() - new Date(to).getTime()) < TOLERANCE_MS
  );
  return match ? match.key : null;
}

export function formatRangeLabel(from, to) {
  if (!from || !to) return "เลือกช่วงเวลา";
  const opts = { day: "2-digit", month: "short", year: "numeric" };
  const fromLabel = new Date(from).toLocaleDateString("th-TH", opts);
  const toLabel = new Date(to).toLocaleDateString("th-TH", opts);
  return fromLabel === toLabel ? fromLabel : `${fromLabel} – ${toLabel}`;
}
