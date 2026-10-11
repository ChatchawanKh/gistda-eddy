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
import Fade from "@mui/material/Fade";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import DataSaverOffRoundedIcon from "@mui/icons-material/DataSaverOffRounded";
import UpdateRoundedIcon from "@mui/icons-material/UpdateRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ShowChartRoundedIcon from "@mui/icons-material/ShowChartRounded";
import GridViewRoundedIcon from "@mui/icons-material/GridViewRounded";
import TouchAppRoundedIcon from "@mui/icons-material/TouchAppRounded";

import StationsMap from "./StationsMap";
import InsightRangedChart from "./InsightRangedChart";
import WindRoseChart from "./WindRoseChart";
import BarChartCard from "./BarChartCard";
import HeatmapChartCard from "./HeatmapChartCard";
import InsightSummaryBar from "./InsightSummaryBar";
import DataReceptionPanel from "./DataReceptionPanel";
import DownloadReportButton from "./DownloadReportButton";
import DateRangePickerModern from "./DateRangePickerModern";
import { useObservationsRange } from "../hooks/useObservationsRange";
import {
  flattenDatastreams,
  timeAgoLabel,
  hasObservationData,
  getDataTimeBounds,
} from "../utils/formatters";
import {
  findDatastreamByEddyproColumn,
  findDatastreamByKeywords,
  WIND_SPEED_COLUMN,
  WIND_DIRECTION_COLUMN,
  WIND_SPEED_KEYWORDS,
  WIND_DIRECTION_KEYWORDS,
} from "../utils/insightHelpers";
import {
  summarizeObservations,
  findLatestAvailableDate,
} from "../utils/insightSummary";
import { buildDatePresets } from "../utils/dateRangePresets";
import { getChartColor } from "../utils/chartColors";
import {
  TEMP_UNITS,
  convertTempRows,
  displayTempUnit,
} from "../utils/units";
import Loading from "./Loading";

export default function DashboardInsight({ things, loading, error }) {
  const theme = useTheme();
  const { background, divider, text, primary } = theme.palette;
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedStationId = searchParams.get("station") || "";
  const selectedDatastreamId = searchParams.get("ds") || "";
  // ขยายแผนที่ไปด้านข้าง (คอลัมน์แผนที่กว้างขึ้น เบียดคอลัมน์สรุปทางซ้าย)
  const [mapExpanded, setMapExpanded] = useState(false);
  // หน่วยอุณหภูมิที่แสดง (ใช้ร่วมกันทั้งหน้า) — สลับด้วยปุ่ม ⇄ บนการ์ดกราฟอุณหภูมิ
  // จำค่าไว้ในเบราว์เซอร์ของผู้ใช้ (ถ้าอ่าน/เขียน localStorage ไม่ได้ก็ใช้ K ตามต้นทาง)
  const [tempUnit, setTempUnit] = useState(() => {
    try {
      return localStorage.getItem("dashboard.tempUnit") === TEMP_UNITS.CELSIUS
        ? TEMP_UNITS.CELSIUS
        : TEMP_UNITS.KELVIN;
    } catch {
      return TEMP_UNITS.KELVIN;
    }
  });
  const handleToggleTempUnit = useCallback(() => {
    setTempUnit((u) => {
      const next =
        u === TEMP_UNITS.CELSIUS ? TEMP_UNITS.KELVIN : TEMP_UNITS.CELSIUS;
      try {
        localStorage.setItem("dashboard.tempUnit", next);
      } catch {
        // ไม่มี localStorage (เช่น private mode) — ใช้ค่าในหน้านี้อย่างเดียว
      }
      return next;
    });
  }, []);

  // วันที่ล่าสุดที่มีข้อมูลจริงในระบบ — ฐานของทุก preset ช่วงเวลา (ไม่ใช้วันที่เครื่องผู้ใช้)
  const latestAvailableDate = useMemo(
    () => findLatestAvailableDate(things),
    [things],
  );
  // ช่วงเวลาที่มีข้อมูลทั้งระบบ จาก Datastream.phenomenonTime — จำกัดวันที่ที่เลือกได้
  const dataBounds = useMemo(() => getDataTimeBounds(things), [things]);

  // ช่องค้นหา/เลือกสถานีใช้สไตล์ MuiOutlinedInput จาก Theme.jsx (มุม, สีขอบ,
  // hover/focus) — ปรับแค่ขนาดตัวอักษรให้เข้ากับแถบเครื่องมือที่หนาแน่นกว่าฟอร์มทั่วไป
  const filterFieldSx = {
    "& .MuiInputBase-input": { fontSize: 13 },
    "& .MuiInputLabel-root": { fontSize: 13 },
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

  // หน้านี้ต้องมีสถานีที่เลือกอยู่เสมอ — ไม่มีสถานีใน URL หรือ id ไม่ตรงกับสถานีใด
  // (เช่นลิงก์เก่า) ให้ใช้สถานีแรก
  useEffect(() => {
    if (things.length === 0) return;
    const valid = things.some(
      (t) => String(t["@iot.id"]) === String(selectedStationId),
    );
    if (!valid) handleSelectStation(String(things[0]["@iot.id"]));
  }, [things, selectedStationId, handleSelectStation]);

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
  // หาจาก properties.eddypro_column เป็นหลัก ใช้การจับคำในชื่อเฉพาะสถานีที่ไม่มี
  // eddypro_column เลย (เช่นสถานีในอนาคตที่ไม่ได้นำเข้าจาก EddyPro)
  const stationHasEddyproColumns = stationDatastreams.some(
    (ds) => ds.properties?.eddypro_column,
  );
  const speedDatastream = stationHasEddyproColumns
    ? findDatastreamByEddyproColumn(stationDatastreams, WIND_SPEED_COLUMN)
    : findDatastreamByKeywords(stationDatastreams, WIND_SPEED_KEYWORDS);
  const directionDatastream = stationHasEddyproColumns
    ? findDatastreamByEddyproColumn(stationDatastreams, WIND_DIRECTION_COLUMN)
    : findDatastreamByKeywords(stationDatastreams, WIND_DIRECTION_KEYWORDS);
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

  // แปลงหน่วยอุณหภูมิก่อนสรุป/ส่งเข้ากราฟ — สถิติทุกตัว (รวม % แนวโน้ม) คำนวณ
  // จากค่าที่แสดงจริง เพราะ % เปลี่ยนแปลงของ K กับ °C ไม่เท่ากัน
  const primarySourceUnit = primaryDatastream?.unitOfMeasurement?.symbol || "";
  const primaryUnit = displayTempUnit(primarySourceUnit, tempUnit);
  // ไม่ใช้ useMemo: React Compiler memoize ให้เอง (และ useMemo ตรงนี้ถูกข้าม
  // เพราะ primarySourceUnit มาจาก object ของ things) — ข้อมูลไม่เกิน 3,000 จุด
  const primaryRowsDisplay = convertTempRows(
    primaryRows,
    primarySourceUnit,
    tempUnit,
  );
  const primarySummary = summarizeObservations(primaryRowsDisplay);
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
    },
    {
      label: "ตัวแปรที่ตรวจวัด (Datastreams)",
      value: datastreams.length,
      icon: DataSaverOffRoundedIcon,
    },
    {
      label: "ข้อมูลล่าสุด",
      value: latestAvailableDate
        ? timeAgoLabel(latestAvailableDate)
        : "ไม่มีข้อมูล",
      icon: UpdateRoundedIcon,
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
          bgcolor: background.paper,
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
                  bgcolor: theme.palette.action.hover,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mr: 1,
                }}
              >
                <GridViewRoundedIcon sx={{ fontSize: 20, color: text.head }} />
              </Box>
              <Typography variant="h5" component="h1" sx={{ color: text.head }}>
                Dashboard
              </Typography>
            </Box>

            <Typography variant="body2">
              สรุปภาพรวมและวิเคราะห์ข้อมูลแต่ละสถานี
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
            ...theme.custom.card,
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
              value={selectedThing ? selectedStationId : ""}
              onChange={(e) => handleSelectStation(e.target.value)}
              sx={{ fontSize: 13 }}
            >
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
            minDate={dataBounds?.min}
            maxDate={dataBounds?.max}
            anchorDate={latestAvailableDate}
          />

          {/* ดาวน์โหลดรายงาน (.txt แบบ FluxSuite / .csv) ของสถานี + ช่วงเวลาที่เลือก */}
          <DownloadReportButton
            thing={selectedThing}
            from={range.from}
            to={range.to}
          />
        </Box>
      </Box>

      <Box sx={{ pt: 2 }}>
        {/* 1) ซ้าย: ภาพรวมระบบ + Insight Summary / ขวา: แผนที่เลือกสถานี
            จอเล็กจะเรียงซ้อนกันเป็นคอลัมน์เดียว */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              // ปกติ 60:40 — กดขยายแผนที่แล้วแผนที่กว้างขึ้นเบียดคอลัมน์ซ้ายเป็น 40:60
              lg: mapExpanded
                ? "minmax(0, 2fr) minmax(0, 3fr)"
                : "minmax(0, 3fr) minmax(0, 2fr)",
            },
            transition: "grid-template-columns 250ms ease",
            gap: 2,
            alignItems: "stretch", // ให้สองคอลัมน์สูงเท่ากัน
            mb: 3,
          }}
        >
          <Box
            sx={{
              ...theme.custom.card,
              bgcolor: background.default,
              p: { xs: 1.5, sm: 2 },
              minWidth: 0,
            }}
          >
            {/* ภาพรวมระบบ — Tag */}
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
                  color="primary"
                  sx={{
                    height: 28,
                    "& .MuiChip-icon": { color: "inherit", ml: 1.25 },
                    "& .MuiChip-label": { px: 1 },
                  }}
                />
              ))}
            </Box>

            {/* Insight Summary: Latest Data banner + KPI ของตัวแปรหลักที่เลือกอยู่ */}
            <InsightSummaryBar
              latestAvailableDate={latestAvailableDate}
              summary={primarySummary}
              rows={primaryRowsDisplay}
              unit={primaryUnit}
              loading={Boolean(primaryDatastream) && primaryFetching}
            />
          </Box>

          {/* แผนที่เลือกสถานี — ไม่ sticky เพราะกินพื้นที่มาก เลื่อนผ่านได้ตามปกติ */}
          <Box
            sx={{
              ...theme.custom.card,
              p: { xs: 1.5, sm: 2 },
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <StationsMap
              things={things}
              selectedStationId={selectedStationId}
              onSelectStation={handleSelectStation}
              fillHeight
              expanded={mapExpanded}
              onToggleExpand={() => setMapExpanded((v) => !v)}
            />
          </Box>
        </Box>

        {/* 2) รายละเอียด + Multi-chart Dashboard ของสถานีที่เลือก */}
        {selectedThing ? (
          <Fade in key={selectedThing["@iot.id"]} timeout={280}>
            <Box sx={{ py: 10 }}>
              {primaryError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {primaryError}
                </Alert>
              )}

              {/* โซนรายละเอียดตัวแปรหลัก — Wind Rose มาก่อนถ้าสถานีมีข้อมูลลม */}
              <Box
                sx={{
                  border: `1px solid ${alpha(primary.main, 0.2)}`,
                  bgcolor: alpha(primary.main, 0.025),
                  borderRadius: `${theme.shape.borderRadius}px`,
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
                {/* ชื่อสถานี · ตัวแปร อยู่บรรทัดบน ส่วน pill คำแนะนำอยู่บรรทัดถัดไป */}
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: 1,
                    mb: 2,
                  }}
                >
                  {primaryDatastream && (
                    <Typography sx={{ fontSize: 12, color: text.secondary }}>
                      {`${selectedThing.name} · ${primaryName}${
                        primaryUnit ? ` (${primaryUnit})` : ""
                      }`}
                    </Typography>
                  )}
                  {/* คำแนะนำการเปลี่ยนตัวแปร — ทำเป็น pill เด่น และกดแล้วเลื่อนลงไป
                      ส่วน "ตัวแปรอื่นในสถานีนี้" ตามที่ข้อความบอก */}
                  {otherDatastreams.length > 0 && (
                    <Box
                      component="button"
                      type="button"
                      onClick={() =>
                        document
                          .getElementById("other-datastreams")
                          ?.scrollIntoView({ behavior: "smooth", block: "start" })
                      }
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 0.75,
                        border: `1px solid ${alpha(primary.main, 0.25)}`,
                        bgcolor: theme.palette.action.hover,
                        color: primary.dark,
                        borderRadius: 50,
                        px: 1.5,
                        py: 0.5,
                        fontFamily: "inherit",
                        fontSize: 12.5,
                        fontWeight: 400,
                        cursor: "pointer",
                        transition: "background-color 0.15s ease, border-color 0.15s ease",
                        "&:hover": {
                          bgcolor: theme.palette.action.selected,
                          borderColor: primary.main,
                        },
                        "&:focus-visible": theme.custom.cardInteractive["&:focus-visible"],
                      }}
                    >
                      <TouchAppRoundedIcon sx={{ fontSize: 16 }} />
                      เลือกตัวแปรจากการ์ดด้านล่างเพื่อดูรายละเอียด
                      {/* <SouthRoundedIcon sx={{ fontSize: 14 }} /> */}
                    </Box>
                  )}
                </Box>

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
                    tempUnit={tempUnit}
                    onToggleTempUnit={handleToggleTempUnit}
                  />
                  <BarChartCard
                    rows={primaryRowsDisplay}
                    unit={primaryUnit}
                    variableName={primaryName}
                    loading={primaryFetching}
                    color={primaryColor}
                    datastreamId={primaryDatastream?.["@iot.id"]}
                    from={range.from}
                    to={range.to}
                  />
                  <HeatmapChartCard
                    rows={primaryRowsDisplay}
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
                // id = ปลายทางของ pill "คลิกการ์ดตัวแปรอื่น..." ด้านบน
                // scrollMarginTop กันหัวข้อไปอยู่ใต้แถบตัวกรองที่ sticky อยู่
                <Box id="other-datastreams" sx={{ mb: 3, scrollMarginTop: 180 }}>
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
                    คลิกการ์ดเพื่อสลับไปดูรายละเอียดของตัวแปรนั้นแทน
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
                        onSelect={handleSelectDatastream}
                        tempUnit={tempUnit}
                        onToggleTempUnit={handleToggleTempUnit}
                      />
                    ))}
                  </Box>
                </Box>
              )}

              {/* สถานะการรับข้อมูลรายอุปกรณ์ — ข้อเท็จจริงจาก API เท่านั้น
                  วางไว้ล่างสุดเพราะเป็นข้อมูลเชิงปฏิบัติการ ไม่ใช่สิ่งที่ผู้ใช้มาดูเป็นหลัก */}
              <DataReceptionPanel
                thing={selectedThing}
                from={range.from}
                to={range.to}
              />
            </Box>
          </Fade>
        ) : noStations ? (
          <Box
            sx={{
              border: `1px dashed ${divider}`,
              borderRadius: `${theme.shape.borderRadius}px`,
              p: 5,
              textAlign: "center",
            }}
          >
            <Typography sx={{ fontSize: 13.5, color: text.secondary }}>
              ยังไม่มีสถานีตรวจวัดในระบบ
            </Typography>
          </Box>
        ) : null}
      </Box>
    </>
  );
}
