// Column Chart: ค่าเฉลี่ยรายวันของตัวแปรหลักในช่วงเวลาที่เลือก
import { useMemo, useRef } from "react";
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import * as HighchartsReactModule from "highcharts-react-official";

import Highcharts, { EXPORTING_DEFAULTS } from "../utils/highchartsSetup";
import { groupDailyAverage } from "../utils/insightSummary";
import ChartCardMenu from "./ChartCardMenu";

const HighchartsReact =
  HighchartsReactModule.default?.default ||
  HighchartsReactModule.default ||
  HighchartsReactModule;

export default function BarChartCard({
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

  const daily = useMemo(() => groupDailyAverage(rows), [rows]);

  const cardSx = {
    border: `1px solid ${divider}`,
    borderRadius: `${theme.shape.borderRadius + 2}px`,
    bgcolor: background.paper,
    p: 2,
    minHeight: 300,
    display: "flex",
    flexDirection: "column",
  };

  const chartOptions = {
    chart: {
      type: "column",
      backgroundColor: "transparent",
      height: 240,
      style: { fontFamily: theme.typography.fontFamily },
    },
    title: { text: undefined },
    credits: { enabled: false },
    exporting: EXPORTING_DEFAULTS,
    xAxis: {
      categories: daily.map((d) =>
        new Date(d.day).toLocaleDateString("th-TH", { day: "2-digit", month: "short" })
      ),
      lineColor: divider,
      labels: { style: { fontSize: "10.5px", color: text.secondary } },
    },
    yAxis: {
      title: { text: unit || null, style: { color: text.secondary, fontSize: "10.5px" } },
      gridLineColor: divider,
      labels: { style: { fontSize: "10.5px", color: text.secondary } },
    },
    legend: { enabled: true, itemStyle: { fontSize: "10.5px", color: text.secondary } },
    tooltip: {
      valueSuffix: unit ? ` ${unit}` : "",
      backgroundColor: background.paper,
      borderColor: divider,
      style: { color: text.primary, fontSize: "12px" },
      valueDecimals: 2,
    },
    plotOptions: {
      column: {
        color: {
          linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
          stops: [
            [0, seriesColor],
            [1, `${seriesColor}99`],
          ],
        },
        borderRadius: 3,
        borderWidth: 0,
      },
    },
    series: [
      {
        name: `ค่าเฉลี่ยรายวัน${unit ? ` (${unit})` : ""}`,
        data: daily.map((d) => Math.round(d.avg * 100) / 100),
      },
    ],
  };

  return (
    <Box sx={cardSx}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.25 }}>
        <Box sx={{ width: 9, height: 9, borderRadius: "50%", bgcolor: seriesColor, flexShrink: 0 }} />
        <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: text.primary }}>
          ค่าเฉลี่ยรายวัน — {variableName || "ตัวแปรหลัก"}
        </Typography>
        <ChartCardMenu
          chartRef={chartRef}
          disabled={loading || daily.length === 0}
          sx={{ ml: "auto" }}
        />
      </Box>
      <Typography sx={{ fontSize: 11.5, color: text.secondary, mb: 1 }}>
        {unit ? `หน่วย: ${unit}` : "แนวโน้มค่าเฉลี่ยต่อวัน"} · {daily.length} วัน
      </Typography>
      <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {loading ? (
          <Typography sx={{ fontSize: 12, color: text.secondary }}>กำลังโหลด...</Typography>
        ) : daily.length === 0 ? (
          <Typography sx={{ fontSize: 12.5, color: text.secondary }}>
            ไม่มีข้อมูลในช่วงเวลาที่เลือก
          </Typography>
        ) : (
          // key บังคับสร้างกราฟใหม่เมื่อตัวแปร/ช่วงเวลาเปลี่ยน (ดู WindRoseChart)
          <Box key={`${datastreamId}-${from}-${to}`} sx={{ width: "100%" }}>
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