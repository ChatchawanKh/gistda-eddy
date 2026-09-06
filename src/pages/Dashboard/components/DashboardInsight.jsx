import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { alpha, useTheme } from "@mui/material/styles";
import { useSearchParams } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
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
import DataSaverOffRoundedIcon from "@mui/icons-material/DataSaverOffRounded";
import UpdateRoundedIcon from "@mui/icons-material/UpdateRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ViewModuleRoundedIcon from "@mui/icons-material/ViewModuleRounded";
import TableRowsRoundedIcon from "@mui/icons-material/TableRowsRounded";
import ShowChartRoundedIcon from '@mui/icons-material/ShowChartRounded';
import GridViewRoundedIcon from "@mui/icons-material/GridViewRounded";

import StationsMap from "./StationsMap";
import StationDatastreamsTable from "./StationDatastreamsTable";
import InsightRangedChart from "./InsightRangedChart";
import WindRoseChart from "./WindRoseChart";
import BarChartCard from "./BarChartCard";
import HeatmapChartCard from "./HeatmapChartCard";
import InsightSummaryBar from "./InsightSummaryBar";
import DateRangePickerModern from "./DateRangePickerModern";
import { useObservationsRange } from "../hooks/useObservationsRange";
import {
  flattenDatastreams,
  timeAgoLabel,
  hasObservationData,
} from "../utils/formatters";
import {
  findDatastreamByKeywords,
  WIND_SPEED_KEYWORDS,
  WIND_DIRECTION_KEYWORDS,
} from "../utils/insightHelpers";
import {
  summarizeObservations,
  findLatestAvailableDate,
} from "../utils/insightSummary";
import { buildDatePresets } from "../utils/dateRangePresets";
import { getChartColor } from "../utils/chartColors";
import Loading from "./Loading";

const STALE_MS = 24 * 60 * 60 * 1000;

export default function DashboardInsight({ things, loading, error }) {
  const theme = useTheme();
  const { background, divider, text, primary } = theme.palette;
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedStationId = searchParams.get("station") || "";
  const selectedDatastreamId = searchParams.get("ds") || "";
  // มุมมองตอนยังไม่เลือกสถานี: การ์ดสรุป หรือตารางละเอียดทุกสถานี
  const [viewMode, setViewMode] = useState("cards");

  // วันที่ล่าสุดที่มีข้อมูลจริงในระบบ — ฐานของทุก preset ช่วงเวลา (ไม่ใช้วันที่เครื่องผู้ใช้)
  const latestAvailableDate = useMemo(
    () => findLatestAvailableDate(things),
    [things],
  );

  const filterFieldSx = {
    bgcolor: background.paper,
    borderRadius: 0.5,
    "& .MuiOutlinedInput-root": {
      bgcolor: background.paper,
      borderRadius: 0.5,
      fontSize: 13,
    },
    "& .MuiOutlinedInput-notchedOutline": {
      borderColor: divider,
    },
    "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline": {
      borderColor: primary.main,
    },
    "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
      borderColor: primary.main,
      borderWidth: 1,
    },
    "& .MuiInputLabel-root": {
      fontSize: 13,
    },
  };

  // ช่วงเวลากลางของทั้งหน้า — default "7 วันล่าสุด" จาก latestAvailableDate
  // ตั้งครั้งเดียวหลังรู้ค่านั้น เพื่อไม่ override ช่วงเวลาที่ผู้ใช้เลือกเองภายหลัง
  const [range, setRange] = useState(
    () => buildDatePresets(new Date())[2].range,
  );
  const didInitRange = useRef(false);
  useEffect(() => {
    if (didInitRange.current || !latestAvailableDate) return;
    didInitRange.current = true;
    setRange(buildDatePresets(latestAvailableDate)[2].range);
  }, [latestAvailableDate]);

  const handleSelectStation = useCallback(
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
    [searchParams, setSearchParams],
  );

  const handleSelectDatastream = useCallback(
    (ds) => {
      if (!ds) return;
      const next = new URLSearchParams(searchParams);
      next.set("ds", String(ds["@iot.id"]));
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const handleJumpToDatastream = useCallback(
    (ds) => {
      if (!ds) return;
      const next = new URLSearchParams(searchParams);
      next.set("station", String(ds.thingId));
      next.set("ds", String(ds["@iot.id"]));
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  // เปลี่ยนสถานีแล้วถ้าตัวแปรใน URL ไม่ valid ให้ default ไปตัวแปรแรกของสถานีนั้น
  useEffect(() => {
    if (!selectedStationId) return;
    const thing = things.find(
      (t) => String(t["@iot.id"]) === String(selectedStationId),
    );
    const dsList = thing?.Datastreams || [];
    const stillValid = dsList.some(
      (d) => String(d["@iot.id"]) === String(selectedDatastreamId),
    );
    if (!stillValid) {
      const firstDs = dsList.find(hasObservationData) || dsList[0];
      const next = new URLSearchParams(searchParams);
      if (firstDs) next.set("ds", String(firstDs["@iot.id"]));
      else next.delete("ds");
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStationId, things.length]);

  const datastreams = flattenDatastreams(things);
  const queryableDatastreams = datastreams.filter(hasObservationData);

  const selectedThing = things.find(
    (t) => String(t["@iot.id"]) === String(selectedStationId),
  );
  const stationDatastreams = selectedThing?.Datastreams || [];
  const primaryDatastream = stationDatastreams.find(
    (ds) => String(ds["@iot.id"]) === String(selectedDatastreamId),
  );

  // ตัวแปรลม (ถ้ามี) — ใช้ทำ Wind Rose และตัดออกจากรายการ "กราฟย่อยอื่น ๆ"
  const speedDatastream = findDatastreamByKeywords(
    stationDatastreams,
    WIND_SPEED_KEYWORDS,
  );
  const directionDatastream = findDatastreamByKeywords(
    stationDatastreams,
    WIND_DIRECTION_KEYWORDS,
  );
  const hasWind = Boolean(speedDatastream || directionDatastream);

  // ตัวแปรที่เหลือ (small multiples) — ไม่รวมตัวแปรหลักและทิศทางลม (ไปอยู่ใน
  // wind rose แล้ว) เพื่อไม่ให้ซ้ำกับกราฟหลักด้านบน
  const otherDatastreams = stationDatastreams.filter(
    (ds) =>
      String(ds["@iot.id"]) !== String(primaryDatastream?.["@iot.id"]) &&
      String(ds["@iot.id"]) !== String(directionDatastream?.["@iot.id"]),
  );

  // ดึงข้อมูลของตัวแปรหลักตามช่วงเวลากลาง — ใช้ทั้งกับ Insight Summary,
  // Time Series, Bar chart รายวัน และ Heatmap รายชั่วโมง (query ครั้งเดียวใช้ร่วมกัน)
  const {
    rows: primaryRows,
    fetching: primaryFetching,
    error: primaryError,
  } = useObservationsRange(
    primaryDatastream?.["@iot.id"],
    range.from,
    range.to,
  );

  const primarySummary = useMemo(
    () => summarizeObservations(primaryRows),
    [primaryRows],
  );
  const primaryUnit = primaryDatastream?.unitOfMeasurement?.symbol || "";
  const primaryName =
    primaryDatastream?.ObservedProperty?.name || primaryDatastream?.name || "";
  // สีประจำตัวแปรหลัก — ใช้ร่วมกันทั้ง 3 กราฟของตัวแปรเดียวกัน
  const primaryColor = getChartColor(
    primaryDatastream?.["@iot.id"],
    primary.main,
  );

  const noStations = things.length === 0;

  if (loading) return <Loading />;
  if (error) return <Alert severity="error">{error}</Alert>;

  const overviewCards = [
    {
      label: "สถานีทั้งหมด",
      value: things.length,
      icon: LocationOnRoundedIcon,
      color: primary.main,
    },
    {
      label: "ตัวแปรที่ตรวจวัด (Datastreams)",
      value: datastreams.length,
      icon: DataSaverOffRoundedIcon,
      color: "#3EAE7E",
    },
    {
      label: "ข้อมูลล่าสุด",
      value: latestAvailableDate
        ? timeAgoLabel(latestAvailableDate)
        : "ไม่มีข้อมูล",
      icon: UpdateRoundedIcon,
      color: "#E8874A",
    },
  ];

  return (
    <>
      {/* Title and Query Tools */}
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 1300,
          bgcolor: "#fff",
          pb: 1.5,
          borderBottom: `1px solid ${divider}`,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: { xs: "flex-start", sm: "center" },
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 1.5,
            py: 1.5,
            mb: 2,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Box
              sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}
            >
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  backgroundColor: "rgba(119, 192, 240, 0.21)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mr: 1,
                }}
              >
                <GridViewRoundedIcon sx={{ fontSize: 20, color: text.head }} />
              </Box>
              <Typography
                sx={{
                  fontSize: 20,
                  fontWeight: 400,
                  color: text.head,
                }}
              >
                Dashboard
              </Typography>
            </Box>

            <Typography sx={{ fontSize: 13.5, color: text.secondary }}>
              สรุปภาพรวมและวิเคราะห์ข้อมูลเชิงลึกของทุกสถานีตรวจวัดในหน้าเดียว
            </Typography>
          </Box>
        </Box>

        {/* แถบ Query หลัก — ค้นหาตัวแปร / เลือกสถานี / ช่วงเวลา / ล้างตัวกรอง
            ควบคุมทุกกราฟและ Insight Summary ในหน้านี้พร้อมกันแบบ real-time */}
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 1.25,
            bgcolor: background.paper,
            border: `1px solid ${divider}`,
            borderRadius: `${theme.shape.borderRadius + 4}px`,
            p: { xs: 1.25, sm: 1.5 },
          }}
        >
          <Autocomplete
            size="small"
            sx={{ minWidth: 260, flex: 1, ...filterFieldSx }}
            options={queryableDatastreams}
            getOptionLabel={(ds) =>
              `${ds.thingName} · ${ds.ObservedProperty?.name || ds.name}`
            }
            groupBy={(ds) => ds.thingName}
            value={
              queryableDatastreams.find(
                (ds) => String(ds["@iot.id"]) === String(selectedDatastreamId),
              ) || null
            }
            onChange={(_, ds) => handleJumpToDatastream(ds)}
            disabled={queryableDatastreams.length === 0}
            renderInput={(params) => (
              <TextField
                {...params}
                label="ค้นหาตัวแปร/สารที่ต้องการดูโดยตรง (ทุกสถานี)"
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <SearchRoundedIcon
                      sx={{
                        fontSize: 17,
                        color: text.secondary,
                        ml: 0.25,
                        mr: 0.5,
                      }}
                    />
                  ),
                }}
              />
            )}
          />

          <FormControl
            size="small"
            sx={{ minWidth: 220, ...filterFieldSx }}
            disabled={noStations}
          >
            <InputLabel>เลือกสถานีที่ต้องการดู</InputLabel>
            <Select
              label="เลือกสถานีที่ต้องการดู"
              value={selectedStationId}
              onChange={(e) => handleSelectStation(e.target.value)}
              sx={{ fontSize: 13 }}
            >
              <MenuItem value="">ทั้งหมด ({things.length} สถานี)</MenuItem>
              {things.map((t) => (
                <MenuItem key={t["@iot.id"]} value={String(t["@iot.id"])}>
                  {t.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <DateRangePickerModern
            from={range.from}
            to={range.to}
            onChange={setRange}
            anchorDate={latestAvailableDate}
          />

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

      <Box sx={{ pt: 2 }}>
        {/* 1) Insight Summary: Latest Data banner + KPI ของตัวแปรหลักที่เลือกอยู่ */}
        <Box
          sx={{
            bgcolor: alpha(theme.palette.text.primary, 0.03),
            borderRadius: `${theme.shape.borderRadius + 4}px`,
            border: `1px solid ${divider}`,
            p: { xs: 1.5, sm: 2 },
            mb: 3,
          }}
        >
          <InsightSummaryBar
            latestAvailableDate={latestAvailableDate}
            summary={primarySummary}
            unit={primaryUnit}
            variableName={
              selectedThing
                ? `${selectedThing.name} · ${primaryName}`
                : primaryName
            }
            loading={Boolean(primaryDatastream) && primaryFetching}
            emptyMessage={
              !selectedThing
                ? "เลือกสถานีที่สนใจ เพื่อดูข้อมูลสรุป"
                : "ไม่มีข้อมูลของตัวแปรนี้ในช่วงเวลาที่เลือก"
            }
          />
        </Box>

        {/* 2) ภาพรวมระบบ — Tag */}

        {/* 3) แผนที่เลือกสถานี — ไม่ sticky เพราะกินพื้นที่มาก เลื่อนผ่านได้ตามปกติ */}
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
              flexWrap: "wrap",
              alignItems: "center",
              gap: 1,
              mb: 1.5,
            }}
          >
            {overviewCards.map((c) => (
              <Chip
                key={c.label}
                size="small"
                icon={<c.icon sx={{ fontSize: "14px !important" }} />}
                label={
                  <Box
                    component="span"
                    sx={{ display: "flex", alignItems: "baseline", gap: 0.5 }}
                  >
                    <Box
                      component="span"
                      sx={{ fontWeight: 400, opacity: 0.85 }}
                    >
                      {c.label}
                    </Box>
                    <Box component="span" sx={{ fontWeight: 600 }}>
                      {c.value}
                    </Box>
                  </Box>
                }
                sx={{
                  height: 28,
                  borderRadius: 999,
                  bgcolor: alpha(primary.main, 0.1), // BLUE[500] @ 10% -> โทนฟ้าอ่อน
                  color: primary.dark, // BLUE[700] -> ตัวอักษรน้ำเงินเข้ม อ่านง่าย
                  "& .MuiChip-icon": { color: "inherit", ml: 1.25 },
                  "& .MuiChip-label": { px: 1 },
                }}
              />
            ))}
          </Box>

          <StationsMap
            things={things}
            selectedStationId={selectedStationId}
            onSelectStation={handleSelectStation}
          />
        </Box>

        {/* 4) รายละเอียด + Multi-chart Dashboard ของสถานีที่เลือก */}
        {selectedThing ? (
          <Fade in key={selectedThing["@iot.id"]} timeout={280}>
            <Box>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  mb: 1.5,
                }}
              >
                <IconButton
                  size="small"
                  onClick={() => handleSelectStation("")}
                >
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

              {primaryError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {primaryError}
                </Alert>
              )}

              {/* โซนรายละเอียดตัวแปรหลัก — Wind Rose มาก่อนถ้าสถานีมีข้อมูลลม */}
              <Box
                sx={{
                  border: `1px solid ${primary.main}33`,
                  bgcolor: `${primary.main}06`,
                  borderRadius: `${theme.shape.borderRadius + 4}px`,
                  p: { xs: 1.5, sm: 2.5 },
                  mb: 3,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    mb: 0.25,
                  }}
                >
                  <ShowChartRoundedIcon
                    sx={{ fontSize: 18, color: primary.main }}
                  />
                  <Typography
                    sx={{ fontSize: 14, fontWeight: 700, color: primary.main }}
                  >
                    {primaryDatastream
                      ? `${selectedThing.name} · ${primaryName}${
                          primaryUnit ? ` (${primaryUnit})` : ""
                        }`
                      : ""}
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: 12, color: text.secondary, mb: 2 }}>
                  {primaryDatastream
                    ? `${selectedThing.name} · ${primaryName}${
                        primaryUnit ? ` (${primaryUnit})` : ""
                      } — คลิกแถวในตารางด้านล่างเพื่อเปลี่ยนตัวแปร`
                    : "เลือกตัวแปรจากตารางด้านล่างเพื่อดูรายละเอียด"}
                </Typography>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
                    gap: 2,
                  }}
                >
                  {hasWind && (
                    <WindRoseChart
                      speedDatastream={speedDatastream}
                      directionDatastream={directionDatastream}
                      from={range.from}
                      to={range.to}
                    />
                  )}

                  <InsightRangedChart
                    datastream={primaryDatastream}
                    from={range.from}
                    to={range.to}
                    color={primaryColor}
                  />
                  <BarChartCard
                    rows={primaryRows}
                    unit={primaryUnit}
                    variableName={primaryName}
                    loading={primaryFetching}
                    color={primaryColor}
                    datastreamId={primaryDatastream?.["@iot.id"]}
                    from={range.from}
                    to={range.to}
                  />
                  <HeatmapChartCard
                    rows={primaryRows}
                    unit={primaryUnit}
                    variableName={primaryName}
                    loading={primaryFetching}
                    color={primaryColor}
                    datastreamId={primaryDatastream?.["@iot.id"]}
                    from={range.from}
                    to={range.to}
                  />
                </Box>
              </Box>

              {/* โซนตัวแปรอื่น ๆ (small multiples) — ข้อมูลรอง ไม่มีกรอบไฮไลต์ */}
              {otherDatastreams.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 0.25,
                    }}
                  >
                    <GridViewRoundedIcon
                      sx={{ fontSize: 17, color: text.secondary }}
                    />
                    <Typography
                      sx={{
                        fontSize: 13.5,
                        fontWeight: 700,
                        color: text.primary,
                      }}
                    >
                      ตัวแปรอื่นในสถานีนี้ ({otherDatastreams.length})
                    </Typography>
                  </Box>
                  <Typography
                    sx={{ fontSize: 11.5, color: text.secondary, mb: 1.5 }}
                  >
                    ภาพรวมแบบย่อของตัวแปรอื่น ๆ ที่สถานีนี้ตรวจวัด
                    นอกเหนือจากตัวแปรที่แสดงรายละเอียดอยู่ด้านบน —
                    คลิกแถวในตารางด้านล่างเพื่อสลับไปดูรายละเอียดของตัวแปรนั้นแทน
                  </Typography>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(320px, 1fr))",
                      gap: 2,
                    }}
                  >
                    {otherDatastreams.map((ds) => (
                      <InsightRangedChart
                        key={ds["@iot.id"]}
                        datastream={ds}
                        from={range.from}
                        to={range.to}
                        color={getChartColor(ds["@iot.id"], primary.main)}
                      />
                    ))}
                  </Box>
                </Box>
              )}

              {/* ตารางค่าล่าสุดของทุกตัวแปร — คลิกแถวเพื่อเปลี่ยนตัวแปรหลักด้านบน */}
              <StationDatastreamsTable
                thing={selectedThing}
                selectedDatastreamId={selectedDatastreamId}
                onSelectDatastream={handleSelectDatastream}
              />
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
                  // eslint-disable-next-line react-hooks/purity -- staleness badge เทียบเวลาปัจจุบัน ณ ตอน render โดยตั้งใจ
                  const isStale = latest ? Date.now() - new Date(latest).getTime() > STALE_MS : true;

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
      </Box>
    </>
  );
}
