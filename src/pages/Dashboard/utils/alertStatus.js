// src/pages/Dashboard/utils/alertStatus.js
// logic ของหน้าแจ้งเตือนคุณภาพข้อมูล — คำนวณจากข้อมูล FROST-Server ฝั่ง client ทั้งหมด
// (ยังไม่มี backend เก็บ event) เกณฑ์มีแค่ "ไม่มีข้อมูลใหม่นานเท่าไร" ไม่ตัดสินค่าตรวจวัด
//
// จัดกลุ่มอุปกรณ์ด้วย Sensor.name เหมือน DataReceptionPanel — FROST มี Sensor แยก
// entity ต่อ Datastream แต่ชื่อซ้ำกันสำหรับอุปกรณ์ตัวเดียวกัน

export const STALE_HOURS = 24;
export const CRITICAL_HOURS = 72;
// ตัวแปรที่ค่าล่าสุดห่างกันไม่เกินนี้ ถือว่า "หยุดพร้อมกัน"
const SAME_TIME_TOLERANCE_HOURS = 1;
const HOUR_MS = 3600000;

export const NO_SENSOR = "ไม่ระบุอุปกรณ์";

export function sensorNameOf(ds) {
  return ds.Sensor?.name || NO_SENSOR;
}

export function latestTimeOf(ds) {
  return ds.Observations?.[0]?.phenomenonTime || null;
}

export function formatElapsed(hours) {
  if (!isFinite(hours)) return "ไม่เคยมีข้อมูล";

  const totalHours = Math.round(hours);
  const totalDays = Math.floor(totalHours / 24);

  if (totalDays < 1) {
    return `${totalHours} ชั่วโมง`;
  }

  return `${totalDays} วัน`;
}

const lastSeenFormatter = new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatLastSeen(isoString) {
  if (!isoString) return null;

  const d = new Date(isoString);

  if (isNaN(d.getTime())) return null;

  return lastSeenFormatter.format(d);
}

function hoursSince(iso, now) {
  return iso ? (now - new Date(iso).getTime()) / HOUR_MS : Infinity;
}

// สถานะของสถานีหนึ่ง ณ เวลา now:
// { id, name, level: "ok" | "warning" | "critical", hours, lastSeen,
//   staleCount, total, cause: { kind, sensors }, sensors: [{ name, stale, items }] }
// hours/lastSeen = ข้อมูลล่าสุดของตัวแปรที่ขาด (ตัวที่ใหม่ที่สุดในกลุ่มที่ขาด)
export function buildStationStatus(thing, now) {
  const items = (thing.Datastreams || []).map((ds) => {
    const t = latestTimeOf(ds);
    const hours = hoursSince(t, now);
    return {
      ds,
      t,
      hours,
      stale: hours > STALE_HOURS,
      critical: hours > CRITICAL_HOURS,
    };
  });

  const sensorMap = new Map();
  items.forEach((it) => {
    const key = sensorNameOf(it.ds);
    if (!sensorMap.has(key)) sensorMap.set(key, []);
    sensorMap.get(key).push(it);
  });
  const sensors = Array.from(sensorMap, ([name, list]) => ({
    name,
    items: list,
    stale: list.every((it) => it.stale),
    partial: list.some((it) => it.stale) && !list.every((it) => it.stale),
  }));

  const staleItems = items.filter((it) => it.stale);
  const level = staleItems.some((it) => it.critical)
    ? "critical"
    : staleItems.length
      ? "warning"
      : "ok";
  const freshestStale = staleItems.reduce(
    (best, it) => (!best || it.hours < best.hours ? it : best),
    null,
  );

  return {
    id: String(thing["@iot.id"]),
    name: thing.name,
    level,
    hours: freshestStale?.hours ?? 0,
    lastSeen: freshestStale?.t ?? null,
    staleCount: staleItems.length,
    total: items.length,
    cause: inferCause(items, staleItems, sensors),
    sensors,
  };
}

// อนุมาน "น่าจะเสียตรงไหน" จากรูปแบบเวลาเท่านั้น — ไม่ใช่สถานะอุปกรณ์จริง
//   station  = ทุกตัวแปรหยุดพร้อมกัน → การส่งข้อมูล/ไฟฟ้าของสถานี
//   sensor   = หยุดยกอุปกรณ์ (ทุกตัวแปรของอุปกรณ์นั้น) แต่อุปกรณ์อื่นยังส่ง
//   partial  = หยุดบางตัวแปร ไม่เข้ารูปแบบข้างบน
function inferCause(items, staleItems, sensors) {
  if (!staleItems.length) return { kind: "none", sensors: [] };

  if (staleItems.length === items.length) {
    const times = staleItems
      .map((it) => (it.t ? new Date(it.t).getTime() : null))
      .filter((v) => v !== null);
    const sameTime =
      times.length === staleItems.length &&
      Math.max(...times) - Math.min(...times) <= SAME_TIME_TOLERANCE_HOURS * HOUR_MS;
    return { kind: sameTime ? "station" : "all", sensors: [] };
  }

  const staleSensors = sensors.filter((s) => s.stale);
  const onlyWholeSensors = !sensors.some((s) => s.partial);
  if (staleSensors.length && onlyWholeSensors) {
    return { kind: "sensor", sensors: staleSensors.map((s) => s.name) };
  }
  return { kind: "partial", sensors: [] };
}

const LEVEL_RANK = { critical: 0, warning: 1, ok: 2 };

// เรียงสถานีที่มีปัญหาก่อน (ด่วน → ควรตรวจสอบ) แล้วตามระยะเวลาที่ขาด
export function sortStations(stations) {
  return [...stations].sort(
    (a, b) => LEVEL_RANK[a.level] - LEVEL_RANK[b.level] || b.hours - a.hours,
  );
}

// จำนวนสถานีที่มีปัญหา — ใช้แสดง badge ที่เมนู
export function countAlertStations(things, now) {
  return (things || []).filter((t) => buildStationStatus(t, now).level !== "ok")
    .length;
}

// หาช่วงที่ไม่มีข้อมูลเกิน gapHours จากลำดับเวลา (ms เรียงจากเก่าไปใหม่)
// ถ้าค่าสุดท้ายห่างจาก now เกินเกณฑ์ → ช่วงที่ยังไม่สิ้นสุด (end = null)
// คืนค่า [{ start, end }] เป็น ms — start = เวลาข้อมูลสุดท้ายก่อนหยุด,
// end = เวลาที่ข้อมูลกลับมา
export function findGaps(times, now, gapHours = STALE_HOURS) {
  const limit = gapHours * HOUR_MS;
  const gaps = [];
  for (let i = 1; i < times.length; i++) {
    if (times[i] - times[i - 1] > limit) {
      gaps.push({ start: times[i - 1], end: times[i] });
    }
  }
  const last = times[times.length - 1];
  if (last !== undefined && now - last > limit) {
    gaps.push({ start: last, end: null });
  }
  return gaps;
}

// รวมเวลาของหลายอุปกรณ์ (unique + เรียง) — ช่วงที่ขาดของชุดรวม =
// ช่วงที่ทั้งสถานีไม่มีข้อมูลจากอุปกรณ์ไหนเลย
export function mergeTimes(lists) {
  return Array.from(new Set(lists.flat())).sort((a, b) => a - b);
}

// ช่วงที่ขาดของอุปกรณ์ซึ่งอยู่ในช่วงที่ทั้งสถานีขาดอยู่แล้ว ไม่ต้องแสดงซ้ำ
// เผื่อขอบ SAME_TIME_TOLERANCE เพราะค่าสุดท้ายของแต่ละอุปกรณ์อาจห่างกันหนึ่งรอบ
export function isWithin(gap, outer) {
  const tol = SAME_TIME_TOLERANCE_HOURS * HOUR_MS;
  const gapEnd = gap.end ?? Infinity;
  const outerEnd = outer.end ?? Infinity;
  return gap.start >= outer.start - tol && gapEnd <= outerEnd + tol;
}
