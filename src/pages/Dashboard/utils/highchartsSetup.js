// src/pages/Dashboard/utils/highchartsSetup.js
// ตั้งค่า Highcharts กลาง "ที่เดียว" ให้ทุกกราฟใน Dashboard ใช้ instance เดียวกัน
// เปิดใช้งาน module ทางการของ Highcharts เอง แทนการเขียนปุ่ม Export/Fullscreen
// เองทีละกราฟ ตามข้อกำหนด UX/UI ที่ให้ทุกกราฟมี Export (PNG/CSV) และ Fullscreen:
//   - highcharts-more  -> จำเป็นสำหรับกราฟ polar/radar (chart.polar: true) —
//     ถ้าไม่โหลด module นี้ Highcharts จะ "เพิกเฉย" ต่อ chart.polar เงียบ ๆ
//     แล้ว fallback ไปวาดเป็นกราฟแท่งธรรมดา (ไม่ใช่วงกลม) โดยไม่ error ให้เห็น
//     — WindRoseChart.jsx ต้องพึ่ง module นี้โดยตรง
//   - exporting        -> เปิดใช้ export engine (เมนู default ของ Highcharts ถูก
//     ปิดไว้ — เราวาดปุ่ม MoreVert เอง ดู ChartCardMenu.jsx — แต่ยังต้องโหลด
//     module นี้เพื่อให้ chart.downloadCSV()/exportChartLocal() ทำงานได้)
//   - export-data      -> chart.downloadCSV() (ดาวน์โหลดข้อมูลเป็น CSV)
//   - offline-exporting -> chart.exportChartLocal() (สร้าง PNG ฝั่ง client ไม่พึ่ง
//     export server ภายนอกของ Highcharts)
//   - full-screen      -> chart.fullscreen.toggle() (ดูกราฟแบบเต็มจอ)
//   - heatmap          -> ใช้กับ HeatmapChartCard.jsx
import Highcharts from "highcharts";
import HighchartsMore from "highcharts/highcharts-more";
import HighchartsExporting from "highcharts/modules/exporting";
import HighchartsExportData from "highcharts/modules/export-data";
import HighchartsOfflineExporting from "highcharts/modules/offline-exporting";
import HighchartsFullScreen from "highcharts/modules/full-screen";
import HighchartsHeatmap from "highcharts/modules/heatmap";

// module ของ Highcharts เป็น UMD — บาง bundler (Vite/Rolldown บางเวอร์ชัน)
// interop default export ผิดพลาดเป็น namespace object แทนฟังก์ชันตรง ๆ
// (ปัญหาเดียวกับที่ highcharts-react-official เจอ ดูคอมเมนต์ในกราฟอื่น ๆ)
// ฟังก์ชันนี้กันปัญหานั้นไว้ ไม่ว่า bundler จะ interop มาแบบไหนก็ตาม
function initModule(mod) {
  const fn = mod?.default?.default || mod?.default || mod;
  if (typeof fn === "function") fn(Highcharts);
}

initModule(HighchartsMore);
initModule(HighchartsExporting);
initModule(HighchartsExportData);
initModule(HighchartsOfflineExporting);
initModule(HighchartsFullScreen);
initModule(HighchartsHeatmap);

// โทนสีคัดลอกมาจาก design tokens ใน src/theme/Theme.jsx (BLUE/GRAY) — คงไว้แค่
// เฉดที่ใช้จริงกับเมนูนี้ ไม่ import ไฟล์ Theme.jsx ตรง ๆ เพราะไฟล์นี้ทำงานนอก
// React tree (โหลดครั้งเดียวตอน import module) จึงไม่มี ThemeProvider context
// ให้ใช้ useTheme() ได้ — ถ้าปรับสีหลักใน Theme.jsx ให้อัปเดตค่าที่นี่ตามด้วย
const MENU_COLORS = {
  grayText: "#46423C", // GRAY[700]
  graySubtle: "#8A8378", // GRAY[500]
  grayHover: "#F1EFEA", // GRAY[100]
  grayBorder: "#E6E2DA", // GRAY[200]
  blueHoverBg: "#EAF2FF", // BLUE[50]
  blueHoverText: "#0038AD", // BLUE[700]
};

// จัดสไตล์ปุ่ม context menu (ไอคอนแฮมเบอร์เกอร์) + เมนู dropdown ที่กดแล้ว
// เปิดขึ้นมา ให้เข้าธีมของแอป แทนหน้าตา default ของ Highcharts (สี่เหลี่ยม
// ดำทึบ มุมเหลี่ยม) ใช้ Highcharts.setOptions ตั้งครั้งเดียวให้ทุกกราฟทั่วแอป
Highcharts.setOptions({
  lang: {
    contextButtonTitle: "ตัวเลือกเพิ่มเติม",
    downloadPNG: "ดาวน์โหลดรูปภาพ (PNG)",
    downloadCSV: "ดาวน์โหลดข้อมูล (CSV)",
    viewFullscreen: "ดูแบบเต็มจอ",
    exitFullscreen: "ออกจากโหมดเต็มจอ",
    resetZoom: "รีเซ็ตการซูม",
    resetZoomTitle: "ยกเลิกการซูม กลับไปมุมมองเต็ม",
  },
  chart: {
    // ซูมดูรายละเอียดด้วยการ "ลากเมาส์" คลุมพื้นที่กราฟ (แกน X) — ปิด mouse-wheel
    // ไว้ไม่ให้แย่งการ scroll หน้าเว็บ เมื่อซูมแล้ว Highcharts วาดปุ่ม "รีเซ็ตการ
    // ซูม" ให้เองมุมขวาบนของพื้นที่กราฟ จัดธีมปุ่มให้เข้าชุดกับเมนู export ของแอป
    zooming: {
      type: "x",
      mouseWheel: { enabled: false },
      resetButton: {
        relativeTo: "plot",
        position: { align: "right", x: -6, y: 4 },
        theme: {
          fill: "#FFFFFF",
          stroke: MENU_COLORS.grayBorder,
          "stroke-width": 1,
          r: 8,
          padding: 7,
          style: {
            color: MENU_COLORS.grayText,
            fontSize: "11.5px",
            fontWeight: "500",
            fontFamily: '"Kanit", "Noto Sans Thai", sans-serif',
          },
          states: {
            hover: {
              fill: MENU_COLORS.blueHoverBg,
              stroke: MENU_COLORS.blueHoverText,
              style: { color: MENU_COLORS.blueHoverText },
            },
          },
        },
      },
    },
    events: {
      // ดูกราฟแบบเต็มจอให้พื้นหลังเป็นสีขาว (ปกติ backgroundColor: "transparent"
      // เพื่อกลืนกับการ์ด แต่พอเต็มจอ browser จะเทพื้นหลังดำ) — คืนค่าโปร่งใส
      // เมื่อออกจากเต็มจอ ใช้ร่วมกับกฎ CSS :fullscreen ใน Theme.jsx
      fullscreenOpen() {
        this.update({ chart: { backgroundColor: "#FFFFFF" } }, true, false, false);
      },
      fullscreenClose() {
        this.update(
          { chart: { backgroundColor: "transparent" } },
          true,
          false,
          false,
        );
      },
    },
  },
  navigation: {
    buttonOptions: {
      symbolStroke: MENU_COLORS.graySubtle,
      symbolStrokeWidth: 1.75,
      theme: {
        fill: "transparent",
        stroke: "none",
        r: 8,
        padding: 6,
        states: {
          hover: { fill: MENU_COLORS.grayHover },
          select: { fill: MENU_COLORS.grayBorder },
        },
      },
    },
    menuStyle: {
      background: "#FFFFFF",
      border: `1px solid ${MENU_COLORS.grayBorder}`,
      borderRadius: "12px",
      boxShadow: "0 12px 28px rgba(15, 23, 42, 0.12), 0 4px 10px rgba(15, 23, 42, 0.06)",
      padding: "6px",
    },
    menuItemStyle: {
      color: MENU_COLORS.grayText,
      fontSize: "12.5px",
      fontFamily: '"Kanit", "Noto Sans Thai", sans-serif',
      fontWeight: "500",
      padding: "8px 12px",
      margin: "1px 0",
      borderRadius: "8px",
      transition: "background-color 120ms ease, color 120ms ease",
    },
    menuItemHoverStyle: {
      background: MENU_COLORS.blueHoverBg,
      color: MENU_COLORS.blueHoverText,
    },
  },
});

// เปิด export engine ไว้ (จำเป็นต่อ downloadCSV/exportChartLocal) แต่ปิดปุ่มเมนู
// hamburger ที่ Highcharts วาดทับมุมขวาบนของกราฟ — เราย้ายไปใช้ปุ่ม MoreVert
// ของ MUI บนแถวเดียวกับ Title แทน (ดู ChartCardMenu.jsx)
export const EXPORTING_DEFAULTS = {
  enabled: true,
  buttons: {
    contextButton: { enabled: false },
  },
};

export default Highcharts;