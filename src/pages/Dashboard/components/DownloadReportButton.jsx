// ปุ่ม "ดาวน์โหลดรายงาน" ในแถบตัวกรอง — เลือกได้ 2 รูปแบบ (.txt แบบ FluxSuite /
// .csv) ใช้สถานีและช่วงเวลาที่เลือกอยู่ในแถบตัวกรอง ดึงข้อมูลครบทุกหน้าจาก FROST
// (ไม่ติดเพดาน 3,000 จุดของกราฟ) ดู utils/reportExport.js
import { useState } from "react";
import Button from "@mui/material/Button";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Tooltip from "@mui/material/Tooltip";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import GridOnRoundedIcon from "@mui/icons-material/GridOnRounded";
import { useTheme } from "@mui/material/styles";

import {
  fetchReportTable,
  buildTxt,
  buildCsv,
  reportFileName,
  downloadTextFile,
} from "../utils/reportExport";

const FORMATS = {
  txt: {
    label: "ดาวน์โหลดไฟล์ .txt",
    icon: DescriptionOutlinedIcon,
    build: buildTxt,
    mime: "text/plain",
  },
  csv: {
    label: "ดาวน์โหลดไฟล์ .csv",
    icon: GridOnRoundedIcon,
    build: buildCsv,
    mime: "text/csv",
  },
};

export default function DownloadReportButton({ thing, from, to }) {
  const theme = useTheme();
  const { text } = theme.palette;
  const [anchorEl, setAnchorEl] = useState(null);
  const [progress, setProgress] = useState(null); // { done, total } ระหว่างดึงข้อมูล
  const [message, setMessage] = useState(null); // { severity, text }

  const busy = progress !== null;
  const disabled = !thing || !from || !to || busy;

  const handleDownload = async (ext) => {
    setAnchorEl(null);
    const format = FORMATS[ext];
    setProgress({ done: 0, total: thing.Datastreams?.length || 0 });
    try {
      const table = await fetchReportTable(thing, from, to, (done, total) =>
        setProgress({ done, total }),
      );
      if (table.rows.length === 0) {
        setMessage({
          severity: "info",
          text: "ไม่มีข้อมูลของสถานีนี้ในช่วงเวลาที่เลือก",
        });
        return;
      }
      downloadTextFile(
        format.build(table),
        reportFileName(thing, from, to, ext),
        format.mime,
      );
      setMessage({
        severity: "success",
        text: `ดาวน์โหลดแล้ว ${table.rows.length.toLocaleString("th-TH")} แถว × ${table.columns.length} ตัวแปร`,
      });
    } catch (err) {
      setMessage({
        severity: "error",
        text: err?.message || "ดาวน์โหลดไม่สำเร็จ",
      });
    } finally {
      setProgress(null);
    }
  };

  return (
    <>
      <Tooltip
        title={
          !thing
            ? "เลือกสถานีก่อน เพื่อดาวน์โหลดรายงาน"
            : "ดาวน์โหลดข้อมูลทุกตัวแปรของสถานีนี้ ในช่วงเวลาที่เลือก"
        }
      >
        {/* span ให้ tooltip ทำงานตอนปุ่ม disabled */}
        <span>
          <Button
            variant="outlined"
            disabled={disabled}
            onClick={(e) => setAnchorEl(e.currentTarget)}
            startIcon={
              busy ? (
                <CircularProgress size={16} />
              ) : (
                <FileDownloadOutlinedIcon sx={{ fontSize: 18 }} />
              )
            }
            endIcon={
              !busy && <KeyboardArrowDownRoundedIcon sx={{ fontSize: 18 }} />
            }
            sx={{
              fontSize: 13,
              color: text.secondary,
              fontWeight: 400,
              px: 1.5,
              py: 0.85,
              whiteSpace: "nowrap",
            }}
            aria-haspopup="menu"
            aria-expanded={Boolean(anchorEl)}
          >
            {busy
              ? `กำลังเตรียมไฟล์ ${progress.done}/${progress.total}`
              : "ดาวน์โหลดรายงาน"}
          </Button>
        </span>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: { sx: { ...theme.custom.chartMenuPaper, mt: 0.75 } },
        }}
      >
        {Object.entries(FORMATS).map(([ext, f]) => (
          <MenuItem key={ext} onClick={() => handleDownload(ext)}>
            <ListItemIcon>
              <f.icon />
            </ListItemIcon>
            <ListItemText>{f.label}</ListItemText>
          </MenuItem>
        ))}
      </Menu>

      {message && (
        <Snackbar
          open
          autoHideDuration={5000}
          onClose={() => setMessage(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Alert
            severity={message.severity}
            onClose={() => setMessage(null)}
            variant="filled"
            sx={{ fontSize: 13 }}
          >
            {message.text}
          </Alert>
        </Snackbar>
      )}
    </>
  );
}
