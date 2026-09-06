// แผนที่ภาพรวมสถานี (leaflet + react-leaflet)
// หมุด: เขียว = อัปเดตภายใน 24 ชม., แดง = เกิน 24 ชม., เทา = ไม่เคยมี Observation
// รองรับ zoom/home/สลับ basemap (street/satellite)/ขยายความสูง/fullscreen
import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Divider from "@mui/material/Divider";
import { useTheme } from "@mui/material/styles";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import SatelliteAltRoundedIcon from "@mui/icons-material/SatelliteAltRounded";
import MapRoundedIcon from "@mui/icons-material/MapRounded";
import HeightRoundedIcon from "@mui/icons-material/HeightRounded";
import FullscreenRoundedIcon from "@mui/icons-material/FullscreenRounded";
import FullscreenExitRoundedIcon from "@mui/icons-material/FullscreenExitRounded";

import { timeAgoLabel } from "../utils/formatters";

const STALE_MS = 24 * 60 * 60 * 1000;
const BASE_HEIGHT = 340;
const EXPANDED_HEIGHT = 600;
const HEIGHT_TRANSITION_MS = 250;

// กรอบพิกัดคร่าว ๆ ของประเทศไทยทั้งประเทศ (SW -> NE) ใช้กับปุ่ม "หน้าแรก"
// เพื่อซูมออกไปเห็นทั้งประเทศ ไม่ว่าสถานีจะกระจุกตัวอยู่แถวไหนก็ตาม
const THAILAND_BOUNDS = [
  [5.6, 97.3],
  [20.6, 105.7],
];

// street = OpenStreetMap, satellite = Esri World Imagery + เลเยอร์ label
const BASEMAPS = {
  street: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution:
      "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerographics, IGN, IGP, UPR-EGP, and the GIS User Community",
    // เลเยอร์ label (ชื่อเมือง/ถนน) ซ้อนทับภาพถ่ายดาวเทียม เพื่อให้อ่านบริบท
    // ตำแหน่งได้ง่ายขึ้น เหมือนโหมด Hybrid ของ Google Maps
    labelsUrl:
      "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
  },
};

function makeIcon(color, active) {
  const size = active ? 20 : 14;
  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 0 0 2px ${color}66;"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function getStationLatLng(thing) {
  const coords = thing.Locations?.[0]?.location?.coordinates;
  return coords ? [coords[1], coords[0]] : null;
}

function getLatestTime(thing) {
  return (thing.Datastreams || [])
    .map((ds) => ds.Observations?.[0]?.phenomenonTime)
    .filter(Boolean)
    .sort()
    .reverse()[0];
}

// Fullscreen API + fallback แบบ vendor-prefixed (Safari/IE)
function getFullscreenElement() {
  return (
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.msFullscreenElement ||
    null
  );
}

function requestFullscreen(el) {
  const fn =
    el.requestFullscreen ||
    el.webkitRequestFullscreen ||
    el.msRequestFullscreen;
  if (fn) fn.call(el);
}

function exitFullscreen() {
  const fn =
    document.exitFullscreen ||
    document.webkitExitFullscreen ||
    document.msExitFullscreen;
  if (fn) fn.call(document);
}

// ปรับมุมมองแผนที่ให้เห็นทุกหมุดพอดีตอนโหลดครั้งแรก
function FitAllStations({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 12);
    } else {
      map.fitBounds(L.latLngBounds(points), { padding: [30, 30] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

// เลื่อนแผนที่ไปหาสถานีที่ถูกเลือก (จาก dropdown หรือคลิกการ์ด)
function FlyToSelected({ point }) {
  const map = useMap();
  useEffect(() => {
    if (point) map.flyTo(point, 13, { duration: 0.6 });
  }, [point, map]);
  return null;
}

// เรียก map.invalidateSize() หลัง container เปลี่ยนขนาด (ขยาย/ย่อ/fullscreen)
// หน่วงเวลาให้พ้นระยะ CSS transition ของความสูงก่อน ไม่งั้นจะวัดขนาดกล่อง
// ผิดตั้งแต่ตอนที่ยังเปลี่ยนขนาดไม่เสร็จ
function MapResizeHandler({ resizeKey }) {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), HEIGHT_TRANSITION_MS + 10);
    return () => clearTimeout(t);
  }, [resizeKey, map]);
  return null;
}

// ส่ง instance ของ Leaflet map ออกมาให้ component แม่ใช้งาน (ปุ่ม zoom/home
// custom ที่วาดด้วย MUI อยู่นอก <MapContainer> จึงต้องได้ map instance มาจาก
// ตรงนี้แทนการใช้ useMap() ตรง ๆ)
function MapInstanceSetter({ onReady }) {
  const map = useMap();
  useEffect(() => {
    onReady(map);
  }, [map, onReady]);
  return null;
}

export default function StationsMap({
  things,
  selectedStationId,
  onSelectStation,
}) {
  const theme = useTheme();
  const {
    divider,
    success,
    error: errorColor,
    text,
    background,
  } = theme.palette;

  const [isExpanded, setIsExpanded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [basemap, setBasemap] = useState("street"); // "street" | "satellite"
  const [mapInstance, setMapInstance] = useState(null);
  const wrapperRef = useRef(null);

  // ซิงก์ state กับสถานะ fullscreen จริงของเบราว์เซอร์ เผื่อผู้ใช้กด Esc
  // ออกจาก fullscreen เองโดยไม่ผ่านปุ่มของเรา
  useEffect(() => {
    const handleChange = () => {
      setIsFullscreen(getFullscreenElement() === wrapperRef.current);
    };
    document.addEventListener("fullscreenchange", handleChange);
    document.addEventListener("webkitfullscreenchange", handleChange);
    document.addEventListener("msfullscreenchange", handleChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleChange);
      document.removeEventListener("webkitfullscreenchange", handleChange);
      document.removeEventListener("msfullscreenchange", handleChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!wrapperRef.current) return;
    if (getFullscreenElement()) {
      exitFullscreen();
    } else {
      requestFullscreen(wrapperRef.current);
    }
  };

  const toggleBasemap = () =>
    setBasemap((b) => (b === "street" ? "satellite" : "street"));

  const handleZoomIn = () => mapInstance?.zoomIn();
  const handleZoomOut = () => mapInstance?.zoomOut();
  // ปุ่ม "หน้าแรก" — ซูมออกไปดูภาพรวมทั้งประเทศไทย ไม่ผูกกับตำแหน่งสถานี
  // (ต่างจาก FitAllStations ที่ fit เฉพาะขอบเขตของหมุดสถานีตอนโหลดครั้งแรก)
  const handleGoHome = () =>
    mapInstance?.fitBounds(THAILAND_BOUNDS, { padding: [20, 20] });

  const points = things.map(getStationLatLng).filter(Boolean);
  const selectedThing = things.find(
    (t) => String(t["@iot.id"]) === String(selectedStationId),
  );
  const selectedPoint = selectedThing ? getStationLatLng(selectedThing) : null;

  if (points.length === 0) {
    return (
      <Box
        sx={{
          border: `1px solid ${divider}`,
          borderRadius: `${theme.shape.borderRadius + 2}px`,
          p: 3,
          textAlign: "center",
        }}
      >
        <Typography sx={{ fontSize: 13, color: text.secondary }}>
          ยังไม่มีข้อมูลพิกัดสถานีให้แสดงบนแผนที่
        </Typography>
      </Box>
    );
  }

  const mapHeight = isFullscreen
    ? "100vh"
    : isExpanded
      ? EXPANDED_HEIGHT
      : BASE_HEIGHT;
  const activeBasemap = BASEMAPS[basemap];

  return (
    <Box
      ref={wrapperRef}
      sx={{
        position: isFullscreen ? "fixed" : "relative",
        top: isFullscreen ? 0 : "auto",
        left: isFullscreen ? 0 : "auto",
        width: isFullscreen ? "100vw" : "100%",
        borderRadius: isFullscreen ? 0 : `${theme.shape.borderRadius + 2}px`,
        overflow: "hidden",
        border: isFullscreen ? "none" : `1px solid ${divider}`,
        height: mapHeight,
        transition: `height ${HEIGHT_TRANSITION_MS}ms ease`,
        bgcolor: background.paper,
        "& .leaflet-container": { height: "100%", width: "100%" },
      }}
    >
      {/* ปุ่ม zoom/home/สลับ basemap (มุมซ้ายบน) แทนปุ่ม default ของ Leaflet */}
      <Box
        sx={{
          position: "absolute",
          top: 10,
          left: 10,
          zIndex: 1200,
          display: "flex",
          flexDirection: "column",
          borderRadius: "10px",
          overflow: "hidden",
          border: `1px solid ${divider}`,
          boxShadow: "0 2px 8px rgba(15, 23, 42, 0.14)",
          bgcolor: background.paper,
        }}
      >
        <Tooltip
          title="ซูมเข้า"
          placement="right"
          slotProps={{
            tooltip: {
              sx: {
                bgcolor: theme.palette.primary.main,
                borderRadius: 50,
                fontWeight: 400,
              },
            },
          }}
        >
          <IconButton
            size="small"
            onClick={handleZoomIn}
            sx={{
              borderRadius: 0,
              "&:hover": { bgcolor: `${theme.palette.primary.main}12` },
            }}
          >
            <AddRoundedIcon sx={{ fontSize: 18, color: text.secondary }} />
          </IconButton>
        </Tooltip>
        <Divider />

        <Tooltip
          title="ซูมออก"
          placement="right"
          slotProps={{
            tooltip: {
              sx: {
                bgcolor: theme.palette.primary.main,
                borderRadius: 50,
                fontWeight: 400,
              },
            },
          }}
        >
          <IconButton
            size="small"
            onClick={handleZoomOut}
            sx={{
              borderRadius: 0,
              "&:hover": { bgcolor: `${theme.palette.primary.main}12` },
            }}
          >
            <RemoveRoundedIcon sx={{ fontSize: 18, color: text.secondary }} />
          </IconButton>
        </Tooltip>
        <Divider />
        <Tooltip
          title="ทั้งประเทศ"
          placement="right"
          slotProps={{
            tooltip: {
              sx: {
                bgcolor: theme.palette.primary.main,
                borderRadius: 50,
                fontWeight: 400,
              },
            },
          }}
        >
          <IconButton
            size="small"
            onClick={handleGoHome}
            sx={{
              borderRadius: 0,
              "&:hover": { bgcolor: `${theme.palette.primary.main}12` },
            }}
          >
            <HomeRoundedIcon sx={{ fontSize: 18, color: text.secondary }} />
          </IconButton>
        </Tooltip>
        <Divider />
        <Tooltip
          title={basemap === "street" ? "ภาพถ่ายดาวเทียม" : "แผนที่เริ่มต้น"}
          placement="right"
          slotProps={{
            tooltip: {
              sx: {
                bgcolor: theme.palette.primary.main,
                borderRadius: 50,
                fontWeight: 400,
              },
            },
          }}
        >
          <IconButton
            size="small"
            onClick={toggleBasemap}
            sx={{
              borderRadius: 0,
              "&:hover": { bgcolor: `${theme.palette.primary.main}12` },
            }}
          >
            {basemap === "street" ? (
              <SatelliteAltRoundedIcon
                sx={{ fontSize: 18, color: text.secondary }}
              />
            ) : (
              <MapRoundedIcon sx={{ fontSize: 18, color: text.secondary }} />
            )}
          </IconButton>
        </Tooltip>
      </Box>

      {/* ปุ่มขยายความสูง/fullscreen (มุมขวาบน) */}
      <Box
        sx={{
          position: "absolute",
          top: 10,
          right: 10,
          zIndex: 1200,
          display: "flex",
          gap: 0.75,
        }}
      >
        <Tooltip
          title={isExpanded ? "ย่อแผนที่กลับขนาดเดิม" : "ขยายแผนที่ให้สูงขึ้น"}
          slotProps={{
            tooltip: {
              sx: {
                bgcolor: theme.palette.primary.main,
                borderRadius: 50,
                fontWeight: 400,
              },
            },
          }}
        >
          <IconButton
            size="small"
            onClick={() => setIsExpanded((v) => !v)}
            sx={{
              bgcolor: background.paper,
              border: `1px solid ${divider}`,
              boxShadow: "0 2px 8px rgba(15, 23, 42, 0.14)",
              "&:hover": {
                bgcolor: background.paper,
                borderColor: theme.palette.primary.main,
              },
            }}
          >
            <HeightRoundedIcon sx={{ fontSize: 18, color: text.secondary }} />
          </IconButton>
        </Tooltip>
        <Tooltip
          title={isFullscreen ? "ออกจากโหมดเต็มจอ" : "ดูแผนที่แบบเต็มจอ"}
          slotProps={{
            tooltip: {
              sx: {
                bgcolor: theme.palette.primary.main,
                borderRadius: 50,
                fontWeight: 400,
              },
            },
          }}
        >
          <IconButton
            size="small"
            onClick={toggleFullscreen}
            sx={{
              bgcolor: background.paper,
              border: `1px solid ${divider}`,
              boxShadow: "0 2px 8px rgba(15, 23, 42, 0.14)",
              "&:hover": {
                bgcolor: background.paper,
                borderColor: theme.palette.primary.main,
              },
            }}
          >
            {isFullscreen ? (
              <FullscreenExitRoundedIcon
                sx={{ fontSize: 18, color: text.secondary }}
              />
            ) : (
              <FullscreenRoundedIcon
                sx={{ fontSize: 18, color: text.secondary }}
              />
            )}
          </IconButton>
        </Tooltip>
      </Box>

      <MapContainer
        center={points[0]}
        zoom={7}
        scrollWheelZoom
        zoomControl={false}
      >
        <TileLayer
          // key เปลี่ยนตาม basemap เพื่อบังคับ remount TileLayer ตอนสลับ url
          // (react-leaflet ไม่ได้ diff การเปลี่ยน url prop ให้เสมอไป)
          key={basemap}
          attribution={activeBasemap.attribution}
          url={activeBasemap.url}
        />
        {basemap === "satellite" && (
          <TileLayer url={BASEMAPS.satellite.labelsUrl} pane="overlayPane" />
        )}
        <FitAllStations points={points} />
        {selectedPoint && <FlyToSelected point={selectedPoint} />}
        <MapResizeHandler resizeKey={`${isExpanded}-${isFullscreen}`} />
        <MapInstanceSetter onReady={setMapInstance} />

        {things.map((t) => {
          const position = getStationLatLng(t);
          if (!position) return null;

          const latest = getLatestTime(t);
          // eslint-disable-next-line react-hooks/purity -- สีหมุดสะท้อนความ stale เทียบเวลาปัจจุบัน ณ ตอน render โดยตั้งใจ
          const isStale = latest ? Date.now() - new Date(latest).getTime() > STALE_MS : true;
          const color = !latest
            ? theme.palette.grey?.[500] || "#9e9e9e"
            : isStale
              ? errorColor.main
              : success.main;
          const isActive = String(t["@iot.id"]) === String(selectedStationId);

          return (
            <Marker
              key={t["@iot.id"]}
              position={position}
              icon={makeIcon(color, isActive)}
              eventHandlers={{
                click: () => onSelectStation(String(t["@iot.id"])),
              }}
            >
              <Popup>
                <strong>{t.name}</strong>
                <br />
                {(t.Datastreams || []).length} Datastreams
                <br />
                อัปเดต {timeAgoLabel(latest)}
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </Box>
  );
}
