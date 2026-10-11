// src/pages/Dashboard/utils/units.js
// แปลงหน่วยอุณหภูมิสำหรับ "การแสดงผล" เท่านั้น — ข้อมูลใน FROST เก็บเป็น Kelvin
// (unitOfMeasurement.symbol = "K") ผู้ใช้สลับดูเป็น °C ได้ด้วยปุ่ม ⇄ บนการ์ดกราฟ
// ไฟล์ดาวน์โหลดรายงานยังเป็นค่าดิบตาม FROST ไม่ผ่านฟังก์ชันเหล่านี้

export const TEMP_UNITS = { KELVIN: "K", CELSIUS: "C" };

const KELVIN_OFFSET = 273.15;

export function isKelvinUnit(unit) {
  return unit === "K";
}

// ต้องแปลงไหม: หน่วยต้นทางเป็น K และผู้ใช้เลือกดูเป็น °C
export function shouldConvertTemp(unit, tempUnit) {
  return isKelvinUnit(unit) && tempUnit === TEMP_UNITS.CELSIUS;
}

// ปัดที่ 4 ตำแหน่งกัน floating-point noise จากการลบ (302.423 - 273.15 = 29.273000000000025)
export function kelvinToCelsius(value) {
  return Math.round((value - KELVIN_OFFSET) * 1e4) / 1e4;
}

export function convertTempValue(value, unit, tempUnit) {
  if (!shouldConvertTemp(unit, tempUnit)) return value;
  const n = Number(value);
  return value === null || value === undefined || !Number.isFinite(n)
    ? value
    : kelvinToCelsius(n);
}

export function displayTempUnit(unit, tempUnit) {
  return shouldConvertTemp(unit, tempUnit) ? "°C" : unit;
}

// แปลงทั้งชุด Observation ({ phenomenonTime, result }) — คืน array เดิมถ้าไม่ต้องแปลง
// (ไม่สร้าง array ใหม่ทุก render ให้ useMemo ปลายทางไม่คำนวณซ้ำโดยไม่จำเป็น)
export function convertTempRows(rows, unit, tempUnit) {
  if (!shouldConvertTemp(unit, tempUnit)) return rows;
  return (rows || []).map((r) => ({
    ...r,
    result: convertTempValue(r.result, unit, tempUnit),
  }));
}
