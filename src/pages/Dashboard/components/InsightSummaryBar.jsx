// การ์ดสรุปสถิติของตัวแปรหลัก (สไตล์ minimal: หัวข้อเล็ก / ตัวเลขใหญ่ / chip
// คำอธิบาย + sparkline ด้านขวา) — ทุกค่าและทุกกราฟคำนวณจาก Observation ในช่วง
// เวลาที่เลือกเท่านั้น ไม่มีการเปรียบเทียบกับช่วงอื่นที่หน้าเว็บไม่มีข้อมูล
import { useId } from "react";
import { alpha, useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Skeleton from "@mui/material/Skeleton";
import UpdateRoundedIcon from "@mui/icons-material/UpdateRounded";
import NorthEastRoundedIcon from "@mui/icons-material/NorthEastRounded";
import SouthEastRoundedIcon from "@mui/icons-material/SouthEastRounded";
import EastRoundedIcon from "@mui/icons-material/EastRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";

import { formatUtcLabel } from "../utils/insightSummary";

const SPARK_BUCKETS = 40;

// ย่อข้อมูลเหลือไม่เกิน SPARK_BUCKETS จุด (แบ่งตามลำดับเวลา) — mode กำหนดวิธีรวม
// แต่ละช่วง: avg = ค่าเฉลี่ย, max/min = ค่าสูงสุด/ต่ำสุดของช่วง (จุดสุดขั้วจริงจึง
// ไม่หายไปตอนย่อ ใช้ไฮไลต์ในการ์ดค่าสูงสุด/ต่ำสุดได้ตรง)
function bucketize(values, mode) {
  if (values.length <= SPARK_BUCKETS) return values;
  const out = [];
  const size = values.length / SPARK_BUCKETS;
  for (let i = 0; i < SPARK_BUCKETS; i += 1) {
    const chunk = values.slice(Math.floor(i * size), Math.floor((i + 1) * size));
    if (chunk.length === 0) continue;
    if (mode === "max") out.push(Math.max(...chunk));
    else if (mode === "min") out.push(Math.min(...chunk));
    else out.push(chunk.reduce((a, b) => a + b, 0) / chunk.length);
  }
  return out;
}

// จำนวนข้อมูลต่อวัน (วันตามสตริงเวลา UTC ที่ FROST ส่งมา)
function countPerDay(rows) {
  const byDay = new Map();
  rows.forEach((r) => {
    const day = String(r.phenomenonTime).slice(0, 10);
    byDay.set(day, (byDay.get(day) || 0) + 1);
  });
  return Array.from(byDay.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([, n]) => n);
}

function shortUtc(iso) {
  if (!iso) return "-";
  return `${new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  })} UTC`;
}

// sparkline แบบ SVG ยืดเต็มกล่อง (preserveAspectRatio none) ส่วนจุดไฮไลต์วาดเป็น
// HTML ทับด้วยตำแหน่ง % เพื่อให้เป็นวงกลมไม่ถูกยืด
//   kind = "line" | "bars"; highlight = index ของจุดที่ต้องเน้น; refValue = เส้นประแนวนอน
function Sparkline({ values, color, kind = "line", highlight = [], refValue }) {
  const theme = useTheme();
  const gradId = useId().replace(/:/g, "");
  const W = 120;
  const H = 44;
  const PAD = 4;
  if (!values || values.length < 2) return null;

  const min = Math.min(...values, ...(refValue !== undefined ? [refValue] : []));
  const max = Math.max(...values, ...(refValue !== undefined ? [refValue] : []));
  const span = max - min || 1;
  const xAt = (i) => (i / (values.length - 1)) * W;
  const yAt = (v) => PAD + (1 - (v - min) / span) * (H - PAD * 2);

  const linePath = values
    .map((v, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(2)} ${yAt(v).toFixed(2)}`)
    .join("");

  return (
    <Box
      aria-hidden
      sx={{ position: "relative", width: "100%", height: H, flexShrink: 1 }}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        width="100%"
        height={H}
        style={{ display: "block", overflow: "visible" }}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {kind === "bars" ? (
          values.map((v, i) => {
            const bw = W / values.length;
            const top = PAD + (1 - v / (max || 1)) * (H - PAD * 2);
            return (
              <rect
                key={i}
                x={i * bw + bw * 0.18}
                y={top}
                width={bw * 0.64}
                height={H - top}
                rx="1.5"
                fill={color}
                fillOpacity={i === values.length - 1 ? 0.9 : 0.35}
              />
            );
          })
        ) : (
          <>
            <path d={`${linePath}L${W} ${H}L0 ${H}Z`} fill={`url(#${gradId})`} />
            <path
              d={linePath}
              fill="none"
              stroke={color}
              strokeWidth="1.8"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            {/* เส้นประค่าอ้างอิง (ค่าเฉลี่ย) วาดทับเส้นข้อมูลให้มองเห็นชัด */}
            {refValue !== undefined && (
              <line
                x1="0"
                x2={W}
                y1={yAt(refValue)}
                y2={yAt(refValue)}
                stroke={theme.palette.text.primary}
                strokeOpacity="0.55"
                strokeWidth="1.2"
                strokeDasharray="4 3"
                vectorEffect="non-scaling-stroke"
              />
            )}
          </>
        )}
      </svg>
      {kind === "line" &&
        highlight.map((i) => (
          <Box
            key={i}
            sx={{
              position: "absolute",
              left: `${(xAt(i) / W) * 100}%`,
              top: `${(yAt(values[i]) / H) * 100}%`,
              width: 8,
              height: 8,
              borderRadius: "50%",
              bgcolor: "background.paper",
              border: `2px solid ${color}`,
              transform: "translate(-50%, -50%)",
            }}
          />
        ))}
    </Box>
  );
}

// chip ท้ายการ์ด: ไอคอนในกรอบสี่เหลี่ยมมนสีอ่อน + ข้อความสี (ถ้ามี) + ข้อความเทา
function FooterChip({ icon: Icon, color, strong, text }) {
  const theme = useTheme();
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, minWidth: 0 }}>
      {Icon && (
        <Box
          sx={{
            width: 18,
            height: 18,
            borderRadius: "5px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: alpha(color, 0.12),
            color,
            flexShrink: 0,
          }}
        >
          <Icon sx={{ fontSize: 13 }} />
        </Box>
      )}
      {strong && (
        <Typography sx={{ fontSize: 12, fontWeight: 600, color, whiteSpace: "nowrap" }}>
          {strong}
        </Typography>
      )}
      <Typography
        sx={{
          fontSize: 12,
          color: theme.palette.text.secondary,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          minWidth: 0,
        }}
      >
        {text}
      </Typography>
    </Box>
  );
}

function KpiCard({ label, suffix, value, footer, spark, span }) {
  const theme = useTheme();
  const { text } = theme.palette;
  return (
    <Box
      sx={{
        ...theme.custom.card,
        gridColumn: `span ${span}`,
        minWidth: 0,
        px: 2.25,
        py: 2,
        display: "flex",
        flexDirection: "column",
        gap: 1.25,
      }}
    >
      <Typography
        sx={{
          fontSize: 13,
          fontWeight: 500,
          color: text.primary,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {label}
        {suffix && (
          <Box component="span" sx={{ color: text.disabled, fontWeight: 400 }}>
            {" "}
            / {suffix}
          </Box>
        )}
      </Typography>

      <Box sx={{ display: "flex", alignItems: "flex-end", gap: 1.5, minWidth: 0 }}>
        <Box sx={{ flexShrink: 0, minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: 26,
              fontWeight: 600,
              lineHeight: 1.15,
              color: text.primary,
              letterSpacing: "-0.01em",
              whiteSpace: "nowrap",
            }}
          >
            {value}
          </Typography>
        </Box>
        <Box sx={{ flex: 1, minWidth: 48, maxWidth: 140, ml: "auto" }}>{spark}</Box>
      </Box>

      {footer}
    </Box>
  );
}

export default function InsightSummaryBar({
  latestAvailableDate,
  summary,
  rows = [],
  unit,
  loading,
  emptyMessage = "ไม่มีข้อมูลของตัวแปรนี้ในช่วงเวลาที่เลือก",
}) {
  const theme = useTheme();
  const { text, primary, secondary, grey, success, error: errorColor } =
    theme.palette;
  const radius = theme.shape.borderRadius;

  const countColor = grey?.[600] || text.secondary;
  const avgColor = primary.main;
  const maxColor = primary.dark;
  const minColor = secondary.main;
  const trendColor =
    summary?.trendDirection === "up"
      ? success.main
      : summary?.trendDirection === "down"
        ? errorColor.main
        : countColor;
  const TrendIcon =
    summary?.trendDirection === "up"
      ? NorthEastRoundedIcon
      : summary?.trendDirection === "down"
        ? SouthEastRoundedIcon
        : EastRoundedIcon;

  const fmt = (v) =>
    v === undefined || v === null
      ? "-"
      : Number(v).toLocaleString("th-TH", { maximumFractionDigits: 2 });

  // ข้อมูลสำหรับ sparkline — ใช้ชุดเดียวกับที่คำนวณ summary (ค่าที่เป็นตัวเลข)
  const numericRows = rows.filter((r) => Number.isFinite(Number(r.result)));
  const values = numericRows.map((r) => Number(r.result));
  const avgLine = bucketize(values, "avg");
  const maxLine = bucketize(values, "max");
  const minLine = bucketize(values, "min");
  const argMax = (arr) => arr.indexOf(Math.max(...arr));
  const argMin = (arr) => arr.indexOf(Math.min(...arr));
  // เวลาที่เกิดค่าสูงสุด/ต่ำสุดครั้งแรกในช่วง
  const maxRow = numericRows[argMax(values)];
  const minRow = numericRows[argMin(values)];

  // grid 6 คอลัมน์: แถวบน 2 การ์ด (ใบละ 3 ช่อง) แถวล่าง 3 การ์ด (ใบละ 2 ช่อง)
  return (
    <Box>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
          gap: 1.5,
        }}
      >
        {loading ? (
          [0, 1, 2, 3, 4].map((i) => (
            <Skeleton
              key={i}
              variant="rounded"
              height={118}
              sx={{
                borderRadius: `${radius}px`,
                gridColumn: i < 2 ? "span 3" : "span 2",
              }}
            />
          ))
        ) : !summary ? (
          <Box
            sx={{
              gridColumn: "1 / -1",
              borderRadius: `${radius}px`,
              bgcolor: alpha(theme.palette.text.primary, 0.03),
              p: 2,
              textAlign: "center",
            }}
          >
            <Typography sx={{ fontSize: 12.5, color: text.secondary }}>
              {emptyMessage}
            </Typography>
          </Box>
        ) : (
          <>
            <KpiCard
              span={3}
              label="จำนวนข้อมูลทั้งหมด"
              suffix="ช่วงที่เลือก"
              value={fmt(summary.count)}
              spark={<Sparkline kind="bars" values={countPerDay(numericRows)} color={countColor} />}
              footer={<FooterChip text="จำนวนค่าที่ตรวจวัดได้" />}
            />
            <KpiCard
              span={3}
              label="แนวโน้มการเปลี่ยนแปลง"
              suffix="ช่วงที่เลือก"
              value={
                summary.trendPct === null
                  ? "-"
                  : `${summary.trendPct > 0 ? "+" : ""}${summary.trendPct.toFixed(1)}%`
              }
              spark={
                <Sparkline
                  values={avgLine}
                  color={trendColor}
                  highlight={[0, avgLine.length - 1]}
                />
              }
              footer={
                <FooterChip
                  icon={TrendIcon}
                  color={trendColor}
                  strong={`${fmt(summary.first)} → ${fmt(summary.last)}`}
                  text="ค่าแรก → ค่าล่าสุด"
                />
              }
            />
            <KpiCard
              span={2}
              label="ค่าเฉลี่ย"
              suffix={unit}
              value={fmt(summary.avg)}
              spark={<Sparkline values={avgLine} color={avgColor} refValue={summary.avg} />}
              footer={<FooterChip text="" />}
            />
            <KpiCard
              span={2}
              label="ค่าสูงสุด"
              suffix={unit}
              value={fmt(summary.max)}
              spark={
                <Sparkline values={maxLine} color={maxColor} highlight={[argMax(maxLine)]} />
              }
              footer={
                <FooterChip
                  icon={ScheduleRoundedIcon}
                  color={maxColor}
                  text={`${shortUtc(maxRow?.phenomenonTime)}`}
                />
              }
            />
            <KpiCard
              span={2}
              label="ค่าต่ำสุด"
              suffix={unit}
              value={fmt(summary.min)}
              spark={
                <Sparkline values={minLine} color={minColor} highlight={[argMin(minLine)]} />
              }
              footer={
                <FooterChip
                  icon={ScheduleRoundedIcon}
                  color={minColor}
                  text={` ${shortUtc(minRow?.phenomenonTime)}`}
                />
              }
            />
          </>
        )}
      </Box>

      {/* Latest Data banner — ต้องเห็นชัดเจนว่าข้อมูลอ้างอิงจากวันไหน */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          flexWrap: "wrap",
          bgcolor: alpha(primary.main, 0.06),
          borderRadius: `${radius}px`,
          px: 2,
          py: 1,
          mt: 2,
        }}
      >
        <UpdateRoundedIcon sx={{ fontSize: 17, color: primary.main }} />
        <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: primary.main }}>
          Latest Data:
        </Typography>
        <Typography sx={{ fontSize: 12.5, color: text.primary }}>
          {latestAvailableDate
            ? formatUtcLabel(latestAvailableDate)
            : "ไม่มีข้อมูลในระบบ"}
        </Typography>
      </Box>
    </Box>
  );
}
