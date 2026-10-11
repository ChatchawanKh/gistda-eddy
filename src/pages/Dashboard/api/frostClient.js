const FROST_BASE = (import.meta.env.VITE_FROST_URL || "").replace(/\/+$/, "");

export async function frostFetch(path) {
  // ไม่ throw ตอน import — ให้ error ไปโผล่ใน Alert ของหน้าที่เรียกใช้แทนหน้าจอขาว
  if (!FROST_BASE) {
    throw new Error("ยังไม่ได้ตั้งค่า VITE_FROST_URL ในไฟล์ .env");
  }
  const res = await fetch(`${FROST_BASE}${path}`);
  if (!res.ok) {
    throw new Error(`เรียกข้อมูลจาก FROST-Server ไม่สำเร็จ (HTTP ${res.status})`);
  }
  return res.json();
}

// ดึงทุกหน้าของผลลัพธ์ โดยตาม @iot.nextLink ไปจนหมด (FROST แบ่งหน้าตาม maxTop
// ของ server) — ใช้กับงานที่ต้องได้ข้อมูลครบ เช่น ดาวน์โหลดรายงาน
// nextLink เป็น URL เต็ม จึงยอมรับเฉพาะลิงก์ที่ขึ้นต้นด้วย FROST_BASE เดียวกัน
export async function frostFetchAll(path, { maxPages = 1000 } = {}) {
  const first = await frostFetch(path);
  const values = [...(first.value || [])];
  let next = first["@iot.nextLink"];
  let pages = 1;
  while (next) {
    if (!next.startsWith(FROST_BASE)) {
      throw new Error("nextLink ชี้ไปนอก FROST-Server ที่ตั้งค่าไว้");
    }
    if (++pages > maxPages) {
      throw new Error(`ข้อมูลมีมากกว่า ${maxPages} หน้า — ลองเลือกช่วงเวลาให้สั้นลง`);
    }
    const data = await frostFetch(next.slice(FROST_BASE.length));
    values.push(...(data.value || []));
    next = data["@iot.nextLink"];
  }
  return values;
}
