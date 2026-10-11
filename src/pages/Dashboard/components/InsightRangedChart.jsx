// กราฟหนึ่งตัวแปร (กราฟหลักหรือ small multiple) ใน Insight Dashboard
// รับ from/to จาก DateRangePickerModern กลางของหน้า ไม่มีตัวเลือกช่วงเวลาของตัวเอง
import { useRef } from "react";
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import SwapHorizRoundedIcon from "@mui/icons-material/SwapHorizRounded";
import * as HighchartsReactModule from "highcharts-react-official";

import Highcharts, { EXPORTING_DEFAULTS } from "../utils/highchartsSetup";
import { useObservationsRange } from "../hooks/useObservationsRange";
import ChartCardMenu from "./ChartCardMenu";
import {
  formatObservationValue,
  hasObservationData,
  timeAgoLabel,
} from "../utils/formatters";
import {
  isKelvinUnit,
  convertTempValue,
  convertTempRows,
  displayTempUnit,
  TEMP_UNITS,
} from "../utils/units";

const HighchartsReact =
  HighchartsReactModule.default?.default ||
  HighchartsReactModule.default ||
  HighchartsReactModule;

// onSelect (ถ้าส่งมา) = คลิกการ์ดเพื่อสลับให้ตัวแปรนี้เป็นตัวแปรหลัก ใช้กับ small multiples
// tempUnit / onToggleTempUnit = หน่วยอุณหภูมิที่แสดง (ใช้ร่วมกันทั้งหน้า) — ปุ่ม ⇄
// แสดงเฉพาะตัวแปรที่หน่วยต้นทางเป็น Kelvin
export default function InsightRangedChart({
  datastream,
  from,
  to,
  color,
  onSelect,
  tempUnit = TEMP_UNITS.KELVIN,
  onToggleTempUnit,
}) {
  const theme = useTheme();
  const { text, background, divider, primary } = theme.palette;
  const { rows: rawRows, fetching, error } = useObservationsRange(
    datastream?.["@iot.id"],
    from,
    to
  );

  const sourceUnit = datastream?.unitOfMeasurement?.symbol || "";
  // ค่าที่แสดงทั้งหมดในการ์ด (กราฟ/ค่าล่าสุด/หน่วย) ผ่านการแปลงหน่วยอุณหภูมิแล้ว
  const unit = displayTempUnit(sourceUnit, tempUnit);
  const rows = convertTempRows(rawRows, sourceUnit, tempUnit);
  const canToggleTemp =
    isKelvinUnit(sourceUnit) && typeof onToggleTempUnit === "function";
  const varName = datastream?.ObservedProperty?.name || datastream?.name || "";
  // คำอธิบายภาษาไทยของตัวแปร — มาจาก Datastream.description ใน FROST
  const varDescription = datastream?.description || "";
  const seriesColor = color || primary.main;
  const chartRef = useRef(null);

  // ค่าล่าสุดของตัวแปร (ไม่ขึ้นกับช่วงเวลาที่เลือก) — มาจาก $expand Observations
  // $top=1 ของ useThings
  const latestObs = datastream?.Observations?.[0];
  const isClickable =
    typeof onSelect === "function" && hasObservationData(datastream);

  const cardSx = {
    ...theme.custom.card,
    p: 2,
    minHeight: 300,
    display: "flex",
    flexDirection: "column",
    ...(isClickable && {
      ...theme.custom.cardInteractive,
      // ขอบตอน hover ใช้สีประจำตัวแปร ให้รู้ว่ากำลังจะสลับไปตัวไหน
      "&:hover": { ...theme.custom.cardInteractive["&:hover"], borderColor: seriesColor },
    }),
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
        color: seriesColor,
        fillColor: {
          linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
          stops: [
            [0, `${seriesColor}40`],
            [1, `${seriesColor}03`],
          ],
        },
        lineWidth: 1.75,
        marker: { enabled: rows.length < 60, radius: 2.5, fillColor: seriesColor },
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
    <Box
      sx={cardSx}
      onClick={isClickable ? () => onSelect(datastream) : undefined}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(datastream);
              }
            }
          : undefined
      }
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.25 }}>
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: 13.5,
            color: text.primary,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {varName}
        </Typography>
        {/* กันคลิกในเมนู (ซึ่งเป็น portal แต่ event ยัง bubble ตาม React tree)
            ไม่ให้ไปสั่งเลือกการ์ด */}
        <Box
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          sx={{ ml: "auto", flexShrink: 0 }}
        >
          <ChartCardMenu
            chartRef={chartRef}
            disabled={fetching || rows.length === 0}
          />
        </Box>
      </Box>
      {varDescription && (
        <Typography
          sx={{
            // ป้ายพื้นฟ้าอ่อน (action.hover = BLUE[50]) กว้างตามข้อความ ไม่ยืดเต็มการ์ด
            alignSelf: "flex-start",
            maxWidth: "100%",
            bgcolor: theme.palette.action.hover,
            color: primary.dark,
            px: 2,
            py: 0.25,
            mt: 0.5,
            borderRadius: 50,
            fontSize: 11.5,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {varDescription}
        </Typography>
      )}

      {/* ค่าล่าสุด — label / VALUE unit / เวลา · จำนวนจุดข้อมูล */}
      <Typography sx={{ fontSize: 11.5, color: text.secondary, mt: 0.5 }}>
        ค่าล่าสุด
      </Typography>
      <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.75, minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: 24,
            fontWeight: 700,
            lineHeight: 1.25,
            color: latestObs ? seriesColor : text.secondary,
            whiteSpace: "nowrap",
          }}
        >
          {latestObs
            ? formatObservationValue(
                convertTempValue(latestObs.result, sourceUnit, tempUnit),
              )
            : "-"}
        </Typography>
        {unit && (
          <Typography
            sx={{
              fontSize: 12.5,
              color: text.secondary,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {unit}
          </Typography>
        )}
        {canToggleTemp && (
          <Tooltip
            title={
              tempUnit === TEMP_UNITS.CELSIUS
                ? "แสดงอุณหภูมิเป็น Kelvin (K)"
                : "แสดงอุณหภูมิเป็นองศาเซลเซียส (°C)"
            }
          >
            <IconButton
              size="small"
              aria-label="สลับหน่วยอุณหภูมิ"
              // ไม่ให้คลิกนี้ไปสั่งเลือกการ์ด (small multiples คลิกทั้งการ์ดได้)
              onClick={(e) => {
                e.stopPropagation();
                onToggleTempUnit();
              }}
              onKeyDown={(e) => e.stopPropagation()}
              sx={{ alignSelf: "center", p: 0.25, color: primary.main }}
            >
              <SwapHorizRoundedIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>
      <Typography sx={{ fontSize: 11.5, color: text.secondary, mb: 1 }}>
        {latestObs
          ? timeAgoLabel(latestObs.phenomenonTime)
          : "ยังไม่เคยมีข้อมูล"}{" "}
        · {rows.length.toLocaleString("th-TH")} จุดข้อมูล ในช่วงที่เลือก
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
          // key บังคับ unmount/mount กราฟใหม่ทุกครั้งที่ query เปลี่ยน — chart.update()
          // ของ highcharts-react-official บางครั้งไม่ repaint เมื่อ React batch
          // การเปลี่ยน loading กับผลลัพธ์เป็น commit เดียว (เหมือน WindRoseChart)
          // หยุด click จากพื้นที่กราฟ — ไม่งั้นการลากเมาส์ซูม (zooming ใน
          // highchartsSetup.js) หรือกดปุ่ม "รีเซ็ตการซูม" จะไปสั่งเลือกการ์ดด้วย
          <Box
            key={`${datastream?.["@iot.id"]}-${from}-${to}-${unit}`}
            onClick={(e) => e.stopPropagation()}
            sx={{ width: "100%", cursor: "crosshair" }}
          >
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