// src/pages/Dashboard/components/StationDatastreamsTable.jsx
// แยกออกมาจาก StationsList.jsx เพื่อใช้ซ้ำได้ทั้งหน้า "สถานีตรวจวัด"
// และหน้า "ภาพรวมสถานี" (ตอนเลือกดูสถานีใดสถานีหนึ่ง)
//
// รองรับโหมด interactive (ใช้ในหน้าภาพรวมสถานี): ส่ง selectedDatastreamId +
// onSelectDatastream เข้ามา เพื่อให้กราฟ "ตัวแปรหลัก" ของ DashboardInsight.jsx
// เปลี่ยนตามได้ทันที — ถ้าไม่ส่งสอง props นี้เข้ามา ตารางจะทำงานเหมือนเดิมทุกประการ
//
// แถวของตัวแปรที่ไม่เคยมี Observation เลย จะถูก "ปิด" ไม่ให้คลิก (ป้องกันการ
// เลือกดูกราฟของตัวแปรที่ไม่มีข้อมูลจริง) พร้อมสไตล์แบบจางลงและ tooltip อธิบาย
import * as React from "react";
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tooltip from "@mui/material/Tooltip";

import { timeAgoLabel, hasObservationData } from "../utils/formatters";

export default function StationDatastreamsTable({
  thing,
  selectedDatastreamId,
  onSelectDatastream,
}) {
  const theme = useTheme();
  const { text, background, divider, primary } = theme.palette;
  const loc = thing.Locations?.[0]?.location?.coordinates;
  const interactive = typeof onSelectDatastream === "function";

  return (
    <TableContainer
      sx={{
        border: `1px solid ${divider}`,
        borderRadius: `${theme.shape.borderRadius + 2}px`,
        bgcolor: background.paper,
        height: "100%",
      }}
    >
      <Box sx={{ p: 2, borderBottom: `1px solid ${divider}` }}>
        <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{thing.name}</Typography>
        <Typography sx={{ fontSize: 12, color: text.secondary }}>
          {thing.description}
          {loc ? ` · พิกัด ${loc[1]?.toFixed(4)}, ${loc[0]?.toFixed(4)}` : ""}
        </Typography>
        {interactive && (
          <Typography sx={{ fontSize: 11.5, color: primary.main, mt: 0.5 }}>
            คลิกแถวเพื่อดูกราฟของตัวแปรนั้น
          </Typography>
        )}
      </Box>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>ตัวแปร (Datastream)</TableCell>
            <TableCell>หน่วย</TableCell>
            <TableCell>ค่าล่าสุด</TableCell>
            <TableCell>เวลา</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {(thing.Datastreams || []).map((ds) => {
            const isSelected =
              interactive && String(ds["@iot.id"]) === String(selectedDatastreamId);
            const rowHasData = hasObservationData(ds);
            const isClickable = interactive && rowHasData;

            const row = (
              <TableRow
                key={ds["@iot.id"]}
                hover={isClickable}
                selected={isSelected}
                onClick={isClickable ? () => onSelectDatastream(ds) : undefined}
                aria-disabled={interactive && !rowHasData}
                sx={{
                  cursor: isClickable ? "pointer" : interactive ? "not-allowed" : "default",
                  transition: "background-color 0.15s ease",
                  ...(interactive &&
                    !rowHasData && {
                      opacity: 0.5,
                      "& .MuiTableCell-root": { color: text.secondary },
                    }),
                  ...(isSelected && {
                    bgcolor: `${primary.main}14`,
                    "& .MuiTableCell-root": { color: primary.main, fontWeight: 600 },
                  }),
                }}
              >
                <TableCell>{ds.ObservedProperty?.name || ds.name}</TableCell>
                <TableCell>{ds.unitOfMeasurement?.symbol || "-"}</TableCell>
                <TableCell>{ds.Observations?.[0]?.result ?? "-"}</TableCell>
                <TableCell>{timeAgoLabel(ds.Observations?.[0]?.phenomenonTime)}</TableCell>
              </TableRow>
            );

            if (interactive && !rowHasData) {
              return (
                <Tooltip
                  key={ds["@iot.id"]}
                  title="ตัวแปรนี้ยังไม่เคยมีข้อมูล จึงยังดูกราฟไม่ได้"
                  arrow
                >
                  {row}
                </Tooltip>
              );
            }
            return row;
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
