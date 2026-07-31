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
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import NotificationsActiveRoundedIcon from "@mui/icons-material/NotificationsActiveRounded";
import ReportRoundedIcon from "@mui/icons-material/ReportRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import SensorsOffRoundedIcon from "@mui/icons-material/SensorsOffRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";

const STALE_HOURS = 24;
const CRITICAL_HOURS = 72; // เกิน 3 วัน = ระดับวิกฤต (สีแดงเข้ม/error) แยกจาก "ต้องตรวจสอบ" (สีเหลือง/warning)

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
      return { ds, hours, stale: hours > STALE_HOURS, critical: hours > CRITICAL_HOURS };
    })
    .filter((a) => a.stale)
    .sort((a, b) => b.hours - a.hours);

  const criticalCount = alerts.filter((a) => a.critical).length;
  const warningCount = alerts.length - criticalCount;
  const affectedStations = new Set(alerts.map((a) => String(a.ds.thingId))).size;

  return (
    <>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
        <NotificationsActiveRoundedIcon sx={{ fontSize: 22, color: theme.palette.warning?.main || "#f59e0b" }} />
        <Typography sx={{ fontSize: 20, fontWeight: 500, color: text.head }}>
          แจ้งเตือนคุณภาพข้อมูล
        </Typography>
      </Box>
      <Typography sx={{ fontSize: 13.5, color: text.secondary, mb: 2 }}>
        แสดงตัวแปรที่ไม่มีข้อมูลใหม่เกิน {STALE_HOURS} ชั่วโมง
      </Typography>

      {/* สรุปสถานะโดยรวมแบบการ์ดสี — เห็นความรุนแรงของปัญหาได้ในแวบเดียว
          ก่อนไล่ดูรายการทีละรายการด้านล่าง */}
      {!loading && alerts.length > 0 && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 1.5,
            mb: 2.5,
          }}
        >
          {[
            {
              label: "ต้องตรวจสอบด่วน",
              value: criticalCount,
              icon: ReportRoundedIcon,
              color: theme.palette.error.main,
              sub: `เกิน ${CRITICAL_HOURS} ชม.`,
            },
            {
              label: "ควรตรวจสอบ",
              value: warningCount,
              icon: WarningAmberRoundedIcon,
              color: theme.palette.warning?.main || "#f59e0b",
              sub: `${STALE_HOURS}–${CRITICAL_HOURS} ชม.`,
            },
            {
              label: "สถานีที่ได้รับผลกระทบ",
              value: affectedStations,
              icon: SensorsOffRoundedIcon,
              color: text.secondary,
              sub: `จาก ${stations.length} สถานี`,
            },
          ].map((s) => (
            <Box
              key={s.label}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                p: 1.75,
                borderRadius: `${theme.shape.borderRadius + 4}px`,
                border: `1px solid ${divider}`,
                bgcolor: background.paper,
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: "12px",
                  bgcolor: `${s.color}14`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <s.icon sx={{ fontSize: 19, color: s.color }} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: 18, fontWeight: 800, color: text.primary, lineHeight: 1.2 }}>
                  {s.value}
                </Typography>
                <Typography sx={{ fontSize: 11, color: text.secondary }}>
                  {s.label} · {s.sub}
                </Typography>
              </Box>
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
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            p: 2.5,
            border: `1px solid ${theme.palette.success.main}33`,
            bgcolor: `${theme.palette.success.main}0d`,
            borderRadius: `${theme.shape.borderRadius + 4}px`,
          }}
        >
          <TaskAltRoundedIcon sx={{ fontSize: 28, color: theme.palette.success.main }} />
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
        alerts.map(({ ds, hours, critical }) => {
          const severityColor = critical ? theme.palette.error.main : theme.palette.warning?.main || "#f59e0b";
          return (
            <Box
              key={ds["@iot.id"]}
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 1.5,
                p: 1.75,
                mb: 1,
                border: `1px solid ${divider}`,
                borderLeft: `4px solid ${severityColor}`,
                borderRadius: `${theme.shape.borderRadius + 2}px`,
                bgcolor: background.paper,
                transition: "box-shadow 0.15s ease, transform 0.15s ease",
                "&:hover": {
                  boxShadow: `0 4px 14px ${severityColor}22`,
                  transform: "translateY(-1px)",
                },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
                <Box
                  sx={{
                    width: 38,
                    height: 38,
                    borderRadius: "11px",
                    bgcolor: `${severityColor}14`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {critical ? (
                    <ReportRoundedIcon sx={{ fontSize: 19, color: severityColor }} />
                  ) : (
                    <WarningAmberRoundedIcon sx={{ fontSize: 19, color: severityColor }} />
                  )}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: text.primary }}>
                    {ds.thingName} · {ds.ObservedProperty?.name || ds.name}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: text.secondary }}>
                    <ScheduleRoundedIcon sx={{ fontSize: 13.5 }} />
                    <Typography sx={{ fontSize: 12 }}>
                      ไม่มีข้อมูลใหม่มา {Math.round(hours)} ชั่วโมงแล้ว
                    </Typography>
                  </Box>
                </Box>
              </Box>
              <Chip
                size="small"
                label={critical ? "ต้องตรวจสอบด่วน" : "ต้องตรวจสอบ"}
                sx={{
                  bgcolor: `${severityColor}1a`,
                  color: severityColor,
                  fontWeight: 700,
                  border: `1px solid ${severityColor}44`,
                }}
              />
            </Box>
          );
        })
      )}
    </>
  );
}
