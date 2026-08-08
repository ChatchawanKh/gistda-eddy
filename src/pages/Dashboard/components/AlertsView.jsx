import * as React from "react";
import { useTheme } from "@mui/material/styles";
import { useSearchParams } from "react-router-dom";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";

import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import SensorsRoundedIcon from "@mui/icons-material/SensorsRounded";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import StorageRoundedIcon from "@mui/icons-material/StorageRounded";
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded';


const STALE_HOURS = 24;
const CRITICAL_HOURS = 72;

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function formatElapsed(hours) {
  if (!isFinite(hours)) return "ไม่เคยมีข้อมูล";

  const totalHours = Math.round(hours);
  const totalDays = Math.floor(totalHours / 24);

  if (totalDays < 1) {
    return `${totalHours} ชั่วโมง`;
  }

  return `${totalDays} วัน`;
}

const lastSeenFormatter = new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatLastSeen(isoString) {
  if (!isoString) return null;

  const d = new Date(isoString);

  if (isNaN(d.getTime())) return null;

  return lastSeenFormatter.format(d);
}

// ------------------------------------------------------------
// Status config
// ------------------------------------------------------------

function getStatusConfig(theme, critical) {
  if (critical) {
    return {
      label: "ต้องตรวจสอบด่วน",
      shortLabel: "ด่วน",
      color: theme.palette.error.main,
      bg: `${theme.palette.error.main}0D`,
      border: `${theme.palette.error.main}30`,
      icon: ErrorOutlineRoundedIcon,
    };
  }

  return {
    label: "ควรตรวจสอบ",
    shortLabel: "ตรวจสอบ",
    color: theme.palette.warning?.main || "#D97706",
    bg: `${theme.palette.warning?.main || "#D97706"}0D`,
    border: `${theme.palette.warning?.main || "#D97706"}30`,
    icon: WarningAmberRoundedIcon,
  };
}

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------

export default function AlertsView({ datastreams, loading }) {
  const theme = useTheme();

  const { text, background, divider } = theme.palette;

  const [searchParams, setSearchParams] = useSearchParams();

  const selectedStationId = searchParams.get("station") || "";

  // ----------------------------------------------------------
  // Station filter
  // ----------------------------------------------------------

  const handleSelectStation = React.useCallback(
    (id) => {
      const next = new URLSearchParams(searchParams);

      if (id) {
        next.set("station", id);
      } else {
        next.delete("station");
      }

      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  // ----------------------------------------------------------
  // Loading
  // ----------------------------------------------------------

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 160,
        }}
      >
        <CircularProgress size={22} />
      </Box>
    );
  }

  // ----------------------------------------------------------
  // Stations
  // ----------------------------------------------------------

  const stations = Array.from(
    new Map(
      datastreams.map((ds) => [
        String(ds.thingId),
        ds.thingName,
      ])
    ).entries()
  ).map(([id, name]) => ({
    id,
    name,
  }));

  // ----------------------------------------------------------
  // Filter
  // ----------------------------------------------------------

  const filteredDatastreams = selectedStationId
    ? datastreams.filter(
        (ds) =>
          String(ds.thingId) === String(selectedStationId)
      )
    : datastreams;

  // ----------------------------------------------------------
  // Alerts
  // ----------------------------------------------------------

  const alerts = filteredDatastreams
    .map((ds) => {
      const t = ds.Observations?.[0]?.phenomenonTime;

      const hours = t
        ? (Date.now() - new Date(t).getTime()) / 3600000
        : Infinity;

      return {
        ds,
        t,
        hours,
        stale: hours > STALE_HOURS,
        critical: hours > CRITICAL_HOURS,
      };
    })
    .filter((a) => a.stale)
    .sort((a, b) => b.hours - a.hours);

  // ----------------------------------------------------------
  // Summary
  // ----------------------------------------------------------

  const criticalCount = alerts.filter(
    (a) => a.critical
  ).length;

  const warningCount = alerts.length - criticalCount;

  const affectedStations = new Set(
    alerts.map((a) => String(a.ds.thingId))
  ).size;

  const totalDatastreams = filteredDatastreams.length;

  // ----------------------------------------------------------
  // Render
  // ----------------------------------------------------------

  return (
    <Box sx={{ width: "100%" }}>
      {/* ======================================================
          Header
      ====================================================== */}

      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 2,
          mb: 2.5,
        }}
      >
        <Box sx={{ minWidth: 0, py: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
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
              <NotificationsActiveRoundedIcon
                sx={{
                  fontSize: 20,
                  color: text.head,
                }}
              />
            </Box>
            <Typography
              sx={{
                fontSize: 20,
                fontWeight: 400,
                color: text.head,
              }}
            >
              แจ้งเตือนคุณภาพข้อมูล
            </Typography>
          </Box>

          <Typography
            sx={{
              fontSize: 13,
              color: text.secondary,
              lineHeight: 1.5,
            }}
          >
            แสดงตัวแปรที่ไม่มีข้อมูลใหม่เกิน {STALE_HOURS} ชั่วโมง
          </Typography>

          {/* Total datastream */}
          <Box
            sx={{
              display: {
                xs: "none",
                sm: "flex",
              },
              alignItems: "center",
              gap: 0.75,
              color: text.secondary,
              flexShrink: 0,
              mt: 2,
            }}
          >
            <SensorsRoundedIcon sx={{ fontSize: 16 }} />

            <Typography
              sx={{
                fontSize: 12,
                whiteSpace: "nowrap",
                fontWeight: 500
              }}
            >
              {totalDatastreams} Datastream
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* ======================================================
          Summary
      ====================================================== */}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(3, 1fr)",
          },
          border: `1px solid ${divider}`,
          borderRadius: 2,
          overflow: "hidden",
          bgcolor: background.paper,
          mb: 2.5,
        }}
      >
        {/* Critical */}
        <Box
          sx={{
            px: 2,
            py: 1.5,
            borderRight: {
              xs: "none",
              sm: `1px solid ${divider}`,
            },
            borderBottom: {
              xs: `1px solid ${divider}`,
              sm: "none",
            },
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1,
            }}
          >
            <Box>
              <Typography
                sx={{
                  fontSize: 22,
                  fontWeight: 700,
                  lineHeight: 1.1,
                  color:
                    criticalCount > 0 ? theme.palette.error.main : text.primary,
                }}
              >
                {criticalCount}
              </Typography>

              <Typography
                sx={{
                  fontSize: 14,
                  color: text.secondary,
                  mt: 0.35,
                }}
              >
                ต้องตรวจสอบด่วน
              </Typography>
            </Box>

            <ErrorOutlineRoundedIcon
              sx={{
                fontSize: 20,
                color: criticalCount > 0 ? theme.palette.error.main : divider,
              }}
            />
          </Box>
        </Box>

        {/* Warning */}
        <Box
          sx={{
            px: 2,
            py: 1.5,
            borderRight: {
              xs: "none",
              sm: `1px solid ${divider}`,
            },
            borderBottom: {
              xs: `1px solid ${divider}`,
              sm: "none",
            },
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1,
            }}
          >
            <Box>
              <Typography
                sx={{
                  fontSize: 22,
                  fontWeight: 700,
                  lineHeight: 1.1,
                  color: text.primary,
                }}
              >
                {warningCount}
              </Typography>

              <Typography
                sx={{
                  fontSize: 14,
                  color: text.secondary,
                  mt: 0.35,
                }}
              >
                ควรตรวจสอบ
              </Typography>
            </Box>

            <WarningAmberRoundedIcon
              sx={{
                fontSize: 20,
                color:
                  warningCount > 0
                    ? theme.palette.warning?.main || "#D97706"
                    : divider,
              }}
            />
          </Box>
        </Box>

        {/* Affected stations */}
        <Box
          sx={{
            px: 2,
            py: 1.5,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1,
            }}
          >
            <Box>
              <Typography
                sx={{
                  fontSize: 22,
                  fontWeight: 700,
                  lineHeight: 1.1,
                  color: text.primary,
                }}
              >
                {affectedStations}
                <Typography
                  component="span"
                  sx={{
                    fontSize: 12,
                    fontWeight: 400,
                    color: text.secondary,
                    ml: 0.5,
                  }}
                >
                  / {stations.length}
                </Typography>
              </Typography>

              <Typography
                sx={{
                  fontSize: 14,
                  color: text.secondary,
                  mt: 0.35,
                }}
              >
                สถานีที่ได้รับผลกระทบ
              </Typography>
            </Box>

            <SensorsRoundedIcon
              sx={{
                fontSize: 20,
                color: affectedStations ? text.secondary : divider,
              }}
            />
          </Box>
        </Box>
      </Box>

      {/* ======================================================
          Filter + Result count
      ====================================================== */}

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1.5,
          flexWrap: "wrap",
          mb: 1.5,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            minWidth: 0,
          }}
        >
          <Typography
            sx={{
              fontSize: 14,
              fontWeight: 600,
              color: text.primary,
              whiteSpace: "nowrap",
            }}
          >
            รายการที่ต้องตรวจสอบ
          </Typography>

          {alerts.length > 0 && (
            <Box
              sx={{
                minWidth: 22,
                height: 22,
                px: 0.75,
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: `${theme.palette.primary.main}12`,
                color: theme.palette.primary.main,
              }}
            >
              <Typography
                sx={{
                  fontSize: 11,
                  fontWeight: 700,
                  lineHeight: 1,
                }}
              >
                {alerts.length}
              </Typography>
            </Box>
          )}
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
          }}
        >
          <FormControl
            size="small"
            sx={{
              minWidth: {
                xs: 190,
                sm: 240,
              },
            }}
            disabled={stations.length === 0}
          >
            <InputLabel shrink>กรองตามสถานี</InputLabel>

            <Select
              label="กรองตามสถานี"
              notched
              value={selectedStationId}
              onChange={(e) => handleSelectStation(e.target.value)}
              displayEmpty
              renderValue={(value) => {
                if (!value) {
                  return "ทุกสถานี";
                }

                return (
                  stations.find((s) => String(s.id) === String(value))?.name ||
                  "ทุกสถานี"
                );
              }}
            >
              <MenuItem value="">ทุกสถานี ({stations.length} สถานี)</MenuItem>

              {stations.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
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
                sx={{
                  width: 36,
                  height: 36,
                }}
              >
                <ClearRoundedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>

      {/* ======================================================
          Content
      ====================================================== */}

      {alerts.length === 0 ? (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            p: 2.5,
            border: `1px solid ${divider}`,
            borderRadius: 2,
            bgcolor: background.paper,
          }}
        >
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: 1.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: `${theme.palette.success?.main || "#2E7D32"}0D`,
              color: theme.palette.success?.main || "#2E7D32",
              flexShrink: 0,
            }}
          >
            <TaskAltRoundedIcon sx={{ fontSize: 21 }} />
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: 13.5,
                fontWeight: 600,
                color: text.primary,
              }}
            >
              ข้อมูลทำงานเป็นปกติ
            </Typography>

            <Typography
              sx={{
                fontSize: 12,
                color: text.secondary,
                mt: 0.25,
              }}
            >
              {selectedStationId
                ? "ทุก Datastream ของสถานีนี้มีข้อมูลอัปเดตภายในช่วงเวลาที่กำหนด"
                : "ทุก Datastream มีข้อมูลอัปเดตภายในช่วงเวลาที่กำหนด"}
            </Typography>
          </Box>
        </Box>
      ) : (
        <Box
          sx={{
            border: `1px solid ${divider}`,
            borderRadius: 2,
            bgcolor: background.paper,
            overflow: "hidden",
          }}
        >
          {alerts.map(({ ds, t, hours, critical }, i) => {
            const status = getStatusConfig(theme, critical);

            const StatusIcon = status.icon;

            const lastSeen = formatLastSeen(t);

            return (
              <Box
                key={ds["@iot.id"]}
                sx={{
                  px: {
                    xs: 1.5,
                    sm: 2,
                  },
                  py: 1.75,
                  borderTop: i === 0 ? "none" : `1px solid ${divider}`,
                  transition: "background-color 0.15s ease",
                  "&:hover": {
                    bgcolor: background.default,
                  },
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: {
                      xs: "flex-start",
                      sm: "center",
                    },
                    justifyContent: "space-between",
                    gap: 2,
                  }}
                >
                  {/* --------------------------------------
                        Left
                    --------------------------------------- */}

                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 1.25,
                      minWidth: 0,
                      flex: 1,
                    }}
                  >
                    {/* Status dot */}
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        mt: "6px",
                        borderRadius: "50%",
                        bgcolor: status.color,
                        flexShrink: 0,
                        boxShadow: `0 0 0 3px ${status.color}14`,
                      }}
                    />

                    <Box
                      sx={{
                        minWidth: 0,
                        flex: 1,
                      }}
                    >
                      {/* Station */}
                      <Typography
                        sx={{
                          fontSize: 13.5,
                          fontWeight: 600,
                          color: text.primary,
                          lineHeight: 1.4,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {ds.thingName}
                      </Typography>

                      {/* Datastream */}
                      <Typography
                        sx={{
                          fontSize: 12,
                          color: text.secondary,
                          mt: 0.2,
                        }}
                      >
                        {ds.ObservedProperty?.name || ds.name}
                      </Typography>

                      {/* Time information */}
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: 0.5,
                          mt: 0.75,
                          color: text.secondary,
                        }}
                      >
                        <ScheduleRoundedIcon
                          sx={{
                            fontSize: 13,
                            flexShrink: 0,
                          }}
                        />

                        <Typography
                          sx={{
                            fontSize: 14,
                            lineHeight: 1.4,
                          }}
                        >
                          ขาดข้อมูลมา{" "}
                          <Box
                            component="span"
                            sx={{
                              fontWeight: 600,
                              color: status.color,
                            }}
                          >
                            {formatElapsed(hours)}
                          </Box>
                        </Typography>

                        {lastSeen && (
                          <>
                            <Typography
                              sx={{
                                fontSize: 11,
                                color: divider,
                              }}
                            >
                              ·
                            </Typography>

                            <Typography
                              sx={{
                                fontSize: 14,
                                color: text.secondary,
                              }}
                            >
                              ล่าสุด {lastSeen}
                            </Typography>
                          </>
                        )}
                      </Box>
                    </Box>
                  </Box>

                  {/* --------------------------------------
                        Status
                    --------------------------------------- */}

                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.6,
                      flexShrink: 0,
                      px: 1,
                      py: 0.6,
                      borderRadius: 1.25,
                      bgcolor: status.bg,
                      color: status.color,
                      border: `1px solid ${status.border}`,
                      alignSelf: {
                        xs: "flex-start",
                        sm: "center",
                      },
                    }}
                  >
                    <StatusIcon
                      sx={{
                        fontSize: 14,
                      }}
                    />

                    <Typography
                      sx={{
                        display: {
                          xs: "none",
                          sm: "block",
                        },
                        fontSize: 12,
                        fontWeight: 500,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {status.label}
                    </Typography>

                    <Typography
                      sx={{
                        display: {
                          xs: "block",
                          sm: "none",
                        },
                        fontSize: 11,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {status.shortLabel}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}