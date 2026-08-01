// src/pages/Dashboard/components/AlertsView.jsx
// [ใหม่] เพิ่มตัวกรอง "เลือกสถานี" ในหน้าแจ้งเตือนเอง โดยผูกกับ query param
// เดียวกับหน้า "ภาพรวมสถานี" (?station=<id> บน URL) เนื่องจากทั้งแอปยังอยู่ใน
// route เดียวกัน (สลับกันด้วย activeKey ไม่ใช่การเปลี่ยนหน้า) ค่านี้จึงอ่าน/
// เขียนร่วมกันได้ทันที:
//   - ถ้าเพิ่งเลือกสถานีไว้ที่หน้า "ภาพรวมสถานี" แล้วมาเปิดหน้านี้ ตัวกรองจะ
//     auto-select สถานีเดียวกันให้เลย
//   - ถ้าเปลี่ยนสถานีที่หน้านี้ ก็จะสะท้อนกลับไปที่หน้า "ภาพรวมสถานี" ด้วยเช่นกัน
//   - ยังสามารถเลือก "ทุกสถานี" หรือ query สถานีอื่นได้อย่างอิสระจากหน้านี้เอง
//
// [ปรับดีไซน์] ลดการใช้สีสัน ให้เป็นลิสต์ที่อ่านง่ายขึ้น:
//   - การ์ดสรุปเดิม (พื้นหลังสีไล่ตามระดับ) เปลี่ยนเป็นแถบสรุปแบบ text-only
//     ใช้สีเน้นเฉพาะตัวเลข/จุดสถานะเล็กๆ เท่านั้น
//   - รายการแจ้งเตือนเดิม (border-left สี + ไอคอนพื้นหลังสี + chip พื้นหลังสี)
//     เปลี่ยนเป็นแถวลิสต์คั่นด้วยเส้น divider ใช้ "จุดสถานะ" (dot) เล็กๆ
//     แทนสีพื้นหลังก้อนใหญ่ ตัวหนังสือส่วนใหญ่เป็นสีปกติ (text.primary/secondary)
//     สีระดับความรุนแรง (error/warning) ใช้เฉพาะจุดเล็กๆ กับ label เท่านั้น
import * as React from "react";
import { useTheme } from "@mui/material/styles";
import { useSearchParams } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import NotificationsActiveRoundedIcon from "@mui/icons-material/NotificationsActiveRounded";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";

const STALE_HOURS = 24;
const CRITICAL_HOURS = 72; // เกิน 3 วัน = ระดับวิกฤต แยกจาก "ต้องตรวจสอบ" ด้วยจุดสีเท่านั้น

// แปลงจำนวนชั่วโมงที่ไม่มีข้อมูลใหม่ ให้เป็นข้อความอ่านง่าย
// - ต่ำกว่า 1 วัน -> บอกเป็นชั่วโมง
// - ตั้งแต่ 1 วันขึ้นไป -> บอกเป็นจำนวนวันเต็ม (ปัดลง) เช่น "145 วัน"
function formatElapsed(hours) {
  if (!isFinite(hours)) return "ไม่เคยมีข้อมูล";

  const totalHours = Math.round(hours);
  const totalDays = Math.floor(totalHours / 24);

  if (totalDays < 1) {
    return `${totalHours} ชั่วโมง`;
  }
  return `${totalDays} วัน`;
}

// ข้อมูลล่าสุดเมื่อไหร่ (วันที่จริง แบบ พ.ศ.) ใช้เสริมคู่กับ formatElapsed
// เพื่อให้ user เทียบกับปฏิทินจริงได้ทันที ไม่ต้องมานั่งคำนวณเอง
const lastSeenFormatter = new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function formatLastSeen(isoString) {
  if (!isoString) return null;
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return null;
  return lastSeenFormatter.format(d);
}

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
      return { ds, t, hours, stale: hours > STALE_HOURS, critical: hours > CRITICAL_HOURS };
    })
    .filter((a) => a.stale)
    .sort((a, b) => b.hours - a.hours);

  const criticalCount = alerts.filter((a) => a.critical).length;
  const warningCount = alerts.length - criticalCount;
  const affectedStations = new Set(alerts.map((a) => String(a.ds.thingId))).size;

  return (
    <>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
        <NotificationsActiveRoundedIcon sx={{ fontSize: 20, color: text.secondary }} />
        <Typography sx={{ fontSize: 20, fontWeight: 500, color: text.head }}>
          แจ้งเตือนคุณภาพข้อมูล
        </Typography>
      </Box>
      <Typography sx={{ fontSize: 13.5, color: text.secondary, mb: 2 }}>
        แสดงตัวแปรที่ไม่มีข้อมูลใหม่เกิน {STALE_HOURS} ชั่วโมง
      </Typography>

      {/* แถบสรุปแบบ text-only — ไม่มีการ์ดสีพื้นหลัง ใช้เส้นคั่นบาง ๆ
          กับสีเน้นเฉพาะตัวเลขที่เป็นระดับวิกฤตเท่านั้น */}
      {alerts.length > 0 && (
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "stretch",
            gap: 0,
            mb: 2.5,
            border: `1px solid ${divider}`,
            borderRadius: `${theme.shape.borderRadius}px`,
            overflow: "hidden",
          }}
        >
          {[
            {
              label: "ต้องตรวจสอบด่วน",
              value: criticalCount,
              color: criticalCount > 0 ? theme.palette.error.main : text.primary,
            },
            {
              label: "ควรตรวจสอบ",
              value: warningCount,
              color: text.primary,
            },
            {
              label: "สถานีที่ได้รับผลกระทบ",
              value: `${affectedStations} / ${stations.length}`,
              color: text.primary,
            },
          ].map((s, i) => (
            <Box
              key={s.label}
              sx={{
                flex: "1 1 160px",
                p: 1.75,
                borderLeft: i === 0 ? "none" : `1px solid ${divider}`,
              }}
            >
              <Typography sx={{ fontSize: 19, fontWeight: 700, color: s.color, lineHeight: 1.2 }}>
                {s.value}
              </Typography>
              <Typography sx={{ fontSize: 11.5, color: text.secondary, mt: 0.25 }}>
                {s.label}
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      {/* ตัวกรองสถานี — sync กับสถานีที่เลือกไว้ในหน้า "ภาพรวมสถานี" ผ่าน URL */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          flexWrap: "wrap",
          mb: 2,
        }}
      >
        <FormControl size="small" sx={{ minWidth: 260 }} disabled={stations.length === 0}>
          <InputLabel shrink>กรองตามสถานี</InputLabel>
          <Select
            label="กรองตามสถานี"
            notched
            value={selectedStationId}
            onChange={(e) => handleSelectStation(e.target.value)}
            displayEmpty
            renderValue={(value) => {
              if (!value) return "ทุกสถานี";
              return stations.find((s) => String(s.id) === String(value))?.name || "ทุกสถานี";
            }}
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
            {/* แสดงเฉพาะสถานีที่เลือกไว้ (เชื่อมกับหน้า "ภาพรวมสถานี") */}
          </Typography>
        )}
      </Box>

      {alerts.length === 0 ? (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            p: 2.25,
            border: `1px solid ${divider}`,
            borderRadius: `${theme.shape.borderRadius}px`,
            bgcolor: background.paper,
          }}
        >
          <TaskAltRoundedIcon sx={{ fontSize: 22, color: text.secondary }} />
          <Box>
            <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: text.primary }}>
              ไม่มีรายการที่ต้องตรวจสอบ
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: text.secondary }}>
              {selectedStationId
                ? "สถานีนี้ทุก Datastream มีข้อมูลอัปเดตปกติ"
                : "ทุก Datastream มีข้อมูลอัปเดตปกติ"}
            </Typography>
          </Box>
        </Box>
      ) : (
        <Box
          sx={{
            border: `1px solid ${divider}`,
            borderRadius: `${theme.shape.borderRadius}px`,
            bgcolor: background.paper,
            overflow: "hidden",
          }}
        >
          {alerts.map(({ ds, t, hours, critical }, i) => {
            const severityColor = critical ? theme.palette.error.main : theme.palette.warning?.main || "#D97706";
            const lastSeen = formatLastSeen(t);
            return (
              <Box
                key={ds["@iot.id"]}
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 1.5,
                  py: 1.5,
                  px: 1.75,
                  borderTop: i === 0 ? "none" : `1px solid ${divider}`,
                  transition: "background-color 0.15s ease",
                  "&:hover": {
                    bgcolor: background.default,
                  },
                }}
              >
                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.25, minWidth: 0 }}>
                  {/* จุดสถานะเล็ก ๆ แทนไอคอนกล่องสี — สื่อระดับความรุนแรงแบบเบา ๆ */}
                  <Box
                    sx={{
                      width: 7,
                      height: 7,
                      mt: "6px",
                      borderRadius: "50%",
                      bgcolor: severityColor,
                      flexShrink: 0,
                    }}
                  />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: text.primary }}>
                      {ds.thingName} · {ds.ObservedProperty?.name || ds.name}
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: text.secondary, mt: 0.25 }}>
                      <ScheduleRoundedIcon sx={{ fontSize: 13 }} />
                      <Typography sx={{ fontSize: 12 }}>
                        ไม่มีข้อมูลใหม่มา {formatElapsed(hours)}แล้ว
                        {lastSeen && ` (ล่าสุด ${lastSeen})`}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                <Typography
                  sx={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: severityColor,
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  {critical ? "ต้องตรวจสอบด่วน" : "ต้องตรวจสอบ"}
                </Typography>
              </Box>
            );
          })}
        </Box>
      )}
    </>
  );
}