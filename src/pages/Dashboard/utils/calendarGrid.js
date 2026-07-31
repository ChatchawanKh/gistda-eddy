// src/pages/Dashboard/utils/calendarGrid.js
// สร้างตารางปฏิทินรายเดือน (6 แถว x 7 วัน = 42 ช่อง คงที่ทุกเดือน กันความสูง
// ของปฏิทินกระโดดตอนเปลี่ยนเดือน) แบบ UTC-based ให้สอดคล้องกับการคำนวณวันที่
// จุดอื่นในหน้า Dashboard (dateRangePresets.js ก็ใช้ UTC เช่นกัน)
export function startOfMonthUTC(date) {
  const d = new Date(date);
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function addMonthsUTC(date, n) {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d;
}

export function addDaysUTC(date, n) {
  return new Date(date.getTime() + n * 24 * 60 * 60 * 1000);
}

export function isSameDayUTC(a, b) {
  if (!a || !b) return false;
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

// คืน array 42 ช่อง { date, inMonth, isAnchor } ของเดือนที่ระบุ เริ่มแถวแรก
// ด้วยวันอาทิตย์เสมอ (0 = อา ... 6 = ส)
export function buildMonthGrid(monthDate, anchorDate) {
  const first = startOfMonthUTC(monthDate);
  const gridStart = addDaysUTC(first, -first.getUTCDay());
  const anchor = anchorDate ? new Date(anchorDate) : null;

  return Array.from({ length: 42 }, (_, i) => {
    const date = addDaysUTC(gridStart, i);
    return {
      date,
      inMonth: date.getUTCMonth() === first.getUTCMonth(),
      isAnchor: anchor ? isSameDayUTC(date, anchor) : false,
    };
  });
}
