// Date Range Picker: ปุ่ม + Popover (คอลัมน์ preset + ปฏิทิน custom)
// preset: วันนี้ / เมื่อวาน / 7-30-90 วันล่าสุด / เดือนนี้ / เดือนที่แล้ว / กำหนดเอง
import { useState, useMemo } from "react";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Popover from "@mui/material/Popover";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";

import { buildDatePresets, matchPreset, formatRangeLabel } from "../utils/dateRangePresets";
import MiniDateRangeCalendar from "./MiniDateRangeCalendar";

// minDate/maxDate = ช่วงที่มีข้อมูลจริง (Datastream.phenomenonTime) — preset ที่ไม่ทับ
// ช่วงนี้เลยจะถูกปิด และปฏิทินเลือกวันนอกช่วงไม่ได้
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
  const isMobile = useMediaQuery("(max-width:600px)");
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  // preset ผูกกับ "วันที่ล่าสุดที่มีข้อมูลจริง" (anchorDate) ไม่ใช่วันนี้จริง ๆ
  const presets = useMemo(() => buildDatePresets(anchorDate), [anchorDate]);
  const activeKey = useMemo(() => matchPreset(presets, from, to), [presets, from, to]);
  const minMs = minDate ? new Date(minDate).getTime() : -Infinity;
  const maxMs = maxDate ? new Date(maxDate).getTime() : Infinity;
  const hasData = (p) =>
    new Date(p.range.to).getTime() >= minMs &&
    new Date(p.range.from).getTime() <= maxMs;

  const handlePreset = (preset) => {
    onChange(preset.range);
    setAnchorEl(null);
  };

  const handleCalendarApply = (nextRange) => {
    onChange(nextRange);
    setAnchorEl(null);
  };

  return (
    <>
      <Button
        onClick={(e) => setAnchorEl(e.currentTarget)}
        variant="outlined"
        startIcon={<CalendarMonthRoundedIcon sx={{ fontSize: 18 }} />}
        endIcon={<KeyboardArrowDownRoundedIcon sx={{ fontSize: 18 }} />}
        sx={{
          fontSize: 13,
          color: text.secondary,
          fontWeight: 400,
          px: 1.5,
          py: 0.85,
          whiteSpace: "nowrap",
        }}
      >
        {formatRangeLabel(from, to)}
        {activeKey === null && (
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
            กำหนดเอง
          </Box>
        )}
      </Button>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        slotProps={{
          paper: {
            sx: {
              mt: 0.75,
              border: `1px solid ${divider}`,
              borderRadius: `${theme.shape.borderRadius}px`,
              boxShadow: theme.shadows[6],
              width: isMobile ? "94vw" : 560,
              maxWidth: "97vw",
            },
          },
        }}
      >
        <Box sx={{ display: "flex", flexDirection: isMobile ? "column" : "row" }}>
          {/* คอลัมน์ preset */}
          <Box
            sx={{
              width: isMobile ? "100%" : 190,
              flexShrink: 0,
              borderRight: isMobile ? "none" : `1px solid ${divider}`,
              borderBottom: isMobile ? `1px solid ${divider}` : "none",
              py: 1,
            }}
          >
            {presets.map((p) => {
              const active = activeKey === p.key;
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
                    px: 2,
                    py: 1,
                    fontSize: 13,
                    cursor: disabled ? "not-allowed" : "pointer",
                    color: disabled
                      ? text.disabled
                      : active
                        ? primary.main
                        : text.primary,
                    fontWeight: active ? 700 : 500,
                    bgcolor: active ? `${primary.main}12` : "transparent",
                    "&:hover": disabled
                      ? {}
                      : { bgcolor: active ? `${primary.main}1a` : `${text.primary}0a` },
                  }}
                >
                  {p.label}
                  {active && <CheckRoundedIcon sx={{ fontSize: 16 }} />}
                </Box>
              );
            })}
          </Box>

          {/* คอลัมน์ปฏิทินกำหนดเอง */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <MiniDateRangeCalendar
              from={from}
              to={to}
              anchorDate={anchorDate}
              minDate={minDate}
              maxDate={maxDate}
              onApply={handleCalendarApply}
            />
          </Box>
        </Box>
      </Popover>
    </>
  );
}
