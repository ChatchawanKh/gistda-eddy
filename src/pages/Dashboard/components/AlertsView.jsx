// หน้าแจ้งเตือนคุณภาพข้อมูล — 1 การ์ดต่อสถานี (ไม่ใช่ 1 แถวต่อตัวแปร) พร้อมสาเหตุ
// ที่น่าจะเป็นจากรูปแบบเวลา และแท็บประวัติช่วงที่ขาดข้อมูล
// คำนวณฝั่ง client ทั้งหมด ดู utils/alertStatus.js
import { useCallback, useMemo, useState } from "react";
import { useTheme } from "@mui/material/styles";
import { useSearchParams } from "react-router-dom";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Collapse from "@mui/material/Collapse";
import ButtonBase from "@mui/material/ButtonBase";

import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import SensorsRoundedIcon from "@mui/icons-material/SensorsRounded";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded';

import Loading from "./Loading";
import AlertHistoryPanel from "./AlertHistoryPanel";
import {
  STALE_HOURS,
  buildStationStatus,
  sortStations,
  formatElapsed,
  formatLastSeen,
} from "../utils/alertStatus";

function getStatusConfig(theme, level) {
  if (level === "critical") {
    return {
      label: "ต้องตรวจสอบด่วน",
      shortLabel: "ด่วน",
      color: theme.palette.error.main,
      bg: `${theme.palette.error.main}0D`,
      border: `${theme.palette.error.main}30`,
      icon: ErrorOutlineRoundedIcon,
    };
  }

  if (level === "warning") {
    return {
      label: "ควรตรวจสอบ",
      shortLabel: "ตรวจสอบ",
      color: theme.palette.warning?.main || "#D97706",
      bg: `${theme.palette.warning?.main || "#D97706"}0D`,
      border: `${theme.palette.warning?.main || "#D97706"}30`,
      icon: WarningAmberRoundedIcon,
    };
  }

  const ok = theme.palette.success?.main || "#2E7D32";
  return {
    label: "ปกติ",
    shortLabel: "ปกติ",
    color: ok,
    bg: `${ok}0D`,
    border: `${ok}30`,
    icon: TaskAltRoundedIcon,
  };
}

// ข้อความสาเหตุที่น่าจะเป็น — อนุมานจากเวลา จึงใช้คำว่า "น่าจะ"
function causeText(cause) {
  switch (cause.kind) {
    case "station":
      return "ทุกอุปกรณ์หยุดส่งพร้อมกัน — น่าจะเป็นที่การส่งข้อมูลหรือไฟฟ้าของสถานี";
    case "all":
      return "ทุกตัวแปรหยุดส่ง แต่หยุดไม่พร้อมกัน";
    case "sensor":
      return `อุปกรณ์ที่หยุดส่ง: ${cause.sensors.join(", ")} — อุปกรณ์อื่นยังส่งข้อมูลปกติ`;
    case "partial":
      return "บางตัวแปรหยุดส่ง ขณะที่อุปกรณ์เดียวกันยังส่งตัวแปรอื่นอยู่";
    default:
      return null;
  }
}

function StatusChip({ status }) {
  const StatusIcon = status.icon;
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.6,
        flexShrink: 0,
        px: 1,
        py: 0.6,
        borderRadius: 1.25,
        bgcolor: status.bg,
        color: status.color,
        border: `1px solid ${status.border}`,
      }}
    >
      <StatusIcon sx={{ fontSize: 14 }} />
      <Typography
        sx={{
          display: { xs: "none", sm: "block" },
          fontSize: 12,
          fontWeight: 500,
          whiteSpace: "nowrap",
        }}
      >
        {status.label}
      </Typography>
      <Typography
        sx={{
          display: { xs: "block", sm: "none" },
          fontSize: 11,
          fontWeight: 600,
          whiteSpace: "nowrap",
        }}
      >
        {status.shortLabel}
      </Typography>
    </Box>
  );
}

function SummaryCell({ value, suffix, label, icon: Icon, color, last }) {
  const theme = useTheme();
  const { text, divider } = theme.palette;
  return (
    <Box
      sx={{
        px: 2,
        py: 1.5,
        borderRight: last ? "none" : { xs: "none", sm: `1px solid ${divider}` },
        borderBottom: last ? "none" : { xs: `1px solid ${divider}`, sm: "none" },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
        }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: 22,
              fontWeight: 700,
              lineHeight: 1.1,
              color: value > 0 && color ? color : text.primary,
            }}
          >
            {value}
            {suffix && (
              <Typography
                component="span"
                sx={{ fontSize: 12, fontWeight: 400, color: text.secondary, ml: 0.5 }}
              >
                {suffix}
              </Typography>
            )}
          </Typography>
          <Typography sx={{ fontSize: 14, color: text.secondary, mt: 0.35 }}>
            {label}
          </Typography>
        </Box>
        <Icon sx={{ fontSize: 20, color: value > 0 ? color || text.secondary : divider }} />
      </Box>
    </Box>
  );
}

// รายละเอียดในการ์ด: จัดกลุ่มตามอุปกรณ์ แสดงทุกตัวแปร (ตัวที่ปกติสีจาง)
function SensorBreakdown({ station }) {
  const theme = useTheme();
  const { text, divider, background } = theme.palette;

  return (
    <Box sx={{ borderTop: `1px solid ${divider}`, bgcolor: background.default }}>
      {station.sensors.map((sensor) => {
        const sensorLevel = sensor.items.some((it) => it.critical)
          ? "critical"
          : sensor.items.some((it) => it.stale)
            ? "warning"
            : "ok";
        const sensorColor = getStatusConfig(theme, sensorLevel).color;
        const staleInSensor = sensor.items.filter((it) => it.stale).length;
        return (
          <Box key={sensor.name} sx={{ px: { xs: 1.5, sm: 2 }, py: 1.25 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
              <SensorsRoundedIcon sx={{ fontSize: 15, color: sensorColor }} />
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: text.primary }}>
                {sensor.name}
              </Typography>
              <Typography sx={{ fontSize: 12, color: text.secondary }}>
                {sensor.stale
                  ? "· ขาดทุกตัวแปร"
                  : staleInSensor
                    ? `· ขาด ${staleInSensor} จาก ${sensor.items.length} ตัวแปร`
                    : "· ปกติ"}
              </Typography>
            </Box>

            {sensor.items.map(({ ds, t, hours, stale }) => (
              <Box
                key={ds["@iot.id"]}
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr auto", sm: "1.6fr 1.4fr 0.8fr" },
                  gap: 1.5,
                  alignItems: "baseline",
                  pl: 3,
                  py: 0.4,
                  borderTop: `1px dashed ${divider}`,
                  opacity: stale ? 1 : 0.6,
                }}
              >
                <Typography
                  sx={{
                    fontSize: 12.5,
                    color: text.primary,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {ds.ObservedProperty?.name || ds.name}
                </Typography>
                <Typography
                  sx={{
                    display: { xs: "none", sm: "block" },
                    fontSize: 12.5,
                    color: text.secondary,
                  }}
                >
                  {formatLastSeen(t) || "ไม่เคยมีข้อมูล"}
                </Typography>
                <Typography
                  sx={{
                    fontSize: 12.5,
                    fontWeight: stale ? 600 : 400,
                    color: stale ? sensorColor : text.secondary,
                    textAlign: "right",
                    whiteSpace: "nowrap",
                  }}
                >
                  {stale ? formatElapsed(hours) : "ปกติ"}
                </Typography>
              </Box>
            ))}
          </Box>
        );
      })}
    </Box>
  );
}

function StationCard({ station, expanded, onToggle }) {
  const theme = useTheme();
  const { text, divider, background } = theme.palette;
  const status = getStatusConfig(theme, station.level);
  const lastSeen = formatLastSeen(station.lastSeen);
  const cause = causeText(station.cause);
  const allStale = station.staleCount === station.total;

  return (
    <Box
      sx={{
        border: `1px solid ${divider}`,
        borderRadius: 2,
        bgcolor: background.paper,
        overflow: "hidden",
      }}
    >
      <Box sx={{ px: { xs: 1.5, sm: 2 }, py: 1.75 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.25, minWidth: 0, flex: 1 }}>
            {/* Status dot */}
            <Box
              sx={{
                width: 8,
                height: 8,
                mt: "7px",
                borderRadius: "50%",
                bgcolor: status.color,
                flexShrink: 0,
                boxShadow: `0 0 0 3px ${status.color}14`,
              }}
            />

            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                sx={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: text.primary,
                  lineHeight: 1.4,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {station.name}
              </Typography>

              {/* Time information */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 0.5,
                  mt: 0.5,
                  color: text.secondary,
                }}
              >
                <ScheduleRoundedIcon sx={{ fontSize: 13, flexShrink: 0 }} />
                <Typography sx={{ fontSize: 14, lineHeight: 1.4 }}>
                  {allStale ? "ขาดข้อมูลมา " : "ขาดข้อมูลบางส่วนมา "}
                  <Box component="span" sx={{ fontWeight: 600, color: status.color }}>
                    {formatElapsed(station.hours)}
                  </Box>
                </Typography>
                {lastSeen && (
                  <>
                    <Typography sx={{ fontSize: 11, color: divider }}>·</Typography>
                    <Typography sx={{ fontSize: 14, color: text.secondary }}>
                      ล่าสุด {lastSeen}
                    </Typography>
                  </>
                )}
              </Box>

              {/* Likely cause */}
              {cause && (
                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.5, mt: 0.75 }}>
                  <InfoOutlinedIcon sx={{ fontSize: 14, mt: "2px", color: text.secondary }} />
                  <Typography sx={{ fontSize: 12.5, color: text.secondary, lineHeight: 1.5 }}>
                    {cause}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>

          <StatusChip status={status} />
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            mt: 1.25,
            pl: 2.25,
          }}
        >
          <Typography sx={{ fontSize: 12.5, color: text.secondary }}>
            ตัวแปรที่ขาด{" "}
            <Box component="span" sx={{ fontWeight: 600, color: text.primary }}>
              {station.staleCount} / {station.total}
            </Box>
          </Typography>

          <ButtonBase
            onClick={onToggle}
            aria-expanded={expanded}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.25,
              px: 1,
              py: 0.5,
              borderRadius: 1,
              fontSize: 12.5,
              fontWeight: 500,
              color: theme.palette.primary.main,
              fontFamily: "inherit",
            }}
          >
            {expanded ? "ซ่อนรายละเอียด" : "ดูรายละเอียด"}
            <ExpandMoreRoundedIcon
              sx={{
                fontSize: 18,
                transition: "transform 0.2s ease",
                transform: expanded ? "rotate(180deg)" : "none",
              }}
            />
          </ButtonBase>
        </Box>
      </Box>

      <Collapse in={expanded} unmountOnExit>
        <SensorBreakdown station={station} />
      </Collapse>
    </Box>
  );
}

export default function AlertsView({ things, loading }) {
  const theme = useTheme();
  const { text, background, divider } = theme.palette;
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedStationId = searchParams.get("station") || "";
  const tab = searchParams.get("tab") === "history" ? "history" : "current";
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [showHealthy, setShowHealthy] = useState(false);
  // อายุข้อมูลเทียบเวลาตอนเปิดหน้า — คงค่าไว้ไม่ให้ตัวเลขเปลี่ยนทุก render
  const [now] = useState(() => Date.now());

  const updateParam = useCallback(
    (key, value) => {
      const next = new URLSearchParams(searchParams);

      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }

      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const allStations = useMemo(
    () => sortStations((things || []).map((t) => buildStationStatus(t, now))),
    [things, now]
  );

  if (loading) return <Loading />;

  const stations = selectedStationId
    ? allStations.filter((s) => s.id === selectedStationId)
    : allStations;
  const problemStations = stations.filter((s) => s.level !== "ok");
  const healthyStations = stations.filter((s) => s.level === "ok");

  const criticalCount = stations.filter((s) => s.level === "critical").length;
  const warningCount = stations.filter((s) => s.level === "warning").length;
  const staleDatastreams = stations.reduce((n, s) => n + s.staleCount, 0);
  const totalDatastreams = stations.reduce((n, s) => n + s.total, 0);

  // ประวัติดูได้ทีละสถานี — ถ้ายังไม่ได้เลือก ใช้สถานีที่มีปัญหาหนักสุด
  const historyStationId = selectedStationId || allStations[0]?.id;
  const historyThing = (things || []).find(
    (t) => String(t["@iot.id"]) === historyStationId
  );

  const toggleExpanded = (id) =>
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Box sx={{ width: "100%" }}>
      {/* Header */}
      <Box sx={{ minWidth: 0, py: 1.5, mb: 2.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              backgroundColor: "rgba(119, 192, 240, 0.21)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mr: 1,
            }}
          >
            <NotificationsActiveRoundedIcon sx={{ fontSize: 20, color: text.head }} />
          </Box>
          <Typography sx={{ fontSize: 20, fontWeight: 400, color: text.head }}>
            แจ้งเตือนคุณภาพข้อมูล
          </Typography>
        </Box>

        <Typography sx={{ fontSize: 13, color: text.secondary, lineHeight: 1.5 }}>
          แสดงสถานีที่มีตัวแปรไม่มีข้อมูลใหม่เกิน {STALE_HOURS} ชั่วโมง
        </Typography>
      </Box>

      {/* Summary */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
          border: `1px solid ${divider}`,
          borderRadius: 2,
          overflow: "hidden",
          bgcolor: background.paper,
          mb: 2.5,
        }}
      >
        <SummaryCell
          value={criticalCount}
          label="สถานีที่ต้องตรวจสอบด่วน"
          icon={ErrorOutlineRoundedIcon}
          color={theme.palette.error.main}
        />
        <SummaryCell
          value={warningCount}
          label="สถานีที่ควรตรวจสอบ"
          icon={WarningAmberRoundedIcon}
          color={theme.palette.warning?.main || "#D97706"}
        />
        <SummaryCell
          value={staleDatastreams}
          suffix={`/ ${totalDatastreams}`}
          label="ตัวแปรที่ขาดข้อมูล"
          icon={SensorsRoundedIcon}
          last
        />
      </Box>

      {/* Tabs + filter */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1.5,
          flexWrap: "wrap",
          mb: 1.5,
          borderBottom: `1px solid ${divider}`,
          pb: 1,
        }}
      >
        {/* จอ xs: Tabs เต็มแถว แบ่งครึ่งเท่ากัน (ชื่อ tab ภาษาไทยยาว ชนกับช่องกรอง) */}
        <Tabs
          value={tab}
          onChange={(_, v) => updateParam("tab", v === "history" ? "history" : "")}
          variant="scrollable"
          scrollButtons={false}
          sx={{
            minHeight: 36,
            width: { xs: "100%", sm: "auto" },
            "& .MuiTab-root": {
              minHeight: 36,
              py: 0.5,
              fontSize: { xs: 13, sm: 14 },
              px: { xs: 1, sm: 2 },
              flex: { xs: 1, sm: "none" },
            },
          }}
        >
          <Tab
            value="current"
            label={
              problemStations.length
                ? `สถานะปัจจุบัน (${problemStations.length})`
                : "สถานะปัจจุบัน"
            }
          />
          <Tab value="history" label="ประวัติการขาดข้อมูล" />
        </Tabs>

        {/* จอ xs: ช่องกรองเต็มความกว้าง อยู่บรรทัดใต้ Tabs */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            width: { xs: "100%", sm: "auto" },
          }}
        >
          <FormControl
            size="small"
            sx={{ minWidth: { sm: 240 }, flex: { xs: 1, sm: "none" } }}
            disabled={allStations.length === 0}
          >
            <InputLabel shrink>กรองตามสถานี</InputLabel>

            <Select
              label="กรองตามสถานี"
              notched
              value={selectedStationId}
              onChange={(e) => updateParam("station", e.target.value)}
              displayEmpty
              renderValue={(value) => {
                if (!value) {
                  return "ทุกสถานี";
                }

                return (
                  allStations.find((s) => s.id === value)?.name || "ทุกสถานี"
                );
              }}
            >
              <MenuItem value="">ทุกสถานี ({allStations.length} สถานี)</MenuItem>

              {allStations.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Tooltip
            title="ล้างตัวกรอง"
            slotProps={{
              tooltip: {
                sx: {
                  bgcolor: theme.palette.primary.main,
                  borderRadius: 50,
                  fontWeight: 400,
                },
              },
            }}
          >
            <span>
              <IconButton
                size="small"
                onClick={() => updateParam("station", "")}
                disabled={!selectedStationId}
                sx={{ width: 36, height: 36 }}
              >
                <ClearRoundedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>

      {/* Content */}
      {tab === "history" ? (
        historyThing ? (
          <AlertHistoryPanel thing={historyThing} now={now} />
        ) : (
          <Typography sx={{ fontSize: 13, color: text.secondary }}>
            ยังไม่มีสถานี
          </Typography>
        )
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {problemStations.length === 0 && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                p: 2.5,
                border: `1px solid ${divider}`,
                borderRadius: 2,
                bgcolor: background.paper,
              }}
            >
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: 1.5,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: `${theme.palette.success?.main || "#2E7D32"}0D`,
                  color: theme.palette.success?.main || "#2E7D32",
                  flexShrink: 0,
                }}
              >
                <TaskAltRoundedIcon sx={{ fontSize: 21 }} />
              </Box>

              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: text.primary }}>
                  ข้อมูลทำงานเป็นปกติ
                </Typography>
                <Typography sx={{ fontSize: 12, color: text.secondary, mt: 0.25 }}>
                  {selectedStationId
                    ? "ทุกตัวแปรของสถานีนี้มีข้อมูลอัปเดตภายในช่วงเวลาที่กำหนด"
                    : "ทุกสถานีมีข้อมูลอัปเดตภายในช่วงเวลาที่กำหนด"}
                </Typography>
              </Box>
            </Box>
          )}

          {problemStations.map((s) => (
            <StationCard
              key={s.id}
              station={s}
              expanded={expandedIds.has(s.id)}
              onToggle={() => toggleExpanded(s.id)}
            />
          ))}

          {/* สถานีที่ปกติ — ย่อไว้ท้ายรายการ ให้เห็นว่าระบบตรวจครบทุกสถานี */}
          {healthyStations.length > 0 && (
            <Box
              sx={{
                border: `1px solid ${divider}`,
                borderRadius: 2,
                bgcolor: background.paper,
                overflow: "hidden",
              }}
            >
              <ButtonBase
                onClick={() => setShowHealthy((v) => !v)}
                aria-expanded={showHealthy}
                sx={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "space-between",
                  px: 2,
                  py: 1.25,
                  fontFamily: "inherit",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <TaskAltRoundedIcon
                    sx={{ fontSize: 17, color: theme.palette.success?.main || "#2E7D32" }}
                  />
                  <Typography sx={{ fontSize: 13.5, color: text.primary }}>
                    ปกติ {healthyStations.length} สถานี
                  </Typography>
                </Box>
                <ExpandMoreRoundedIcon
                  sx={{
                    fontSize: 18,
                    color: text.secondary,
                    transition: "transform 0.2s ease",
                    transform: showHealthy ? "rotate(180deg)" : "none",
                  }}
                />
              </ButtonBase>

              <Collapse in={showHealthy} unmountOnExit>
                {healthyStations.map((s) => {
                  const latest = s.sensors
                    .flatMap((g) => g.items.map((it) => it.t))
                    .filter(Boolean)
                    .sort()
                    .pop();
                  return (
                    <Box
                      key={s.id}
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 1.5,
                        px: 2,
                        py: 1,
                        borderTop: `1px solid ${divider}`,
                      }}
                    >
                      <Typography sx={{ fontSize: 13, color: text.primary }}>
                        {s.name}
                      </Typography>
                      <Typography sx={{ fontSize: 12.5, color: text.secondary }}>
                        ล่าสุด {formatLastSeen(latest)}
                      </Typography>
                    </Box>
                  );
                })}
              </Collapse>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
