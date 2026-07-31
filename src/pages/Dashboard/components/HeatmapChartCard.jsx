// src/pages/Dashboard/components/HeatmapChartCard.jsx
// Heatmap: ค่าเฉลี่ยของ "ตัวแปรหลัก" แยกตาม "วันในสัปดาห์ x ชั่วโมง" ภายในช่วง
// เวลาที่เลือก ช่วยเห็น pattern ที่ผูกกับเวลาของวัน/วันในสัปดาห์ (เช่น ลมแรงช่วง
// บ่าย ฝุ่นสูงช่วงเช้า) ที่กราฟเส้น/แท่งทั่วไปมองเห็นได้ยาก
// ใช้ highcharts/modules/heatmap ที่เปิดใช้งานไว้กลางใน utils/highchartsSetup.js
import * as React from "react";
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import * as HighchartsReactModule from "highcharts-react-official";

import Highcharts, { EXPORTING_DEFAULTS } from "../utils/highchartsSetup";
import { groupHourlyHeatmap } from "../utils/insightSummary";

const HighchartsReact =
  HighchartsReactModule.default?.default ||
  HighchartsReactModule.default ||
  HighchartsReactModule;

const WEEKDAY_LABELS_TH = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

export default function HeatmapChartCard({ rows, unit, variableName, loading }) {
  const theme = useTheme();
  const { text, background, divider, primary } = theme.palette;

  const heatmap = React.useMemo(() => groupHourlyHeatmap(rows), [rows]);

  const cardSx = {
    border: `1px solid ${divider}`,
    borderRadius: `${theme.shape.borderRadius + 2}px`,
    bgcolor: background.paper,
    p: 2,
    minHeight: 320,
    display: "flex",
    flexDirection: "column",
  };

  const chartOptions = heatmap.hasAny && {
    chart: {
      type: "heatmap",
      backgroundColor: "transparent",
      height: 260,
      style: { fontFamily: theme.typography.fontFamily },
    },
    title: { text: undefined },
    credits: { enabled: false },
    exporting: EXPORTING_DEFAULTS,
    xAxis: {
      categories: Array.from({ length: 24 }, (_, h) => `${h}:00`),
      labels: { style: { fontSize: "9.5px", color: text.secondary } },
      lineColor: divider,
    },
    yAxis: {
      categories: WEEKDAY_LABELS_TH,
      title: null,
      reversed: true,
      labels: { style: { fontSize: "10.5px", color: text.secondary } },
    },
    colorAxis: {
      min: 0,
      minColor: `${primary.main}1a`,
      maxColor: primary.main,
    },
    legend: {
      align: "right",
      layout: "vertical",
      verticalAlign: "middle",
      itemStyle: { fontSize: "10.5px", color: text.secondary },
    },
    tooltip: {
      backgroundColor: background.paper,
      borderColor: divider,
      style: { color: text.primary, fontSize: "12px" },
      formatter: function formatTooltip() {
        return `${WEEKDAY_LABELS_TH[this.point.y]} ${this.point.x}:00 — <b>${this.point.value}${
          unit ? ` ${unit}` : ""
        }</b>`;
      },
    },
    series: [
      {
        name: variableName || "ค่าเฉลี่ย",
        borderWidth: 1,
        borderColor: background.paper,
        data: heatmap.data,
      },
    ],
  };

  return (
    <Box sx={cardSx}>
      <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: text.primary, mb: 0.25 }}>
        Heatmap รายชั่วโมง — {variableName || "ตัวแปรหลัก"}
      </Typography>
      <Typography sx={{ fontSize: 11.5, color: text.secondary, mb: 1 }}>
        ค่าเฉลี่ยแยกตามวันในสัปดาห์และชั่วโมง{unit ? ` (${unit})` : ""}
      </Typography>
      <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {loading ? (
          <Typography sx={{ fontSize: 12, color: text.secondary }}>กำลังโหลด...</Typography>
        ) : !heatmap.hasAny ? (
          <Typography sx={{ fontSize: 12.5, color: text.secondary, textAlign: "center", px: 2 }}>
            ข้อมูลยังไม่พอสำหรับสร้าง Heatmap (ต้องมีข้อมูลกระจายหลายช่วงเวลา)
          </Typography>
        ) : (
          <Box sx={{ width: "100%" }}>
            <HighchartsReact highcharts={Highcharts} options={chartOptions} />
          </Box>
        )}
      </Box>
    </Box>
  );
}
