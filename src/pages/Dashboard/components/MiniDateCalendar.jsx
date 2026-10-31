// ปฏิทินเลือกวันเดียว (UTC-based) ตาม theme tokens — ใช้เป็นปฏิทินของช่อง
// "เริ่มต้น" หรือ "สิ้นสุด" ทีละช่อง โดยแสดงแถบช่วงที่เลือกไว้ (rangeFrom–rangeTo) ให้เห็นบริบท
// เดือนที่แสดง (viewMonth) ควบคุมจากภายนอก เพื่อให้กระโดดตามค่าที่พิมพ์ในช่องได้
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";

import {
  startOfMonthUTC,
  addMonthsUTC,
  isSameDayUTC,
  buildMonthGrid,
} from "../utils/calendarGrid";
import { toBuddhistYear } from "../utils/thaiDate";

const WEEKDAY_LABELS_TH = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const MONTH_LABELS_TH = Array.from({ length: 12 }, (_, m) =>
  new Date(Date.UTC(2000, m, 1)).toLocaleDateString("th-TH", {
    month: "long",
    timeZone: "UTC",
  }),
);

const selectSx = {
  fontSize: 13,
  fontWeight: 700,
  "& .MuiSelect-select": { py: 0.5, pl: 1, pr: "28px !important" },
  "& .MuiOutlinedInput-notchedOutline": { border: "none" },
};

// minDate/maxDate = วันแรก/วันสุดท้ายที่เลือกได้ (Date เที่ยงคืน UTC) — วันนอกช่วง
// คลิกไม่ได้ และเลื่อนเดือนออกนอกช่วงไม่ได้
export default function MiniDateCalendar({
  viewMonth,
  onViewMonthChange,
  value,
  rangeFrom,
  rangeTo,
  minDate,
  maxDate,
  anchorDate,
  onSelect,
}) {
  const theme = useTheme();
  const { primary, secondary, text } = theme.palette;

  const minMonth = minDate ? startOfMonthUTC(minDate) : null;
  const maxMonth = maxDate ? startOfMonthUTC(maxDate) : null;
  const isOutOfRange = (date) =>
    (minDate && date < minDate) || (maxDate && date > maxDate);
  const canGoPrev = !minMonth || viewMonth > minMonth;
  const canGoNext = !maxMonth || viewMonth < maxMonth;

  // ตัวเลือกปีใน dropdown = ทุกปีที่มีข้อมูล (มีปีของเดือนที่แสดงอยู่เสมอ)
  const viewYear = viewMonth.getUTCFullYear();
  const firstYear = Math.min(minDate ? minDate.getUTCFullYear() : viewYear, viewYear);
  const lastYear = Math.max(maxDate ? maxDate.getUTCFullYear() : viewYear, viewYear);
  const years = Array.from({ length: lastYear - firstYear + 1 }, (_, i) => firstYear + i);

  const goTo = (year, month) => {
    let next = new Date(Date.UTC(year, month, 1));
    if (minMonth && next < minMonth) next = minMonth;
    if (maxMonth && next > maxMonth) next = maxMonth;
    onViewMonthChange(next);
  };
  const monthDisabled = (m) => {
    const d = new Date(Date.UTC(viewYear, m, 1));
    return Boolean((minMonth && d < minMonth) || (maxMonth && d > maxMonth));
  };

  const grid = buildMonthGrid(viewMonth, anchorDate);

  return (
    <Box>
      {/* Header: เลื่อนเดือน + dropdown เดือน/ปี (พ.ศ.) */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
        <IconButton
          size="small"
          aria-label="เดือนก่อนหน้า"
          disabled={!canGoPrev}
          onClick={() => onViewMonthChange(addMonthsUTC(viewMonth, -1))}
        >
          <ChevronLeftRoundedIcon sx={{ fontSize: 20 }} />
        </IconButton>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Select
            size="small"
            value={viewMonth.getUTCMonth()}
            onChange={(e) => goTo(viewYear, e.target.value)}
            sx={selectSx}
            inputProps={{ "aria-label": "เดือน" }}
          >
            {MONTH_LABELS_TH.map((label, m) => (
              <MenuItem key={m} value={m} disabled={monthDisabled(m)} sx={{ fontSize: 13 }}>
                {label}
              </MenuItem>
            ))}
          </Select>
          <Select
            size="small"
            value={viewYear}
            onChange={(e) => goTo(e.target.value, viewMonth.getUTCMonth())}
            sx={selectSx}
            inputProps={{ "aria-label": "ปี" }}
          >
            {years.map((y) => (
              <MenuItem key={y} value={y} sx={{ fontSize: 13 }}>
                {toBuddhistYear(y)}
              </MenuItem>
            ))}
          </Select>
        </Box>
        <IconButton
          size="small"
          aria-label="เดือนถัดไป"
          disabled={!canGoNext}
          onClick={() => onViewMonthChange(addMonthsUTC(viewMonth, 1))}
        >
          <ChevronRightRoundedIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </Box>

      {/* หัวคอลัมน์วันในสัปดาห์ */}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", mb: 0.5 }}>
        {WEEKDAY_LABELS_TH.map((w) => (
          <Box
            key={w}
            sx={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: text.secondary, py: 0.5 }}
          >
            {w}
          </Box>
        ))}
      </Box>

      {/* ตารางวัน */}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
        {grid.map(({ date, inMonth, isAnchor }, idx) => {
          const isStart = isSameDayUTC(date, rangeFrom);
          const isEnd = isSameDayUTC(date, rangeTo);
          const isEndpoint = isStart || isEnd;
          const isSelected = isSameDayUTC(date, value);
          const inRange =
            !isEndpoint && rangeFrom && rangeTo && date > rangeFrom && date < rangeTo;
          const outOfRange = isOutOfRange(date);

          return (
            <Box
              key={idx}
              onClick={outOfRange ? undefined : () => onSelect(date)}
              aria-disabled={outOfRange || undefined}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: 34,
                cursor: outOfRange ? "not-allowed" : "pointer",
                bgcolor: inRange ? `${primary.main}1f` : "transparent",
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
                    : !inMonth || outOfRange
                      ? text.disabled
                      : text.primary,
                  textDecoration: outOfRange && inMonth ? "line-through" : "none",
                  opacity: outOfRange ? 0.55 : 1,
                  bgcolor: isEndpoint ? primary.main : "transparent",
                  // ปลายช่วงที่เป็นของช่องที่กำลังแก้อยู่ มีวงแหวนเพิ่มให้รู้ว่าคลิกแล้วจะเปลี่ยนตัวไหน
                  boxShadow: isSelected ? `0 0 0 2px ${theme.palette.background.paper}, 0 0 0 4px ${primary.main}` : "none",
                  border: isAnchor && !isEndpoint ? `1.5px solid ${secondary.main}` : "1.5px solid transparent",
                  transition: "background-color 0.12s ease",
                  "&:hover": outOfRange
                    ? {}
                    : { bgcolor: isEndpoint ? primary.dark : `${primary.main}24` },
                }}
              >
                {date.getUTCDate()}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
