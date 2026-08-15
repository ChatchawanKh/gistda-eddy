import * as React from "react";
import { useTheme } from "@mui/material/styles";
import { useSearchParams } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Fade from "@mui/material/Fade";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import ToggleButton from "@mui/material/ToggleButton";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import ShowChartRoundedIcon from "@mui/icons-material/ShowChartRounded";
import UpdateRoundedIcon from "@mui/icons-material/UpdateRounded";
import MapRoundedIcon from "@mui/icons-material/MapRounded";
import GridViewRoundedIcon from "@mui/icons-material/GridViewRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ViewModuleRoundedIcon from "@mui/icons-material/ViewModuleRounded";
import TableRowsRoundedIcon from "@mui/icons-material/TableRowsRounded";

import StationsMap from "./StationsMap";
import StationDatastreamsTable from "./StationDatastreamsTable";
import StationTimeSeriesChart from "./StationTimeSeriesChart";
import { flattenDatastreams, timeAgoLabel, hasObservationData } from "../utils/formatters";

import Loading from "./Loading"

const STALE_MS = 24 * 60 * 60 * 1000;

export default function StationOverview({ things, loading, error }) {
  const theme = useTheme();
  const { background, divider, text } = theme.palette;
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedStationId = searchParams.get("station") || "";
  // ตัวแปร (Datastream) ที่กำลังแสดงกราฟอยู่ ณ ตอนนี้ — เก็บไว้บน URL (?ds=)
  // เช่นเดียวกับสถานี เพื่อให้ query ตัวแปรได้โดยตรงและอ้างอิงต่อได้
  const selectedDatastreamId = searchParams.get("ds") || "";
  // มุมมองตอนยังไม่เลือกสถานี: การ์ดสรุป (เดิม) หรือตารางละเอียดทุกสถานี
  // (ฟังก์ชันเดิมของหน้า "สถานีตรวจวัด")
  const [viewMode, setViewMode] = React.useState("cards");

const handleSelectStation = React.useCallback(
  (id) => {
    const currentStation = searchParams.get("station") || "";
    const next = new URLSearchParams(searchParams);

    if (id) next.set("station", id);
    else next.delete("station");

    if (id !== currentStation) {
      next.delete("ds");
    }

    setSearchParams(next, { replace: true });
  },
  [searchParams, setSearchParams]
);

  const handleSelectDatastream = React.useCallback(
    (ds) => {
      if (!ds) return;
      const next = new URLSearchParams(searchParams);
      next.set("ds", String(ds["@iot.id"]));
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  // Query ตรง: เลือกสถานี + ตัวแปรพร้อมกันในคลิกเดียว จากช่องค้นหาด้านบน
  // (เทียบเท่า dropdown เดิมของหน้า "กราฟข้อมูลตามเวลา" แต่ไม่ต้องเลือกสถานีก่อน)
  const handleJumpToDatastream = React.useCallback(
    (ds) => {
      if (!ds) return;
      const next = new URLSearchParams(searchParams);
      next.set("station", String(ds.thingId));
      next.set("ds", String(ds["@iot.id"]));
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  // เมื่อเปลี่ยนสถานีที่เลือก (หรือข้อมูลสถานีโหลดเสร็จ) และยังไม่มีตัวแปรที่
  // valid อยู่ใน URL ให้ default ไปที่ตัวแปรแรกของสถานีนั้นโดยอัตโนมัติ
  React.useEffect(() => {
    if (!selectedStationId) return;
    const thing = things.find((t) => String(t["@iot.id"]) === String(selectedStationId));
    const dsList = thing?.Datastreams || [];
    const stillValid = dsList.some(
      (d) => String(d["@iot.id"]) === String(selectedDatastreamId)
    );
    if (!stillValid) {
      const firstDs = dsList[0];
      const next = new URLSearchParams(searchParams);
      if (firstDs) next.set("ds", String(firstDs["@iot.id"]));
      else next.delete("ds");
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStationId, things.length]);

  if (loading) {
      return (
        <Loading/>
      );
    }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  const datastreams = flattenDatastreams(things);
  const queryableDatastreams = datastreams.filter(hasObservationData);
  const latestTimes = datastreams
    .map((ds) => ds.Observations?.[0]?.phenomenonTime)
    .filter(Boolean)
    .sort()
    .reverse();

  const summaryCards = [
    { label: "สถานีทั้งหมด", value: things.length, icon: LocationOnRoundedIcon },
    {
      label: "ตัวแปรที่ตรวจวัด (Datastreams)",
      value: datastreams.length,
      icon: ShowChartRoundedIcon,
    },
    {
      label: "อัปเดตล่าสุด",
      value: latestTimes[0] ? timeAgoLabel(latestTimes[0]) : "ไม่มีข้อมูล",
      icon: UpdateRoundedIcon,
    },
  ];

  const noStations = things.length === 0;

  const selectedThing = things.find(
    (t) => String(t["@iot.id"]) === String(selectedStationId)
  );
  const selectedDatastream = selectedThing?.Datastreams?.find(
    (ds) => String(ds["@iot.id"]) === String(selectedDatastreamId)
  );
  const selectedAutocompleteValue =
    queryableDatastreams.find(
      (ds) => String(ds["@iot.id"]) === String(selectedDatastreamId)
    ) || null;

  return (
    <>
      <Typography
        sx={{ fontSize: 20, fontWeight: 500, color: text.head, mb: 0.5 }}
      >
        ภาพรวมสถานี
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: text.secondary, mb: 3 }}>
        ข้อมูลจากทุกสถานีตรวจวัด (SensorThings API) —
        เลือกสถานีหรือค้นหาตัวแปรที่ต้องการดูได้โดยตรง
      </Typography>

      {/* สรุปภาพรวมทั้งระบบ (ไม่เปลี่ยนตามตัวกรอง) */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 2,
          mb: 3,
        }}
      >
        {summaryCards.map((c) => (
          <Box
            key={c.label}
            sx={{
              bgcolor: background.paper,
              borderRadius: `${theme.shape.borderRadius + 4}px`,
              border: `1px solid ${divider}`,
              p: 2.5,
              display: "flex",
              alignItems: "center",
              gap: 1.75,
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: "12px",
                bgcolor: `${theme.palette.primary.main}14`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <c.icon
                sx={{ fontSize: 20, color: theme.palette.primary.main }}
              />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{ fontSize: 12, color: text.secondary, mb: 0.25 }}
              >
                {c.label}
              </Typography>
              <Typography
                sx={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: text.primary,
                  lineHeight: 1.2,
                }}
              >
                {c.value}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>

      {/* ค้นหาตัวแปร/สารที่ต้องการดูโดยตรง (ทุกสถานี) — query ตัวแปรได้ทันทีโดย
          ไม่ต้องเลือกสถานีก่อน (แทนที่หน้า "กราฟข้อมูลตามเวลา" เดิม) */}
      <Box
        sx={{
          bgcolor: "background.paper",
          borderRadius: `${theme.shape.borderRadius + 4}px`,
          border: `1px solid ${divider}`,
          p: { xs: 1.5, sm: 2 },
          mb: 3,
        }}
      >
        <Box
          sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1.25 }}
        >
          <SearchRoundedIcon sx={{ fontSize: 18, color: text.secondary }} />
          <Typography
            sx={{ fontSize: 13, fontWeight: 700, color: text.primary }}
          >
            ค้นหาตัวแปร/สารที่ต้องการดูโดยตรง
          </Typography>
        </Box>
        <Autocomplete
          size="small"
          disabled={queryableDatastreams.length === 0}
          options={queryableDatastreams}
          value={selectedAutocompleteValue}
          onChange={(_, ds) => handleJumpToDatastream(ds)}
          getOptionLabel={(ds) =>
            `${ds.thingName} · ${ds.ObservedProperty?.name || ds.name}`
          }
          isOptionEqualToValue={(a, b) =>
            String(a["@iot.id"]) === String(b["@iot.id"])
          }
          groupBy={(ds) => ds.thingName}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="พิมพ์ชื่อสถานี หรือชื่อสาร เช่น PM2.5, อุณหภูมิ..."
              label="ตัวแปร/สาร (ทุกสถานี)"
            />
          )}
        />
      </Box>

      {/* แถบเลือกสถานี + แผนที่ อยู่ในกรอบเดียวกันให้ดูเป็นระเบียบ */}
      <Box
        sx={{
          bgcolor: background.paper,
          borderRadius: `${theme.shape.borderRadius + 4}px`,
          border: `1px solid ${divider}`,
          p: { xs: 1.5, sm: 2 },
          mb: 3,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            mb: 1.5,
            flexWrap: "wrap",
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <MapRoundedIcon sx={{ fontSize: 18, color: text.secondary }} />
            <Typography
              sx={{ fontSize: 13, fontWeight: 700, color: text.primary }}
            >
              แผนที่แสดงตำแหน่งสถานี
            </Typography>
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              flexWrap: "wrap",
            }}
          >
            <FormControl
              size="small"
              sx={{ minWidth: 260 }}
              disabled={noStations}
            >
              <InputLabel>เลือกสถานีที่ต้องการดู</InputLabel>
              <Select
                label="เลือกสถานีที่ต้องการดู"
                value={selectedStationId}
                onChange={(e) => handleSelectStation(e.target.value)}
              >
                <MenuItem value="">ทั้งหมด ({things.length} สถานี)</MenuItem>
                {things.map((t) => (
                  <MenuItem key={t["@iot.id"]} value={String(t["@iot.id"])}>
                    {t.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Tooltip
              title="ล้างตัวกรอง"
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
              <span>
                <IconButton
                  size="small"
                  onClick={() => handleSelectStation("")}
                  disabled={!selectedStationId}
                >
                  <ClearRoundedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </Box>

        <StationsMap
          things={things}
          selectedStationId={selectedStationId}
          onSelectStation={handleSelectStation}
        />
      </Box>

      {/* รายละเอียดสถานีที่เลือก (กราฟ + ตาราง มาด้วยกันเสมอ) หรือรายการทุกสถานี */}
      {selectedThing ? (
        <Fade in key={selectedThing["@iot.id"]} timeout={280}>
          <Box>
            <Box
              sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1.5 }}
            >
              <IconButton size="small" onClick={() => handleSelectStation("")}>
                <ArrowBackRoundedIcon fontSize="small" />
              </IconButton>
              <Typography
                onClick={() => handleSelectStation("")}
                sx={{
                  fontSize: 13,
                  color: text.secondary,
                  cursor: "pointer",
                  "&:hover": { color: theme.palette.primary.main },
                }}
              >
                กลับไปดูทุกสถานี
              </Typography>
            </Box>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", lg: "1.25fr 1fr" },
                gap: 2,
                alignItems: "stretch",
              }}
            >
              <StationTimeSeriesChart datastream={selectedDatastream} />
              <StationDatastreamsTable
                thing={selectedThing}
                selectedDatastreamId={selectedDatastreamId}
                onSelectDatastream={handleSelectDatastream}
              />
            </Box>
          </Box>
        </Fade>
      ) : noStations ? (
        <Box
          sx={{
            border: `1px dashed ${divider}`,
            borderRadius: `${theme.shape.borderRadius + 4}px`,
            p: 5,
            textAlign: "center",
          }}
        >
          <Typography sx={{ fontSize: 13.5, color: text.secondary }}>
            ยังไม่มีสถานีตรวจวัดในระบบ
          </Typography>
        </Box>
      ) : (
        <>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 1,
              mb: 1.5,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <GridViewRoundedIcon
                sx={{ fontSize: 18, color: text.secondary }}
              />
              <Typography
                sx={{ fontSize: 13, fontWeight: 700, color: text.primary }}
              >
                รายชื่อสถานีทั้งหมด
              </Typography>
            </Box>

            {/* สลับมุมมอง: การ์ดสรุป / ตารางละเอียดทุกสถานี (ฟังก์ชันเดิมของ
                หน้า "สถานีตรวจวัด") */}
            <ToggleButtonGroup
              size="small"
              exclusive
              value={viewMode}
              onChange={(_, v) => v && setViewMode(v)}
            >
              <ToggleButton
                value="cards"
                sx={{ fontSize: 12, px: 1.25, py: 0.25 }}
              >
                <ViewModuleRoundedIcon sx={{ fontSize: 16, mr: 0.5 }} />
                การ์ดสรุป
              </ToggleButton>
              <ToggleButton
                value="table"
                sx={{ fontSize: 12, px: 1.25, py: 0.25 }}
              >
                <TableRowsRoundedIcon sx={{ fontSize: 16, mr: 0.5 }} />
                ตารางละเอียด
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {viewMode === "table" ? (
            things.map((t) => (
              <Box key={t["@iot.id"]} sx={{ mb: 2 }}>
                <StationDatastreamsTable thing={t} />
              </Box>
            ))
          ) : (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 2,
              }}
            >
              {things.map((t) => {
                const stationDs = t.Datastreams || [];
                const latest = stationDs
                  .map((ds) => ds.Observations?.[0]?.phenomenonTime)
                  .filter(Boolean)
                  .sort()
                  .reverse()[0];
                const isStale = latest
                  ? Date.now() - new Date(latest).getTime() > STALE_MS
                  : true;

                return (
                  <Box
                    key={t["@iot.id"]}
                    onClick={() => handleSelectStation(String(t["@iot.id"]))}
                    sx={{
                      bgcolor: background.paper,
                      borderRadius: `${theme.shape.borderRadius + 4}px`,
                      border: `1px solid ${divider}`,
                      p: 2.5,
                      cursor: "pointer",
                      transition:
                        "border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease",
                      "&:hover": {
                        borderColor: theme.palette.primary.main,
                        boxShadow: `0 4px 16px ${theme.palette.primary.main}1f`,
                        transform: "translateY(-2px)",
                      },
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        mb: 0.5,
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: 15,
                          fontWeight: 700,
                          color: text.primary,
                        }}
                      >
                        {t.name}
                      </Typography>
                      <Chip
                        size="small"
                        label={isStale ? "ไม่มีข้อมูลใหม่" : "ออนไลน์"}
                        color={isStale ? "error" : "success"}
                        variant="outlined"
                      />
                    </Box>
                    <Typography
                      sx={{ fontSize: 12.5, color: text.secondary, mb: 1 }}
                    >
                      {t.description}
                    </Typography>
                    {t.properties?.ecosystem && (
                      <Chip
                        size="small"
                        label={`Ecosystem: ${t.properties.ecosystem}`}
                        sx={{ mr: 1, mb: 1 }}
                      />
                    )}
                    <Typography sx={{ fontSize: 12, color: text.secondary }}>
                      {stationDs.length} Datastreams · อัปเดต{" "}
                      {timeAgoLabel(latest)}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          )}
        </>
      )}
    </>
  );
}
