// src/pages/Dashboard/components/WindRoseChart.jsx
// กราฟลม — แสดงทั้ง "ทิศทาง" (16 ทิศรอบเข็มทิศ) และ "ความเร็ว" (ไล่สีตามช่วง
// ความเร็ว ซ้อนทับกันในแต่ละทิศ) พร้อมกันในภาพเดียว
//
// ปรับตามคำขอผู้ใช้ให้เป็น "Radar/Spider Chart" จริง ๆ: ใช้ Highcharts polar
// area chart (chart.polar + type: "area") แทน polar column (แท่ง/wedge) เดิม
// ผลลัพธ์คือรูปหลายเหลี่ยมซ้อนกันแบบ radar ทั่วไป แต่ยังคง stacking แบบ
// สัดส่วน (normal) ไว้ ทำให้แต่ละทิศยังอ่านสัดส่วนความเร็วลมได้ครบเหมือนเดิม
//
// ต้องการ Datastream สองตัว: ความเร็วลม + ทิศทางลม ของสถานีเดียวกัน โดยจับคู่
// ข้อมูลด้วย phenomenonTime ที่ตรงกัน (ดู buildWindRoseMatrix ใน insightHelpers)
// รับ from/to จากแถบช่วงเวลากลางเช่นเดียวกับกราฟอื่นในหน้า
import * as React from "react";
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import * as HighchartsReactModule from "highcharts-react-official";

import Highcharts, { EXPORTING_DEFAULTS } from "../utils/highchartsSetup";
import { useObservationsRange } from "../hooks/useObservationsRange";
import {
  COMPASS_SECTORS,
  buildWindRoseMatrix,
  computeSpeedBinEdges,
  speedBinLabel,
} from "../utils/insightHelpers";

const HighchartsReact =
  HighchartsReactModule.default?.default ||
  HighchartsReactModule.default ||
  HighchartsReactModule;

// ไล่สีจากฟ้าอ่อน (ลมเบา) ไปแดง (ลมแรง) ตามธรรมเนียม wind rose ทั่วไป
const BIN_COLORS = ["#8ecae6", "#219ebc", "#ffb703", "#fb8500", "#d00000"];

export default function WindRoseChart({ speedDatastream, directionDatastream, from, to }) {
  const theme = useTheme();
  const { text, background, divider } = theme.palette;

  const {
    rows: speedRows,
    fetching: fetchingSpeed,
    error: errorSpeed,
  } = useObservationsRange(speedDatastream?.["@iot.id"], from, to);
  const {
    rows: dirRows,
    fetching: fetchingDir,
    error: errorDir,
  } = useObservationsRange(directionDatastream?.["@iot.id"], from, to);

  const fetching = fetchingSpeed || fetchingDir;
  const error = errorSpeed || errorDir;
  const unit = speedDatastream?.unitOfMeasurement?.symbol || "";

  const rose = React.useMemo(() => {
    if (!speedRows.length || !dirRows.length) return null;
    const edges = computeSpeedBinEdges(speedRows);
    const result = buildWindRoseMatrix(speedRows, dirRows, edges);
    if (!result) return null;
    return { edges, ...result };
  }, [speedRows, dirRows]);

  const cardSx = {
    border: `1px solid ${divider}`,
    borderRadius: `${theme.shape.borderRadius + 2}px`,
    bgcolor: background.paper,
    p: 2,
    minHeight: 340,
    display: "flex",
    flexDirection: "column",
  };

  if (!speedDatastream || !directionDatastream) {
    return (
      <Box sx={{ ...cardSx, alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: text.primary, mb: 0.5 }}>
          Wind Rose — Radar Chart (ทิศทาง+ความเร็วลม)
        </Typography>
        <Typography sx={{ fontSize: 12, color: text.secondary, px: 2 }}>
          สถานีนี้ต้องมีทั้งตัวแปร "ความเร็วลม" และ "ทิศทางลม" จึงจะแสดงกราฟนี้ได้
          {!speedDatastream && !directionDatastream
            ? " (ไม่พบทั้งสองตัวแปร)"
            : !speedDatastream
            ? " (ไม่พบตัวแปรความเร็วลม)"
            : " (ไม่พบตัวแปรทิศทางลม)"}
        </Typography>
      </Box>
    );
  }

  const chartOptions = rose && {
    chart: {
      polar: true,
      type: "area",
      backgroundColor: "transparent",
      height: 280,
      style: { fontFamily: theme.typography.fontFamily },
    },
    title: { text: undefined },
    credits: { enabled: false },
    exporting: EXPORTING_DEFAULTS,
    pane: { size: "85%" },
    xAxis: {
      categories: COMPASS_SECTORS,
      tickmarkPlacement: "on",
      lineColor: divider,
      labels: { style: { fontSize: "10.5px", color: text.secondary } },
    },
    yAxis: {
      min: 0,
      labels: { format: "{value}%", style: { fontSize: "10px", color: text.secondary } },
      gridLineColor: divider,
      reversedStacks: false,
    },
    tooltip: {
      shared: false,
      valueSuffix: "%",
      backgroundColor: background.paper,
      borderColor: divider,
      style: { color: text.primary, fontSize: "12px" },
      valueDecimals: 1,
    },
    legend: {
      align: "center",
      verticalAlign: "bottom",
      itemStyle: { fontSize: "11px", color: text.secondary },
    },
    plotOptions: {
      area: {
        stacking: "normal",
        fillOpacity: 0.55,
        lineWidth: 1.5,
        marker: { enabled: true, radius: 2.5, symbol: "circle", lineWidth: 0 },
        states: { hover: { lineWidthPlus: 1 } },
      },
    },
    series: rose.percentages.map((data, i) => ({
      name: speedBinLabel(i, rose.edges, unit),
      data,
      color: BIN_COLORS[i % BIN_COLORS.length],
    })),
  };

  return (
    <Box sx={cardSx}>
      <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: text.primary, mb: 0.25 }}>
        Wind Rose — Radar Chart (ทิศทาง+ความเร็วลม)
      </Typography>
      <Typography sx={{ fontSize: 11.5, color: text.secondary, mb: 1 }}>
        {rose ? `จับคู่ข้อมูลได้ ${rose.matched} จุด` : "แนวโน้มทิศทางและความเร็วลม"}
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
        ) : !rose ? (
          <Typography sx={{ fontSize: 12.5, color: text.secondary, textAlign: "center", px: 2 }}>
            ไม่มีข้อมูลความเร็ว/ทิศทางลมที่จับคู่กันได้ในช่วงเวลาที่เลือก
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
