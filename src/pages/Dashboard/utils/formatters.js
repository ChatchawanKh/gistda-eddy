// src/pages/Dashboard/utils/formatters.js
// ฟังก์ชันช่วยแปลง/จัดรูปแบบข้อมูลที่ได้จาก FROST-Server ให้ใช้กับ UI ได้ง่ายขึ้น

// รวม Datastream ของทุกสถานีให้เป็น list เดียว ใช้กับหน้ากราฟ/แจ้งเตือน
export function flattenDatastreams(things) {
  return things.flatMap((t) =>
    (t.Datastreams || []).map((ds) => ({
      ...ds,
      thingId: t["@iot.id"],
      thingName: t.name,
    }))
  );
}

// แปลงเวลาล่าสุด (ISO string) เป็นข้อความ "N นาที/ชั่วโมง/วันที่แล้ว"
export function timeAgoLabel(isoString) {
  if (!isoString) return "ไม่มีข้อมูล";
  const diffMs = Date.now() - new Date(isoString).getTime();
  const hours = diffMs / (1000 * 60 * 60);
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} นาทีที่แล้ว`;
  if (hours < 48) return `${Math.round(hours)} ชั่วโมงที่แล้ว`;
  return `${Math.round(hours / 24)} วันที่แล้ว`;
}

// จัดรูปแบบค่าตรวจวัดสำหรับแสดงเป็นตัวเลขสั้น ๆ — ค่าน้อยกว่า 1 (เช่น CH4 flux
// 0.00225) ใช้เลขนัยสำคัญ 3 ตัว ไม่งั้นจะปัดเหลือ 0 ค่าอื่นทศนิยมไม่เกิน 2 ตำแหน่ง
export function formatObservationValue(value) {
  const n = Number(value);
  if (value === null || value === undefined || !Number.isFinite(n)) {
    return value ?? "-";
  }
  if (n !== 0 && Math.abs(n) < 1) {
    return n.toLocaleString("th-TH", { maximumSignificantDigits: 3 });
  }
  return n.toLocaleString("th-TH", { maximumFractionDigits: 2 });
}

// ช่วงเวลาที่มีข้อมูลของทุก Datastream รวมกัน จาก Datastream.phenomenonTime
// (ISO 8601 interval "start/end" หรือเวลาเดียว) คืนค่า { min, max } เป็น Date
// หรือ null ถ้าไม่มี Datastream ไหนระบุช่วงเวลาไว้
export function getDataTimeBounds(things) {
  let min = null;
  let max = null;
  (things || []).forEach((t) =>
    (t.Datastreams || []).forEach((ds) => {
      if (!ds.phenomenonTime) return;
      const [startStr, endStr = startStr] = String(ds.phenomenonTime).split("/");
      const start = new Date(startStr);
      const end = new Date(endStr);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return;
      if (!min || start < min) min = start;
      if (!max || end > max) max = end;
    }),
  );
  return min && max ? { min, max } : null;
}

// ตรวจสอบว่า Datastream นี้เคยมี Observation บันทึกไว้บ้างหรือไม่ (ใช้กับการ
// ปิด/เปิดปุ่มในหน้าภาพรวมสถานี เพื่อกันไม่ให้กดดูกราฟ/แถวที่ไม่มีข้อมูลจริง)
export function hasObservationData(ds) {
  return Boolean(ds?.Observations?.[0]);
}
