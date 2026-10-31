// src/pages/Dashboard/navSections.js
// key ของแต่ละเมนู = path ระดับบนสุด (/dashboard, /alerts, /settings)
// ส่วน "จัดการระบบ" รวมเหลือเมนู "การตั้งค่า" เมนูเดียว — "จัดการผู้ใช้งาน" (admin)
// ย้ายไปเป็นแท็บย่อยใน /settings/manage-user (ดู SettingsPage.jsx)
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import NotificationsActiveRoundedIcon from "@mui/icons-material/NotificationsActiveRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";

// [รวม UX] เดิมมี 4 เมนูแยกกัน: "ภาพรวมสถานี", "สถานีตรวจวัด", "กราฟข้อมูลตามเวลา"
// และ "อินไซต์ข้อมูล" ตอนนี้รวมทั้งหมดเป็นเมนูเดียว ("dashboard") ตามข้อกำหนด
// ใหม่ที่ให้ Insight และ Dashboard อยู่หน้าเดียวกัน (Single Page Dashboard) เพราะ
// ทุกหน้าล้วนต้อง query "สถานี" และ "ตัวแปร/สาร" ร่วมกันอยู่แล้ว การแยกหน้าทำให้
// ผู้ใช้ต้องเลือกสถานีซ้ำหลายรอบ และมองเห็นข้อมูลสรุป+กราฟวิเคราะห์ไม่พร้อมกัน
// ดู components/DashboardInsight.jsx
// alertCount = จำนวนสถานีที่มีปัญหา แสดงเป็น badge ที่เมนูแจ้งเตือน
export function buildNavSections(alertCount = 0) {
  return [
    {
      label: "ภาพรวม",
      items: [
        { key: "dashboard", label: "Dashboard", icon: DashboardRoundedIcon },
      ],
    },
    {
      label: "ข้อมูลตรวจวัด",
      items: [
        { key: "alerts", label: "แจ้งเตือนคุณภาพข้อมูล", icon: NotificationsActiveRoundedIcon, badge: alertCount },
      ],
    },
    {
      label: "จัดการระบบ",
      items: [
        { key: "settings", label: "การตั้งค่า", icon: SettingsRoundedIcon },
      ],
    },
  ];
}
