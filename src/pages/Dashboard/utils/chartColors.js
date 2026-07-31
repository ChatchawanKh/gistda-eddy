// src/pages/Dashboard/utils/chartColors.js
// พาเลตสีสำหรับกราฟใน Multi-chart Dashboard — ให้แต่ละ "ตัวแปร" (datastream)
// มีสีประจำตัวที่แตกต่างกันชัดเจน แทนที่จะใช้สี primary (ฟ้า) ซ้ำกันทุกกราฟ
// เหมือนเดิม ช่วยให้แยกแยะกราฟแต่ละตัวแปรได้ง่ายขึ้นเมื่อเห็นพร้อมกันหลายการ์ด
// (เช่นโซน "ตัวแปรอื่นในสถานีนี้" ที่แสดงกราฟย่อยหลายตัวติดกัน)
//
// เลือกโทนสีที่แยกแยะง่าย (categorical, ตัดสีที่ตัดกันเกินไปออก) และยังอ่านง่าย
// บนพื้นหลังขาว ทั้งตอนใช้เป็นเส้น/แท่งทึบ และตอนใช้เป็นพื้นที่ระบายสีอ่อน
export const CHART_PALETTE = [
  "#2E7DD1", // ฟ้า
  "#E8874A", // ส้ม
  "#3EAE7E", // เขียว
  "#B15DCE", // ม่วง
  "#D9455F", // แดงกุหลาบ
  "#2FA6A0", // เขียวอมฟ้า (teal)
  "#C9A227", // เหลืองทอง
  "#6C7BD1", // น้ำเงินม่วง
  "#D68910", // น้ำตาลส้ม
  "#5B8C5A", // เขียวมะกอก
];

// hash string -> ตัวเลขคงที่ เพื่อให้ตัวแปรเดียวกัน (id เดียวกัน) ได้สีเดิม
// เสมอไม่ว่าจะ render กี่รอบ หรือลำดับการ์ดในกริดจะเปลี่ยนไปแค่ไหน
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // เก็บเป็น 32-bit int
  }
  return Math.abs(hash);
}

/**
 * คืนสีประจำตัวของ key (เช่น datastream id หรือชื่อตัวแปร) แบบคงที่
 * @param {string|number} key - ตัวระบุที่ไม่ซ้ำของกราฟ/ตัวแปรนั้น
 * @param {string} [fallback] - สีสำรองถ้าไม่มี key (เช่น theme.palette.primary.main)
 */
export function getChartColor(key, fallback) {
  if (key === undefined || key === null || key === "") {
    return fallback || CHART_PALETTE[0];
  }
  return CHART_PALETTE[hashString(String(key)) % CHART_PALETTE.length];
}
