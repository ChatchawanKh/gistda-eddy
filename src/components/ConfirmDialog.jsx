// src/components/ConfirmDialog.jsx
// Dialog ยืนยันการทำงานแบบใช้ซ้ำได้ทั่วโปรเจกต์ — ใช้แทน window.confirm(...)
//
// ตัวอย่างการใช้งาน:
//   const [target, setTarget] = useState(null); // เก็บข้อมูลของสิ่งที่จะลบ/ยืนยัน
//
//   <ConfirmDialog
//     open={Boolean(target)}
//     title="ยืนยันการลบผู้ใช้งาน"
//     message={`ต้องการลบผู้ใช้งาน "${target?.email}" ใช่หรือไม่? การลบไม่สามารถย้อนกลับได้`}
//     confirmLabel="ลบผู้ใช้งาน"
//     severity="error"
//     loading={deleting}
//     onCancel={() => setTarget(null)}
//     onConfirm={handleConfirmDelete}
//   />
import * as React from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import WarningRoundedIcon from "@mui/icons-material/WarningRounded";
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded";
import InfoRoundedIcon from "@mui/icons-material/InfoRounded";
import { useTheme, alpha } from "@mui/material/styles";

const ICONS = {
  error: ErrorRoundedIcon,
  warning: WarningRoundedIcon,
  info: InfoRoundedIcon,
};

export default function ConfirmDialog({
  open,
  title = "ยืนยันการดำเนินการ",
  message,
  confirmLabel = "ยืนยัน",
  cancelLabel = "ยกเลิก",
  severity = "warning", // "error" (สีแดง เช่นลบ) | "warning" (สีเหลือง เช่นระงับ) | "info" (สีน้ำเงิน)
  loading = false,
  onConfirm,
  onCancel,
}) {
  const theme = useTheme();
  const color = theme.palette[severity]?.main || theme.palette.warning.main;
  const Icon = ICONS[severity] || WarningRoundedIcon;

  return (
    <Dialog open={open} onClose={loading ? undefined : onCancel} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.5, fontWeight: 800 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            bgcolor: alpha(color, 0.12),
            flexShrink: 0,
          }}
        >
          <Icon sx={{ color, fontSize: 20 }} />
        </Box>
        {title}
      </DialogTitle>
      <DialogContent>
        <DialogContentText component="div" sx={{ color: "text.primary" }}>
          {message}
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onCancel} disabled={loading} sx={{ textTransform: "none" }}>
          {cancelLabel}
        </Button>
        <Button
          onClick={onConfirm}
          disabled={loading}
          variant="contained"
          color={severity === "info" ? "primary" : severity}
          sx={{ textTransform: "none", fontWeight: 700 }}
        >
          {loading ? "กำลังดำเนินการ..." : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
