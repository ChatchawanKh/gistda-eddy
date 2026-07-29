import * as React from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";

import WarningRoundedIcon from "@mui/icons-material/WarningRounded";
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded";
import InfoRoundedIcon from "@mui/icons-material/InfoRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";

import { alpha, useTheme } from "@mui/material/styles";

const ICONS = {
  error: ErrorRoundedIcon,
  warning: WarningRoundedIcon,
  info: InfoRoundedIcon,
  success: CheckCircleRoundedIcon,
};

export default function ConfirmDialog({
  open,
  title = "ยืนยันการดำเนินการ",
  message,
  confirmLabel = "ยืนยัน",
  cancelLabel = "ยกเลิก",
  severity = "warning",
  loading = false,
  onConfirm,
  onCancel,
}) {
  const theme = useTheme();

  // ===== แคช props ล่าสุดไว้ตอนที่ open === true =====
  // สาเหตุของบั๊ก "ปิดแล้ว UI ค้างสีน้ำเงิน": หลายจุดที่เรียกใช้ ConfirmDialog
  // คำนวณ props (โดยเฉพาะ severity) มาจาก state ตัวหนึ่ง เช่น
  //   severity={statusTarget?.is_active ? "warning" : "info"}
  //   onCancel={() => setStatusTarget(null)}
  // พอกดปิด state ต้นทาง (statusTarget) จะถูกเคลียร์เป็น null "ทันที" ทำให้
  // severity เปลี่ยนไปเป็นค่า fallback ("info" = สีน้ำเงิน) ก่อน Dialog ของ MUI
  // จะเล่น exit animation จบ (~225ms) จึงเห็น dialog กระพริบเปลี่ยนสีตอนกำลังปิด
  //
  // ทางแก้: เก็บ props ที่ได้รับล่าสุดตอน open=true ไว้ใน state (ผ่าน useEffect
  // ไม่ใช่การอ่าน/เขียน ref ระหว่าง render ซึ่ง React ห้ามไว้) แล้วใช้ค่านั้น
  // render ต่อระหว่างช่วง exit transition แทนที่จะอ่านค่าที่เปลี่ยนไปแล้วสดๆ
  const [displayed, setDisplayed] = React.useState({
    title,
    message,
    confirmLabel,
    cancelLabel,
    severity,
  });

  React.useLayoutEffect(() => {
    if (open) {
      setDisplayed({ title, message, confirmLabel, cancelLabel, severity });
    }
    // ตอน open เป็น false ตั้งใจไม่อัปเดต เพื่อคงค่าล่าสุดไว้ระหว่าง exit animation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, title, message, confirmLabel, cancelLabel, severity]);

  const color =
    theme.palette[displayed.severity]?.main || theme.palette.warning.main;

  const Icon = ICONS[displayed.severity] || WarningRoundedIcon;

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onCancel}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: "hidden",
        },
      }}
    >
      

      <DialogTitle
        sx={{
          pt: 2.5,
          px: 3,
          pb: 1,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            bgcolor: alpha(color, 0.1),
            flexShrink: 0,
          }}
        >
          <Icon
            sx={{
              color,
              fontSize: 22,
            }}
          />
        </Box>

        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            fontSize: "1.1rem",
            letterSpacing: 0,
          }}
        >
          {displayed.title}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ px: 3, pb: 1 }}>
        <Typography
          sx={{
            color: "text.secondary",
            lineHeight: 1.6,
            fontSize: 14,
            fontWeight: 400,
          }}
        >
          {displayed.message}
        </Typography>
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          pb: 3,
          pt: 1.5,
          gap: 1,
        }}
      >
        <Button
          fullWidth
          variant="outlined"
          onClick={onCancel}
          disabled={loading}
          sx={{
            textTransform: "none",
            borderRadius: 2,
            py: 1,
            fontWeight: 500,
            borderColor: alpha(color, 0.35),
            color,
            bgcolor: "transparent",

            "&:hover": {
              bgcolor: alpha(color, 0.06),
              borderColor: color,
            },
          }}
        >
          {displayed.cancelLabel}
        </Button>

        <Button
          fullWidth
          variant="contained"
          color={displayed.severity === "info" ? "primary" : displayed.severity}
          onClick={onConfirm}
          disabled={loading}
          startIcon={!loading && <CheckRoundedIcon />}
          sx={{
            textTransform: "none",
            borderRadius: 2,
            py: 1,
            fontWeight: 600,
            boxShadow: "none",
          }}
        >
          {loading ? "กำลังดำเนินการ..." : displayed.confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}