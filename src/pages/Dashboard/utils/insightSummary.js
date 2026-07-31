// src/pages/Dashboard/utils/insightSummary.js
// ฟังก์ชันสรุปสถิติสำหรับ "Insight Summary" บนสุดของ Dashboard และสำหรับ
// เตรียมข้อมูลให้กราฟ Bar/Heatmap ต่างจาก insightHelpers.js เดิมที่เจาะจง
// เฉพาะเรื่อง wind rose อย่างเดียว จึงแยกไฟล์กัน

// คำนวณ จำนวนข้อมูล / ค่าเฉลี่ย / สูงสุด / ต่ำสุด / แนวโน้ม จากชุด Observation
// ของตัวแปรหนึ่งตัว (rows เรียงจากเก่า -> ใหม่ ตามที่ useObservationsRange คืนมา)
export function summarizeObservations(rows) {
  const values = (rows || [])
    .map((r) => Number(r.result))
    .filter((v) => Number.isFinite(v));

  if (values.length === 0) return null;

  const sum = values.reduce((a, b) => a + b, 0);
  const avg = sum / values.length;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const first = values[0];
  const last = values[values.length - 1];
  const trendPct = first !== 0 ? ((last - first) / Math.abs(first)) * 100 : null;
  const trendDirection =
    trendPct === null ? "flat" : trendPct > 0.5 ? "up" : trendPct < -0.5 ? "down" : "flat";

  return { count: values.length, avg, max, min, first, last, trendPct, trendDirection };
}

// หาวันที่ล่าสุดที่ "มีข้อมูลจริง" ในระบบ (Latest Available Data Date) จาก
// phenomenonTime ล่าสุดของทุก Datastream ทุกสถานี — ใช้แทนวันที่ปัจจุบันของ
// เครื่องผู้ใช้ ตามข้อกำหนดของ Insight Dashboard
export function findLatestAvailableDate(things) {
  const times = (things || [])
    .flatMap((t) => (t.Datastreams || []).map((ds) => ds.Observations?.[0]?.phenomenonTime))
    .filter(Boolean);
  if (times.length === 0) return null;
  return times.sort().reverse()[0];
}

const MONTHS_EN = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// จัดรูปแบบ "28 Jul 2026 15:00 UTC" ตามที่ requirement ระบุไว้เป๊ะ ๆ
export function formatUtcLabel(isoString) {
  if (!isoString) return "ไม่มีข้อมูล";
  const d = new Date(isoString);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getUTCDate())} ${MONTHS_EN[d.getUTCMonth()]} ${d.getUTCFullYear()} ${pad(
    d.getUTCHours()
  )}:${pad(d.getUTCMinutes())} UTC`;
}

// จัดกลุ่มข้อมูลเป็นค่าเฉลี่ยรายวัน (เรียงเก่า -> ใหม่) — ใช้กับ Bar/Column chart
export function groupDailyAverage(rows) {
  const byDay = new Map();
  (rows || []).forEach((r) => {
    const v = Number(r.result);
    if (!Number.isFinite(v) || !r.phenomenonTime) return;
    const day = r.phenomenonTime.slice(0, 10); // YYYY-MM-DD
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day).push(v);
  });
  return Array.from(byDay.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([day, values]) => ({
      day,
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      count: values.length,
    }));
}

// จัดกลุ่มข้อมูลเป็นตาราง "วันในสัปดาห์ x ชั่วโมง" ค่าเฉลี่ย — ใช้กับ Heatmap
// คืนค่ารูปแบบ [hourIndex, weekdayIndex, avgValue] ตามที่ Highcharts heatmap ต้องการ
export function groupHourlyHeatmap(rows) {
  const buckets = new Map(); // key: "weekday-hour" -> values[]
  (rows || []).forEach((r) => {
    const v = Number(r.result);
    if (!Number.isFinite(v) || !r.phenomenonTime) return;
    const d = new Date(r.phenomenonTime);
    const key = `${d.getUTCDay()}-${d.getUTCHours()}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(v);
  });

  const data = [];
  let hasAny = false;
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const values = buckets.get(`${day}-${hour}`);
      if (values && values.length) {
        hasAny = true;
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        data.push([hour, day, Math.round(avg * 100) / 100]);
      }
    }
  }
  return { data, hasAny };
}
