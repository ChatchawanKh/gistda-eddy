// src/pages/Dashboard/components/InsightSummaryBar.jsx
// แถบสรุป Insight บนสุดของ Dashboard ประกอบด้วย:
//   1) แบนเนอร์ "Latest Data" — บอกชัดเจนว่าข้อมูลทั้งหมดในหน้านี้อ้างอิงจาก
//      วันที่ล่าสุดที่มีข้อมูลจริงในฐานข้อมูล (Latest Available Data Date)
//      ไม่ใช่วันที่ปัจจุบันของเครื่องผู้ใช้ เพราะข้อมูลอาจอัปเดตล่าช้า
//   2) การ์ด KPI: จำนวนข้อมูลทั้งหมด / ค่าเฉลี่ย / ค่าสูงสุด / ค่าต่ำสุด /
//      แนวโน้มการเปลี่ยนแปลง ของ "ตัวแปรหลัก" ที่กำลังเลือกดูอยู่ ภายในช่วงเวลา
//      ที่เลือกบน DateRangePickerModern (อัปเดตพร้อมกับกราฟทุกตัวในหน้า)
import * as React from "react";
import { useTheme } from "@mui/material/styles";
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

function KpiCard({ icon: Icon, label, value, sub, accent }) {
  const theme = useTheme();
  const { background, divider, text } = theme.palette;
  return (
    <Box
      sx={{
        bgcolor: background.paper,
        borderRadius: `${theme.shape.borderRadius + 4}px`,
        border: `1px solid ${divider}`,
        p: 2,
        display: "flex",
        flexDirection: "column",
        gap: 0.5,
        minWidth: 0,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, color: text.secondary }}>
        <Icon sx={{ fontSize: 15 }} />
        <Typography sx={{ fontSize: 11.5, fontWeight: 700 }}>{label}</Typography>
      </Box>
      <Typography
        sx={{
          fontSize: 19,
          fontWeight: 800,
          color: accent || text.primary,
          lineHeight: 1.25,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {value}
      </Typography>
      {sub && (
        <Typography sx={{ fontSize: 11, color: text.secondary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {sub}
        </Typography>
      )}
    </Box>
  );
}

export default function InsightSummaryBar({
  latestAvailableDate,
  summary,
  unit,
  loading,
  variableName,
  emptyMessage = "ไม่มีข้อมูลของตัวแปรนี้ในช่วงเวลาที่เลือก",
}) {
  const theme = useTheme();
  const { divider, text, primary, success, error: errorColor, info } = theme.palette;

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
      : text.secondary;

  const fmt = (v) =>
    v === undefined || v === null
      ? "-"
      : Number(v).toLocaleString("th-TH", { maximumFractionDigits: 2 });

  return (
    <Box sx={{ mb: 2.5 }}>
      {/* Latest Data banner — ต้องเห็นชัดเจนว่าข้อมูลอ้างอิงจากวันไหน */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          flexWrap: "wrap",
          bgcolor: `${primary.main}0f`,
          border: `1px solid ${primary.main}33`,
          borderRadius: `${theme.shape.borderRadius + 4}px`,
          px: 2,
          py: 1,
          mb: 2,
        }}
      >
        <UpdateRoundedIcon sx={{ fontSize: 17, color: primary.main }} />
        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: primary.main }}>
          Latest Data:
        </Typography>
        <Typography sx={{ fontSize: 12.5, color: text.primary }}>
          {latestAvailableDate ? formatUtcLabel(latestAvailableDate) : "ไม่มีข้อมูลในระบบ"}
        </Typography>
        <Typography sx={{ fontSize: 11.5, color: text.secondary }}>
          ข้อมูลทั้งหมดในหน้านี้อ้างอิงจากวันที่ล่าสุดที่มีข้อมูลจริง ไม่ใช่วันที่ปัจจุบัน
        </Typography>
      </Box>

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
              sx={{ borderRadius: `${theme.shape.borderRadius + 4}px` }}
            />
          ))
        ) : !summary ? (
          <Box
            sx={{
              gridColumn: "1 / -1",
              border: `1px dashed ${divider}`,
              borderRadius: `${theme.shape.borderRadius + 4}px`,
              p: 2,
              textAlign: "center",
            }}
          >
            <Typography sx={{ fontSize: 12.5, color: text.secondary }}>{emptyMessage}</Typography>
          </Box>
        ) : (
          <>
            <KpiCard
              icon={DatasetRoundedIcon}
              label="จำนวนข้อมูลทั้งหมด"
              value={fmt(summary.count)}
              sub={variableName}
            />
            <KpiCard
              icon={FunctionsRoundedIcon}
              label="ค่าเฉลี่ย"
              value={`${fmt(summary.avg)} ${unit || ""}`}
            />
            <KpiCard
              icon={ArrowUpwardRoundedIcon}
              label="ค่าสูงสุด"
              value={`${fmt(summary.max)} ${unit || ""}`}
              accent={errorColor.main}
            />
            <KpiCard
              icon={ArrowDownwardRoundedIcon}
              label="ค่าต่ำสุด"
              value={`${fmt(summary.min)} ${unit || ""}`}
              accent={info?.main}
            />
            <KpiCard
              icon={trendIcon}
              label="แนวโน้มการเปลี่ยนแปลง"
              value={
                summary.trendPct === null
                  ? "-"
                  : `${summary.trendPct > 0 ? "+" : ""}${summary.trendPct.toFixed(1)}%`
              }
              accent={trendColor}
            />
          </>
        )}
      </Box>
    </Box>
  );
}
