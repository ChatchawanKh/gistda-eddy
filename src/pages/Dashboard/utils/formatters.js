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

// ตรวจสอบว่า Datastream นี้เคยมี Observation บันทึกไว้บ้างหรือไม่ (ใช้กับการ
// ปิด/เปิดปุ่มในหน้าภาพรวมสถานี เพื่อกันไม่ให้กดดูกราฟ/แถวที่ไม่มีข้อมูลจริง)
export function hasObservationData(ds) {
  return Boolean(ds?.Observations?.[0]);
}
