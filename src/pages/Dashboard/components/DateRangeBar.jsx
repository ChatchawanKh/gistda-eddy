// src/pages/Dashboard/components/DateRangeBar.jsx
// แถบเลือกช่วงเวลาแบบกลาง ใช้ควบคุมทุกกราฟในหน้า "อินไซต์ข้อมูล" พร้อมกัน
// (เปลี่ยนที่นี่ที่เดียว ทุกกราฟ query ใหม่ตามช่วงเวลาเดียวกันทั้งหมด)
// - ปุ่มลัด 24 ชม. / 7 วัน / 30 วัน
// - ช่องกำหนดวันที่เอง "จาก" - "ถึง" (แก้แล้วถือเป็นช่วงเวลาแบบกำหนดเอง)
// ไม่ได้ใช้ @mui/x-date-pickers (ยังไม่ได้ติดตั้งในโปรเจกต์) จึงใช้
// <input type="date"> มาตรฐานของ MUI TextField แทน เพื่อไม่ต้องเพิ่ม dependency
import * as React from "react";
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import ToggleButton from "@mui/material/ToggleButton";
import DateRangeRoundedIcon from "@mui/icons-material/DateRangeRounded";

export const PRESETS = [
  { key: "24h", label: "24 ชม.", ms: 24 * 60 * 60 * 1000 },
  { key: "7d", label: "7 วัน", ms: 7 * 24 * 60 * 60 * 1000 },
  { key: "30d", label: "30 วัน", ms: 30 * 24 * 60 * 60 * 1000 },
];

const TOLERANCE_MS = 5 * 60 * 1000; // เผื่อความคลาดเคลื่อนตอนเทียบ preset

function toDateInputValue(iso) {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 10);
}

export function makePresetRange(ms) {
  const to = new Date();
  const from = new Date(to.getTime() - ms);
  return { from: from.toISOString(), to: to.toISOString() };
}

export default function DateRangeBar({ from, to, onChange }) {
  const theme = useTheme();
  const { background, divider, text } = theme.palette;

  // หา preset ที่ตรงกับช่วงเวลาปัจจุบัน (ถ้าไม่ตรงเลย = โหมดกำหนดเอง)
  const activePreset = React.useMemo(() => {
    if (!from || !to) return null;
    const spanMs = new Date(to).getTime() - new Date(from).getTime();
    const nowDiffMs = Date.now() - new Date(to).getTime();
    if (Math.abs(nowDiffMs) > TOLERANCE_MS) return null; // "ถึง" ไม่ใช่ตอนนี้ = กำหนดเอง
    const match = PRESETS.find((p) => Math.abs(spanMs - p.ms) < TOLERANCE_MS);
    return match ? match.key : null;
  }, [from, to]);

  const handlePreset = (key) => {
    if (!key) return;
    const preset = PRESETS.find((p) => p.key === key);
    onChange(makePresetRange(preset.ms));
  };

  const handleCustomDate = (field, value) => {
    if (!value) return;
    const iso =
      field === "from"
        ? new Date(`${value}T00:00:00`).toISOString()
        : new Date(`${value}T23:59:59`).toISOString();
    onChange({ from: field === "from" ? iso : from, to: field === "to" ? iso : to });
  };

  return (
    <Box
      sx={{
        bgcolor: background.paper,
        borderRadius: `${theme.shape.borderRadius + 4}px`,
        border: `1px solid ${divider}`,
        p: { xs: 1.5, sm: 2 },
        mb: 3,
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        flexWrap: "wrap",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mr: 0.5 }}>
        <DateRangeRoundedIcon sx={{ fontSize: 18, color: text.secondary }} />
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: text.primary, whiteSpace: "nowrap" }}>
          ช่วงเวลา
        </Typography>
      </Box>

      <ToggleButtonGroup
        size="small"
        exclusive
        value={activePreset}
        onChange={(_, v) => handlePreset(v)}
      >
        {PRESETS.map((p) => (
          <ToggleButton key={p.key} value={p.key} sx={{ fontSize: 12, px: 1.5, py: 0.25 }}>
            {p.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      <Typography sx={{ fontSize: 12, color: text.secondary, mx: 0.5 }}>
        หรือกำหนดเอง:
      </Typography>

      <TextField
        size="small"
        type="date"
        label="จาก"
        value={toDateInputValue(from)}
        onChange={(e) => handleCustomDate("from", e.target.value)}
        InputLabelProps={{ shrink: true }}
        sx={{ width: 160 }}
      />
      <TextField
        size="small"
        type="date"
        label="ถึง"
        value={toDateInputValue(to)}
        onChange={(e) => handleCustomDate("to", e.target.value)}
        InputLabelProps={{ shrink: true }}
        sx={{ width: 160 }}
      />

      {activePreset === null && from && to && (
        <Typography sx={{ fontSize: 11.5, color: theme.palette.primary.main }}>
          กำหนดเอง
        </Typography>
      )}
    </Box>
  );
}
