// src/pages/Dashboard/components/InsightView.jsx
// หน้า "อินไซต์ข้อมูล" — รวมหลายกราฟไว้ในหน้าเดียวสำหรับดูภาพรวมเชิงลึกของ
// สถานีหนึ่งสถานี ทุกกราฟผูกกับ:
//   - สถานีที่เลือก (?station= ผูกร่วมกับหน้า "ภาพรวมสถานี" และ "แจ้งเตือน")
//   - ช่วงเวลาเดียวกัน ควบคุมจากแถบ DateRangeBar.jsx ด้านบนสุดของหน้า
// ประกอบด้วย:
//   1) Wind Rose (ถ้าสถานีมีทั้งตัวแปรความเร็วลม+ทิศทางลม)
//   2) กราฟย่อยรายตัวแปร (small multiples) ของทุก Datastream ในสถานีนั้น
import * as React from "react";
import { useTheme } from "@mui/material/styles";
import { useSearchParams } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";

import DateRangeBar, { makePresetRange, PRESETS } from "./DateRangeBar";
import InsightRangedChart from "./InsightRangedChart";
import WindRoseChart from "./WindRoseChart";
import {
  findDatastreamByKeywords,
  WIND_SPEED_KEYWORDS,
  WIND_DIRECTION_KEYWORDS,
} from "../utils/insightHelpers";

export default function InsightView({ things, loading, error }) {
  const theme = useTheme();
  const { background, divider, text } = theme.palette;
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedStationId = searchParams.get("station") || "";

  // ช่วงเวลากลางของทั้งหน้า — default 7 วันย้อนหลัง
  const [range, setRange] = React.useState(() => makePresetRange(PRESETS[1].ms));

  const handleSelectStation = React.useCallback(
    (id) => {
      const next = new URLSearchParams(searchParams);
      if (id) next.set("station", id);
      else next.delete("station");
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  if (loading) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 4 }}>
        <CircularProgress size={20} />
        <Typography sx={{ fontSize: 13.5, color: text.secondary }}>
          กำลังดึงข้อมูลสถานีจาก FROST-Server...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  const selectedThing = things.find(
    (t) => String(t["@iot.id"]) === String(selectedStationId)
  );
  const datastreams = selectedThing?.Datastreams || [];

  const speedDatastream = findDatastreamByKeywords(datastreams, WIND_SPEED_KEYWORDS);
  const directionDatastream = findDatastreamByKeywords(datastreams, WIND_DIRECTION_KEYWORDS);
  const hasWind = Boolean(speedDatastream || directionDatastream);

  // กราฟย่อยรายตัวแปร: แสดงทุกตัวแปร ยกเว้นทิศทางลม (ไปรวมอยู่ใน wind rose แล้ว)
  const otherDatastreams = datastreams.filter(
    (ds) => String(ds["@iot.id"]) !== String(directionDatastream?.["@iot.id"])
  );

  return (
    <>
      <Typography sx={{ fontSize: 20, fontWeight: 500, color: text.head, mb: 0.5 }}>
        อินไซต์ข้อมูล
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: text.secondary, mb: 3 }}>
        ดูหลายกราฟของสถานีเดียวพร้อมกัน เลือกช่วงเวลาครั้งเดียวแล้วทุกกราฟอัปเดตตาม
      </Typography>

      {/* เลือกสถานี — ผูก query param เดียวกับหน้า "ภาพรวมสถานี" / "แจ้งเตือน" */}
      <Box
        sx={{
          bgcolor: background.paper,
          borderRadius: `${theme.shape.borderRadius + 4}px`,
          border: `1px solid ${divider}`,
          p: { xs: 1.5, sm: 2 },
          mb: 3,
          display: "flex",
          alignItems: "center",
          gap: 1,
          flexWrap: "wrap",
        }}
      >
        <InsightsRoundedIcon sx={{ fontSize: 18, color: text.secondary }} />
        <FormControl size="small" sx={{ minWidth: 260 }} disabled={things.length === 0}>
          <InputLabel>เลือกสถานีที่ต้องการดู</InputLabel>
          <Select
            label="เลือกสถานีที่ต้องการดู"
            value={selectedStationId}
            onChange={(e) => handleSelectStation(e.target.value)}
          >
            {things.map((t) => (
              <MenuItem key={t["@iot.id"]} value={String(t["@iot.id"])}>
                {t.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {!selectedThing ? (
        <Box
          sx={{
            border: `1px dashed ${divider}`,
            borderRadius: `${theme.shape.borderRadius + 4}px`,
            p: 5,
            textAlign: "center",
          }}
        >
          <Typography sx={{ fontSize: 13.5, color: text.secondary }}>
            เลือกสถานีด้านบนเพื่อดูอินไซต์ข้อมูลของสถานีนั้น
          </Typography>
        </Box>
      ) : (
        <>
          {/* แถบช่วงเวลากลาง — ควบคุมทุกกราฟด้านล่างพร้อมกัน */}
          <DateRangeBar from={range.from} to={range.to} onChange={setRange} />

          {/* Wind Rose แสดงก่อนเสมอถ้าสถานีมีข้อมูลลม เพราะเป็นภาพรวมที่อ่านง่ายสุด */}
          {hasWind && (
            <Box sx={{ mb: 2 }}>
              <WindRoseChart
                speedDatastream={speedDatastream}
                directionDatastream={directionDatastream}
                from={range.from}
                to={range.to}
              />
            </Box>
          )}

          {/* กราฟย่อยรายตัวแปร */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 2,
            }}
          >
            {otherDatastreams.map((ds) => (
              <InsightRangedChart
                key={ds["@iot.id"]}
                datastream={ds}
                from={range.from}
                to={range.to}
              />
            ))}
          </Box>

          {otherDatastreams.length === 0 && !hasWind && (
            <Typography sx={{ fontSize: 13, color: text.secondary }}>
              สถานีนี้ยังไม่มีตัวแปรให้แสดงกราฟ
            </Typography>
          )}
        </>
      )}
    </>
  );
}
