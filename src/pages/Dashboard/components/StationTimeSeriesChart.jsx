// src/pages/Dashboard/components/StationTimeSeriesChart.jsx
// กราฟข้อมูลตามเวลาของ "ตัวแปรที่กำลังเลือกอยู่" ในหน้าภาพรวมสถานี
// - แสดงกราฟของ Datastream ที่ผู้ใช้เลือก (จากตารางด้านข้าง หรือ default ตัวแปรแรก)
// - ตัวเลือกช่วงเวลา:
//     "ล่าสุดที่มีข้อมูล" (default) -> ดึงข้อมูลชุดล่าสุดตาม max(phenomenonTime)
//       จริงในฐานข้อมูล ไม่อิงเวลาปัจจุบันของเครื่อง จึงยังเห็นกราฟได้แม้สถานี
//       จะไม่มีข้อมูลใหม่เข้ามานานแล้ว
//     "24 ชม. / 7 วัน / 30 วัน" -> นับย้อนหลังจากเวลาปัจจุบันตามปกติ
// ใช้ Highcharts แทน MUI Charts (ธีมสี/ฟอนต์ปรับให้เข้ากับ MUI theme ของโปรเจก)
// ติดตั้งก่อนใช้งาน: npm install highcharts highcharts-react-official
import * as React from "react";
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import ToggleButton from "@mui/material/ToggleButton";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Tooltip from "@mui/material/Tooltip";
import Highcharts from "highcharts";
import * as HighchartsReactModule from "highcharts-react-official";

import { frostFetch } from "../api/frostClient";
import { hasObservationData } from "../utils/formatters";

// highcharts-react-official เป็น CJS module — บาง bundler (เช่น Vite/Rolldown
// บางเวอร์ชัน) จะ interop default export ผิดพลาด กลายเป็น namespace object
// แทนที่จะเป็นตัว component function โดยตรง (ทำให้ React โยน
// "Element type is invalid ... but got: object") บรรทัดด้านล่างกันปัญหานี้
// โดยรองรับได้ทั้งสองรูปแบบ
const HighchartsReact =
  HighchartsReactModule.default?.default ||
  HighchartsReactModule.default ||
  HighchartsReactModule;

// "latest" ไม่มี ms เพราะไม่ได้อิงเวลาปัจจุบัน แต่ดึงชุดข้อมูลล่าสุดที่มีจริง
const RANGES = [
  { key: "latest", label: "ล่าสุดที่มีข้อมูล" },
  { key: "24h", label: "24 ชม.", ms: 24 * 60 * 60 * 1000 },
  { key: "7d", label: "7 วัน", ms: 7 * 24 * 60 * 60 * 1000 },
  { key: "30d", label: "30 วัน", ms: 30 * 24 * 60 * 60 * 1000 },
];

const LATEST_POINTS = 200;

export default function StationTimeSeriesChart({ datastream }) {
  const theme = useTheme();
  const { text, background, divider, primary } = theme.palette;
  const [range, setRange] = React.useState("latest");
  const [rows, setRows] = React.useState([]);
  const [fetching, setFetching] = React.useState(false);
  const [error, setError] = React.useState(null);

  const datastreamId = datastream?.["@iot.id"];
  const everHasData = hasObservationData(datastream);

  React.useEffect(() => {
    if (!datastreamId || !everHasData) {
      setRows([]);
      return;
    }
    let active = true;
    setFetching(true);
    setError(null);

    const isLatest = range === "latest";
    const query = isLatest
      ? `/Datastreams(${datastreamId})/Observations?$orderby=phenomenonTime desc&$top=${LATEST_POINTS}`
      : (() => {
          const rangeDef = RANGES.find((r) => r.key === range) || RANGES[1];
          const since = new Date(Date.now() - rangeDef.ms).toISOString();
          return `/Datastreams(${datastreamId})/Observations?$filter=phenomenonTime ge ${since}&$orderby=phenomenonTime asc&$top=1000`;
        })();

    frostFetch(query)
      .then((data) => {
        if (!active) return;
        const value = data.value || [];
        // โหมด "latest" ดึงมาแบบใหม่->เก่า (desc) เพื่อจำกัดจำนวนแถวได้ถูกต้อง
        // ต้องกลับลำดับก่อนพล็อตกราฟให้เป็นเก่า->ใหม่
        setRows(isLatest ? [...value].reverse() : value);
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setFetching(false);
      });
    return () => {
      active = false;
    };
  }, [datastreamId, range, everHasData]);

  const cardSx = {
    border: `1px solid ${divider}`,
    borderRadius: `${theme.shape.borderRadius + 2}px`,
    bgcolor: background.paper,
    p: 2,
    height: "100%",
    minHeight: 340,
    display: "flex",
    flexDirection: "column",
  };

  if (!datastream) {
    return (
      <Box sx={{ ...cardSx, alignItems: "center", justifyContent: "center" }}>
        <Typography sx={{ fontSize: 13, color: text.secondary }}>
          สถานีนี้ยังไม่มีตัวแปรให้แสดงกราฟ
        </Typography>
      </Box>
    );
  }

  const unit = datastream.unitOfMeasurement?.symbol || "";
  const varName = datastream.ObservedProperty?.name || datastream.name;
  const latestPhenomenonTime = rows.length ? rows[rows.length - 1].phenomenonTime : null;

  const chartOptions = {
    chart: {
      type: "area",
      backgroundColor: "transparent",
      height: 280,
      style: { fontFamily: theme.typography.fontFamily },
    },
    title: { text: undefined },
    credits: { enabled: false },
    xAxis: {
      type: "datetime",
      lineColor: divider,
      tickColor: divider,
      labels: { style: { fontSize: "11px", color: text.secondary } },
    },
    yAxis: {
      title: { text: unit || null, style: { color: text.secondary, fontSize: "11px" } },
      gridLineColor: divider,
      labels: { style: { fontSize: "11px", color: text.secondary } },
    },
    legend: { enabled: false },
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
        lineWidth: 2,
        marker: { enabled: rows.length < 60, radius: 3, fillColor: primary.main },
        states: { hover: { lineWidth: 2 } },
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
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 1,
          mb: 1,
        }}
      >
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: 14, color: text.primary }}>
            {varName}
          </Typography>
          <Typography sx={{ fontSize: 12, color: text.secondary }}>
            {unit ? `หน่วย: ${unit}` : "แนวโน้มข้อมูลย้อนหลัง"}
            {range === "latest" && latestPhenomenonTime
              ? ` · ข้อมูลถึง ${new Date(latestPhenomenonTime).toLocaleString("th-TH")}`
              : ""}
          </Typography>
        </Box>
        <Tooltip title={everHasData ? "" : "ตัวแปรนี้ยังไม่เคยมีข้อมูล จึงยังเลือกช่วงเวลาไม่ได้"}>
          <span>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={range}
              onChange={(_, v) => v && setRange(v)}
              disabled={!everHasData}
            >
              {RANGES.map((r) => (
                <ToggleButton
                  key={r.key}
                  value={r.key}
                  disabled={!everHasData || fetching}
                  sx={{ fontSize: 12, px: 1.25, py: 0.25 }}
                >
                  {r.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </span>
        </Tooltip>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 1, fontSize: 12.5 }}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          flex: 1,
          minHeight: 260,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {!everHasData ? (
          <Typography sx={{ fontSize: 13, color: text.secondary, textAlign: "center", px: 2 }}>
            ตัวแปรนี้ยังไม่เคยมีข้อมูลบันทึกไว้
          </Typography>
        ) : fetching ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <CircularProgress size={20} />
            <Typography sx={{ fontSize: 12.5, color: text.secondary }}>
              กำลังโหลดข้อมูลกราฟ...
            </Typography>
          </Box>
        ) : rows.length === 0 ? (
          <Typography sx={{ fontSize: 13, color: text.secondary }}>
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
