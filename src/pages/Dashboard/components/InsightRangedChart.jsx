// src/pages/Dashboard/components/InsightRangedChart.jsx
// กราฟหนึ่งตัวแปร (ใช้ทั้งเป็นกราฟหลักและกราฟย่อย/small multiple) ใน
// Insight Dashboard — ไม่มีปุ่มเลือกช่วงเวลาของตัวเอง แต่รับ from/to จาก
// DateRangePickerModern.jsx กลางของทั้งหน้าแทน เพื่อให้ทุกกราฟในหน้าเปลี่ยน
// ช่วงเวลาไปพร้อมกันเมื่อผู้ใช้ปรับที่แถบด้านบนเพียงจุดเดียว
import * as React from "react";
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import * as HighchartsReactModule from "highcharts-react-official";

import Highcharts, { EXPORTING_DEFAULTS } from "../utils/highchartsSetup";
import { useObservationsRange } from "../hooks/useObservationsRange";

const HighchartsReact =
  HighchartsReactModule.default?.default ||
  HighchartsReactModule.default ||
  HighchartsReactModule;

export default function InsightRangedChart({ datastream, from, to }) {
  const theme = useTheme();
  const { text, background, divider, primary } = theme.palette;
  const { rows, fetching, error } = useObservationsRange(
    datastream?.["@iot.id"],
    from,
    to
  );

  const unit = datastream?.unitOfMeasurement?.symbol || "";
  const varName = datastream?.ObservedProperty?.name || datastream?.name || "";

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
      type: "area",
      backgroundColor: "transparent",
      height: 220,
      style: { fontFamily: theme.typography.fontFamily },
    },
    title: { text: undefined },
    credits: { enabled: false },
    exporting: EXPORTING_DEFAULTS,
    xAxis: {
      type: "datetime",
      lineColor: divider,
      tickColor: divider,
      labels: { style: { fontSize: "10.5px", color: text.secondary } },
    },
    yAxis: {
      title: { text: unit || null, style: { color: text.secondary, fontSize: "10.5px" } },
      gridLineColor: divider,
      labels: { style: { fontSize: "10.5px", color: text.secondary } },
    },
    legend: { enabled: true, itemStyle: { fontSize: "10.5px", color: text.secondary } },
    tooltip: {
      xDateFormat: "%d %b %Y %H:%M",
      valueSuffix: unit ? ` ${unit}` : "",
      backgroundColor: background.paper,
      borderColor: divider,
      style: { color: text.primary, fontSize: "12px" },
    },
    plotOptions: {
      area: {
        color: primary.main,
        fillOpacity: 0.15,
        lineWidth: 1.75,
        marker: { enabled: rows.length < 60, radius: 2.5, fillColor: primary.main },
      },
    },
    series: [
      {
        name: `${varName}${unit ? ` (${unit})` : ""}`,
        data: rows.map((o) => [new Date(o.phenomenonTime).getTime(), o.result]),
      },
    ],
  };

  return (
    <Box sx={cardSx}>
      <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: text.primary, mb: 0.25 }}>
        {varName}
      </Typography>
      <Typography sx={{ fontSize: 11.5, color: text.secondary, mb: 1 }}>
        {unit ? `หน่วย: ${unit}` : "แนวโน้มข้อมูลย้อนหลัง"} · {rows.length} จุดข้อมูล
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 1, fontSize: 12 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {fetching ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
            <CircularProgress size={18} />
            <Typography sx={{ fontSize: 12, color: text.secondary }}>กำลังโหลด...</Typography>
          </Box>
        ) : rows.length === 0 ? (
          <Typography sx={{ fontSize: 12.5, color: text.secondary }}>
            ไม่มีข้อมูลในช่วงเวลาที่เลือก
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
