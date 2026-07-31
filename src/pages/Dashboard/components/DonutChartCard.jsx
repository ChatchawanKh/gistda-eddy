// src/pages/Dashboard/components/DonutChartCard.jsx
// Pie/Donut Chart: สัดส่วนสถานะของสถานีทั้งหมดในระบบ (ออนไลน์ / ไม่มีข้อมูลใหม่ /
// ไม่เคยมีข้อมูล) ช่วยให้เห็นภาพรวมสุขภาพของทั้งระบบได้ในแวบเดียว — ไม่ผูกกับ
// สถานีที่เลือกอยู่ จึงแสดงภาพรวมทั้งระบบเสมอ ไม่ว่าจะเลือกสถานีไว้หรือไม่
import * as React from "react";
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import * as HighchartsReactModule from "highcharts-react-official";

import Highcharts, { EXPORTING_DEFAULTS } from "../utils/highchartsSetup";

const HighchartsReact =
  HighchartsReactModule.default?.default ||
  HighchartsReactModule.default ||
  HighchartsReactModule;

const STALE_MS = 24 * 60 * 60 * 1000;

export default function DonutChartCard({ things, minHeight = 300 }) {
  const theme = useTheme();
  const { text, background, divider, success, error: errorColor, grey } = theme.palette;

  // สเกลความสูงของตัวกราฟ Highcharts ให้สัมพันธ์กับความสูงการ์ดที่ส่งเข้ามา
  // (ค่าเริ่มต้น 300/240 คือสัดส่วนอ้างอิงเดิม) เพื่อให้การ์ดนี้เข้าชุดกับ
  // การ์ดอื่นในแถวเดียวกันได้พอดี ไม่ว่าจะกำหนด minHeight เท่าไหร่
  const chartHeight = Math.max(140, minHeight - 60);

  const counts = React.useMemo(() => {
    let online = 0;
    let stale = 0;
    let noData = 0;
    (things || []).forEach((t) => {
      const latest = (t.Datastreams || [])
        .map((ds) => ds.Observations?.[0]?.phenomenonTime)
        .filter(Boolean)
        .sort()
        .reverse()[0];
      if (!latest) noData += 1;
      else if (Date.now() - new Date(latest).getTime() > STALE_MS) stale += 1;
      else online += 1;
    });
    return { online, stale, noData };
  }, [things]);

  const total = counts.online + counts.stale + counts.noData;

  const cardSx = {
    border: `1px solid ${divider}`,
    borderRadius: `${theme.shape.borderRadius + 2}px`,
    bgcolor: background.paper,
    p: 2,
    height: minHeight,
    display: "flex",
    flexDirection: "column",
  };

  const chartOptions = {
    chart: {
      type: "pie",
      backgroundColor: "transparent",
      height: chartHeight,
      style: { fontFamily: theme.typography.fontFamily },
    },
    title: { text: undefined },
    credits: { enabled: false },
    exporting: EXPORTING_DEFAULTS,
    tooltip: {
      pointFormat: "{point.y} สถานี ({point.percentage:.1f}%)",
      backgroundColor: background.paper,
      borderColor: divider,
      style: { color: text.primary, fontSize: "12px" },
    },
    legend: { itemStyle: { fontSize: "11px", color: text.secondary } },
    plotOptions: {
      pie: {
        innerSize: "65%",
        borderWidth: 2,
        borderColor: background.paper,
        dataLabels: { enabled: false },
      },
    },
    series: [
      {
        name: "สถานี",
        data: [
          { name: "ออนไลน์", y: counts.online, color: success.main },
          { name: "ไม่มีข้อมูลใหม่", y: counts.stale, color: errorColor.main },
          { name: "ไม่เคยมีข้อมูล", y: counts.noData, color: grey?.[500] || "#9e9e9e" },
        ],
      },
    ],
  };

  return (
    <Box sx={cardSx}>
      <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: text.primary, mb: 0.25 }}>
        สถานะสถานีทั้งระบบ
      </Typography>
      <Typography sx={{ fontSize: 11.5, color: text.secondary, mb: 1 }}>
        สัดส่วนสถานีตามความสดใหม่ของข้อมูล · {total} สถานี
      </Typography>
      <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {total === 0 ? (
          <Typography sx={{ fontSize: 12.5, color: text.secondary }}>
            ยังไม่มีสถานีในระบบ
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
