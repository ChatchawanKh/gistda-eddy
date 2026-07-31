// src/pages/Dashboard/components/AlertsView.jsx
// [ใหม่] เพิ่มตัวกรอง "เลือกสถานี" ในหน้าแจ้งเตือนเอง โดยผูกกับ query param
// เดียวกับหน้า "ภาพรวมสถานี" (?station=<id> บน URL) เนื่องจากทั้งแอปยังอยู่ใน
// route เดียวกัน (สลับกันด้วย activeKey ไม่ใช่การเปลี่ยนหน้า) ค่านี้จึงอ่าน/
// เขียนร่วมกันได้ทันที:
//   - ถ้าเพิ่งเลือกสถานีไว้ที่หน้า "ภาพรวมสถานี" แล้วมาเปิดหน้านี้ ตัวกรองจะ
//     auto-select สถานีเดียวกันให้เลย
//   - ถ้าเปลี่ยนสถานีที่หน้านี้ ก็จะสะท้อนกลับไปที่หน้า "ภาพรวมสถานี" ด้วยเช่นกัน
//   - ยังสามารถเลือก "ทุกสถานี" หรือ query สถานีอื่นได้อย่างอิสระจากหน้านี้เอง
import * as React from "react";
import { useTheme } from "@mui/material/styles";
import { useSearchParams } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";

const STALE_HOURS = 24;

export default function AlertsView({ datastreams, loading }) {
  const theme = useTheme();
  const { text, background, divider } = theme.palette;
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedStationId = searchParams.get("station") || "";

  const handleSelectStation = React.useCallback(
    (id) => {
      const next = new URLSearchParams(searchParams);
      if (id) next.set("station", id);
      else next.delete("station");
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  if (loading) return <CircularProgress size={20} />;

  // รายชื่อสถานีไว้ทำ dropdown (ไม่ซ้ำ) — ดึงจาก datastreams ที่ flatten มาแล้ว
  const stations = Array.from(
    new Map(datastreams.map((ds) => [String(ds.thingId), ds.thingName])).entries()
  ).map(([id, name]) => ({ id, name }));

  const filteredDatastreams = selectedStationId
    ? datastreams.filter((ds) => String(ds.thingId) === String(selectedStationId))
    : datastreams;

  const alerts = filteredDatastreams
    .map((ds) => {
      const t = ds.Observations?.[0]?.phenomenonTime;
      const hours = t ? (Date.now() - new Date(t).getTime()) / 3600000 : Infinity;
      return { ds, hours, stale: hours > STALE_HOURS };
    })
    .filter((a) => a.stale)
    .sort((a, b) => b.hours - a.hours);

  return (
    <>
      <Typography sx={{ fontSize: 20, fontWeight: 500, color: text.head, mb: 0.5 }}>
        แจ้งเตือนคุณภาพข้อมูล
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: text.secondary, mb: 2 }}>
        แสดงตัวแปรที่ไม่มีข้อมูลใหม่เกิน {STALE_HOURS} ชั่วโมง
      </Typography>

      {/* ตัวกรองสถานี — sync กับสถานีที่เลือกไว้ในหน้า "ภาพรวมสถานี" ผ่าน URL */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          flexWrap: "wrap",
          mb: 2.5,
        }}
      >
        <FormControl size="small" sx={{ minWidth: 260 }} disabled={stations.length === 0}>
          <InputLabel>กรองตามสถานี</InputLabel>
          <Select
            label="กรองตามสถานี"
            value={selectedStationId}
            onChange={(e) => handleSelectStation(e.target.value)}
          >
            <MenuItem value="">ทุกสถานี ({stations.length} สถานี)</MenuItem>
            {stations.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Tooltip title="ล้างตัวกรอง">
          <span>
            <IconButton
              size="small"
              onClick={() => handleSelectStation("")}
              disabled={!selectedStationId}
            >
              <ClearRoundedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        {selectedStationId && (
          <Typography sx={{ fontSize: 12, color: text.secondary }}>
            แสดงเฉพาะสถานีที่เลือกไว้ (เชื่อมกับหน้า "ภาพรวมสถานี")
          </Typography>
        )}
      </Box>

      {alerts.length === 0 ? (
        <Alert severity="success">
          {selectedStationId
            ? "สถานีนี้ทุก Datastream มีข้อมูลอัปเดตปกติ"
            : "ทุก Datastream มีข้อมูลอัปเดตปกติ"}
        </Alert>
      ) : (
        alerts.map(({ ds, hours }) => (
          <Box
            key={ds["@iot.id"]}
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              p: 1.75,
              mb: 1,
              border: `1px solid ${divider}`,
              borderRadius: `${theme.shape.borderRadius + 2}px`,
              bgcolor: background.paper,
            }}
          >
            <Box>
              <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>
                {ds.thingName} · {ds.ObservedProperty?.name || ds.name}
              </Typography>
              <Typography sx={{ fontSize: 12, color: text.secondary }}>
                ไม่มีข้อมูลใหม่มา {Math.round(hours)} ชั่วโมงแล้ว
              </Typography>
            </Box>
            <Chip size="small" color="error" label="ต้องตรวจสอบ" />
          </Box>
        ))
      )}
    </>
  );
}
