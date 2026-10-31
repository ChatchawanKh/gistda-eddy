// ประวัติช่วงที่ขาดข้อมูลของสถานีหนึ่ง — คำนวณจากเวลาของ Observation ใน FROST
// (ยังไม่มี backend เก็บ event) แสดง 1 แถวต่อ 1 ช่วง ไม่ใช่ 1 แถวต่อการตรวจ
//   สถานี  = ไม่มีข้อมูลจากอุปกรณ์ไหนเลย
//   อุปกรณ์ = อุปกรณ์นั้นหยุด แต่ช่วงนั้นสถานียังมีข้อมูลจากอุปกรณ์อื่น
import { useMemo, useState } from "react";
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Skeleton from "@mui/material/Skeleton";
import Alert from "@mui/material/Alert";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";

import { useOutageHistory } from "../hooks/useOutageHistory";
import {
  STALE_HOURS,
  findGaps,
  mergeTimes,
  isWithin,
  formatElapsed,
  formatLastSeen,
} from "../utils/alertStatus";

const RANGES = [
  { key: "30d", label: "30 วัน", days: 30 },
  { key: "90d", label: "90 วัน", days: 90 },
  { key: "1y", label: "1 ปี", days: 365 },
  { key: "all", label: "ทั้งหมด", days: null },
];

// ชื่อคอลัมน์เหนือค่าในแต่ละแถว — แสดงเฉพาะจอ xs ที่ซ่อนหัวตารางไว้
function MobileLabel({ children }) {
  return (
    <Box
      component="span"
      sx={{
        display: { xs: "block", sm: "none" },
        fontSize: 11,
        fontWeight: 400,
        color: "text.secondary",
      }}
    >
      {children}
    </Box>
  );
}

export default function AlertHistoryPanel({ thing, now }) {
  const theme = useTheme();
  const { text, divider, background } = theme.palette;
  const [rangeKey, setRangeKey] = useState("90d");

  const from = useMemo(() => {
    const days = RANGES.find((r) => r.key === rangeKey)?.days;
    return days ? new Date(now - days * 86400000).toISOString() : null;
  }, [rangeKey, now]);

  const { sensors, fetching, error } = useOutageHistory(thing, from);

  const episodes = useMemo(() => {
    const stationGaps = findGaps(
      mergeTimes(sensors.map((s) => s.times)),
      now,
    ).map((g) => ({ ...g, scope: "station", label: "ทั้งสถานี" }));

    const sensorGaps = sensors.flatMap((s) =>
      findGaps(s.times, now)
        .filter((g) => !stationGaps.some((sg) => isWithin(g, sg)))
        .map((g) => ({ ...g, scope: "sensor", label: s.name })),
    );

    return [...stationGaps, ...sensorGaps].sort((a, b) => b.start - a.start);
  }, [sensors, now]);

  const hasAnyData = sensors.some((s) => s.times.length > 0);

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1.5,
          flexWrap: "wrap",
          mb: 1.5,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 600, color: text.primary }}>
            ประวัติการขาดข้อมูล · {thing.name}
          </Typography>
          <Typography sx={{ fontSize: 12, color: text.secondary, mt: 0.25 }}>
            ช่วงที่ไม่มีข้อมูลใหม่เกิน {STALE_HOURS} ชั่วโมง คำนวณจากเวลาของข้อมูลที่ได้รับ
          </Typography>
        </Box>

        <ToggleButtonGroup
          size="small"
          exclusive
          value={rangeKey}
          onChange={(_, v) => v && setRangeKey(v)}
          sx={{ width: { xs: "100%", sm: "auto" } }}
        >
          {RANGES.map((r) => (
            <ToggleButton
              key={r.key}
              value={r.key}
              sx={{ px: 1.5, fontSize: 12, flex: { xs: 1, sm: "none" } }}
            >
              {r.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {error && (
        <Alert severity="warning" sx={{ mb: 1.5, fontSize: 12 }}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          border: `1px solid ${divider}`,
          borderRadius: 2,
          bgcolor: background.paper,
          overflow: "hidden",
        }}
      >
        {/* หัวตาราง */}
        <Box
          sx={{
            display: { xs: "none", sm: "grid" },
            gridTemplateColumns: "1.4fr 1.4fr 1.4fr 1fr",
            gap: 1.5,
            px: 2,
            py: 1,
            bgcolor: background.default,
            borderBottom: `1px solid ${divider}`,
          }}
        >
          {["ขอบเขต", "ข้อมูลหยุดหลัง", "ข้อมูลกลับมา", "ระยะเวลา"].map((h) => (
            <Typography key={h} sx={{ fontSize: 12, fontWeight: 600, color: text.secondary }}>
              {h}
            </Typography>
          ))}
        </Box>

        {fetching ? (
          [0, 1, 2].map((i) => (
            <Box key={i} sx={{ px: 2, py: 1.25 }}>
              <Skeleton height={22} />
            </Box>
          ))
        ) : episodes.length === 0 ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, px: 2, py: 2 }}>
            <TaskAltRoundedIcon
              sx={{ fontSize: 20, color: theme.palette.success?.main || "#2E7D32" }}
            />
            <Typography sx={{ fontSize: 13, color: text.primary }}>
              {hasAnyData
                ? "ไม่พบช่วงที่ขาดข้อมูลในช่วงเวลานี้"
                : "สถานีนี้ยังไม่มีข้อมูล"}
            </Typography>
          </Box>
        ) : (
          episodes.map((ep, i) => {
            const ongoing = ep.end === null;
            const hours = ((ep.end ?? now) - ep.start) / 3600000;
            const color = ongoing
              ? theme.palette.error.main
              : text.secondary;
            return (
              <Box
                key={`${ep.scope}-${ep.label}-${ep.start}`}
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr 1fr", sm: "1.4fr 1.4fr 1.4fr 1fr" },
                  gap: { xs: 0.5, sm: 1.5 },
                  alignItems: "center",
                  px: 2,
                  py: 1.25,
                  borderTop: i === 0 ? "none" : `1px solid ${divider}`,
                }}
              >
                <Box sx={{ minWidth: 0, gridColumn: { xs: "1 / -1", sm: "auto" } }}>
                  <Typography
                    sx={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: text.primary,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {ep.label}
                  </Typography>
                  <Typography sx={{ fontSize: 11.5, color: text.secondary }}>
                    {ep.scope === "station" ? "ไม่มีข้อมูลจากอุปกรณ์ใดเลย" : "อุปกรณ์อื่นยังส่งข้อมูล"}
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: 13, color: text.primary }}>
                  <MobileLabel>ข้อมูลหยุดหลัง</MobileLabel>
                  {formatLastSeen(new Date(ep.start).toISOString())}
                </Typography>
                <Typography sx={{ fontSize: 13, color: ongoing ? color : text.primary, fontWeight: ongoing ? 600 : 400 }}>
                  <MobileLabel>ข้อมูลกลับมา</MobileLabel>
                  {ongoing ? "ยังไม่กลับมา" : formatLastSeen(new Date(ep.end).toISOString())}
                </Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color, gridColumn: { xs: "1 / -1", sm: "auto" } }}>
                  <MobileLabel>ระยะเวลา</MobileLabel>
                  {formatElapsed(hours)}
                </Typography>
              </Box>
            );
          })
        )}
      </Box>
    </Box>
  );
}
