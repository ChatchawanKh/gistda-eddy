// src/pages/Dashboard/components/DateRangePickerModern.jsx
// Date Range Picker แบบ Modern Material Design — แทนที่ DateRangeBar.jsx เดิม
// ตามข้อกำหนด "Date Picker" ของ Insight Dashboard:
//   - แสดงเป็น Component เดียว (ปุ่ม + panel เลือกช่วงเวลา ไม่แยกเป็นหลายช่อง)
//   - มีไอคอน Calendar และแสดงช่วงวันที่ในรูปแบบอ่านง่ายบนปุ่ม
//   - รองรับ Preset: วันนี้ / เมื่อวาน / 7 วันล่าสุด / 30 วันล่าสุด / 90 วันล่าสุด /
//     เดือนนี้ / เดือนที่แล้ว / กำหนดเอง (Custom Range) ผ่านปฏิทินแบบ custom
//     (ดู MiniDateRangeCalendar.jsx) แทนปฏิทิน default ของเบราว์เซอร์
//   - ดีไซน์ตาม design tokens ของ src/theme/Theme.jsx ทั้งหมด (ใช้ theme.palette
//     ล้วน ๆ ไม่ hardcode สี) จึงรองรับ Dark/Light Theme โดยอัตโนมัติ
//   - Responsive: จอเล็กพับ panel เป็นแนวตั้งและกว้างเกือบเต็มจอ
//   - เลือกแล้วอัปเดตทันทีผ่าน onChange (React state ล้วน ๆ ไม่ reload หน้า)
import * as React from "react";
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

export default function DateRangePickerModern({ from, to, onChange, anchorDate }) {
  const theme = useTheme();
  const { background, divider, text, primary } = theme.palette;
  const isMobile = useMediaQuery("(max-width:600px)");
  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);

  // preset ผูกกับ "วันที่ล่าสุดที่มีข้อมูลจริง" (anchorDate) ไม่ใช่วันนี้จริง ๆ
  const presets = React.useMemo(() => buildDatePresets(anchorDate), [anchorDate]);
  const activeKey = React.useMemo(() => matchPreset(presets, from, to), [presets, from, to]);

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
          border: `1px solid ${divider}`,
          // ml: 0.25,
          // mr: 0.5,
          textTransform: "none",
          // fontSize: 13,
          fontWeight: 400,
          // color: text.primary,
          // borderColor: divider,
          bgcolor: background.paper,
          px: 1.5,
          py: 0.85,
          borderRadius: 0.5,
          whiteSpace: "nowrap",
          "&:hover": { borderColor: primary.main, bgcolor: background.paper },
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
              bgcolor: `${primary.main}1a`,
              px: 0.75,
              py: 0.15,
              borderRadius: "6px",
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
              borderRadius: `${theme.shape.borderRadius + 4}px`,
              boxShadow:
                theme.palette.mode === "dark"
                  ? "0 12px 32px #000000aa"
                  : "0 12px 32px #00000022",
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
              return (
                <Box
                  key={p.key}
                  onClick={() => handlePreset(p)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    px: 2,
                    py: 1,
                    fontSize: 13,
                    cursor: "pointer",
                    color: active ? primary.main : text.primary,
                    fontWeight: active ? 700 : 500,
                    bgcolor: active ? `${primary.main}12` : "transparent",
                    "&:hover": { bgcolor: active ? `${primary.main}1a` : `${text.primary}0a` },
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
              onApply={handleCalendarApply}
            />
          </Box>
        </Box>
      </Popover>
    </>
  );
}
