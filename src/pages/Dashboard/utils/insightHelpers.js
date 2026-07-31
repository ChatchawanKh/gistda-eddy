// src/pages/Dashboard/utils/insightHelpers.js
// ฟังก์ชันช่วยสำหรับหน้า "อินไซต์ข้อมูล": หาตัวแปรลมจากชื่อ ObservedProperty
// และคำนวณข้อมูลสำหรับ wind rose (กราฟทิศทาง+ความเร็วลมแบบเรดาร์)

// ค้นหา Datastream จาก keyword ในชื่อ (case-insensitive) — ใช้หา "ความเร็วลม"
// และ "ทิศทางลม" จากรายชื่อ ObservedProperty ที่ตั้งไว้ไม่แน่นอนในแต่ละสถานี
export function findDatastreamByKeywords(datastreams, keywords) {
  const norm = (s) => (s || "").toLowerCase();
  return datastreams.find((ds) => {
    const name = norm(ds.ObservedProperty?.name || ds.name);
    return keywords.some((k) => name.includes(k.toLowerCase()));
  });
}

export const WIND_SPEED_KEYWORDS = [
  "wind speed",
  "windspeed",
  "wind_speed",
  "ความเร็วลม",
];

export const WIND_DIRECTION_KEYWORDS = [
  "wind direction",
  "wind dir",
  "wind_direction",
  "ทิศทางลม",
  "ทิศลม",
];

// เรียงตามเข็มนาฬิกาเริ่มจากทิศเหนือ (มาตรฐานเข็มทิศ 16 ทิศ)
export const COMPASS_SECTORS = [
  "N", "NNE", "NE", "ENE",
  "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW",
  "W", "WNW", "NW", "NNW",
];

// แปลงองศา (0-360) เป็น index ของ 16 ทิศ
export function degToSectorIndex(deg) {
  const normalized = ((deg % 360) + 360) % 360;
  return Math.round(normalized / 22.5) % 16;
}

function binIndexFor(speed, edges) {
  for (let i = 0; i < edges.length; i++) {
    if (speed < edges[i]) return i;
  }
  return edges.length;
}

// จับคู่ข้อมูลความเร็วลม + ทิศทางลมด้วยเวลาที่ "ใกล้เคียงที่สุด" (nearest-time
// match) แล้วนับความถี่ลงในตาราง [speedBin][sector] เป็น % ของจำนวนคู่ข้อมูลที่
// จับคู่ได้ทั้งหมด สำหรับพล็อตเป็น Highcharts polar stacked column (wind rose)
//
// [แก้บัค] เดิมจับคู่ด้วย phenomenonTime ที่ต้อง "ตรงกันเป๊ะ" แบบ string
// เทียบตรง ๆ (Map key = phenomenonTime) ซึ่งพังง่ายมาก เพราะความเร็วลมและ
// ทิศทางลมเป็นคนละ Observation กัน ในทางปฏิบัติสถานีมักบันทึกเวลาต่างกันแค่
// เสี้ยววินาที/มิลลิวินาที ทำให้ string ไม่ตรงกันเป๊ะแม้จะเป็น "รอบเดียวกัน"
//
// [แก้รอบ 2] รอบแรกเปลี่ยนมาใช้ nearest-time match แต่ยังกำหนด tolerance
// ตายตัวไว้ที่ 5 นาที ซึ่งยังพังอยู่ดีถ้าสถานีนั้นบันทึกความเร็วลมกับทิศทางลม
// ห่างกันเกิน 5 นาที (เช่น logger บันทึกทุก 10/15/30 นาที ไม่ตรงรอบกัน) —
// grid ของสองตัวแปรนี้ไม่มีทางรู้ล่วงหน้าว่าห่างกันเท่าไหร่ เพราะแต่ละสถานี/
// เซนเซอร์ตั้งค่าความถี่ไม่เหมือนกัน ใช้ค่าคงที่จึงพังได้กับบางสถานี/ช่วงเวลา
// เสมอ ไม่ว่าจะปรับตัวเลขเป็นเท่าไหร่ก็ตาม
//
// แก้ให้ tolerance "ปรับตามข้อมูลจริง" แทน: คำนวณจาก median ของช่วงห่างระหว่าง
// จุดข้อมูลที่ติดกันของแต่ละตัวแปร (sampling interval จริงของสถานีนั้น) แล้วใช้
// ครึ่งหนึ่งของช่วงที่กว้างกว่าเป็น tolerance — ไม่ว่าสถานีจะบันทึกถี่/ห่างแค่ไหน
// ก็ยังจับคู่จุดที่ใกล้เคียงกันที่สุดของรอบนั้นได้เสมอ (มี floor/ceiling กันไว้
// ไม่ให้แคบ/กว้างเกินสมเหตุสมผล)
function medianInterval(series) {
  if (series.length < 2) return null;
  const diffs = [];
  for (let i = 1; i < series.length; i += 1) diffs.push(series[i].t - series[i - 1].t);
  diffs.sort((a, b) => a - b);
  return diffs[Math.floor(diffs.length / 2)];
}

const MIN_TOLERANCE_MS = 5 * 60 * 1000; // อย่างน้อย 5 นาที
const MAX_TOLERANCE_MS = 3 * 60 * 60 * 1000; // อย่างมาก 3 ชั่วโมง กันไม่ให้จับคู่ข้ามช่วงเวลาที่ห่างเกินไปจนไม่มีความหมาย

function toSortedTimeSeries(rows) {
  return rows
    .map((r) => ({ t: new Date(r.phenomenonTime).getTime(), v: r.result }))
    .filter((r) => Number.isFinite(r.t) && r.v !== undefined && r.v !== null)
    .sort((a, b) => a.t - b.t);
}

export function buildWindRoseMatrix(speedRows, directionRows, speedBinEdges) {
  const speedSeries = toSortedTimeSeries(speedRows);
  const dirSeries = toSortedTimeSeries(directionRows);
  const matrix = Array.from({ length: speedBinEdges.length + 1 }, () => Array(16).fill(0));
  let matched = 0;

  if (!speedSeries.length || !dirSeries.length) return null;

  // tolerance ปรับตาม sampling interval จริงของทั้งสองตัวแปร — ใช้ตัวที่ห่าง
  // กว่า (บ่งบอกว่าเซนเซอร์นั้นบันทึกถี่น้อยกว่า) หาร 2 เพื่อให้จุดกึ่งกลาง
  // ระหว่างสองรอบการบันทึกยังนับว่า "จับคู่ได้"
  const speedInterval = medianInterval(speedSeries);
  const dirInterval = medianInterval(dirSeries);
  const baseInterval = Math.max(speedInterval || 0, dirInterval || 0);
  const tolerance = Math.min(
    MAX_TOLERANCE_MS,
    Math.max(MIN_TOLERANCE_MS, baseInterval ? baseInterval / 2 : MIN_TOLERANCE_MS)
  );

  let dirIdx = 0;
  speedSeries.forEach(({ t, v }) => {
    // เลื่อน pointer ของทิศทางลมไปข้างหน้าจนกว่าจุดถัดไปจะไม่ใกล้เวลานี้กว่าจุด
    // ปัจจุบัน (ทั้งสองฝั่งเรียงเวลาแล้ว จึงเลื่อนไปข้างหน้าอย่างเดียวพอ ไม่ต้อง
    // ย้อนกลับ — เป็น two-pointer merge มาตรฐาน)
    while (
      dirIdx < dirSeries.length - 1 &&
      Math.abs(dirSeries[dirIdx + 1].t - t) <= Math.abs(dirSeries[dirIdx].t - t)
    ) {
      dirIdx += 1;
    }
    const closest = dirSeries[dirIdx];
    if (Math.abs(closest.t - t) > tolerance) return;

    const sector = degToSectorIndex(Number(closest.v));
    const bin = binIndexFor(Number(v), speedBinEdges);
    matrix[bin][sector] += 1;
    matched += 1;
  });

  if (matched === 0) return null;

  return {
    matched,
    percentages: matrix.map((bin) => bin.map((count) => (count / matched) * 100)),
  };
}

// คำนวณขอบเขตช่วงความเร็ว (bin edges) แบบไดนามิกจากค่าสูงสุดที่พบจริง แบ่งเป็น
// 5 ช่วงเท่า ๆ กัน (คืนค่า 4 ขอบเขต) ปัดเป็นทศนิยม 1 ตำแหน่ง
export function computeSpeedBinEdges(speedRows) {
  const values = speedRows.map((r) => Number(r.result)).filter((v) => Number.isFinite(v));
  const max = values.length ? Math.max(...values) : 0;
  const step = max > 0 ? max / 5 : 1;
  return [1, 2, 3, 4].map((i) => Math.round(step * i * 10) / 10);
}

export function speedBinLabel(index, edges, unit) {
  const u = unit ? ` ${unit}` : "";
  if (index === 0) return `< ${edges[0]}${u}`;
  if (index === edges.length) return `≥ ${edges[edges.length - 1]}${u}`;
  return `${edges[index - 1]}–${edges[index]}${u}`;
}
