// src/pages/Dashboard/components/StationsMap.jsx
// แผนที่ภาพรวมสถานี ใช้ leaflet + react-leaflet
// ติดตั้งก่อนใช้งาน: npm install leaflet react-leaflet
//
// หมุดสีเขียว  = มีข้อมูลอัปเดตภายใน 24 ชม.
// หมุดสีแดง    = ไม่มีข้อมูลใหม่เกิน 24 ชม.
// หมุดสีเทา    = ยังไม่เคยมี Observation
// คลิกหมุดเพื่อเลือกดูรายละเอียดสถานีนั้น (ผูกกับ query param ?station=)
import * as React from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";

import { timeAgoLabel } from "../utils/formatters";

const STALE_MS = 24 * 60 * 60 * 1000;

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

export default function StationsMap({ things, selectedStationId, onSelectStation }) {
  const theme = useTheme();
  const { divider, success, error: errorColor, text } = theme.palette;

  const points = things.map(getStationLatLng).filter(Boolean);
  const selectedThing = things.find(
    (t) => String(t["@iot.id"]) === String(selectedStationId)
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

  return (
    <Box
      sx={{
        borderRadius: `${theme.shape.borderRadius + 2}px`,
        overflow: "hidden",
        border: `1px solid ${divider}`,
        height: 340,
        "& .leaflet-container": { height: "100%", width: "100%" },
      }}
    >
      <MapContainer center={points[0]} zoom={7} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitAllStations points={points} />
        {selectedPoint && <FlyToSelected point={selectedPoint} />}

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
