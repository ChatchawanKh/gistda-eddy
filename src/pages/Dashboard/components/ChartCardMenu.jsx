// ปุ่มเมนู 3 จุด (MoreVertRoundedIcon) ที่มุมขวาของหัวการ์ดกราฟทุกใบ
// เปิดเมนู: ดูแบบเต็มจอ / ดาวน์โหลด PNG / ดาวน์โหลด CSV โดยเรียก Highcharts API
// ผ่าน chartRef (ref ของ <HighchartsReact />) — style ปุ่ม/เมนูมาจาก
// theme.custom.chartMenuButton + theme.custom.chartMenuPaper (Theme.jsx)
// ให้ทุกกราฟหน้าตาเหมือนกัน
import { useState } from "react";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import FullscreenRoundedIcon from "@mui/icons-material/FullscreenRounded";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import GridOnRoundedIcon from "@mui/icons-material/GridOnRounded";

export default function ChartCardMenu({ chartRef, disabled = false, sx }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleOpen = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleFullscreen = () => {
    handleClose();
    chartRef?.current?.chart?.fullscreen?.toggle();
  };
  const handleDownloadPng = () => {
    handleClose();
    chartRef?.current?.chart?.exportChartLocal({ type: "image/png" });
  };
  const handleDownloadCsv = () => {
    handleClose();
    chartRef?.current?.chart?.downloadCSV();
  };

  return (
    <>
      <IconButton
        size="small"
        aria-label="ตัวเลือกกราฟ"
        aria-haspopup="true"
        disabled={disabled}
        onClick={handleOpen}
        sx={[
          (theme) => theme.custom.chartMenuButton,
          ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
        ]}
      >
        <MoreVertRoundedIcon fontSize="small" />
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: (theme) => theme.custom.chartMenuPaper } }}
      >
        <MenuItem onClick={handleFullscreen}>
          <ListItemIcon>
            <FullscreenRoundedIcon />
          </ListItemIcon>
          <ListItemText>ดูแบบเต็มจอ</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDownloadPng}>
          <ListItemIcon>
            <ImageOutlinedIcon />
          </ListItemIcon>
          <ListItemText>ดาวน์โหลดรูปภาพ (PNG)</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDownloadCsv}>
          <ListItemIcon>
            <GridOnRoundedIcon />
          </ListItemIcon>
          <ListItemText>ดาวน์โหลดข้อมูล (CSV)</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}
