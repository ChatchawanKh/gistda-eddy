// src/pages/Dashboard/components/DashboardInsight.jsx
// [Insight Dashboard] หน้านี้แทนที่ StationOverview.jsx + InsightView.jsx เดิม
// ทั้งคู่ — ตามข้อกำหนดใหม่ที่ให้รวม "Insight" และ "Dashboard" ไว้ในหน้าเดียว
// (Single Page Dashboard) แทนที่จะแยกเป็นหน้า "ภาพรวมสถานี" กับ "อินไซต์ข้อมูล"
// เหมือนเดิม โครงสร้างของหน้า (บนลงล่าง):
//
//   1) Insight Summary  — แบนเนอร์ "Latest Data" (อ้างอิงวันที่ล่าสุดที่มีข้อมูล
//      จริงในระบบ ไม่ใช่วันที่ปัจจุบัน) + การ์ด KPI (จำนวน/ค่าเฉลี่ย/สูงสุด/
//      ต่ำสุด/แนวโน้ม) ของตัวแปรหลักที่กำลังดูอยู่
//   2) แถบเลือกช่วงเวลากลาง (DateRangePickerModern) — ควบคุมทุกกราฟ +
//      Insight Summary ในหน้านี้พร้อมกันแบบ real-time ไม่ต้อง reload
//   3) ภาพรวมระบบ — จัด 2 คอลัมน์แยก 2 หมวด: "ภาพรวมระบบ" (จำนวนสถานี/ตัวแปร/
//      ความสดใหม่ของข้อมูล) ฝั่งซ้าย และ "สถานะสถานีทั้งระบบ" (Donut) ฝั่งขวา
//      ไม่ผูกกับสถานีที่เลือก แสดงเสมอ
//   4) ตัวเลือกสถานี (แผนที่ + dropdown + ค้นหาตัวแปรโดยตรง)
//   5) เมื่อเลือกสถานีแล้ว: Multi-chart grid ของสถานีนั้น จัด layout ตาม
//      ความสำคัญของข้อมูล (Priority-based Layout) — ถ้าสถานีมีข้อมูลลม
//      Wind Rose (Radar Chart) จะอยู่ตำแหน่งแรก/โดดเด่นที่สุดของกริดเสมอ
//      ตามด้วย Time Series, Bar Chart รายวัน, Heatmap รายชั่วโมง แล้วตามด้วย
//      กราฟย่อย (small multiples) ของตัวแปรอื่น ๆ ทั้งหมด และตารางค่าล่าสุด
import * as React from "react";
import { useTheme } from "@mui/material/styles";
import { useSearchParams } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Divider from "@mui/material/Divider";
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
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ViewModuleRoundedIcon from "@mui/icons-material/ViewModuleRounded";
import TableRowsRoundedIcon from "@mui/icons-material/TableRowsRounded";
import GridViewRoundedIcon from "@mui/icons-material/GridViewRounded";

import StationsMap from "./StationsMap";
import StationDatastreamsTable from "./StationDatastreamsTable";
import InsightRangedChart from "./InsightRangedChart";
import WindRoseChart from "./WindRoseChart";
import BarChartCard from "./BarChartCard";
import DonutChartCard from "./DonutChartCard";
import HeatmapChartCard from "./HeatmapChartCard";
import InsightSummaryBar from "./InsightSummaryBar";
import DateRangePickerModern from "./DateRangePickerModern";
import { useObservationsRange } from "../hooks/useObservationsRange";
import { flattenDatastreams, timeAgoLabel, hasObservationData } from "../utils/formatters";
import {
  findDatastreamByKeywords,
  WIND_SPEED_KEYWORDS,
  WIND_DIRECTION_KEYWORDS,
} from "../utils/insightHelpers";
import { summarizeObservations, findLatestAvailableDate } from "../utils/insightSummary";
import { buildDatePresets } from "../utils/dateRangePresets";

const STALE_MS = 24 * 60 * 60 * 1000;

export default function DashboardInsight({ things, loading, error }) {
  const theme = useTheme();
  const { background, divider, text, primary } = theme.palette;
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedStationId = searchParams.get("station") || "";
  const selectedDatastreamId = searchParams.get("ds") || "";
  // มุมมองตอนยังไม่เลือกสถานี: การ์ดสรุป หรือตารางละเอียดทุกสถานี
  const [viewMode, setViewMode] = React.useState("cards");

  // วันที่ล่าสุดที่มีข้อมูลจริงในระบบ — ใช้เป็นฐานของทุก preset ช่วงเวลา และ
  // แสดงในแบนเนอร์ "Latest Data" (ไม่ใช้วันที่ปัจจุบันของเครื่องผู้ใช้)
  const latestAvailableDate = React.useMemo(() => findLatestAvailableDate(things), [things]);

  // ช่วงเวลากลางของทั้งหน้า — default "7 วันล่าสุด" นับจากวันที่ล่าสุดที่มี
  // ข้อมูลจริง ตั้งค่าเริ่มต้นแค่ครั้งเดียวหลังรู้ latestAvailableDate แล้ว
  // เพื่อไม่ให้ override ช่วงเวลาที่ผู้ใช้เลือกเองในภายหลัง
  const [range, setRange] = React.useState(() => buildDatePresets(new Date())[2].range);
  const didInitRange = React.useRef(false);
  React.useEffect(() => {
    if (didInitRange.current || !latestAvailableDate) return;
    didInitRange.current = true;
    setRange(buildDatePresets(latestAvailableDate)[2].range); // "7 วันล่าสุด"
  }, [latestAvailableDate]);

  const handleSelectStation = React.useCallback(
    (id) => {
      const next = new URLSearchParams(searchParams);
      if (id) next.set("station", id);
      else next.delete("station");
      next.delete("ds");
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

  // เมื่อเปลี่ยนสถานี (หรือข้อมูลโหลดเสร็จ) และยังไม่มีตัวแปรที่ valid อยู่ใน
  // URL ให้ default ไปที่ตัวแปรแรกของสถานีนั้นโดยอัตโนมัติ
  React.useEffect(() => {
    if (!selectedStationId) return;
    const thing = things.find((t) => String(t["@iot.id"]) === String(selectedStationId));
    const dsList = thing?.Datastreams || [];
    const stillValid = dsList.some(
      (d) => String(d["@iot.id"]) === String(selectedDatastreamId)
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
    (t) => String(t["@iot.id"]) === String(selectedStationId)
  );
  const stationDatastreams = selectedThing?.Datastreams || [];
  const primaryDatastream = stationDatastreams.find(
    (ds) => String(ds["@iot.id"]) === String(selectedDatastreamId)
  );

  // ตัวแปรลม (ถ้ามี) — ใช้ทำ Wind Rose และตัดออกจากรายการ "กราฟย่อยอื่น ๆ"
  const speedDatastream = findDatastreamByKeywords(stationDatastreams, WIND_SPEED_KEYWORDS);
  const directionDatastream = findDatastreamByKeywords(
    stationDatastreams,
    WIND_DIRECTION_KEYWORDS
  );
  const hasWind = Boolean(speedDatastream || directionDatastream);

  // ตัวแปรที่เหลือ (small multiples) — ไม่รวมตัวแปรหลักและทิศทางลม (ไปอยู่ใน
  // wind rose แล้ว) เพื่อไม่ให้ซ้ำกับกราฟหลักด้านบน
  const otherDatastreams = stationDatastreams.filter(
    (ds) =>
      String(ds["@iot.id"]) !== String(primaryDatastream?.["@iot.id"]) &&
      String(ds["@iot.id"]) !== String(directionDatastream?.["@iot.id"])
  );

  // ดึงข้อมูลของตัวแปรหลักตามช่วงเวลากลาง — ใช้ทั้งกับ Insight Summary,
  // Time Series, Bar chart รายวัน และ Heatmap รายชั่วโมง (query ครั้งเดียวใช้ร่วมกัน)
  const {
    rows: primaryRows,
    fetching: primaryFetching,
    error: primaryError,
  } = useObservationsRange(primaryDatastream?.["@iot.id"], range.from, range.to);

  const primarySummary = React.useMemo(() => summarizeObservations(primaryRows), [primaryRows]);
  const primaryUnit = primaryDatastream?.unitOfMeasurement?.symbol || "";
  const primaryName = primaryDatastream?.ObservedProperty?.name || primaryDatastream?.name || "";

  if (loading) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 4 }}>
        <CircularProgress size={20} />
        <Typography sx={{ fontSize: 13.5, color: text.secondary }}>
          กำลังดึงข้อมูลสถานีจาก FROST-Server...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  const noStations = things.length === 0;

  // ความสูงร่วมของทั้ง 2 คอลัมน์ในโซนนี้ (การ์ด "ภาพรวมระบบ" ฝั่งซ้าย +
  // การ์ด "สถานะสถานีทั้งระบบ" ฝั่งขวา) ให้เท่ากันเป๊ะ ๆ เพื่อความสมมาตร
  const CATEGORY_CARD_HEIGHT = 300;

  const overviewCards = [
    { label: "สถานีทั้งหมด", value: things.length, icon: LocationOnRoundedIcon },
    { label: "ตัวแปรที่ตรวจวัด (Datastreams)", value: datastreams.length, icon: ShowChartRoundedIcon },
    {
      label: "ข้อมูลล่าสุด",
      value: latestAvailableDate ? timeAgoLabel(latestAvailableDate) : "ไม่มีข้อมูล",
      icon: UpdateRoundedIcon,
    },
  ];

  return (
    <>
      <Box
        sx={{
          display: "flex",
          alignItems: { xs: "flex-start", sm: "center" },
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1.5,
          mb: 2,
        }}
      >
        <Box>
          <Typography sx={{ fontSize: 20, fontWeight: 500, color: text.head }}>
            Dashboard
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: text.secondary }}>
            สรุปภาพรวมและวิเคราะห์ข้อมูลเชิงลึกของทุกสถานีตรวจวัดในหน้าเดียว
          </Typography>
        </Box>

        {/* แถบเลือกช่วงเวลากลาง — คุมทั้ง Insight Summary และทุกกราฟในหน้านี้ */}
        <DateRangePickerModern
          from={range.from}
          to={range.to}
          onChange={setRange}
          anchorDate={latestAvailableDate}
        />
      </Box>

      {/* 1) Insight Summary: Latest Data banner + KPI ของตัวแปรหลักที่เลือกอยู่ */}
      <InsightSummaryBar
        latestAvailableDate={latestAvailableDate}
        summary={primarySummary}
        unit={primaryUnit}
        variableName={selectedThing ? `${selectedThing.name} · ${primaryName}` : primaryName}
        loading={Boolean(primaryDatastream) && primaryFetching}
        emptyMessage={
          !selectedThing
            ? "เลือกสถานีด้านล่างเพื่อดู Insight Summary ของตัวแปรที่ต้องการ"
            : "ไม่มีข้อมูลของตัวแปรนี้ในช่วงเวลาที่เลือก"
        }
      />

      {/* 2) ภาพรวมระบบ — จัดเป็น 2 คอลัมน์ แยก 2 หมวดชัดเจน:
          ซ้าย  = "ภาพรวมระบบ" (จำนวนสถานี/ตัวแปร/ความสดใหม่ของข้อมูล เป็นลิสต์)
          ขวา   = "สถานะสถานีทั้งระบบ" (Donut แยกตามความสดใหม่ของข้อมูล)
          ทั้งสองคอลัมน์กว้างเท่ากัน (1fr 1fr) และสูงเท่ากัน (CATEGORY_CARD_HEIGHT) */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: 2,
          mb: 3,
        }}
      >
        {/* หมวดที่ 1: ภาพรวมระบบ */}
        <Box
          sx={{
            height: { xs: "auto", md: CATEGORY_CARD_HEIGHT },
            bgcolor: background.paper,
            borderRadius: `${theme.shape.borderRadius + 4}px`,
            border: `1px solid ${divider}`,
            p: 2.5,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: text.primary, mb: 0.25 }}>
            ภาพรวมระบบ
          </Typography>
          <Typography sx={{ fontSize: 11.5, color: text.secondary, mb: 1 }}>
            จำนวนสถานีและตัวแปรที่ตรวจวัดทั้งหมดในระบบ
          </Typography>

          <Box sx={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-evenly" }}>
            {overviewCards.map((c, i) => (
              <React.Fragment key={c.label}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.75, py: 0.75 }}>
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: "14px",
                      bgcolor: `${primary.main}14`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <c.icon sx={{ fontSize: 21, color: primary.main }} />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: 19, fontWeight: 800, color: text.primary, lineHeight: 1.2 }}>
                      {c.value}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: text.secondary }}>{c.label}</Typography>
                  </Box>
                </Box>
                {i < overviewCards.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </Box>
        </Box>

        {/* หมวดที่ 2: สถานะสถานีทั้งระบบ */}
        <DonutChartCard things={things} minHeight={CATEGORY_CARD_HEIGHT} />
      </Box>

      {/* 3) เลือกสถานี — ค้นหาตัวแปรโดยตรง + dropdown + แผนที่ */}
      <Box
        sx={{
          bgcolor: background.paper,
          borderRadius: `${theme.shape.borderRadius + 4}px`,
          border: `1px solid ${divider}`,
          p: { xs: 1.5, sm: 2 },
          mb: 3,
        }}
      >
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.25, mb: 2 }}>
          <Autocomplete
            size="small"
            sx={{ minWidth: 280, flex: 1 }}
            options={queryableDatastreams}
            getOptionLabel={(ds) => `${ds.thingName} · ${ds.ObservedProperty?.name || ds.name}`}
            groupBy={(ds) => ds.thingName}
            value={
              queryableDatastreams.find(
                (ds) => String(ds["@iot.id"]) === String(selectedDatastreamId)
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
                  startAdornment: <SearchRoundedIcon sx={{ fontSize: 17, color: text.secondary, ml: 0.25, mr: 0.5 }} />,
                }}
              />
            )}
          />

          <FormControl size="small" sx={{ minWidth: 240 }} disabled={noStations}>
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
          <Tooltip title="ล้างตัวกรอง">
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
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1.5 }}>
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

            {primaryError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {primaryError}
              </Alert>
            )}

            {/* Priority-based layout: Wind Rose ก่อนเสมอถ้าสถานีมีข้อมูลลม
                เพราะเป็นภาพรวมที่อ่านง่ายและสำคัญที่สุดของสถานีอุตุนิยมวิทยา */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
                gap: 2,
                mb: 2,
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
              <InsightRangedChart datastream={primaryDatastream} from={range.from} to={range.to} />
              <BarChartCard
                rows={primaryRows}
                unit={primaryUnit}
                variableName={primaryName}
                loading={primaryFetching}
              />
              <HeatmapChartCard
                rows={primaryRows}
                unit={primaryUnit}
                variableName={primaryName}
                loading={primaryFetching}
              />
            </Box>

            {/* กราฟย่อยของตัวแปรอื่น ๆ ในสถานีเดียวกัน (small multiples) */}
            {otherDatastreams.length > 0 && (
              <>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: text.primary, mb: 1 }}>
                  ตัวแปรอื่นในสถานีนี้
                </Typography>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                    gap: 2,
                    mb: 2,
                  }}
                >
                  {otherDatastreams.map((ds) => (
                    <InsightRangedChart
                      key={ds["@iot.id"]}
                      datastream={ds}
                      from={range.from}
                      to={range.to}
                    />
                  ))}
                </Box>
              </>
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
              <GridViewRoundedIcon sx={{ fontSize: 18, color: text.secondary }} />
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: text.primary }}>
                รายชื่อสถานีทั้งหมด
              </Typography>
            </Box>

            <ToggleButtonGroup
              size="small"
              exclusive
              value={viewMode}
              onChange={(_, v) => v && setViewMode(v)}
            >
              <ToggleButton value="cards" sx={{ fontSize: 12, px: 1.25, py: 0.25 }}>
                <ViewModuleRoundedIcon sx={{ fontSize: 16, mr: 0.5 }} />
                การ์ดสรุป
              </ToggleButton>
              <ToggleButton value="table" sx={{ fontSize: 12, px: 1.25, py: 0.25 }}>
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
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                      <Typography sx={{ fontSize: 15, fontWeight: 700, color: text.primary }}>
                        {t.name}
                      </Typography>
                      <Chip
                        size="small"
                        label={isStale ? "ไม่มีข้อมูลใหม่" : "ออนไลน์"}
                        color={isStale ? "error" : "success"}
                        variant="outlined"
                      />
                    </Box>
                    <Typography sx={{ fontSize: 12.5, color: text.secondary, mb: 1 }}>
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
                      {stationDs.length} Datastreams · อัปเดต {timeAgoLabel(latest)}
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
