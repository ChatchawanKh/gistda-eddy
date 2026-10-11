// สถานะการรับข้อมูลของสถานีหนึ่ง จัดกลุ่มตามอุปกรณ์ (Datastream → Sensor.name)
// แสดงเฉพาะข้อเท็จจริงจาก FROST-Server: เวลาข้อมูลล่าสุด (phenomenonTime) และ
// จำนวน Observation ในช่วงเวลาที่เลือก ($count) — ไม่มีสีสถานะ/เปอร์เซ็นต์/เกณฑ์ใด ๆ
// เพราะ API ไม่มีค่าอ้างอิงให้ตัดสินว่า "ปกติ" หรือ "ผิดปกติ"
// จัดกลุ่มด้วย Sensor.name ไม่ใช่ @iot.id เพราะใน FROST มี Sensor แยก entity ต่อ
// Datastream แต่ชื่อซ้ำกันสำหรับอุปกรณ์ตัวเดียวกัน
import { useMemo } from "react";
import { alpha, useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Skeleton from "@mui/material/Skeleton";
import Alert from "@mui/material/Alert";
import SensorsRoundedIcon from "@mui/icons-material/SensorsRounded";

import { useObservationCounts } from "../hooks/useObservationCounts";
import { formatUtcLabel } from "../utils/insightSummary";

const NO_SENSOR = "ไม่ระบุอุปกรณ์";

function latestTimeOf(ds) {
  return ds.Observations?.[0]?.phenomenonTime || null;
}

export default function DataReceptionPanel({ thing, from, to }) {
  const theme = useTheme();
  const { text, divider, primary } = theme.palette;
  const radius = theme.shape.borderRadius;

  const datastreams = useMemo(() => thing?.Datastreams || [], [thing]);
  const { counts, fetching, error } = useObservationCounts(
    datastreams.map((ds) => ds["@iot.id"]),
    from,
    to,
  );

  // คงลำดับกลุ่มตาม Datastream ตัวแรกที่เจอ (เรียงตาม @iot.id จาก API)
  const groups = useMemo(() => {
    const map = new Map();
    datastreams.forEach((ds) => {
      const key = ds.Sensor?.name || NO_SENSOR;
      if (!map.has(key)) {
        map.set(key, {
          name: key,
          description: ds.Sensor?.description || "",
          datastreams: [],
        });
      }
      map.get(key).datastreams.push(ds);
    });
    return Array.from(map.values()).map((g) => ({
      ...g,
      // ISO 8601 UTC เทียบแบบ string ได้ตรง
      latest:
        g.datastreams
          .map(latestTimeOf)
          .filter(Boolean)
          .sort()
          .pop() || null,
    }));
  }, [datastreams]);

  if (datastreams.length === 0) return null;

  return (
    <Box
      sx={{
        ...theme.custom.card,
        p: { xs: 1.5, sm: 2 },
        mb: 3,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.25 }}>
        <SensorsRoundedIcon sx={{ fontSize: 18, color: text.secondary }} />
        <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: text.primary }}>
          สถานะการรับข้อมูล ({groups.length} อุปกรณ์)
        </Typography>
      </Box>
      <Typography sx={{ fontSize: 11.5, color: text.secondary, mb: 1.5 }}>
        เวลาข้อมูลล่าสุด และจำนวนข้อมูลที่ได้รับในช่วงเวลาที่เลือก
        ของแต่ละอุปกรณ์ — ดึงจาก FROST-Server โดยตรง
      </Typography>

      {error && (
        <Alert severity="warning" sx={{ mb: 1.5, fontSize: 12 }}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 1.5,
        }}
      >
        {groups.map((g) => (
          <Box
            key={g.name}
            sx={{
              border: `1px solid ${divider}`,
              borderRadius: `${radius}px`,
              p: 1.5,
              minWidth: 0,
            }}
          >
            <Typography
              sx={{ fontSize: 13, fontWeight: 700, color: text.primary }}
            >
              {g.name}
            </Typography>
            {g.description && (
              <Typography sx={{ fontSize: 11.5, color: text.secondary }}>
                {g.description}
              </Typography>
            )}
            <Box
              sx={{
                mt: 1,
                mb: 1,
                px: 1,
                py: 0.5,
                borderRadius: `${theme.custom.radiusSm}px`,
                bgcolor: alpha(primary.main, 0.06),
              }}
            >
              <Typography sx={{ fontSize: 11, color: text.secondary }}>
                ข้อมูลล่าสุด
              </Typography>
              <Typography
                sx={{ fontSize: 12.5, fontWeight: 600, color: text.primary }}
              >
                {formatUtcLabel(g.latest)}
              </Typography>
            </Box>

            {/* รายการตัวแปร: ชื่อ — จำนวนข้อมูลในช่วงที่เลือก
                แสดงเวลาล่าสุดรายตัวเฉพาะเมื่อไม่ตรงกับเวลาล่าสุดของอุปกรณ์ */}
            {g.datastreams.map((ds) => {
              const id = ds["@iot.id"];
              const dsLatest = latestTimeOf(ds);
              const count = counts[id];
              return (
                <Box
                  key={id}
                  sx={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    gap: 1,
                    py: 0.4,
                    borderTop: `1px dashed ${divider}`,
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontSize: 12,
                        color: text.primary,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {ds.ObservedProperty?.name || ds.name}
                    </Typography>
                    {dsLatest !== g.latest && (
                      <Typography sx={{ fontSize: 10.5, color: text.secondary }}>
                        ล่าสุด {formatUtcLabel(dsLatest)}
                      </Typography>
                    )}
                  </Box>
                  {fetching ? (
                    <Skeleton width={56} height={18} />
                  ) : (
                    <Typography
                      sx={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: text.primary,
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                    >
                      {count === undefined
                        ? "-"
                        : `${count.toLocaleString("th-TH")} ค่า`}
                    </Typography>
                  )}
                </Box>
              );
            })}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
