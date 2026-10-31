// src/pages/Dashboard/utils/thaiDate.js
// แปลง/ตรวจสอบวันที่แบบ วว/ดด/ปปปป (ปี พ.ศ.) สำหรับช่องพิมพ์วันที่ของ Date Range Picker
// ทุกฟังก์ชันทำงานแบบ UTC-based ให้ตรงกับ calendarGrid.js / dateRangePresets.js
const BE_OFFSET = 543;

// จัดรูปตัวเลขล้วน (สูงสุด 8 หลัก) เป็น "วว/ดด/ปปปป" — trailingSlash = เติม "/"
// ทันทีที่พิมพ์วันหรือเดือนครบ 2 หลัก (ปิดตอนผู้ใช้กำลังลบ ไม่งั้นลบ "/" ไม่ออก)
export function formatDateDigits(digits, trailingSlash = true) {
  const d = digits.slice(0, 8);
  let out = d.slice(0, 2);
  if (d.length > 2 || (trailingSlash && d.length === 2)) out += `/${d.slice(2, 4)}`;
  if (d.length > 4 || (trailingSlash && d.length === 4)) out += `/${d.slice(4)}`;
  return out;
}

// แปลงข้อความที่ผู้ใช้พิมพ์/วางเป็นตัวเลขล้วน — วันหรือเดือนหลักเดียวที่ตามด้วยตัวคั่น
// เติม 0 ให้ (เช่นพิมพ์ "1/" หรือวาง "1-3-2569" → "01032569")
export function normalizeDateInput(raw) {
  const segments = String(raw).split(/\D+/);
  return segments
    .map((seg, i) =>
      i < 2 && seg.length === 1 && i < segments.length - 1 ? `0${seg}` : seg,
    )
    .join("")
    .slice(0, 8);
}

// "22/10/2569" → { date } เป็น Date เที่ยงคืน UTC
// ถ้าไม่ครบหรือผิดรูปแบบคืน { date: null, error } (error = null ถ้ายังพิมพ์ไม่ครบ)
export function parseThaiDate(text) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(text || "").trim());
  if (!m) return { date: null, error: null };
  const day = Number(m[1]);
  const month = Number(m[2]);
  let year = Number(m[3]);
  if (year < 2400) return { date: null, error: "กรอกปีเป็น พ.ศ. เช่น 2569" };
  year -= BE_OFFSET;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return { date: null, error: "ไม่มีวันที่นี้ในปฏิทิน" };
  }
  return { date, error: null };
}

// Date → "22/10/2569"
export function formatThaiDate(date) {
  if (!date) return "";
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear() + BE_OFFSET}`;
}

export function toBuddhistYear(ceYear) {
  return ceYear + BE_OFFSET;
}
