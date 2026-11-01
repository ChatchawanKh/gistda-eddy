// เนื้อหา popup ของหมุดสถานีบนแผนที่ (react-leaflet render ผ่าน portal จึงใช้ theme ของ MUI ได้)
// ข้อมูลมาจาก FROST ทั้งหมด: Thing (ชื่อ/properties), Location.name, Datastreams และ Observation ล่าสุด
// แสดงเฉพาะ field ที่มีค่า — กรอบ popup ของ Leaflet ปรับไว้ที่ utils/stationPopupStyles.js
import { alpha, useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import ApartmentRoundedIcon from "@mui/icons-material/ApartmentRounded";
import SensorsRoundedIcon from "@mui/icons-material/SensorsRounded";
import UpdateRoundedIcon from "@mui/icons-material/UpdateRounded";
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";
import TerrainRoundedIcon from "@mui/icons-material/TerrainRounded";
import NorthEastRoundedIcon from "@mui/icons-material/NorthEastRounded";

import { timeAgoLabel } from "../utils/formatters";

// ความสูง popup = พอดีเนื้อหา (max-content) แต่ไม่เกิน 265px
// — กล่องเนื้อหาสูงสุด 263 + เส้นขอบบน/ล่างของ .leaflet-popup-content-wrapper อย่างละ 1
const POPUP_MAX_HEIGHT = 265;
const CONTENT_MAX_HEIGHT = POPUP_MAX_HEIGHT - 2;

// โลโก้ Google "G" สี่สี
function GoogleIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden focusable="false">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  const theme = useTheme();
  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.5, minWidth: 0 }}>
      <Icon sx={{ fontSize: 12, color: theme.palette.primary.main, flexShrink: 0, mt: "2px" }} />
      <Typography
        sx={{
          fontSize: 10.5,
          lineHeight: 1.45,
          color: theme.palette.text.secondary,
          flexShrink: 0,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </Typography>
      {/* ค่ายาว (เช่นชื่อหน่วยงาน) ขึ้นบรรทัดใหม่ ไม่ตัดเป็น … */}
      <Typography
        sx={{
          fontSize: 11,
          lineHeight: 1.45,
          fontWeight: 500,
          color: theme.palette.text.primary,
          ml: "auto",
          textAlign: "right",
          fontVariantNumeric: "tabular-nums",
          wordBreak: "break-word",
          minWidth: 0,
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

// status = { color, label } — สีเดียวกับหมุด (เขียว/แดง/เทา)
export default function StationPopup({ thing, position, latest, status }) {
  const theme = useTheme();
  const locationName = thing.Locations?.[0]?.name;
  const institute = thing.properties?.institute;
  const elevation = thing.properties?.elevation_m;
  const [lat, lng] = position;
  // Google Maps URLs (api=1): เปิดเส้นทางจากตำแหน่งปัจจุบันของผู้ใช้ไปยังสถานี
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  return (
    <Box
      sx={{
        width: 208,
        height: "max-content",
        maxHeight: CONTENT_MAX_HEIGHT,
        boxSizing: "border-box",
        p: 1.25,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* หัว: ชื่อสถานี + สถานะ (จุดสีเดียวกับหมุด) */}
      <Box sx={{ pr: 2.5 /* เว้นที่ให้ปุ่มปิดของ Leaflet */ }}>
        <Typography
          sx={{
            fontSize: 12.5,
            fontWeight: 600,
            color: theme.palette.text.head, // สีหัวข้อของ Theme (น้ำเงิน) เหมือนหัวหน้า Dashboard
            lineHeight: 1.3,
            wordBreak: "break-word",
          }}
        >
          {thing.name}
        </Typography>
        {locationName && (
          <Typography
            sx={{
              fontSize: 10.5,
              lineHeight: 1.45,
              color: theme.palette.text.secondary,
              wordBreak: "break-word",
            }}
          >
            {locationName}
          </Typography>
        )}
        <Box
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 0.5,
            mt: 0.25,
            fontSize: 10,
            lineHeight: 1.45,
            fontWeight: 600,
            color: status.color,
          }}
        >
          <Box
            sx={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              bgcolor: status.color,
              boxShadow: `0 0 0 2px ${alpha(status.color, 0.2)}`,
            }}
          />
          {status.label}
        </Box>
      </Box>

      <Box
        sx={{
          mt: 0.75,
          pt: 0.75,
          borderTop: `1px solid ${theme.palette.divider}`,
          display: "flex",
          flexDirection: "column",
          gap: 0.25,
        }}
      >
        {institute && <InfoRow icon={ApartmentRoundedIcon} label="หน่วยงาน" value={institute} />}
        <InfoRow
          icon={SensorsRoundedIcon}
          label="Datastreams"
          value={(thing.Datastreams || []).length}
        />
        <InfoRow icon={UpdateRoundedIcon} label="อัปเดต" value={timeAgoLabel(latest)} />
        <InfoRow
          icon={PlaceRoundedIcon}
          label="พิกัด"
          value={`${lat?.toFixed(4)}, ${lng?.toFixed(4)}`}
        />
        {Number.isFinite(elevation) && (
          <InfoRow
            icon={TerrainRoundedIcon}
            label="ความสูง"
            value={`${elevation.toLocaleString("th-TH")} ม.`}
          />
        )}
      </Box>

      {/* ปุ่มนำทาง — && เพิ่ม specificity ให้ชนะ .leaflet-container a { color } ของ Leaflet */}
      <Box
        component="a"
        href={directionsUrl}
        target="_blank"
        rel="noopener noreferrer"
        sx={{
          "&&": {
            mt: 1,
            height: 28,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 0.625,
            borderRadius: "7px",
            border: `1px solid ${theme.palette.divider}`,
            bgcolor: theme.palette.background.paper,
            color: theme.palette.text.primary,
            fontSize: 11,
            fontWeight: 500,
            textDecoration: "none",
            transition: "background-color 120ms ease, border-color 120ms ease",
          },
          "&&:hover": {
            bgcolor: alpha(theme.palette.primary.main, 0.05),
            borderColor: alpha(theme.palette.primary.main, 0.4),
          },
        }}
      >
        <GoogleIcon size={13} />
        นำทางด้วย Google Maps
        <NorthEastRoundedIcon sx={{ fontSize: 11, color: theme.palette.text.secondary }} />
      </Box>
    </Box>
  );
}
