// src/pages/Dashboard/components/StationsMap.jsx
// แผนที่ภาพรวมสถานี ใช้ leaflet + react-leaflet
// ติดตั้งก่อนใช้งาน: npm install leaflet react-leaflet
//
// หมุดสีเขียว  = มีข้อมูลอัปเดตภายใน 24 ชม.
// หมุดสีแดง    = ไม่มีข้อมูลใหม่เกิน 24 ชม.
// หมุดสีเทา    = ยังไม่เคยมี Observation
// คลิกหมุดเพื่อเลือกดูรายละเอียดสถานีนั้น (ผูกกับ query param ?station=)
//
// ฟีเจอร์เพิ่มเติมของแผนที่:
//   - Zoom ด้วยเมาส์: เปิด scrollWheelZoom (หมุนล้อเมาส์ซูม) + ดับเบิลคลิกซูม
//     ของ Leaflet เอง ส่วนปุ่ม +/- ปิดปุ่ม default ของ Leaflet แล้วสร้างปุ่ม
//     custom (มุมซ้ายบน) ให้หน้าตาตรงธีมแอปแทน พร้อมปุ่ม "หน้าแรก" (มุมซ้ายบน
//     เช่นกัน) ไว้ซูมออกไปดูภาพรวมประเทศไทยทั้งหมด
//   - สลับ Basemap: ปุ่มไอคอนแผนที่/ดาวเทียม (มุมซ้ายบน ต่อจากปุ่มหน้าแรก)
//     สลับระหว่างไทล์ถนนของ OpenStreetMap กับภาพถ่ายดาวเทียมของ Esri
//     (World_Imagery) เวลาอยู่โหมดดาวเทียมจะซ้อนเลเยอร์ label ชื่อสถานที่/
//     ถนนแบบโปร่งใสทับไว้ด้วย (Esri Reference/World_Boundaries_and_Places)
//     เพื่อให้ยังอ่านชื่อสถานที่ได้ คล้ายโหมด Hybrid ของ Google Maps
//   - ขยาย/ย่อความสูง: สลับความสูงกล่องแผนที่ระหว่างค่าเริ่มต้นกับค่าที่สูงขึ้น
//     แล้วย่อกลับเท่าเดิมได้ (ปุ่มไอคอนลูกศรขึ้น-ลง มุมขวาบน)
//   - Fullscreen: ใช้ browser Fullscreen API ตรง ๆ (ไม่ต้องเพิ่ม dependency
//     ปลั๊กอิน leaflet.fullscreen) พร้อม fallback สำหรับ Safari/IE ที่ใช้ชื่อ
//     method แบบ vendor-prefixed (มุมขวาบน)
//
// สำคัญ: ทุกครั้งที่กล่องแผนที่เปลี่ยนขนาด (ขยาย/ย่อ/เข้า-ออก fullscreen) ต้อง
// เรียก map.invalidateSize() เพราะ Leaflet จำขนาด container ไว้ตอนสร้างแผนที่
// ครั้งแรก ไม่งั้นจะเห็นไทล์แสดงผลผิดตำแหน่ง/มีพื้นที่ว่างเทาๆ (ดู
// MapResizeHandler ด้านล่าง)
import * as React from "react";
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

// ---- นิยาม Basemap ที่เลือกสลับได้ -----------------------------------------
// street    = ไทล์ถนนของ OpenStreetMap (ค่าเริ่มต้นเดิม)
// satellite = ภาพถ่ายดาวเทียมของ Esri World Imagery พร้อมเลเยอร์ label
//             (ชื่อสถานที่/เส้นถนน) ซ้อนทับไว้ให้ยังอ่านหมุด/ตำแหน่งได้ง่าย
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

// ---- ตัวช่วยเรื่อง Fullscreen API (มี fallback แบบ vendor-prefixed) --------
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
  React.useEffect(() => {
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
  React.useEffect(() => {
    if (point) map.flyTo(point, 13, { duration: 0.6 });
  }, [point, map]);
  return null;
}

// เรียก map.invalidateSize() หลัง container เปลี่ยนขนาด (ขยาย/ย่อ/fullscreen)
// หน่วงเวลาให้พ้นระยะ CSS transition ของความสูงก่อน ไม่งั้นจะวัดขนาดกล่อง
// ผิดตั้งแต่ตอนที่ยังเปลี่ยนขนาดไม่เสร็จ
function MapResizeHandler({ resizeKey }) {
  const map = useMap();
  React.useEffect(() => {
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
  React.useEffect(() => {
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

  const [isExpanded, setIsExpanded] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [basemap, setBasemap] = React.useState("street"); // "street" | "satellite"
  const [mapInstance, setMapInstance] = React.useState(null);
  const wrapperRef = React.useRef(null);

  // ซิงก์ state กับสถานะ fullscreen จริงของเบราว์เซอร์ เผื่อผู้ใช้กด Esc
  // ออกจาก fullscreen เองโดยไม่ผ่านปุ่มของเรา
  React.useEffect(() => {
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
      {/* ปุ่ม zoom in/out + หน้าแรก + สลับ basemap ลอยมุมซ้ายบน — แทนที่ปุ่ม
          +/- แบบ default ของ Leaflet (ปิดด้วย zoomControl={false} ด้านล่าง)
          ด้วยดีไซน์เดียวกับปุ่มฝั่งขวา (การ์ดโค้งมน มีเงาบาง ๆ) */}
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

      {/* ปุ่มควบคุมขนาด/fullscreen ลอยมุมขวาบน — zIndex สูงกว่า pane/control
          ของ Leaflet เอง (~400-1000) เพื่อไม่ให้แผนที่บังปุ่ม */}
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
          const isStale = latest
            ? Date.now() - new Date(latest).getTime() > STALE_MS
            : true;
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
