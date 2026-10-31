// Date Range Picker: ปุ่ม + Popover (คอลัมน์ preset + ช่องเริ่มต้น/สิ้นสุด + ปฏิทิน)
// จอ xs เปิดเป็น Dialog เต็มจอแทน Popover (เนื้อหาเดียวกัน)
// preset: 2 วันล่าสุด (ค่าเริ่มต้น) / 7 วันล่าสุด / 30 วันล่าสุด / ทั้งหมด
// ทุกการเลือก (preset, ปฏิทิน, พิมพ์) แก้แค่ "ค่าร่าง" — หน้าจะเปลี่ยนตามเมื่อกด "ยืนยัน"
// เท่านั้น ปิด popover โดยไม่ยืนยัน (คลิกข้างนอก / Esc / ยกเลิก) = ทิ้งค่าร่าง
import { useState, useMemo } from "react";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Popover from "@mui/material/Popover";
import Dialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";

import {
  buildDatePresets,
  matchPreset,
  formatRangeLabel,
  DEFAULT_PRESET_KEY,
  startOfDayUTC,
  endOfDayUTC,
} from "../utils/dateRangePresets";
import { startOfMonthUTC, isSameDayUTC } from "../utils/calendarGrid";
import { formatThaiDate } from "../utils/thaiDate";
import MiniDateCalendar from "./MiniDateCalendar";
import ThaiDateInput from "./ThaiDateInput";

const toDay = (iso) => (iso ? startOfDayUTC(iso) : null);

// minDate/maxDate = ช่วงที่มีข้อมูลจริง (Datastream.phenomenonTime) — preset ที่ไม่ทับ
// ช่วงนี้เลยจะถูกปิด ปฏิทินเลือกวันนอกช่วงไม่ได้ และวันที่พิมพ์นอกช่วงจะขึ้น error
export default function DateRangePickerModern({
  from,
  to,
  onChange,
  anchorDate,
  minDate,
  maxDate,
}) {
  const theme = useTheme();
  const { divider, text, primary } = theme.palette;
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  // ค่าร่างเป็น Date เที่ยงคืน UTC ของวันเริ่มต้น/สิ้นสุด
  const [draftFrom, setDraftFrom] = useState(null);
  const [draftTo, setDraftTo] = useState(null);
  const [activeField, setActiveField] = useState("from");
  const [viewMonth, setViewMonth] = useState(() => startOfMonthUTC(to || anchorDate || new Date()));

  const minDay = minDate ? startOfDayUTC(minDate) : null;
  const maxDay = maxDate ? startOfDayUTC(maxDate) : null;

  // preset ผูกกับ "วันที่ล่าสุดที่มีข้อมูลจริง" (anchorDate) ไม่ใช่วันนี้จริง ๆ
  const presets = useMemo(() => {
    const list = buildDatePresets(anchorDate);
    if (minDate && maxDate) {
      list.push({
        key: "all",
        label: "ทั้งหมด",
        range: {
          from: startOfDayUTC(minDate).toISOString(),
          to: endOfDayUTC(maxDate).toISOString(),
        },
      });
    }
    return list;
  }, [anchorDate, minDate, maxDate]);
  const appliedKey = useMemo(() => matchPreset(presets, from, to), [presets, from, to]);
  const draftKey =
    draftFrom && draftTo
      ? matchPreset(presets, draftFrom.toISOString(), endOfDayUTC(draftTo).toISOString())
      : null;
  const minMs = minDate ? new Date(minDate).getTime() : -Infinity;
  const maxMs = maxDate ? new Date(maxDate).getTime() : Infinity;
  const hasData = (p) =>
    new Date(p.range.to).getTime() >= minMs &&
    new Date(p.range.from).getTime() <= maxMs;

  const boundsError = (date) => {
    if (!date) return null;
    if (minDay && date < minDay) return `มีข้อมูลตั้งแต่ ${formatThaiDate(minDay)}`;
    if (maxDay && date > maxDay) return `มีข้อมูลถึง ${formatThaiDate(maxDay)}`;
    return null;
  };
  const fromError = boundsError(draftFrom);
  const toError =
    boundsError(draftTo) ||
    (draftFrom && draftTo && draftTo < draftFrom ? "ต้องไม่ก่อนวันเริ่มต้น" : null);
  const isValid = Boolean(draftFrom && draftTo && !fromError && !toError);
  const isUnchanged =
    isSameDayUTC(draftFrom, toDay(from)) && isSameDayUTC(draftTo, toDay(to));

  const showMonthOf = (date) => {
    if (date && !boundsError(date)) setViewMonth(startOfMonthUTC(date));
  };

  const handleOpen = (e) => {
    const f = toDay(from);
    const t = toDay(to);
    setDraftFrom(f);
    setDraftTo(t);
    setActiveField("from");
    setViewMonth(startOfMonthUTC(f || anchorDate || new Date()));
    setAnchorEl(e.currentTarget);
  };
  const handleClose = () => setAnchorEl(null);

  const handleConfirm = () => {
    if (!isValid) return;
    if (!isUnchanged) {
      onChange({
        from: draftFrom.toISOString(),
        to: endOfDayUTC(draftTo).toISOString(),
      });
    }
    handleClose();
  };

  const handlePreset = (preset) => {
    const f = toDay(preset.range.from);
    const t = toDay(preset.range.to);
    setDraftFrom(f);
    setDraftTo(t);
    showMonthOf(activeField === "to" ? t : f);
  };

  // เลือกวันเริ่มต้นแล้วไปต่อที่ช่องสิ้นสุดเลย — ถ้าวันเริ่มต้นใหม่เลยวันสิ้นสุดเดิม
  // ให้ล้างวันสิ้นสุดทิ้ง (แทนการบังคับให้ผู้ใช้ไปแก้วันสิ้นสุดก่อน)
  const handleCalendarSelect = (date) => {
    if (activeField === "from") {
      setDraftFrom(date);
      if (draftTo && date > draftTo) setDraftTo(null);
      setActiveField("to");
    } else {
      setDraftTo(date);
    }
  };

  const handleFieldFocus = (field) => {
    setActiveField(field);
    showMonthOf(field === "from" ? draftFrom : draftTo);
  };

  // ปฏิทินของช่องสิ้นสุดเลือกวันก่อนวันเริ่มต้นไม่ได้
  const calendarMin =
    activeField === "to" && draftFrom && !fromError && (!minDay || draftFrom > minDay)
      ? draftFrom
      : minDay;

  // เนื้อหา: preset + ช่องวันที่ + ปฏิทิน / แถบล่าง — ใช้ร่วมกันทั้ง Popover และ Dialog
  const body = (
    <Box sx={{ display: "flex", flexDirection: isMobile ? "column" : "row" }}>
      {/* คอลัมน์ preset — คลิกแล้วเติมค่าลงช่อง ยังไม่ใช้จริงจนกดยืนยัน */}
      <Box
        sx={{
          width: isMobile ? "100%" : 170,
          flexShrink: 0,
          borderRight: isMobile ? "none" : `1px solid ${divider}`,
          borderBottom: isMobile ? `1px solid ${divider}` : "none",
          py: 1,
          ...(isMobile && { display: "flex", flexWrap: "wrap", gap: 0.5, px: 1 }),
        }}
      >
        {presets.map((p) => {
          const active = draftKey === p.key;
          const disabled = !hasData(p);
          return (
            <Box
              key={p.key}
              onClick={disabled ? undefined : () => handlePreset(p)}
              aria-disabled={disabled}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
                px: isMobile ? 1.25 : 2,
                py: isMobile ? 0.75 : 1,
                fontSize: 13,
                cursor: disabled ? "not-allowed" : "pointer",
                color: disabled
                  ? text.disabled
                  : active
                    ? primary.main
                    : text.primary,
                fontWeight: active ? 700 : 500,
                bgcolor: active ? `${primary.main}12` : "transparent",
                borderRadius: isMobile ? 999 : 0,
                border: isMobile ? `1px solid ${active ? primary.main : divider}` : "none",
                "&:hover": disabled
                  ? {}
                  : { bgcolor: active ? `${primary.main}1a` : `${text.primary}0a` },
              }}
            >
              {p.label}
              {active && !isMobile && <CheckRoundedIcon sx={{ fontSize: 16 }} />}
            </Box>
          );
        })}
      </Box>

      {/* ช่องเริ่มต้น/สิ้นสุด + ปฏิทินของช่องที่กำลังแก้ */}
      <Box sx={{ flex: 1, minWidth: 0, p: 2 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, mb: 1 }}>
          <ThaiDateInput
            label="วันที่เริ่มต้น"
            value={draftFrom}
            onChange={(d) => {
              setDraftFrom(d);
              showMonthOf(d);
            }}
            onFocus={() => handleFieldFocus("from")}
            onEnter={handleConfirm}
            active={activeField === "from"}
            error={fromError}
          />
          <ArrowForwardRoundedIcon sx={{ fontSize: 18, color: text.secondary, mt: 1.1 }} />
          <ThaiDateInput
            label="วันที่สิ้นสุด"
            value={draftTo}
            onChange={(d) => {
              setDraftTo(d);
              showMonthOf(d);
            }}
            onFocus={() => handleFieldFocus("to")}
            onEnter={handleConfirm}
            active={activeField === "to"}
            error={toError}
          />
        </Box>

        <MiniDateCalendar
          viewMonth={viewMonth}
          onViewMonthChange={setViewMonth}
          value={activeField === "from" ? draftFrom : draftTo}
          rangeFrom={draftFrom}
          rangeTo={draftTo}
          minDate={calendarMin}
          maxDate={maxDay}
          anchorDate={anchorDate}
          onSelect={handleCalendarSelect}
        />

        {anchorDate && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 1 }}>
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                border: `1.5px solid ${theme.palette.secondary.main}`,
                flexShrink: 0,
              }}
            />
            <Typography sx={{ fontSize: 10.5, color: text.secondary }}>
              = วันที่มีข้อมูลล่าสุด
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );

  const footer = (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 1,
        px: 2,
        py: 1.25,
        // Dialog เต็มจอ: เว้นแถบ home indicator ของ iOS
        pb: isMobile ? "calc(10px + env(safe-area-inset-bottom))" : 1.25,
        borderTop: `1px solid ${divider}`,
      }}
    >
      <Typography sx={{ fontSize: 11.5, color: text.secondary, flex: 1, minWidth: 180 }}>
        {minDay && maxDay
          ? `ข้อมูลที่มี: ${formatThaiDate(minDay)} – ${formatThaiDate(maxDay)}`
          : "ไม่พบช่วงเวลาที่มีข้อมูล"}
      </Typography>
      <Button size="small" onClick={handleClose} sx={{ fontSize: 12, color: text.secondary }}>
        ยกเลิก
      </Button>
      <Button
        size="small"
        variant="contained"
        disabled={!isValid}
        onClick={handleConfirm}
        sx={{ fontSize: 12, px: 2 }}
      >
        ยืนยัน
      </Button>
    </Box>
  );

  return (
    <>
      <Button
        onClick={handleOpen}
        variant="outlined"
        startIcon={<CalendarMonthRoundedIcon sx={{ fontSize: 18 }} />}
        endIcon={<KeyboardArrowDownRoundedIcon sx={{ fontSize: 18 }} />}
        sx={{
          fontSize: 13,
          color: text.secondary,
          fontWeight: 400,
          px: 1.5,
          height: theme.custom.filterControlHeight,
          bgcolor: theme.palette.background.paper,
          whiteSpace: "nowrap",
        }}
      >
        {formatRangeLabel(from, to)}
        {(appliedKey === null || appliedKey === DEFAULT_PRESET_KEY) && (
          <Box
            component="span"
            sx={{
              ml: 1,
              fontSize: 10.5,
              fontWeight: 700,
              color: primary.main,
              bgcolor: theme.palette.action.hover,
              px: 0.75,
              py: 0.15,
              borderRadius: `${theme.custom.radiusSm}px`,
            }}
          >
            {appliedKey === null ? "กำหนดเอง" : "ค่าเริ่มต้น"}
          </Box>
        )}
      </Button>

      {isMobile ? (
        // จอ xs: เปิดเต็มจอ ปฏิทินและปุ่มยืนยันไม่ถูกบีบหรือตกขอบจอ
        <Dialog
          fullScreen
          open={open}
          onClose={handleClose}
          aria-labelledby="date-range-dialog-title"
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              pl: 2,
              pr: 1,
              py: 1,
              borderBottom: `1px solid ${divider}`,
            }}
          >
            <Typography
              id="date-range-dialog-title"
              sx={{ flex: 1, fontSize: 15, fontWeight: 600, color: text.head }}
            >
              เลือกช่วงเวลา
            </Typography>
            <IconButton onClick={handleClose} aria-label="ปิด">
              <CloseRoundedIcon />
            </IconButton>
          </Box>
          <Box sx={{ flex: 1, overflowY: "auto" }}>{body}</Box>
          {footer}
        </Dialog>
      ) : (
        <Popover
          open={open}
          anchorEl={anchorEl}
          onClose={handleClose}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
          slotProps={{
            paper: {
              sx: {
                mt: 0.75,
                border: `1px solid ${divider}`,
                borderRadius: `${theme.shape.borderRadius}px`,
                boxShadow: theme.shadows[6],
                width: 600,
                maxWidth: "97vw",
              },
            },
          }}
        >
          {body}
          {footer}
        </Popover>
      )}
    </>
  );
}
