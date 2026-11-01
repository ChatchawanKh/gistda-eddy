// กรอบ popup ของหมุดสถานี (ใส่ใน sx ของกล่องที่ครอบแผนที่) — แทนกรอบขาวมุมโค้งเดิมของ Leaflet
// เนื้อหาข้างในอยู่ที่ components/StationPopup.jsx
import { alpha } from "@mui/material/styles";

export const STATION_POPUP_CLASS = "station-popup";

export const stationPopupSx = (theme) => ({
  [`& .${STATION_POPUP_CLASS} .leaflet-popup-content-wrapper`]: {
    p: 0,
    borderRadius: "10px",
    overflow: "hidden",
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: "0 12px 32px rgba(15, 23, 42, 0.16), 0 2px 6px rgba(15, 23, 42, 0.08)",
  },
  [`& .${STATION_POPUP_CLASS} .leaflet-popup-content`]: {
    m: 0,
    fontFamily: theme.typography.fontFamily,
    lineHeight: 1.4,
  },
  // Leaflet ใส่ .leaflet-popup-content p { margin: 1.3em 0 } ซึ่งชนะ margin 0 ของ Typography (<p>)
  // ทำให้ทุกบรรทัดห่างกันมากจนเนื้อหาล้นกรอบ
  [`& .${STATION_POPUP_CLASS} .leaflet-popup-content p`]: {
    m: 0,
  },
  [`& .${STATION_POPUP_CLASS} .leaflet-popup-tip`]: {
    boxShadow: "none",
    border: `1px solid ${theme.palette.divider}`,
  },
  [`& .${STATION_POPUP_CLASS} .leaflet-popup-close-button`]: {
    top: "8px",
    right: "8px",
    width: 22,
    height: 22,
    borderRadius: "6px",
    font: "400 16px/22px sans-serif",
    color: theme.palette.text.secondary,
    transition: "background-color 120ms ease",
    "&:hover": {
      bgcolor: alpha(theme.palette.text.primary, 0.06),
      color: theme.palette.text.primary,
    },
  },
});
