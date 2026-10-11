// Heatmap: ค่าเฉลี่ยของตัวแปรหลักแยกตามวันในสัปดาห์ x ชั่วโมง
import { useMemo, useRef } from "react";
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import * as HighchartsReactModule from "highcharts-react-official";

import Highcharts, { EXPORTING_DEFAULTS } from "../utils/highchartsSetup";
import { groupHourlyHeatmap } from "../utils/insightSummary";
import ChartCardMenu from "./ChartCardMenu";

const HighchartsReact =
  HighchartsReactModule.default?.default ||
  HighchartsReactModule.default ||
  HighchartsReactModule;

const WEEKDAY_LABELS_TH = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

export default function HeatmapChartCard({
  rows,
  unit,
  variableName,
  loading,
  color,
  datastreamId,
  from,
  to,
}) {
  const theme = useTheme();
  const { text, background, divider, primary } = theme.palette;
  const seriesColor = color || primary.main;
  const chartRef = useRef(null);

  const heatmap = useMemo(() => groupHourlyHeatmap(rows), [rows]);

  const cardSx = {
    ...theme.custom.card,
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
      minColor: `${seriesColor}1a`,
      maxColor: seriesColor,
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
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.25 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: text.primary }}>
          Heatmap รายชั่วโมง — {variableName || "ตัวแปรหลัก"}
        </Typography>
        <ChartCardMenu
          chartRef={chartRef}
          disabled={loading || !heatmap.hasAny}
          sx={{ ml: "auto" }}
        />
      </Box>
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
          // key บังคับสร้างกราฟใหม่เมื่อตัวแปร/ช่วงเวลาเปลี่ยน (ดู WindRoseChart)
          <Box key={`${datastreamId}-${from}-${to}-${unit}`} sx={{ width: "100%" }}>
            <HighchartsReact
              ref={chartRef}
              highcharts={Highcharts}
              options={chartOptions}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
}