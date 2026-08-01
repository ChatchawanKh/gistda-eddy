// src/pages/Dashboard/components/InsightSummaryBar.jsx
// แถบสรุป Insight บนสุดของ Dashboard ประกอบด้วย:
//   1) แบนเนอร์ "Latest Data" — บอกชัดเจนว่าข้อมูลทั้งหมดในหน้านี้อ้างอิงจาก
//      วันที่ล่าสุดที่มีข้อมูลจริงในฐานข้อมูล (Latest Available Data Date)
//      ไม่ใช่วันที่ปัจจุบันของเครื่องผู้ใช้ เพราะข้อมูลอาจอัปเดตล่าช้า
//   2) การ์ด KPI: จำนวนข้อมูลทั้งหมด / ค่าเฉลี่ย / ค่าสูงสุด / ค่าต่ำสุด /
//      แนวโน้มการเปลี่ยนแปลง ของ "ตัวแปรหลัก" ที่กำลังเลือกดูอยู่ ภายในช่วงเวลา
//      ที่เลือกบน DateRangePickerModern (อัปเดตพร้อมกับกราฟทุกตัวในหน้า)
//
// ระบบสีของการ์ด (ปรับให้เป็น Monochromatic Blue Scale ตาม theme.jsx จริง
// ของโปรเจกต์ แทนระบบสีแยกโทนแบบเดิม (grey/blue/orange/sky/green) ที่ดู
// กระจายและมีโทนส้ม (warning.main) ซึ่งฉูดฉาดเกินไปและไปคล้ายโทนสีของ
// Claude Design — ตอนนี้ไล่เฉดน้ำเงินอ่อน→เข้มตามความหมายของสถิติแทน):
//   - จำนวนข้อมูล  -> theme.palette.grey[600]      metadata เป็นกลาง ไม่ใช่สถิติของตัวแปร
//   - ค่าเฉลี่ย     -> theme.palette.primary.main   (BLUE[500]) แกนกลาง/central tendency
//   - ค่าสูงสุด     -> theme.palette.primary.dark   (BLUE[700]) น้ำเงินเข้มสุด = ปลายบน
//   - ค่าต่ำสุด     -> theme.palette.secondary.main (SKY[500])  น้ำเงินอ่อนกว่า = ปลายล่าง
//   - แนวโน้ม       -> success/error/grey ตามทิศทางจริง (ไดนามิก, คงไว้เพราะจำเป็นเชิงความหมาย)
//
// น้ำหนักตัวอักษร (ปรับตามที่ชอบ):
//   - Title (บรรทัด 1, label)  -> เน้นชัดเจนขึ้น: fontWeight 600, สีเข้มขึ้น
//     (text.primary แทน text.secondary) ให้เป็นจุดที่สายตาจับก่อนในการ์ด
//   - ข้อความธรรมดา (หน่วย/caption บรรทัด 3) -> fontWeight 400 (บาง) ตามที่ชอบ
//   - Value (บรรทัด 2, ตัวเลข) -> ยังคงหนา (700) เพราะเป็นข้อมูลหลักที่ต้องเด่นสุด
import * as React from "react";
import { alpha, useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Skeleton from "@mui/material/Skeleton";
import UpdateRoundedIcon from "@mui/icons-material/UpdateRounded";
import DatasetRoundedIcon from "@mui/icons-material/DatasetRounded";
import FunctionsRoundedIcon from "@mui/icons-material/FunctionsRounded";
import ArrowUpwardRoundedIcon from "@mui/icons-material/ArrowUpwardRounded";
import ArrowDownwardRoundedIcon from "@mui/icons-material/ArrowDownwardRounded";
import TrendingFlatRoundedIcon from "@mui/icons-material/TrendingFlatRounded";
import KeyboardDoubleArrowUpRoundedIcon from "@mui/icons-material/KeyboardDoubleArrowUpRounded";
import KeyboardDoubleArrowDownRoundedIcon from "@mui/icons-material/KeyboardDoubleArrowDownRounded";

import { formatUtcLabel } from "../utils/insightSummary";

/* ------------------------------------------------------------------ */
/* KPI Card — 3 บรรทัด: (icon + Title) / value / unit-or-caption         */
/* ------------------------------------------------------------------ */

function KpiCard({ icon: Icon, label, value, sub, accentColor }) {
  const theme = useTheme();
  const { text } = theme.palette;
  const radius = theme.shape.borderRadius + 4;

  return (
    <Box
      sx={{
        position: "relative",
        overflow: "hidden",
        bgcolor: "#fff",
        borderRadius: `${radius}px`,
        p: 2,
        display: "flex",
        flexDirection: "column",
        gap: 0.5,
        minWidth: 0,
      }}
    >
      {/* ลายพื้นหลัง — dot grid บาง ๆ สีเดียวกับ accentColor ของการ์ด ทำ
          ด้วย CSS gradient ล้วน (ไม่ต้องพึ่งไฟล์ภาพ) วางเป็นเลเยอร์ล่างสุด
          และจางลงเป็น fade ทางขวา-ล่าง ไม่ให้แย่งความสนใจจากตัวเลขหลัก */}
      <Box
  sx={{
    position: "absolute",
    inset: 0,
    zIndex: 0,
    pointerEvents: "none",
    overflow: "hidden",

    backgroundImage: `
      repeating-radial-gradient(
        ellipse 120px 45px at 100% 100%,
        transparent 0,
        transparent 18px,
        ${alpha(accentColor, 0.12)} 19px,
        transparent 20px
      )
    `,

    transform: "rotate(-12deg) scale(1.3)",

    maskImage:
      "linear-gradient(to top left, #000 0%, rgba(0,0,0,0.5) 55%, transparent 85%)",
    WebkitMaskImage:
      "linear-gradient(to top left, #000 0%, rgba(0,0,0,0.5) 55%, transparent 85%)",
  }}
/>

      {/* บรรทัด 1: icon badge + Title (เน้น) */}
      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          alignItems: "center",
          gap: 1,
          justifyContent: "space-between",
        }}
      >
        <Typography
          sx={{
            fontSize: 12.5,
            fontWeight: 600,
            color: text.primary,
            letterSpacing: 0.1,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {label}
        </Typography>
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: "9px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: alpha(accentColor, 0.1),
            color: accentColor,
            flexShrink: 0,
          }}
        >
          <Icon sx={{ fontSize: 16 }} />
        </Box>
      </Box>

      {/* บรรทัด 2: value (ตัวเลขล้วน ไม่ต่อหน่วย) */}
      <Typography
        sx={{
          position: "relative",
          zIndex: 1,
          fontSize: 19,
          fontWeight: 700,
          color: accentColor,
          lineHeight: 1.25,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {value}
      </Typography>

      {/* บรรทัด 3: หน่วย/caption — ข้อความธรรมดา น้ำหนักบาง (400) */}
      <Typography
        sx={{
          position: "relative",
          zIndex: 1,
          fontSize: 11,
          fontWeight: 400,
          color: text.secondary,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          minHeight: "1.4em",
        }}
      >
        {sub || "\u00A0"}
      </Typography>
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* Insight Summary Bar                                                 */
/* ------------------------------------------------------------------ */

export default function InsightSummaryBar({
  latestAvailableDate,
  summary,
  unit,
  loading,
  variableName,
  emptyMessage = "ไม่มีข้อมูลของตัวแปรนี้ในช่วงเวลาที่เลือก",
}) {
  const theme = useTheme();
  const { text, primary, secondary, grey, success, error: errorColor } = theme.palette;
  const radius = theme.shape.borderRadius + 4;

  // สีตามความหมายเชิงสถิติ — ไล่เฉด "น้ำเงิน" ล้วนตาม theme.jsx จริง
  // (secondary = อ่อนสุด, primary = กลาง, primary.dark = เข้มสุด) แทนการ
  // สลับหลายโทน/สีส้ม เพื่อความ cohesive และดู modern มากขึ้น
  const countColor = grey?.[600] || text.secondary;
  const avgColor = primary.main; // BLUE[500] — แกนกลาง
  const maxColor = primary.dark; // BLUE[700] — เข้มสุด = ปลายบน
  const minColor = secondary.main; // SKY[500] — อ่อนกว่า = ปลายล่าง

  const trendIcon =
    summary?.trendDirection === "up"
      ? KeyboardDoubleArrowUpRoundedIcon
      : summary?.trendDirection === "down"
      ? KeyboardDoubleArrowDownRoundedIcon
      : TrendingFlatRoundedIcon;
  const trendColor =
    summary?.trendDirection === "up"
      ? success.main
      : summary?.trendDirection === "down"
      ? errorColor.main
      : countColor;

  const fmt = (v) =>
    v === undefined || v === null
      ? "-"
      : Number(v).toLocaleString("th-TH", { maximumFractionDigits: 2 });

  return (
    <Box sx={{  }}>
      

      {/* KPI cards */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 1.5,
        }}
      >
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton
              key={i}
              variant="rounded"
              height={82}
              sx={{ borderRadius: `${radius}px` }}
            />
          ))
        ) : !summary ? (
          <Box
            sx={{
              gridColumn: "1 / -1",
              borderRadius: `${radius}px`,
              bgcolor: alpha(theme.palette.text.primary, 0.03),
              p: 2,
              textAlign: "center",
            }}
          >
            <Typography sx={{ fontSize: 12.5, fontWeight: 400, color: text.secondary }}>
              {emptyMessage}
            </Typography>
          </Box>
        ) : (
          <>
            <KpiCard
              icon={DatasetRoundedIcon}
              label="จำนวนข้อมูลทั้งหมด"
              value={fmt(summary.count)}
              sub={variableName}
              accentColor={countColor}
            />
            <KpiCard
              icon={FunctionsRoundedIcon}
              label="ค่าเฉลี่ย"
              value={fmt(summary.avg)}
              sub={unit}
              accentColor={avgColor}
            />
            <KpiCard
              icon={ArrowUpwardRoundedIcon}
              label="ค่าสูงสุด"
              value={fmt(summary.max)}
              sub={unit}
              accentColor={maxColor}
            />
            <KpiCard
              icon={ArrowDownwardRoundedIcon}
              label="ค่าต่ำสุด"
              value={fmt(summary.min)}
              sub={unit}
              accentColor={minColor}
            />
            <KpiCard
              icon={trendIcon}
              label="แนวโน้มการเปลี่ยนแปลง"
              value={
                summary.trendPct === null
                  ? "-"
                  : `${summary.trendPct > 0 ? "+" : ""}${summary.trendPct.toFixed(1)}%`
              }
              sub="เปลี่ยนแปลงจากค่าแรกในช่วงเวลา"
              accentColor={trendColor}
            />
          </>
        )}
      </Box>

      {/* Latest Data banner — ต้องเห็นชัดเจนว่าข้อมูลอ้างอิงจากวันไหน */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          flexWrap: "wrap",
          bgcolor: alpha(primary.main, 0.06),
          borderRadius: `${radius}px`,
          px: 2,
          py: 1,
          mt: 2,
        }}
      >
        <UpdateRoundedIcon sx={{ fontSize: 17, color: primary.main }} />
        <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: primary.main }}>
          Latest Data:
        </Typography>
        <Typography sx={{ fontSize: 12.5, fontWeight: 400, color: text.primary }}>
          {latestAvailableDate ? formatUtcLabel(latestAvailableDate) : "ไม่มีข้อมูลในระบบ"}
        </Typography>
      </Box>
    </Box>
  );
}