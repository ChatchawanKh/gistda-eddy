// Wind Rose Chart — polar stacked column (เข็มทิศ 16 ทิศ): ทิศทาง = มุม, ความเร็ว = สี
// ต้องการ Datastream ความเร็วลม + ทิศทางลมของสถานีเดียวกัน (จับคู่ใน buildWindRoseMatrix)
import { useRef, useCallback, useEffect, useMemo } from "react";
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import * as HighchartsReactModule from "highcharts-react-official";

import Highcharts, { EXPORTING_DEFAULTS } from "../utils/highchartsSetup";
import { useObservationsRange } from "../hooks/useObservationsRange";
import ChartCardMenu from "./ChartCardMenu";
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

  // เปลี่ยนช่วงเวลาแล้วกราฟไม่ repaint จนกว่าจะ resize: เมื่อ fetch เสร็จเร็วพอ
  // React batch loading->done เป็น commit เดียว กราฟไม่เคย unmount ทำให้
  // highcharts-react-official ใช้ chart.update() ซึ่ง polar stacked column ไม่
  // repaint ถูกต้อง — แก้ด้วย key ผูกกับ datastream + from/to บน Box ที่ห่อกราฟ
  // (ดู JSX) ให้ React unmount/mount กราฟใหม่เสมอ
  // ResizeObserver + reflow ด้านล่างเป็นตาข่ายนิรภัยกรณี container เปลี่ยนขนาด
  // จากสาเหตุอื่น (เช่น sidebar ย่อ/ขยาย) หลังกราฟ mount แล้ว
  const chartRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const chartContainerRef = useCallback((node) => {
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
      resizeObserverRef.current = null;
    }
    if (node && typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => {
        chartRef.current?.chart?.reflow();
      });
      observer.observe(node);
      resizeObserverRef.current = observer;
    }
  }, []);

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

  useEffect(() => {
    if (!chartRef.current?.chart) return undefined;
    // reflow หลายครั้ง เผื่อ container กำลังอยู่ระหว่าง CSS transition ตอนกราฟ mount
    const raf = requestAnimationFrame(() => chartRef.current?.chart?.reflow());
    const t1 = setTimeout(() => chartRef.current?.chart?.reflow(), 320);
    const t2 = setTimeout(() => chartRef.current?.chart?.reflow(), 700);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  });

  const rose = useMemo(() => {
    if (!speedRows.length || !dirRows.length) return null;
    const edges = computeSpeedBinEdges(speedRows);
    const result = buildWindRoseMatrix(speedRows, dirRows, edges);
    if (!result) return null;
    return { edges, ...result };
  }, [speedRows, dirRows]);

  const cardSx = {
    ...theme.custom.card,
    p: 2,
    minHeight: 420,
    display: "flex",
    flexDirection: "column",
  };

  if (!speedDatastream || !directionDatastream) {
    return (
      <Box sx={{ ...cardSx, alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: text.primary, mb: 0.5 }}>
          Wind Rose Chart (ทิศทาง+ความเร็วลม)
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
      type: "column",
      backgroundColor: "transparent",
      height: 360,
      style: { fontFamily: theme.typography.fontFamily },
      // กราฟ polar ลากเมาส์เพื่อซูมไม่ได้ตามธรรมชาติ — ปิด default zoom ทั่วแอป
      // (highchartsSetup.js) ไว้เฉพาะกราฟนี้ ไม่ให้ค้างสถานะเลือกพื้นที่
      zooming: { type: null },
    },
    title: { text: undefined },
    credits: { enabled: false },
    exporting: EXPORTING_DEFAULTS,
    // 0/360 บังคับ pane เป็นวงกลมเต็มวงเสมอ
    pane: { size: "88%", startAngle: 0, endAngle: 360 },
    xAxis: {
      categories: COMPASS_SECTORS,
      tickmarkPlacement: "on",
      lineColor: divider,
      labels: { style: { fontSize: "10.5px", color: text.secondary } },
    },
    yAxis: {
      min: 0,
      endOnTick: false,
      showLastLabel: true,
      title: { text: "ความถี่ (%)", style: { fontSize: "10.5px", color: text.secondary } },
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
    // legend แนวนอนใต้กราฟ เพื่อไม่แย่งพื้นที่แนวนอนของวงกลมในการ์ดแคบ
    legend: {
      align: "center",
      verticalAlign: "bottom",
      layout: "horizontal",
      itemStyle: { fontSize: "10.5px", color: text.secondary },
      itemDistance: 10,
      squareSymbol: true,
      symbolHeight: 10,
      symbolWidth: 10,
      symbolRadius: 2,
    },
    plotOptions: {
      series: {
        stacking: "normal",
        shadow: false,
        groupPadding: 0,
        pointPlacement: "on",
      },
      column: {
        pointPadding: 0,
        borderWidth: 1,
        borderColor: background.paper,
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
      <Box sx={{ display: "flex", alignItems: "center", mb: 0.25 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: text.primary }}>
          Wind Rose Chart (ทิศทาง+ความเร็วลม)
        </Typography>
        <ChartCardMenu
          chartRef={chartRef}
          disabled={fetching || !rose}
          sx={{ ml: "auto" }}
        />
      </Box>
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
          <Box
            key={`${speedDatastream?.["@iot.id"]}-${directionDatastream?.["@iot.id"]}-${from}-${to}`}
            sx={{ width: "100%" }}
            ref={chartContainerRef}
          >
            <HighchartsReact ref={chartRef} highcharts={Highcharts} options={chartOptions} />
          </Box>
        )}
      </Box>
    </Box>
  );
}