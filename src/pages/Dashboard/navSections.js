// src/pages/Dashboard/navSections.js
// หมายเหตุ: ส่วน "จัดการระบบ" (การตั้งค่า + จัดการผู้ใช้งาน) คงโครงสร้าง/logic เดิมไว้ทั้งหมด
// ตามที่กำหนดไว้ก่อนหน้านี้ว่าห้ามยุ่งกับสองหน้านี้
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import NotificationsActiveRoundedIcon from "@mui/icons-material/NotificationsActiveRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";

import { ADMIN_USERS_KEY } from "./Dashboard.constants";

// [รวม UX] เดิมมี 4 เมนูแยกกัน: "ภาพรวมสถานี", "สถานีตรวจวัด", "กราฟข้อมูลตามเวลา"
// และ "อินไซต์ข้อมูล" ตอนนี้รวมทั้งหมดเป็นเมนูเดียว ("dashboard") ตามข้อกำหนด
// ใหม่ที่ให้ Insight และ Dashboard อยู่หน้าเดียวกัน (Single Page Dashboard) เพราะ
// ทุกหน้าล้วนต้อง query "สถานี" และ "ตัวแปร/สาร" ร่วมกันอยู่แล้ว การแยกหน้าทำให้
// ผู้ใช้ต้องเลือกสถานีซ้ำหลายรอบ และมองเห็นข้อมูลสรุป+กราฟวิเคราะห์ไม่พร้อมกัน
// ดู components/DashboardInsight.jsx
export function buildNavSections(isAdmin) {
  const sections = [
    {
      label: "ภาพรวม",
      items: [
        { key: "dashboard", label: "Dashboard", icon: DashboardRoundedIcon },
      ],
    },
    {
      label: "ข้อมูลตรวจวัด",
      items: [
        { key: "alerts", label: "แจ้งเตือนคุณภาพข้อมูล", icon: NotificationsActiveRoundedIcon },
      ],
    },
    {
      // ----- ห้ามแก้ไข logic หรือรายการเมนูของ section นี้ -----
      label: "จัดการระบบ",
      items: [
        { key: "settings", label: "การตั้งค่า", icon: SettingsRoundedIcon },
      ],
    },
  ];

  if (isAdmin) {
    sections[2].items.push({
      key: ADMIN_USERS_KEY,
      label: "จัดการผู้ใช้งาน",
      icon: AdminPanelSettingsRoundedIcon,
    });
  }

  return sections;
}
