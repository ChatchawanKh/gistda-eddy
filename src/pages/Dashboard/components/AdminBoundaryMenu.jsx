// เมนู "ขอบเขตการปกครอง" บนแผนที่สถานี
// สวิตช์หลักเปิด/ปิดทั้งชั้น + ชิปเลือกระดับ (จังหวัด/อำเภอ/ตำบล) + ความทึบแสงของระดับที่เปิด
// ป้ายชื่อแสดงอัตโนมัติตามซูม — ทุกค่าอ่าน/เขียนผ่าน boundaryStore แล้ว AdminBoundaryLayer วาดตามเอง
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Switch from "@mui/material/Switch";
import Chip from "@mui/material/Chip";
import Slider from "@mui/material/Slider";
import Tooltip from "@mui/material/Tooltip";
import Collapse from "@mui/material/Collapse";
import ClickAwayListener from "@mui/material/ClickAwayListener";
import { alpha, useTheme } from "@mui/material/styles";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import RadioButtonCheckedRoundedIcon from "@mui/icons-material/RadioButtonCheckedRounded";
import RadioButtonUncheckedRoundedIcon from "@mui/icons-material/RadioButtonUncheckedRounded";
import OpacityRoundedIcon from "@mui/icons-material/OpacityRounded";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import { LEVEL_NAMES_TH, LEVELS } from "admin-boundary";
import { useBoundary } from "admin-boundary/react";

import { boundaryStore } from "../utils/boundaryStore";

const SOURCE_LABEL = "ที่มา: GISTDA (กรมการปกครอง)";

// ค่าสไตล์อาจเป็น ramp [[zoom, ค่า], ...] — ใช้ค่าที่ซูมใกล้สุดเป็นตัวแทนในสัญลักษณ์
const lastValue = (v) => (Array.isArray(v) ? v.at(-1)[1] : v);

// สัญลักษณ์พื้นที่: ขอบ = สี/ลายของเส้นหลัก, พื้น = เส้นรองพื้น (ให้เส้นขาวของตำบลมองเห็นบนพื้นขาว)
function AreaSymbol({ style }) {
  return (
    <Box
      sx={{
        width: 13,
        height: 13,
        flexShrink: 0,
        borderRadius: "3px",
        border: `2px ${style.dash ? "dashed" : "solid"} ${style.color}`,
        bgcolor: alpha(style.casingColor, lastValue(style.casingOpacity) ?? 1),
      }}
    />
  );
}

function LevelSection({ level }) {
  const theme = useTheme();
  const opacity = useBoundary((s) => s.levels[level].opacity, boundaryStore);
  const st = useBoundary((s) => s.styles[level], boundaryStore);
  const name = LEVEL_NAMES_TH[level];

  return (
    <Box sx={{ py: 1, "& + &": { borderTop: `1px solid ${theme.palette.divider}` } }}>
      <Typography sx={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>{name}</Typography>
      <Typography sx={{ fontSize: 10.5, color: theme.palette.text.secondary, lineHeight: 1.4 }}>
        {SOURCE_LABEL}
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 0.5 }}>
        <AreaSymbol style={st} />
        <Typography sx={{ fontSize: 12 }}>เส้นแบ่งเขต{name}</Typography>
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
        <OpacityRoundedIcon sx={{ fontSize: 14, color: theme.palette.text.secondary }} />
        <Typography sx={{ fontSize: 11.5, color: theme.palette.text.secondary, flex: 1 }}>
          ความทึบแสง
        </Typography>
        <Box
          sx={{
            fontSize: 10.5,
            fontWeight: 600,
            color: theme.palette.primary.main,
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            borderRadius: 999,
            px: 0.75,
            lineHeight: "18px",
          }}
        >
          {opacity}%
        </Box>
        <Tooltip title="คืนค่า 100%">
          <span>
            <IconButton
              size="small"
              disabled={opacity === 100}
              onClick={() => boundaryStore.setLevelOpacity(level, 100)}
              aria-label={`คืนค่าความทึบแสง${name}`}
              sx={{ p: 0.25 }}
            >
              <ReplayRoundedIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
      <Slider
        size="small"
        min={0}
        max={100}
        step={5}
        value={opacity}
        onChange={(_, value) => boundaryStore.setLevelOpacity(level, value)}
        aria-label={`ความทึบแสง${name}`}
        sx={{ display: "block", width: "calc(100% - 12px)", mx: "6px", py: 1 }}
      />
    </Box>
  );
}

function LevelChip({ level, disabled }) {
  const visible = useBoundary((s) => s.levels[level].visible, boundaryStore);
  const Icon = visible ? RadioButtonCheckedRoundedIcon : RadioButtonUncheckedRoundedIcon;
  return (
    <Chip
      size="small"
      variant="outlined"
      color={visible ? "primary" : "default"}
      icon={<Icon />}
      label={LEVEL_NAMES_TH[level]}
      disabled={disabled}
      onClick={() => boundaryStore.toggleLevel(level)}
      aria-pressed={visible}
      sx={{ fontSize: 12, height: 26, "& .MuiChip-icon": { fontSize: 15 } }}
    />
  );
}

export default function AdminBoundaryMenu({
  enabled,
  onEnabledChange,
  // expanded = กางรายละเอียดรายระดับ (ความทึบแสง) — ยุบไว้เหลือแค่สวิตช์กับชิป
  expanded,
  onExpandedChange,
  onClose,
  anchorRef,
}) {
  const theme = useTheme();
  const levels = useBoundary((s) => s.levels, boundaryStore);
  const shownLevels = LEVELS.filter((level) => levels[level].visible);
  const canExpand = enabled && shownLevels.length > 0;

  // คลิกปุ่มเปิดเมนูเองไม่นับเป็นคลิกนอกเมนู (ปุ่มจัดการเปิด/ปิดอยู่แล้ว)
  const handleClickAway = (e) => {
    if (anchorRef?.current?.contains(e.target)) return;
    onClose();
  };

  return (
    <ClickAwayListener onClickAway={handleClickAway}>
      <Box
        role="dialog"
        aria-label="ขอบเขตการปกครอง"
        sx={{
          position: "absolute",
          top: 10,
          left: 56,
          zIndex: 1200,
          width: 248,
          maxWidth: "calc(100% - 66px)",
          // แผนที่เตี้ย (จอมือถือ) จนกล่องรายละเอียดล้น → ให้ทั้งการ์ดเลื่อนได้
          maxHeight: "calc(100% - 20px)",
          overflowY: "auto",
          ...theme.custom.floatingControl,
          p: 1.25,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
          <Typography sx={{ fontSize: 13.5, fontWeight: 600, flex: 1 }}>
            ขอบเขตการปกครอง
          </Typography>
          <Tooltip title={expanded ? "ยุบรายละเอียด" : "แสดงรายละเอียด"}>
            <span>
              <IconButton
                size="small"
                disabled={!canExpand}
                onClick={() => onExpandedChange(!expanded)}
                aria-expanded={expanded}
                aria-label={expanded ? "ยุบรายละเอียด" : "แสดงรายละเอียด"}
                sx={{ p: 0.25 }}
              >
                <ExpandMoreRoundedIcon
                  sx={{
                    fontSize: 20,
                    transform: expanded ? "rotate(180deg)" : "none",
                    transition: "transform 200ms ease",
                  }}
                />
              </IconButton>
            </span>
          </Tooltip>
          <Switch
            size="small"
            checked={enabled}
            onChange={(e) => onEnabledChange(e.target.checked)}
            slotProps={{ input: { "aria-label": "แสดงขอบเขตการปกครอง" } }}
          />
          <IconButton size="small" onClick={onClose} aria-label="ปิดเมนู" sx={{ p: 0.25 }}>
            <CloseRoundedIcon sx={{ fontSize: 18, color: theme.palette.text.secondary }} />
          </IconButton>
        </Box>

        <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 1 }}>
          {LEVELS.map((level) => (
            <LevelChip key={level} level={level} disabled={!enabled} />
          ))}
        </Box>

        <Collapse in={canExpand && expanded} unmountOnExit>
          <Box
            sx={{
              mt: 1,
              px: 1,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: "6px",
              overflowY: "auto",
              // Collapse วัดความสูงจากเนื้อหา จึงจำกัดความสูงที่กล่องนี้แทน maxHeight ของการ์ด
              maxHeight: 300,
            }}
          >
            {shownLevels.map((level) => (
              <LevelSection key={level} level={level} />
            ))}
          </Box>
        </Collapse>
      </Box>
    </ClickAwayListener>
  );
}
