// src/pages/Dashboard/components/MiniDateRangeCalendar.jsx
// ปฏิทินเลือกช่วงวันที่แบบ custom — แทนที่ <input type="date"> เดิมที่เรียก
// ปฏิทิน default ของเบราว์เซอร์ขึ้นมา (หน้าตาไม่ตรง theme และไม่ responsive)
// ดีไซน์ตาม design tokens ของ src/theme/Theme.jsx โดยตรง (สี primary/secondary/
// grey, shape.borderRadius, ตัวอักษร Kanit) ผ่าน useTheme() ทั้งหมด จึงไม่ต้อง
// import BLUE/GRAY/SKY ตรง ๆ — เปลี่ยน Theme.jsx ที่เดียวก็ตามสีไปด้วยอัตโนมัติ
//
// วิธีใช้: คลิกวันแรก = จุดเริ่มต้นช่วง, คลิกวันที่สอง = จุดสิ้นสุดช่วง (ระหว่าง
// เลือกจะ hover-preview ช่วงให้เห็นก่อน) แล้วกด "ใช้ช่วงนี้" เพื่อยืนยัน
import * as React from "react";
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";

import {
  startOfMonthUTC,
  addMonthsUTC,
  isSameDayUTC,
  buildMonthGrid,
} from "../utils/calendarGrid";

const WEEKDAY_LABELS_TH = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

function toStartOfDayISO(date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function toEndOfDayISO(date) {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d.toISOString();
}

export default function MiniDateRangeCalendar({ from, to, anchorDate, onApply, onCancel }) {
  const theme = useTheme();
  const { primary, secondary, text, divider, background } = theme.palette;

  const [viewMonth, setViewMonth] = React.useState(() =>
    startOfMonthUTC(to || anchorDate || new Date())
  );
  const [draftFrom, setDraftFrom] = React.useState(() => (from ? new Date(from) : null));
  const [draftTo, setDraftTo] = React.useState(() => (to ? new Date(to) : null));
  const [hoverDate, setHoverDate] = React.useState(null);

  const grid = React.useMemo(
    () => buildMonthGrid(viewMonth, anchorDate),
    [viewMonth, anchorDate]
  );

  const monthLabel = viewMonth.toLocaleDateString("th-TH", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  // ช่วงที่จะไฮไลต์บนตาราง (รวม preview ระหว่าง hover ตอนเลือกวันที่สองอยู่)
  const previewEnd = draftTo || (draftFrom && hoverDate ? hoverDate : null);
  const rangeStart = draftFrom && previewEnd ? (draftFrom < previewEnd ? draftFrom : previewEnd) : draftFrom;
  const rangeEnd = draftFrom && previewEnd ? (draftFrom < previewEnd ? previewEnd : draftFrom) : null;

  const handleDayClick = (date) => {
    if (!draftFrom || (draftFrom && draftTo)) {
      setDraftFrom(date);
      setDraftTo(null);
      return;
    }
    if (isSameDayUTC(date, draftFrom)) {
      setDraftTo(date);
      return;
    }
    if (date < draftFrom) {
      setDraftTo(draftFrom);
      setDraftFrom(date);
    } else {
      setDraftTo(date);
    }
  };

  const handleApply = () => {
    if (!draftFrom) return;
    const endDate = draftTo || draftFrom;
    onApply({ from: toStartOfDayISO(draftFrom), to: toEndOfDayISO(endDate) });
  };

  const handleClear = () => {
    setDraftFrom(null);
    setDraftTo(null);
    setHoverDate(null);
  };

  const rangeLabel = !draftFrom
    ? "เลือกวันที่เริ่มต้น"
    : !draftTo
    ? `${draftFrom.toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })} — เลือกวันที่สิ้นสุด`
    : `${draftFrom.toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })} – ${draftTo.toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })}`;

  return (
    <Box sx={{ p: 2, width: "100%" }}>
      {/* Header: เดือน/ปี + ปุ่มเลื่อนเดือน */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
        <IconButton size="small" onClick={() => setViewMonth((m) => addMonthsUTC(m, -1))}>
          <ChevronLeftRoundedIcon sx={{ fontSize: 20 }} />
        </IconButton>
        <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: text.primary }}>
          {monthLabel}
        </Typography>
        <IconButton size="small" onClick={() => setViewMonth((m) => addMonthsUTC(m, 1))}>
          <ChevronRightRoundedIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </Box>

      {/* หัวคอลัมน์วันในสัปดาห์ */}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", mb: 0.5 }}>
        {WEEKDAY_LABELS_TH.map((w) => (
          <Typography
            key={w}
            align="center"
            sx={{ fontSize: 11, fontWeight: 700, color: text.secondary, py: 0.5 }}
          >
            {w}
          </Typography>
        ))}
      </Box>

      {/* ตารางวัน */}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
        {grid.map(({ date, inMonth, isAnchor }, idx) => {
          const isStart = draftFrom && isSameDayUTC(date, draftFrom);
          const isEnd = draftTo && isSameDayUTC(date, draftTo);
          const isEndpoint = isStart || isEnd;
          const inRange =
            !isEndpoint && rangeStart && rangeEnd && date > rangeStart && date < rangeEnd;
          const isPreview = !draftTo && draftFrom && hoverDate && !isEndpoint && inRange;

          return (
            <Box
              key={idx}
              onMouseEnter={() => draftFrom && !draftTo && setHoverDate(date)}
              onClick={() => handleDayClick(date)}
              sx={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: 34,
                cursor: "pointer",
                bgcolor: inRange
                  ? isPreview
                    ? `${primary.main}14`
                    : `${primary.main}1f`
                  : "transparent",
                borderTopLeftRadius: inRange && date.getUTCDay() === 0 ? 999 : 0,
                borderBottomLeftRadius: inRange && date.getUTCDay() === 0 ? 999 : 0,
                borderTopRightRadius: inRange && date.getUTCDay() === 6 ? 999 : 0,
                borderBottomRightRadius: inRange && date.getUTCDay() === 6 ? 999 : 0,
              }}
            >
              <Box
                sx={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12.5,
                  fontWeight: isEndpoint ? 700 : 500,
                  color: isEndpoint
                    ? primary.contrastText
                    : !inMonth
                    ? text.disabled
                    : text.primary,
                  bgcolor: isEndpoint ? primary.main : "transparent",
                  border: isAnchor && !isEndpoint ? `1.5px solid ${secondary.main}` : "1.5px solid transparent",
                  transition: "background-color 0.12s ease",
                  "&:hover": {
                    bgcolor: isEndpoint ? primary.dark : `${primary.main}24`,
                  },
                }}
              >
                {date.getUTCDate()}
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* แถบสรุป + ปุ่มยืนยัน/ล้าง */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          mt: 1.5,
          pt: 1.5,
          borderTop: `1px solid ${divider}`,
        }}
      >
        <Typography sx={{ fontSize: 11.5, color: text.secondary, flex: 1 }}>
          {rangeLabel}
        </Typography>
        <Button size="small" onClick={handleClear} sx={{ fontSize: 12, color: text.secondary }}>
          ล้าง
        </Button>
        <Button
          size="small"
          variant="contained"
          disabled={!draftFrom}
          onClick={handleApply}
          sx={{ fontSize: 12, px: 1.75 }}
        >
          ใช้ช่วงนี้
        </Button>
      </Box>

      {anchorDate && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 1 }}>
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              border: `1.5px solid ${secondary.main}`,
              flexShrink: 0,
            }}
          />
          <Typography sx={{ fontSize: 10.5, color: text.secondary }}>
            = วันที่มีข้อมูลล่าสุด
          </Typography>
        </Box>
      )}
    </Box>
  );
}
