import { memo, useState, useEffect, useMemo, useCallback } from "react";
import { useTheme, alpha } from "@mui/material/styles";

import {
  TableContainer,
  Box,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableSortLabel,
  TableBody,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Stack,
  Paper,
  Collapse,
  Fade,
  Divider,
} from "@mui/material";

import PersonAddRoundedIcon from "@mui/icons-material/PersonAddRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import LockResetRoundedIcon from "@mui/icons-material/LockResetRounded";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import RadioButtonUncheckedRoundedIcon from "@mui/icons-material/RadioButtonUncheckedRounded";
import HourglassTopRoundedIcon from "@mui/icons-material/HourglassTopRounded";
import HowToRegRoundedIcon from "@mui/icons-material/HowToRegRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import UnfoldMoreRoundedIcon from "@mui/icons-material/UnfoldMoreRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";

import axiosClient from "../../api/axiosClient";
import ConfirmDialog from "../../components/ConfirmDialog";
import { useAuth } from "../../context/auth-context";
// util ฝั่ง client เดียวกับที่ใช้ในหน้า Register / ResetPassword / SettingsSection
import { validatePassword } from "../../../server/auth/utils/validatePassword";

const emptyForm = {
  email: "",
  password: "",
  confirmPassword: "",
  full_name: "",
  role_name: "user",
};

// คอลัมน์ที่รองรับการเรียงลำดับ พร้อมฟังก์ชันดึงค่าที่ใช้เปรียบเทียบของแต่ละแถว
const SORT_ACCESSORS = {
  email: (u) => (u.email || "").toLowerCase(),
  full_name: (u) => (u.full_name || "").toLowerCase(),
  role_name: (u) => (u.role_name || "").toLowerCase(),
  status: (u) => (!u.is_approved ? 0 : u.is_active ? 2 : 1), // รอการอนุมัติ < ระงับ < ใช้งานได้
  last_login_at: (u) =>
    u.last_login_at ? new Date(u.last_login_at).getTime() : 0,
};

const BULK_ACTION_LABELS = {
  activate: {
    title: "ยืนยันการเปิดใช้งานบัญชีหลายรายการ",
    confirmLabel: "เปิดใช้งานทั้งหมด",
    color: "primary",
  },
  deactivate: {
    title: "ยืนยันการระงับการใช้งานบัญชีหลายรายการ",
    confirmLabel: "ระงับการใช้งานทั้งหมด",
    color: "warning",
  },
  delete: {
    title: "ยืนยันการลบผู้ใช้งานหลายรายการ",
    confirmLabel: "ลบทั้งหมด",
    color: "error",
  },
  change_role: {
    title: "ยืนยันการเปลี่ยนสิทธิ์ผู้ใช้งานหลายรายการ",
    confirmLabel: "เปลี่ยนสิทธิ์ทั้งหมด",
    color: "secondary",
  },
};

// ข้อความ tooltip ที่ใช้ซ้ำ เมื่อกำลังอยู่ในโหมดเลือกหลายแถว (bulk mode) — บังคับให้ใช้
// แถบดำเนินการพร้อมกันด้านบนแทนปุ่ม/Chip รายแถว เพื่อไม่ให้สับสนว่า action มีผลกับแถวเดียวหรือทั้งกลุ่ม
const BULK_MODE_LOCK_HINT = "";

// เงื่อนไขรหัสผ่านที่โชว์เป็น checklist สด ๆ ระหว่างพิมพ์ (ใช้ร่วมกันทั้ง dialog เพิ่มผู้ใช้งาน
// และ dialog ตั้งรหัสผ่านใหม่ — ไม่รวมกฎ blacklist/ผูกกับอีเมล เพราะแจ้งผ่าน error message ตอน submit แทน)
const PASSWORD_RULES = [
  {
    key: "length",
    label: "มากกว่า 10 ตัวอักษร",
    test: (v) => v.length >= 10,
  },
  { key: "upper", label: "มีตัวพิมพ์ใหญ่ (A-Z)", test: (v) => /[A-Z]/.test(v) },
  { key: "lower", label: "มีตัวพิมพ์เล็ก (a-z)", test: (v) => /[a-z]/.test(v) },
  { key: "digit", label: "มีตัวเลข (0-9)", test: (v) => /[0-9]/.test(v) },
  {
    key: "special",
    label: "มีอักขระพิเศษ (เช่น ! @ # $)",
    test: (v) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(v),
  },
];

// ---- Helper: ผสมสีให้ได้ผลลัพธ์ทึบแสง 100% (ไม่ใช้ alpha) ----
// ใช้เฉพาะกับพื้นหลังของคอลัมน์ sticky (checkbox ซ้าย / การจัดการ ขวา) เท่านั้น
// เพราะพื้นหลังแบบโปร่งแสง (alpha) จะโดนเนื้อหาของแถวอื่นที่เลื่อนอยู่ด้านล่าง
// ทะลุขึ้นมาซ้อนทับตัวหนังสือตอน scroll แนวนอน — ต้องผสมเป็นสีทึบไว้ล่วงหน้าแทน
function parseColorToRgb(input) {
  if (!input) return [255, 255, 255];
  const value = String(input).trim();
  if (value.startsWith("#")) {
    let hex = value.slice(1);
    if (hex.length === 3) {
      hex = hex
        .split("")
        .map((c) => c + c)
        .join("");
    }
    const num = parseInt(hex, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  }
  const match = value.match(/rgba?\(([^)]+)\)/i);
  if (match) {
    const parts = match[1].split(",").map((v) => parseFloat(v.trim()));
    return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
  }
  return [255, 255, 255];
}

function mixOpaqueColor(tintColor, baseColor, ratio) {
  const [tr, tg, tb] = parseColorToRgb(tintColor);
  const [br, bg, bb] = parseColorToRgb(baseColor);
  const mix = (a, b) => Math.round(a * ratio + b * (1 - ratio));
  return `rgb(${mix(tr, br)}, ${mix(tg, bg)}, ${mix(tb, bb)})`;
}

/* ============================================================================
 * PasswordChecklist — โชว์เมื่อเริ่มพิมพ์ (Collapse) + scale bar ความแข็งแรง
 * ==========================================================================*/
const PasswordChecklist = memo(function PasswordChecklist({ password }) {
  const theme = useTheme();
  const isVisible = password.length > 0;

  const passedCount = PASSWORD_RULES.filter((rule) =>
    rule.test(password),
  ).length;
  const strengthRatio = PASSWORD_RULES.length
    ? passedCount / PASSWORD_RULES.length
    : 0;

  const strengthLevels = [
    { label: "อ่อนแอ", color: theme.palette.error.main },
    { label: "พอใช้", color: theme.palette.warning.main },
    { label: "ดี", color: theme.palette.info.main },
    { label: "แข็งแรง", color: theme.palette.success.main },
  ];

  const levelIndex =
    password.length === 0
      ? -1
      : Math.min(
          Math.floor(strengthRatio * strengthLevels.length),
          strengthLevels.length - 1,
        );

  const activeLevel = levelIndex >= 0 ? strengthLevels[levelIndex] : null;
  const barWidthPercent = Math.max(
    strengthRatio * 100,
    password.length > 0 ? 6 : 0,
  );

  return (
    <Collapse in={isVisible} timeout={220} unmountOnExit>
      <Box
        sx={{
          mt: 1.25,
          p: 2,
          borderRadius: 1,
          bgcolor: alpha(theme.palette.text.primary, 0.03),
          border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
        }}
      >
        {/* Strength bar */}
        <Stack spacing={0.75} sx={{ mb: 1.5 }}>
          <Box
            sx={{
              position: "relative",
              height: 5,
              borderRadius: 3,
              bgcolor: alpha(theme.palette.text.primary, 0.08),
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                width: `${barWidthPercent}%`,
                borderRadius: 3,
                bgcolor: activeLevel?.color ?? "transparent",
                transition: "width 0.3s ease, background-color 0.3s ease",
              }}
            />
          </Box>

          <Fade in={!!activeLevel} timeout={200}>
            <Typography
              variant="caption"
              sx={{
                color: activeLevel?.color,
                fontWeight: 600,
                letterSpacing: 0.2,
              }}
            >
              {activeLevel?.label ?? ""}
            </Typography>
          </Fade>
        </Stack>

        {/* Rules — 2 columns */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            columnGap: 1.5,
            rowGap: 0.75,
          }}
        >
          {PASSWORD_RULES.map((rule) => {
            const passed = rule.test(password);
            return (
              <Box
                key={rule.key}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.625,
                  minWidth: 0,
                }}
              >
                <Box
                  sx={{
                    position: "relative",
                    width: 14,
                    height: 14,
                    flexShrink: 0,
                  }}
                >
                  <Fade in={passed} timeout={180}>
                    <CheckCircleRoundedIcon
                      sx={{
                        position: "absolute",
                        inset: 0,
                        fontSize: 14,
                        color: theme.palette.success.main,
                      }}
                    />
                  </Fade>
                  <Fade in={!passed} timeout={180}>
                    <RadioButtonUncheckedRoundedIcon
                      sx={{
                        position: "absolute",
                        inset: 0,
                        fontSize: 14,
                        color: theme.palette.text.disabled,
                      }}
                    />
                  </Fade>
                </Box>
                <Typography
                  variant="caption"
                  noWrap
                  sx={{
                    color: passed ? "text.primary" : "text.disabled",
                    transition: "color 0.2s ease",
                  }}
                >
                  {rule.label}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Box>
    </Collapse>
  );
});

/* ============================================================================
 * AddUserDialog — state ของฟอร์มอยู่ภายในตัวมันเอง ไม่ผูกกับ component แม่
 * ==========================================================================*/
const AddUserDialog = memo(function AddUserDialog({
  open,
  onClose,
  onSubmit,
}) {
  const theme = useTheme();
  const radius = theme.shape.borderRadius;

  const [form, setForm] = useState(emptyForm);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [localError, setLocalError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const createPasswordErrors = useMemo(
    () => validatePassword(form.password, form.email),
    [form.password, form.email],
  );
  const isCreatePasswordValid =
    form.password.length > 0 && createPasswordErrors.length === 0;
  const createPasswordsMatch =
    form.confirmPassword.length > 0 && form.password === form.confirmPassword;

  function resetState() {
    setForm(emptyForm);
    setShowCreatePassword(false);
    setShowConfirmPassword(false);
    setLocalError("");
  }

  function handleClose() {
    if (submitting) return;
    resetState();
    onClose();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLocalError("");

    if (!isCreatePasswordValid) {
      setLocalError(createPasswordErrors[0] || "รหัสผ่านไม่ตรงตามเงื่อนไข");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setLocalError("รหัสผ่านทั้งสองช่องไม่ตรงกัน กรุณากรอกให้ตรงกัน");
      return;
    }

    setSubmitting(true);
    try {
      const { email, password, full_name, role_name } = form;
      await onSubmit({ email, password, full_name, role_name });
      resetState();
      onClose();
    } catch (err) {
      setLocalError(err?.response?.data?.message || "เพิ่มผู้ใช้งานไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="xs"
      slotProps={{ paper: { sx: { borderRadius: `${radius + 4}px` } } }}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: "1.1rem" }}>
          เพิ่มผู้ใช้งานใหม่
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <Fade in={Boolean(localError)} unmountOnExit>
              <Alert severity="error" sx={{ borderRadius: `${radius}px` }}>
                {localError}
              </Alert>
            </Fade>

            <TextField
              id="email"
              label="อีเมล"
              type="email"
              required
              fullWidth
              size="small"
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
              sx={{
                "& .MuiOutlinedInput-root": { borderRadius: `${radius}px` },
              }}
            />
            <TextField
              id="full-name"
              label="ชื่อ-นามสกุล"
              fullWidth
              size="small"
              value={form.full_name}
              onChange={(e) =>
                setForm((f) => ({ ...f, full_name: e.target.value }))
              }
              sx={{
                "& .MuiOutlinedInput-root": { borderRadius: `${radius}px` },
              }}
            />

            <Box>
              <TextField
                id="password"
                label="รหัสผ่านเริ่มต้น"
                type={showCreatePassword ? "text" : "password"}
                required
                fullWidth
                size="small"
                sx={{
                  "& .MuiOutlinedInput-root": { borderRadius: `${radius}px` },
                }}
                slotProps={{
                  htmlInput: { minLength: 10 },
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          tabIndex={-1}
                          onClick={() => setShowCreatePassword((v) => !v)}
                          edge="end"
                        >
                          {showCreatePassword ? (
                            <VisibilityOffRoundedIcon sx={{ fontSize: 18 }} />
                          ) : (
                            <VisibilityRoundedIcon sx={{ fontSize: 18 }} />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
                value={form.password}
                onChange={(e) =>
                  setForm((f) => ({ ...f, password: e.target.value }))
                }
              />
              <Box sx={{ mt: 1 }}>
                <PasswordChecklist password={form.password} />
              </Box>
            </Box>

            <TextField
              id="confirm-password"
              label="ยืนยันรหัสผ่านเริ่มต้น"
              type={showConfirmPassword ? "text" : "password"}
              required
              fullWidth
              size="small"
              sx={{
                "& .MuiOutlinedInput-root": { borderRadius: `${radius}px` },
              }}
              slotProps={{
                htmlInput: { minLength: 10 },
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        tabIndex={-1}
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        edge="end"
                      >
                        {showConfirmPassword ? (
                          <VisibilityOffRoundedIcon sx={{ fontSize: 18 }} />
                        ) : (
                          <VisibilityRoundedIcon sx={{ fontSize: 18 }} />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
              value={form.confirmPassword}
              onChange={(e) =>
                setForm((f) => ({ ...f, confirmPassword: e.target.value }))
              }
              error={
                form.confirmPassword.length > 0 &&
                form.password !== form.confirmPassword
              }
              helperText={
                form.confirmPassword.length > 0 &&
                form.password !== form.confirmPassword
                  ? "รหัสผ่านไม่ตรงกัน"
                  : " "
              }
            />
            <FormControl fullWidth size="small" >
              <InputLabel id="create-role-label" htmlFor="create-role-input">
                สิทธิ์การใช้งาน
              </InputLabel>
              <Select
                id="create-role"
                labelId="create-role-label"
                inputProps={{ id: "create-role-input" }}
                label="สิทธิ์การใช้งาน"
                value={form.role_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, role_name: e.target.value }))
                }
                sx={{ borderRadius: `${radius}px`, }}
              >
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={handleClose}
            disabled={submitting}
            sx={{ textTransform: "none", borderRadius: `${radius}px` }}
          >
            ยกเลิก
          </Button>
          <Button
            type="submit"
            variant="contained"
            disableElevation
            disabled={
              !isCreatePasswordValid || !createPasswordsMatch || submitting
            }
            sx={{
              textTransform: "none",
              fontWeight: 400,
              borderRadius: `${radius}px`,
            }}
          >
            {submitting ? "กำลังบันทึก..." : "บันทึก"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
});

/* ============================================================================
 * ResetPasswordDialog
 * ==========================================================================*/
const ResetPasswordDialog = memo(function ResetPasswordDialog({
  target,
  onClose,
  onSubmit,
}) {
  const theme = useTheme();

  // ใช้สี primary เป็น accent เพราะการตั้งรหัสผ่านใหม่ไม่ใช่ action ที่ทำลาย/เสี่ยง
  // เหมือน delete หรือ deactivate — ไม่จำเป็นต้องใช้โทน warning/error
  const color = theme.palette.primary.main;

  const [value, setValue] = useState("");
  const [show, setShow] = useState(false);
  const [localError, setLocalError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const targetId = target?.user_id;
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset ฟอร์มเมื่อสลับผู้ใช้เป้าหมาย (ตั้งใจ)
    setValue("");
    setShow(false);
    setLocalError("");
    setSubmitting(false);
  }, [targetId]);

  const errors = useMemo(
    () => validatePassword(value, target?.email),
    [value, target?.email],
  );
  const isValid = value.length > 0 && errors.length === 0;

  function handleClose() {
    if (submitting) return;
    onClose();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLocalError("");
    if (!isValid) {
      setLocalError(errors[0] || "รหัสผ่านไม่ตรงตามเงื่อนไข");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(value);
      onClose();
    } catch (err) {
      setLocalError(
        err?.response?.data?.message || "ตั้งรหัสผ่านใหม่ไม่สำเร็จ",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={Boolean(target)}
      onClose={handleClose}
      fullWidth
      maxWidth="xs"
      slotProps={{ paper: { sx: { borderRadius: 3, overflow: "hidden" } } }}
    >
      <form onSubmit={handleSubmit}>
        {/* ===== Title: icon badge วงกลม + ข้อความ — เหมือน ConfirmDialog =====
            หมายเหตุ: DialogTitle ของ MUI ครอบ children ด้วย
            <Typography variant="h6" component="h2"> ให้อัตโนมัติอยู่แล้ว
            (เป็น heading ของ dialog เพื่อ accessibility) ดังนั้น Typography
            ตัวในต้องระบุ component="span" ไม่ให้ mount เป็น <h6> ซ้อนใน <h2>
            ซึ่งผิด HTML spec และทำให้เกิด hydration error */}
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
            <LockResetRoundedIcon sx={{ color, fontSize: 22 }} />
          </Box>

          <Typography
            component="span"
            sx={{ fontWeight: 600, fontSize: "1.1rem", letterSpacing: 0 }}
          >
            ตั้งรหัสผ่านใหม่
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ px: 3, pb: 1 }}>
          <Typography
            sx={{
              color: "text.secondary",
              lineHeight: 1.6,
              fontSize: 14,
              fontWeight: 400,
              mb: 2,
            }}
          >
            สำหรับผู้ใช้งาน: <strong>{target?.email}</strong>
          </Typography>

          <Fade in={Boolean(localError)} unmountOnExit>
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {localError}
            </Alert>
          </Fade>

          <TextField
            id="reset-password"
            label="รหัสผ่านใหม่"
            type={show ? "text" : "password"}
            required
            fullWidth
            size="small"
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
            slotProps={{
              htmlInput: { minLength: 10 },
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      tabIndex={-1}
                      onClick={() => setShow((v) => !v)}
                      edge="end"
                    >
                      {show ? (
                        <VisibilityOffRoundedIcon sx={{ fontSize: 18 }} />
                      ) : (
                        <VisibilityRoundedIcon sx={{ fontSize: 18 }} />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            error={value.length > 0 && errors.length > 0}
            helperText={value.length > 0 && errors.length > 0 ? errors[0] : " "}
          />

          <Box sx={{ mt: 1 }}>
            <PasswordChecklist password={value} />
          </Box>
        </DialogContent>

        {/* ===== Actions: ปุ่ม outlined/contained คู่กัน แบบ fullWidth — เหมือน ConfirmDialog ===== */}
        <DialogActions sx={{ px: 3, pb: 3, pt: 1.5, gap: 1 }}>
          <Button
            fullWidth
            variant="outlined"
            onClick={handleClose}
            disabled={submitting}
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
            ยกเลิก
          </Button>
          <Button
            fullWidth
            type="submit"
            variant="contained"
            disableElevation
            disabled={!isValid || submitting}
            startIcon={!submitting && <CheckRoundedIcon />}
            sx={{
              textTransform: "none",
              borderRadius: 2,
              py: 1,
              fontWeight: 600,
              boxShadow: "none",
            }}
          >
            {submitting ? "กำลังบันทึก..." : "บันทึกรหัสผ่านใหม่"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
});

/* ============================================================================
 * BulkActionDialog — state รหัสผ่านยืนยันตัวตนของ admin อยู่ภายในตัวมันเอง
 * ==========================================================================*/
const BulkActionDialog = memo(function BulkActionDialog({
  bulkAction,
  onClose,
  onConfirm,
}) {
  const theme = useTheme();
  const radius = theme.shape.borderRadius;
  const { text, divider, background } = theme.palette;

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset ฟอร์มเมื่อเปลี่ยน bulk action (ตั้งใจ)
    setPassword("");
    setShowPassword(false);
    setError("");
  }, [bulkAction]);

  function handleClose() {
    if (processing) return;
    onClose();
  }

  async function handleConfirm() {
    if (!password) {
      setError("กรุณากรอกรหัสผ่านของท่านเพื่อยืนยันการดำเนินการ");
      return;
    }
    setProcessing(true);
    setError("");
    try {
      await onConfirm(password);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "รหัสผ่านไม่ถูกต้อง หรือดำเนินการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
      );
    } finally {
      setProcessing(false);
    }
  }

  return (
    <Dialog
      open={Boolean(bulkAction)}
      onClose={handleClose}
      fullWidth
      maxWidth="xs"
      PaperProps={{ sx: { borderRadius: `${radius + 4}px` } }}
    >
      <DialogTitle sx={{ fontWeight: 700, fontSize: "1.1rem" }}>
        {bulkAction ? BULK_ACTION_LABELS[bulkAction.type].title : ""}
      </DialogTitle>
      <DialogContent>
        <Typography sx={{ fontSize: 13, color: text.secondary, mb: 1.5 }}>
          การดำเนินการนี้จะมีผลกับผู้ใช้งาน{" "}
          <strong>{bulkAction?.targets?.length || 0}</strong> รายการ:
        </Typography>
        <Box
          sx={{
            maxHeight: 140,
            overflowY: "auto",
            mb: 2,
            border: `1px solid ${divider}`,
            borderRadius: `${radius}px`,
            p: 1,
            bgcolor: background.default,
          }}
        >
          {bulkAction?.targets?.map((u) => (
            <Typography
              key={u.user_id}
              sx={{ fontSize: 12.5, color: text.secondary }}
            >
              • {u.email}
            </Typography>
          ))}
        </Box>

        {bulkAction?.type === "change_role" && (
          <Alert severity="info" sx={{ mb: 2, borderRadius: `${radius}px` }}>
            จะเปลี่ยนสิทธิ์เป็น{" "}
            <strong>
              {bulkAction.role_name === "admin" ? "Admin" : "User"}
            </strong>
          </Alert>
        )}

        {bulkAction?.type === "delete" && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: `${radius}px` }}>
            การลบไม่สามารถย้อนกลับได้ ข้อมูลบัญชีเหล่านี้จะหายไปถาวรทั้งหมด
          </Alert>
        )}

        <TextField
          label="กรอกรหัสผ่านของท่านเพื่อยืนยัน"
          type={showPassword ? "text" : "password"}
          fullWidth
          required
          size="small"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleConfirm();
            }
          }}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: `${radius}px` } }}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    tabIndex={-1}
                    onClick={() => setShowPassword((v) => !v)}
                    edge="end"
                  >
                    {showPassword ? (
                      <VisibilityOffRoundedIcon sx={{ fontSize: 18 }} />
                    ) : (
                      <VisibilityRoundedIcon sx={{ fontSize: 18 }} />
                    )}
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />

        {error && (
          <Alert severity="error" sx={{ mt: 1.5, borderRadius: `${radius}px` }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button
          onClick={handleClose}
          disabled={processing}
          sx={{ textTransform: "none", borderRadius: `${radius}px` }}
        >
          ยกเลิก
        </Button>
        <Button
          variant="contained"
          disableElevation
          color={
            bulkAction ? BULK_ACTION_LABELS[bulkAction.type].color : "primary"
          }
          onClick={handleConfirm}
          disabled={processing || !password}
          sx={{
            textTransform: "none",
            fontWeight: 400,
            borderRadius: `${radius}px`,
            color: "#fff",
          }}
        >
          {processing
            ? "กำลังดำเนินการ..."
            : bulkAction
              ? BULK_ACTION_LABELS[bulkAction.type].confirmLabel
              : "ยืนยัน"}
        </Button>
      </DialogActions>
    </Dialog>
  );
});

/* ============================================================================
 * SummaryCards
 * ==========================================================================*/
const SummaryCards = memo(function SummaryCards({ summary }) {
  const theme = useTheme();
  const radius = theme.shape.borderRadius + 4;
  const { primary, text } = theme.palette;

  const cards = [
    {
      label: "ผู้ดูแลระบบ",
      value: summary.admins,
      icon: <AdminPanelSettingsRoundedIcon sx={{ fontSize: 16 }} />,
      color: theme.palette.secondary?.main || "#7c3aed",
    },
    {
      label: "ผู้ใช้งาน",
      value: summary.total,
      icon: <GroupRoundedIcon sx={{ fontSize: 16 }} />,
      color: primary.main,
    },
    {
      label: "รอการอนุมัติ",
      value: summary.pending,
      icon: <HourglassTopRoundedIcon sx={{ fontSize: 16 }} />,
      color: theme.palette.warning?.main || "#f59e0b",
    },
  ];

  return (
    <Box
          sx={{
            position: "relative",
            overflow: "hidden",
            bgcolor: alpha(theme.palette.text.primary, 0.03),
            borderRadius: `${radius}px`,
            p: 2,
            display: "flex",
            flexDirection: "column",
            gap: 0.5,
            minWidth: 0,
            mb:5
          }}
        >
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={1.5}
    >
      {cards.map((card) => (
        <Box
          key={card.label}
          sx={{
            position: "relative",
            overflow: "hidden",
            flex: 1,
            bgcolor: "#fff",
            borderRadius: `${radius}px`,
            p: 2,
            display: "flex",
            flexDirection: "column",
            gap: 0.5,
            minWidth: 0,
          }}
        >
          {/* ลายพื้นหลัง dot-grid จางๆ สี accent ของแต่ละการ์ด */}
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              zIndex: 0,
              pointerEvents: "none",
              overflow: "hidden",
              backgroundImage: `
                repeating-radial-gradient(
                  ellipse 120px 45px at 100% 100%,
                  transparent 0,
                  transparent 18px,
                  ${alpha(card.color, 0.12)} 19px,
                  transparent 20px
                )
              `,
              transform: "rotate(-12deg) scale(1.3)",
              maskImage:
                "linear-gradient(to top left, #000 0%, rgba(0,0,0,0.5) 55%, transparent 85%)",
              WebkitMaskImage:
                "linear-gradient(to top left, #000 0%, rgba(0,0,0,0.5) 55%, transparent 85%)",
            }}
          />

          {/* บรรทัด 1: label + icon badge */}
          <Box
            sx={{
              position: "relative",
              zIndex: 1,
              display: "flex",
              alignItems: "center",
              gap: 1,
              justifyContent: "space-between",
            }}
          >
            <Typography
              sx={{
                fontSize: 12.5,
                fontWeight: 600,
                color: text.primary,
                letterSpacing: 0.1,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {card.label}
            </Typography>
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: "9px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: alpha(card.color, 0.1),
                color: card.color,
                flexShrink: 0,
              }}
            >
              {card.icon}
            </Box>
          </Box>

          {/* บรรทัด 2: value */}
          <Typography
            sx={{
              position: "relative",
              zIndex: 1,
              fontSize: 20,
              fontWeight: 700,
              color: card.color,
              lineHeight: 1.25,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {card.value}
          </Typography>
        </Box>
      ))}
    </Stack>
    </Box>
  );
});

/* ============================================================================
 * BulkActionBar — bulkRoleValue เก็บ local ในตัวเอง
 * ==========================================================================*/
const BulkActionBar = memo(function BulkActionBar({
  selectedCount,
  selectedUsers,
  onRequestBulkAction,
  onClearSelection,
}) {
  const theme = useTheme();
  const radius = theme.shape.borderRadius;
  const { primary } = theme.palette;
  const secondaryColor = theme.palette.secondary?.main || "#7c3aed";
  const secondaryDark = theme.palette.secondary?.dark || "#6d28d9";

  const [bulkRoleValue, setBulkRoleValue] = useState("user");

  const bulkRoleAllSame = useMemo(() => {
    if (selectedUsers.length === 0) return true;
    return selectedUsers.every((u) => u.role_name === bulkRoleValue);
  }, [selectedUsers, bulkRoleValue]);

  return (
    <Fade in={selectedCount > 0} unmountOnExit>
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 1.5,
          alignItems: "center",
          justifyContent: "space-between",
          px: 2,
          py: 1.25,
          mb: 1.5,
          borderRadius: `${radius + 2}px`,
          bgcolor: alpha(primary.main, 0.05),
          border: `1px solid ${alpha(primary.main, 0.25)}`,
        }}
      >
        <Typography sx={{ fontSize: 14, fontWeight: 400, color: primary.main }}>
          เลือกแล้ว {selectedCount} รายการ
        </Typography>

        <Stack
          direction="row"
          spacing={1.5}
          sx={{ flexWrap: "wrap", alignItems: "center", rowGap: 1 }}
        >
          {/* ===== โซน 1: เปลี่ยนสิทธิ์ ===== */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              pl: 1.25,
              pr: 0.75,
              py: 0.5,
              borderRadius: 50,
              bgcolor: alpha(secondaryColor, 0.08),
              border: `1px solid ${alpha(secondaryColor, 0.3)}`,
            }}
          >
            <Typography
              sx={{
                fontSize: 12.5,
                color: secondaryColor,
                whiteSpace: "nowrap",
              }}
            >
              เปลี่ยนสิทธิ์เป็น
            </Typography>

            <Select
              size="small"
              value={bulkRoleValue}
              onChange={(e) => setBulkRoleValue(e.target.value)}
              variant="standard"
              disableUnderline
              IconComponent={KeyboardArrowDownRoundedIcon}
              inputProps={{ "aria-label": "เปลี่ยนสิทธิ์เป็น" }}
              sx={{
                fontSize: 13,
                fontWeight: 600,
                color: secondaryColor,
                "& .MuiSelect-select": { py: 0.25, pr: "22px !important" },
                "& .MuiSvgIcon-root": { color: secondaryColor },
              }}
            >
              <MenuItem value="user" sx={{ fontSize: 13 }}>
                User
              </MenuItem>
              <MenuItem value="admin" sx={{ fontSize: 13 }}>
                Admin
              </MenuItem>
            </Select>

            <Button
              size="small"
              variant="contained"
              disableElevation
              disabled={bulkRoleAllSame}
              onClick={() => onRequestBulkAction("change_role", bulkRoleValue)}
              sx={{
                ml: 0.5,
                minWidth: "auto",
                height: 26,
                px: 1.5,
                fontSize: 12,
                textTransform: "none",
                fontWeight: 400,
                borderRadius: 50,
                bgcolor: secondaryColor,
                "&:hover": { bgcolor: secondaryDark },
                "&.Mui-disabled": {
                  bgcolor: alpha(secondaryColor, 0.25),
                  color: "#fff",
                },
              }}
            >
              ยืนยัน
            </Button>
          </Box>

          <Divider orientation="vertical" flexItem sx={{ my: 0.5 }} />

          {/* ===== โซน 2: action สถานะ/ลบ ===== */}
          <Stack
            direction="row"
            spacing={1}
            sx={{ flexWrap: "wrap", rowGap: 1 }}
          >
            <Button
              size="small"
              variant="outlined"
              color="success"
              startIcon={<CheckCircleRoundedIcon sx={{ fontSize: 16 }} />}
              onClick={() => onRequestBulkAction("activate")}
              sx={{
                textTransform: "none",
                fontWeight: 400,
                borderRadius: `${radius}px`,
                borderColor: "success.main",
                "&:hover": {
                  bgcolor: (t) => alpha(t.palette.success.main, 0.08),
                  borderColor: "success.main",
                },
              }}
            >
              เปิดใช้งาน
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="warning"
              startIcon={<BlockRoundedIcon sx={{ fontSize: 16 }} />}
              onClick={() => onRequestBulkAction("deactivate")}
              sx={{
                textTransform: "none",
                fontWeight: 400,
                borderRadius: `${radius}px`,
                borderColor: "warning.main",
                "&:hover": {
                  bgcolor: (t) => alpha(t.palette.warning.main, 0.08),
                  borderColor: "warning.main",
                },
              }}
            >
              ระงับการใช้งาน
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="error"
              startIcon={<DeleteRoundedIcon sx={{ fontSize: 16 }} />}
              onClick={() => onRequestBulkAction("delete")}
              sx={{
                textTransform: "none",
                fontWeight: 400,
                borderRadius: `${radius}px`,
                borderColor: "error.main",
                "&:hover": {
                  bgcolor: (t) => alpha(t.palette.error.main, 0.08),
                  borderColor: "error.main",
                },
              }}
            >
              ลบ
            </Button>
            <Button
              size="small"
              variant="text"
              onClick={onClearSelection}
              sx={{
                color: "text.secondary",
                textTransform: "none",
                fontWeight: 400,
                borderRadius: `${radius}px`,
              }}
            >
              ยกเลิกการเลือก
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Fade>
  );
});

/* ============================================================================
 * SortableHeaderCell — เลิกก็อปวาง sx ของ TableSortLabel ซ้ำ 4 รอบ
 * ==========================================================================*/
function SortableHeaderCell({ field, label, orderBy, order, onSort }) {
  return (
    <TableCell sortDirection={orderBy === field ? order : false}>
      <TableSortLabel
        active={orderBy === field}
        direction={orderBy === field ? order : "asc"}
        onClick={() => onSort(field)}
        IconComponent={UnfoldMoreRoundedIcon}
        sx={{
          "& .MuiTableSortLabel-icon": {
            fontSize: 18,
            opacity: 0.45,
            transition: "0.2s ease",
            transform: "none !important",
          },
          "&.Mui-active .MuiTableSortLabel-icon": {
            opacity: 1,
            color: "primary.main",
          },
          "&.Mui-active[aria-sort='ascending'] .MuiTableSortLabel-icon": {
            transform: "rotate(180deg) !important",
          },
          "&.Mui-active[aria-sort='descending'] .MuiTableSortLabel-icon": {
            transform: "rotate(0deg) !important",
          },
        }}
      >
        {label}
      </TableSortLabel>
    </TableCell>
  );
}

/* ============================================================================
 * UserRow — memoized ต่อแถว: toggle checkbox 1 แถว จะไม่ทำให้แถวอื่น re-render
 * ==========================================================================*/
const UserRow = memo(function UserRow({
  user,
  isSelf,
  isSelected,
  isRowActionLocked,
  stickyColors,
  onToggleSelect,
  onChangeRole,
  onRequestApprove,
  onRequestToggleStatus,
  onRequestResetPassword,
  onRequestDelete,
}) {
  const theme = useTheme();
  const { primary, text } = theme.palette;
  const radius = theme.shape.borderRadius;
  const u = user;

  return (
    <TableRow
      hover
      selected={isSelected}
      sx={{
        ...(isSelf && {
          borderLeft: `3px solid ${primary.main}`,
          "& td:nth-of-type(2)": { pl: "13px" },
        }),
        bgcolor: isSelf ? alpha(primary.main, 0.045) : "transparent",
        "& td:first-of-type, & td:last-of-type": {
          bgcolor: isSelf ? stickyColors.self : stickyColors.normal,
          transition: "background-color 120ms ease",
        },
        "&:hover td:first-of-type, &:hover td:last-of-type": {
          bgcolor: isSelf ? stickyColors.selfHover : stickyColors.normalHover,
        },
        "&.Mui-selected td:first-of-type, &.Mui-selected td:last-of-type": {
          bgcolor: stickyColors.selected,
        },
        "&.Mui-selected:hover td:first-of-type, &.Mui-selected:hover td:last-of-type":
          {
            bgcolor: stickyColors.selectedHover,
          },
      }}
    >
      <TableCell padding="checkbox">
        <Tooltip placement="top" arrow disableHoverListener={!isSelf}>
          <span>
            <Checkbox
              size="small"
              checked={isSelected}
              onChange={() => onToggleSelect(u.user_id)}
              disabled={isSelf}
              sx={{ "&.Mui-disabled": { color: "#acacac" } }}
            />
          </span>
        </Tooltip>
      </TableCell>

      <TableCell sx={{ maxWidth: { xs: 220, md: "none" } }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            component="div"
            sx={{
              fontSize: 13.5,
              fontWeight: isSelf ? 600 : 500,
              color: text.head,
              overflow: "hidden",
              textOverflow: "ellipsis",
              lineHeight: 1.4,
            }}
          >
            {u.full_name || "-"}
            {isSelf && (
              <Chip
                label="คุณ"
                size="small"
                color="primary"
                variant="outlined"
                sx={{
                  ml: 0.75,
                  height: 20,
                  fontSize: 11,
                  fontWeight: 400,
                  borderRadius: 999,
                  "& .MuiChip-label": { px: 1 },
                }}
              />
            )}
          </Typography>
          <Typography
            sx={{
              fontSize: 12,
              color: text.secondary,
              overflow: "hidden",
              textOverflow: "ellipsis",
              lineHeight: 1.4,
            }}
          >
            {u.email}
          </Typography>
        </Box>
      </TableCell>

      <TableCell>
        <Tooltip
          placement="top"
          title={isRowActionLocked ? BULK_MODE_LOCK_HINT : ""}
          arrow
          disableHoverListener={!isRowActionLocked}
        >
          <span>
            <FormControl
              size="small"
              sx={{ minWidth: 110, mx:2 }}
              disabled={isRowActionLocked}
            >
              <Select
                inputProps={{ "aria-label": "สิทธิ์ผู้ใช้งาน" }}
                value={u.role_name}
                onChange={(e) => onChangeRole(u.user_id, e.target.value)}
                sx={{
                  fontSize: 13,
                  borderRadius: 2,
                  "&.Mui-disabled": {
                    color: "#acacac",
                    WebkitTextFillColor: "#acacac",
                  },
                  "& .MuiSvgIcon-root.Mui-disabled": { color: "#acacac" },
                }}
              >
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>
          </span>
        </Tooltip>
      </TableCell>

      <TableCell>
        {!u.is_approved ? (
          <Chip
            size="small"
            icon={<HourglassTopRoundedIcon sx={{ fontSize: 14 }} />}
            label="รอการอนุมัติ"
            color="warning"
            onClick={() => onRequestApprove(u)}
            sx={{
              cursor: "pointer",
              fontSize: 11.5,
              fontWeight: 400,
              borderRadius: `${radius}px`,
            }}
          />
        ) : (
          <Tooltip
            placement="top"
            title={isRowActionLocked ? BULK_MODE_LOCK_HINT : ""}
            arrow
            disableHoverListener={!isRowActionLocked}
          >
            <span>
              <Chip
                size="small"
                icon={
                  u.is_active ? (
                    <CheckCircleRoundedIcon sx={{ fontSize: 14 }} />
                  ) : (
                    <BlockRoundedIcon sx={{ fontSize: 14 }} />
                  )
                }
                label={u.is_active ? "ใช้งานได้" : "ระงับการใช้งาน"}
                color={u.is_active ? "success" : "default"}
                variant={u.is_active ? "outlined" : "filled"}
                onClick={() => onRequestToggleStatus(u)}
                disabled={isRowActionLocked}
                sx={{
                  cursor: isRowActionLocked ? "not-allowed" : "pointer",
                  fontSize: 11.5,
                  fontWeight: 400,
                  borderRadius: `${radius}px`,
                  "&.Mui-disabled": {
                    opacity: 1,
                    color: "#acacac",
                    borderColor: "#acacac",
                    "& .MuiChip-icon": { color: "#acacac" },
                  },
                }}
              />
            </span>
          </Tooltip>
        )}
      </TableCell>

      <TableCell sx={{ fontSize: 12.5, color: text.secondary }}>
        {u.last_login_at
          ? new Date(u.last_login_at).toLocaleString("th-TH")
          : "-"}
      </TableCell>

      <TableCell align="left">
        <Stack
          direction="row"
          spacing={0.5}
          sx={{
            justifyContent: "flex-start",
            p: 0.5,
            width: "fit-content",
            borderRadius: 2.5,
            bgcolor: alpha(theme.palette.grey[500], 0.04),
            border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
          }}
        >
          {!u.is_approved && (
            <>
              <Tooltip title="อนุมัติผู้ใช้งาน" arrow>
                <IconButton
                  size="small"
                  onClick={() => onRequestApprove(u)}
                  sx={{
                    width: 34,
                    height: 34,
                    borderRadius: 2,
                    color: "text.secondary",
                    transition: "all .18s ease",
                    "& svg": { fontSize: 17 },
                    "&:hover": {
                      color: "success.main",
                      bgcolor: alpha(theme.palette.success.main, 0.1),
                      transform: "translateY(-1px)",
                      boxShadow: 1,
                    },
                  }}
                >
                  <HowToRegRoundedIcon />
                </IconButton>
              </Tooltip>
              <Divider orientation="vertical" flexItem />
            </>
          )}

          <Tooltip
            placement="left"
            title={isRowActionLocked ? BULK_MODE_LOCK_HINT : "ตั้งรหัสผ่านใหม่"}
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
                disabled={isRowActionLocked}
                onClick={() => onRequestResetPassword(u)}
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: 2,
                  color: "text.secondary",
                  transition: "all .18s ease",
                  "& svg": { fontSize: 17 },
                  "&.Mui-disabled": { color: "#acacac" },
                  "&:hover": isRowActionLocked
                    ? {}
                    : {
                        color: "primary.main",
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        transform: "translateY(-1px)",
                        boxShadow: 1,
                      },
                }}
              >
                <LockResetRoundedIcon />
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip
            placement="top"
            title={isRowActionLocked ? BULK_MODE_LOCK_HINT : ""}
            arrow
            disableHoverListener={!isRowActionLocked}
          >
            <span>
              <Button
                size="small"
                variant="text"
                startIcon={<DeleteRoundedIcon sx={{ fontSize: 17 }} />}
                onClick={() => onRequestDelete(u)}
                disabled={isRowActionLocked}
                sx={{
                  minWidth: "auto",
                  px: 1.2,
                  py: 0.6,
                  borderRadius: 2,
                  textTransform: "none",
                  fontWeight: 400,
                  fontSize: 13,
                  color: isRowActionLocked ? "action.disabled" : "error.main",
                  transition: "all .18s ease",
                  "&:hover": !isRowActionLocked
                    ? {
                        color: "error.main",
                        bgcolor: alpha(theme.palette.error.main, 0.1),
                        transform: "translateY(-1px)",
                        boxShadow: 1,
                      }
                    : {},
                }}
              >
                ลบผู้ใช้งาน
              </Button>
            </span>
          </Tooltip>
        </Stack>
      </TableCell>
    </TableRow>
  );
});

/* ============================================================================
 * UsersTable — ห่อด้วย memo ทั้งก้อน + คำนวณ stickyColors ในตัวเอง
 * ==========================================================================*/
const UsersTable = memo(function UsersTable({
  users,
  loading,
  hasAnyUsers,
  currentUserId,
  selectedIds,
  selectableIds,
  allSelected,
  someSelected,
  selectedCount,
  orderBy,
  order,
  onSort,
  onToggleSelectAll,
  onToggleSelectRow,
  onChangeRole,
  onRequestApprove,
  onRequestToggleStatus,
  onRequestResetPassword,
  onRequestDelete,
}) {
  const theme = useTheme();
  const { primary, divider, text, background } = theme.palette;
  const radius = theme.shape.borderRadius;

  const stickyColors = useMemo(() => {
    const base = background.paper;
    return {
      normal: base,
      normalHover: mixOpaqueColor(text.primary, base, 0.045),
      self: mixOpaqueColor(primary.main, base, 0.055),
      selfHover: mixOpaqueColor(primary.main, base, 0.09),
      selected: mixOpaqueColor(primary.main, base, 0.11),
      selectedHover: mixOpaqueColor(primary.main, base, 0.16),
    };
  }, [background.paper, primary.main, text.primary]);

  return (
    <Box
      sx={{
        border: `1px solid ${divider}`,
        borderRadius: `${radius + 2}px`,
        overflow: "hidden",
        bgcolor: background.paper,
        maxWidth: "100%",
        boxShadow: `0 1px 2px ${alpha("#000", 0.04)}`,
      }}
    >
      <TableContainer
        sx={{
          width: "100%",
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          "&::-webkit-scrollbar": { height: 8 },
          "&::-webkit-scrollbar-thumb": {
            borderRadius: 8,
            bgcolor: alpha(text.secondary, 0.25),
          },
        }}
      >
        <Table
          size="small"
          sx={{
            minWidth: 900,
            "& th, & td": { whiteSpace: "nowrap" },
            "& tbody tr": { transition: "background-color 120ms ease" },
            "& th:first-of-type, & td:first-of-type": {
              position: "sticky",
              left: 0,
              zIndex: 3,
              backgroundColor: background.paper,
            },
            "& thead th:first-of-type": {
              backgroundColor: background.default,
              zIndex: 4,
            },
            "& th:last-of-type, & td:last-of-type": {
              position: "sticky",
              right: 0,
              zIndex: 3,
              backgroundColor: background.paper,
              boxShadow: `-6px 0 6px -6px ${alpha(primary.main, 0.25)}`,
            },
            "& thead th:last-of-type": {
              backgroundColor: background.default,
              zIndex: 4,
            },
          }}
        >
          <TableHead>
            <TableRow
              sx={{
                "& th": {
                  fontWeight: 400,
                  fontSize: 13,
                  color: text.secondary,
                  bgcolor: background.default,
                  borderBottom: `1px solid ${divider}`,
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                },
              }}
            >
              <TableCell padding="checkbox">
                <Checkbox
                  size="small"
                  checked={allSelected}
                  indeterminate={someSelected}
                  onChange={onToggleSelectAll}
                  disabled={selectableIds.length === 0}
                  sx={{ "&.Mui-disabled": { color: "#acacac" } }}
                />
              </TableCell>

              <SortableHeaderCell
                field="email"
                label="ผู้ใช้งาน"
                orderBy={orderBy}
                order={order}
                onSort={onSort}
              />
              <SortableHeaderCell
                field="role_name"
                label="สิทธิ์"
                orderBy={orderBy}
                order={order}
                onSort={onSort}
              />
              <SortableHeaderCell
                field="status"
                label="สถานะ"
                orderBy={orderBy}
                order={order}
                onSort={onSort}
              />
              <SortableHeaderCell
                field="last_login_at"
                label="เข้าใช้งานล่าสุด"
                orderBy={orderBy}
                order={order}
                onSort={onSort}
              />

              <TableCell align="left">การจัดการ</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {!loading &&
              users.map((u) => {
                const isSelf = u.user_id === currentUserId;
                const isRowActionLocked = isSelf || selectedCount > 0;
                return (
                  <UserRow
                    key={u.user_id}
                    user={u}
                    isSelf={isSelf}
                    isSelected={selectedIds.has(u.user_id)}
                    isRowActionLocked={isRowActionLocked}
                    stickyColors={stickyColors}
                    onToggleSelect={onToggleSelectRow}
                    onChangeRole={onChangeRole}
                    onRequestApprove={onRequestApprove}
                    onRequestToggleStatus={onRequestToggleStatus}
                    onRequestResetPassword={onRequestResetPassword}
                    onRequestDelete={onRequestDelete}
                  />
                );
              })}
          </TableBody>
        </Table>
      </TableContainer>

      {loading && (
        <Box
          sx={{
            p: 3,
            textAlign: "center",
            color: text.secondary,
            fontSize: 13,
          }}
        >
          กำลังโหลดข้อมูล...
        </Box>
      )}
      {!loading && hasAnyUsers && users.length === 0 && (
        <Box
          sx={{
            p: 3,
            textAlign: "center",
            color: text.secondary,
            fontSize: 13,
          }}
        >
          ไม่พบผู้ใช้งานที่ตรงกับคำค้นหา
        </Box>
      )}
      {!loading && !hasAnyUsers && (
        <Box
          sx={{
            p: 3,
            textAlign: "center",
            color: text.secondary,
            fontSize: 13,
          }}
        >
          ยังไม่มีผู้ใช้งานในระบบ
        </Box>
      )}
    </Box>
  );
});

/* ============================================================================
 * UserManagementSection — orchestrator
 * ==========================================================================*/
export default function UserManagementSection() {
  const theme = useTheme();
  const { divider, text, background } = theme.palette;
  const radius = theme.shape.borderRadius;
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const [searchText, setSearchText] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [orderBy, setOrderBy] = useState("email");
  const [order, setOrder] = useState("asc");

  const [addOpen, setAddOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [statusTarget, setStatusTarget] = useState(null);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [approveTarget, setApproveTarget] = useState(null);
  const [approving, setApproving] = useState(false);

  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkAction, setBulkAction] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axiosClient.get("/users");
      setUsers(data.users);
    } catch (err) {
      setError(err.response?.data?.message || "โหลดรายชื่อผู้ใช้งานไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount: setState หลัง await (async lifecycle ปกติ)
    fetchUsers();
  }, [fetchUsers]);

  const handleSort = useCallback(
    (field) => {
      if (orderBy === field) {
        setOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setOrderBy(field);
        setOrder("asc");
      }
    },
    [orderBy],
  );

  // กรองตามคำค้นหา (อีเมล/ชื่อ-นามสกุล) + สิทธิ์ แล้วจึงเรียงลำดับตามคอลัมน์ที่เลือก
  const displayedUsers = useMemo(() => {
    const q = searchText.trim().toLowerCase();

    let result = users.filter((u) => {
      const matchesQuery =
        !q ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.full_name || "").toLowerCase().includes(q);
      const matchesRole = roleFilter === "all" || u.role_name === roleFilter;
      return matchesQuery && matchesRole;
    });

    const accessor = SORT_ACCESSORS[orderBy] || SORT_ACCESSORS.email;
    result = [...result].sort((a, b) => {
      // ปักหมุดแถวของผู้ใช้ปัจจุบัน (ตัวเอง) ไว้บนสุดเสมอ ไม่ว่าจะเรียงคอลัมน์ไหนหรือทิศทางใด
      const aIsSelf = a.user_id === currentUser?.user_id;
      const bIsSelf = b.user_id === currentUser?.user_id;
      if (aIsSelf && !bIsSelf) return -1;
      if (!aIsSelf && bIsSelf) return 1;

      const va = accessor(a);
      const vb = accessor(b);
      if (va < vb) return order === "asc" ? -1 : 1;
      if (va > vb) return order === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [users, searchText, roleFilter, orderBy, order, currentUser?.user_id]);

  // แถวที่สามารถเลือกได้ (ตัดตัวเองออกเสมอ กันดำเนินการ bulk กับบัญชีตัวเอง)
  const selectableIds = useMemo(
    () =>
      displayedUsers
        .filter((u) => u.user_id !== currentUser?.user_id)
        .map((u) => u.user_id),
    [displayedUsers, currentUser?.user_id],
  );

  const selectedCount = selectedIds.size;
  const allSelected =
    selectableIds.length > 0 &&
    selectableIds.every((id) => selectedIds.has(id));
  const someSelected =
    !allSelected && selectableIds.some((id) => selectedIds.has(id));

  const selectedUsers = useMemo(
    () => users.filter((u) => selectedIds.has(u.user_id)),
    [users, selectedIds],
  );

  // สรุปจำนวนตามสิทธิ์
  const summary = useMemo(() => {
    const total = users.length;
    const admins = users.filter((u) => u.role_name === "admin").length;
    const pending = users.filter((u) => !u.is_approved).length;
    return { total, admins, pending };
  }, [users]);

  // ล้างการเลือกเมื่อเปลี่ยนคำค้นหา/ตัวกรอง เพื่อไม่ให้ดำเนินการกับแถวที่ถูกซ่อนอยู่โดยไม่ตั้งใจ
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- ปรับ state ตามการเปลี่ยนตัวกรอง (ตั้งใจ)
    setSelectedIds(new Set());
  }, [searchText, roleFilter]);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds(() => (allSelected ? new Set() : new Set(selectableIds)));
  }, [allSelected, selectableIds]);

  const toggleSelectRow = useCallback((userId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  // เปิด popup ยืนยันก่อนดำเนินการพร้อมกันหลายราย
  const requestBulkAction = useCallback(
    (type, roleName) => {
      const targets = users.filter((u) => selectedIds.has(u.user_id));
      if (targets.length === 0) return;
      setBulkAction({
        type,
        targets,
        role_name: type === "change_role" ? roleName : undefined,
      });
    },
    [users, selectedIds],
  );

  const closeBulkDialog = useCallback(() => setBulkAction(null), []);

  const handleConfirmBulkAction = useCallback(
    async (password) => {
      const userIds = bulkAction.targets.map((u) => u.user_id);

      if (bulkAction.type === "delete") {
        await axiosClient.post("/users/bulk-delete", {
          user_ids: userIds,
          password,
        });
        setInfo(`ลบผู้ใช้งานสำเร็จ ${userIds.length} รายการ`);
      } else if (bulkAction.type === "change_role") {
        await axiosClient.patch("/users/bulk-role", {
          user_ids: userIds,
          role_name: bulkAction.role_name,
          password,
        });
        setInfo(
          `เปลี่ยนสิทธิ์เป็น ${bulkAction.role_name === "admin" ? "Admin" : "User"} สำเร็จ ${userIds.length} รายการ`,
        );
        setTimeout(() => setInfo(""), 3000);
      } else {
        await axiosClient.patch("/users/bulk-status", {
          user_ids: userIds,
          is_active: bulkAction.type === "activate",
          password,
        });
        setInfo(
          bulkAction.type === "activate"
            ? `เปิดใช้งานบัญชีสำเร็จ ${userIds.length} รายการ`
            : `ระงับการใช้งานบัญชีสำเร็จ ${userIds.length} รายการ`,
        );
        setTimeout(() => setInfo(""), 3000);
      }

      setBulkAction(null);
      setSelectedIds(new Set());
      await fetchUsers();
    },
    [bulkAction, fetchUsers],
  );

  const handleCreateUser = useCallback(
    async (payload) => {
      const { email, password, full_name, role_name } = payload;
      await axiosClient.post("/users", {
        email,
        password,
        full_name,
        role_name,
      });
      setInfo("เพิ่มผู้ใช้งานสำเร็จ");
      await fetchUsers();
    },
    [fetchUsers],
  );

  const handleChangeRole = useCallback(
    async (userId, newRole) => {
      if (userId === currentUser?.user_id) {
        setError(
          "ไม่สามารถเปลี่ยนสิทธิ์ของตัวเองได้ กรุณาให้ผู้ดูแลระบบท่านอื่นเปลี่ยนสิทธิ์ให้",
        );
        return;
      }
      setError("");
      try {
        await axiosClient.patch(`/users/${userId}/role`, {
          role_name: newRole,
        });
        await fetchUsers();
      } catch (err) {
        setError(err.response?.data?.message || "เปลี่ยนสิทธิ์ไม่สำเร็จ");
      }
    },
    [currentUser?.user_id, fetchUsers],
  );

  const requestApprove = useCallback((user) => {
    setApproveTarget(user);
  }, []);

  async function handleConfirmApprove() {
    setApproving(true);
    setError("");
    try {
      await axiosClient.patch(`/users/${approveTarget.user_id}/approve`);
      setInfo(
        `อนุมัติผู้ใช้งาน ${approveTarget.email} สำเร็จ — ผู้ใช้งานสามารถเข้าสู่ระบบได้แล้ว`,
      );
      setApproveTarget(null);
      await fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || "อนุมัติผู้ใช้งานไม่สำเร็จ");
    } finally {
      setApproving(false);
    }
  }

  // กันดำเนินการกับบัญชีของตัวเองเสมอ
  const requestToggleStatus = useCallback(
    (user) => {
      if (user.user_id === currentUser?.user_id) {
        setError(
          "ไม่สามารถระงับการใช้งานบัญชีของตัวเองได้ กรุณาให้ผู้ดูแลระบบท่านอื่นดำเนินการ",
        );
        return;
      }
      setStatusTarget(user);
    },
    [currentUser?.user_id],
  );

  async function handleConfirmToggleStatus() {
    setTogglingStatus(true);
    setError("");
    try {
      await axiosClient.patch(`/users/${statusTarget.user_id}/status`, {
        is_active: !statusTarget.is_active,
      });
      setInfo(
        statusTarget.is_active
          ? `ระงับการใช้งานบัญชี ${statusTarget.email} แล้ว`
          : `เปิดใช้งานบัญชี ${statusTarget.email} แล้ว`,
      );
      setTimeout(() => setInfo(""), 6000);
      setStatusTarget(null);
      await fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || "อัปเดตสถานะไม่สำเร็จ");
    } finally {
      setTogglingStatus(false);
    }
  }

  // กันลบบัญชีของตัวเองเสมอ
  const requestDelete = useCallback(
    (user) => {
      if (user.user_id === currentUser?.user_id) {
        setError(
          "ไม่สามารถลบบัญชีของตัวเองได้ กรุณาให้ผู้ดูแลระบบท่านอื่นดำเนินการ",
        );
        return;
      }
      setDeleteTarget(user);
    },
    [currentUser?.user_id],
  );

  async function handleConfirmDelete() {
    setDeleting(true);
    setError("");
    try {
      await axiosClient.delete(`/users/${deleteTarget.user_id}`);
      setInfo(`ลบผู้ใช้งาน ${deleteTarget.email} สำเร็จ`);
      setDeleteTarget(null);
      await fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || "ลบผู้ใช้งานไม่สำเร็จ");
    } finally {
      setDeleting(false);
    }
  }

  const requestResetPassword = useCallback((user) => {
    setResetTarget(user);
  }, []);

  const handleResetPassword = useCallback(
    async (newPassword) => {
      await axiosClient.patch(`/users/${resetTarget.user_id}/reset-password`, {
        newPassword,
      });
      setInfo(
        `ตั้งรหัสผ่านใหม่ให้ ${resetTarget.email} สำเร็จ — แจ้งผู้ใช้งานผ่านช่องทางที่ปลอดภัย`,
      );
    },
    [resetTarget],
  );

  return (
    <Box>
      {/* ===== Header ===== */}
      <Stack
        sx={{
          mb: 2,
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
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
              <AdminPanelSettingsRoundedIcon
                sx={{ fontSize: 20, color: text.head }}
              />
            </Box>
            <Typography
              sx={{ fontSize: 20, fontWeight: 400, color: text.head }}
            >
              บริหารจัดการสิทธิ์ผู้ใช้งาน
            </Typography>
          </Box>
          <Typography sx={{ fontSize: 13, color: text.secondary }}>
            เพิ่ม ลบ เปลี่ยนสิทธิ์ และตั้งรหัสผ่านใหม่ให้ผู้ใช้งาน
          </Typography>
        </Box>

        <Button
          variant="contained"
          disableElevation
          startIcon={<PersonAddRoundedIcon />}
          onClick={() => setAddOpen(true)}
          sx={{
            height: 36,
            borderRadius: 50,
            textTransform: "none",
            fontWeight: 400,
            px: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          เพิ่มผู้ใช้งาน
        </Button>
      </Stack>

      {/* ===== การ์ดสรุปภาพรวม ===== */}
      <SummaryCards summary={summary} />

      <Fade in={Boolean(info)} unmountOnExit>
        <Alert
          severity="success"
          sx={{ mb: 2, borderRadius: `${radius}px` }}
          onClose={() => setInfo("")}
        >
          {info}
        </Alert>
      </Fade>
      <Fade in={Boolean(error)} unmountOnExit>
        <Alert
          severity="error"
          sx={{ mb: 2, borderRadius: `${radius}px` }}
          onClose={() => setError("")}
        >
          {error}
        </Alert>
      </Fade>

      {/* แถบค้นหา + กรองสิทธิ์ */}
      <Paper
        variant="outlined"
        sx={{
          mb: 2,
          p: 1.5,
          borderRadius: `${radius + 2}px`,
          borderColor: divider,
          bgcolor: background.paper,
        }}
      >
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <TextField
            size="small"
            placeholder="ค้นหาจากอีเมลหรือชื่อ-นามสกุล..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            sx={{
              flex: 1,
              "& .MuiOutlinedInput-root": {
                borderRadius: `${radius}px`,
                bgcolor: "#fff",
              },
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon
                      sx={{ fontSize: 18, color: text.secondary }}
                    />
                  </InputAdornment>
                ),
                endAdornment: searchText ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchText("")}>
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
                        <ClearRoundedIcon sx={{ fontSize: 16 }} />
                      </Tooltip>
                    </IconButton>
                  </InputAdornment>
                ) : null,
              },
            }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="role-filter-label" htmlFor="role-filter-input">
              สิทธิ์
            </InputLabel>
            <Select
              labelId="role-filter-label"
              slotProps={{ htmlInput: { id: "role-filter-input" } }}
              id="role-filter"
              inputProps={{ id: "role-filter-input" }}
              label="สิทธิ์"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              sx={{ borderRadius: `${radius}px`, bgcolor: "#fff" }}
            >
              <MenuItem value="all">ทั้งหมด</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="user">User</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      {/* แถบดำเนินการพร้อมกัน */}
      <BulkActionBar
        selectedCount={selectedCount}
        selectedUsers={selectedUsers}
        onRequestBulkAction={requestBulkAction}
        onClearSelection={clearSelection}
      />

      {/* ตารางผู้ใช้งาน — memoized ทั้งก้อน */}
      <UsersTable
        users={displayedUsers}
        loading={loading}
        hasAnyUsers={users.length > 0}
        currentUserId={currentUser?.user_id}
        selectedIds={selectedIds}
        selectableIds={selectableIds}
        allSelected={allSelected}
        someSelected={someSelected}
        selectedCount={selectedCount}
        orderBy={orderBy}
        order={order}
        onSort={handleSort}
        onToggleSelectAll={toggleSelectAll}
        onToggleSelectRow={toggleSelectRow}
        onChangeRole={handleChangeRole}
        onRequestApprove={requestApprove}
        onRequestToggleStatus={requestToggleStatus}
        onRequestResetPassword={requestResetPassword}
        onRequestDelete={requestDelete}
      />

      {/* Dialog: เพิ่มผู้ใช้งานใหม่ — state ฟอร์มแยกอิสระ ไม่กระทบตาราง */}
      <AddUserDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={handleCreateUser}
      />

      {/* Dialog: ตั้งรหัสผ่านใหม่ — state รหัสผ่านแยกอิสระ ไม่กระทบตาราง */}
      <ResetPasswordDialog
        target={resetTarget}
        onClose={() => setResetTarget(null)}
        onSubmit={handleResetPassword}
      />

      {/* Popup: ยืนยันการอนุมัติผู้ใช้งานที่สมัครเอง */}
      <ConfirmDialog
        open={Boolean(approveTarget)}
        title="ยืนยันการอนุมัติผู้ใช้งาน"
        message={
          <>
            ต้องการอนุมัติผู้ใช้งาน <strong>{approveTarget?.email}</strong>{" "}
            ใช่หรือไม่?
            <br />
            หลังอนุมัติ ผู้ใช้งานคนนี้จะสามารถเข้าสู่ระบบได้ทันที
          </>
        }
        confirmLabel="อนุมัติ"
        severity="info"
        loading={approving}
        onCancel={() => setApproveTarget(null)}
        onConfirm={handleConfirmApprove}
      />

      {/* Popup: ยืนยันการลบผู้ใช้งาน */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="ยืนยันการลบผู้ใช้งาน"
        message={
          <>
            ต้องการลบผู้ใช้งาน <strong>{deleteTarget?.email}</strong>{" "}
            ใช่หรือไม่?
            <br />
            การลบไม่สามารถย้อนกลับได้ บัญชีนี้จะหายไปถาวร
          </>
        }
        confirmLabel="ลบผู้ใช้งาน"
        severity="error"
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />

      {/* Popup: ยืนยันการระงับ/เปิดใช้งานบัญชี */}
      <ConfirmDialog
        open={Boolean(statusTarget)}
        title={
          statusTarget?.is_active
            ? "ยืนยันการระงับการใช้งาน"
            : "ยืนยันการเปิดใช้งานบัญชี"
        }
        message={
          statusTarget?.is_active ? (
            <>
              ต้องการระงับการใช้งานบัญชี <strong>{statusTarget?.email}</strong>{" "}
              ใช่หรือไม่?
              <br />
              ผู้ใช้งานคนนี้จะไม่สามารถเข้าสู่ระบบได้จนกว่าจะเปิดใช้งานอีกครั้ง
            </>
          ) : (
            <>
              ต้องการเปิดใช้งานบัญชี <strong>{statusTarget?.email}</strong>{" "}
              อีกครั้งใช่หรือไม่?
            </>
          )
        }
        confirmLabel={statusTarget?.is_active ? "ระงับการใช้งาน" : "เปิดใช้งาน"}
        severity={statusTarget?.is_active ? "warning" : "info"}
        loading={togglingStatus}
        onCancel={() => setStatusTarget(null)}
        onConfirm={handleConfirmToggleStatus}
      />

      {/* Dialog: ยืนยันการดำเนินการพร้อมกันหลายราย — state รหัสผ่านแยกอิสระ ไม่กระทบตาราง */}
      <BulkActionDialog
        bulkAction={bulkAction}
        onClose={closeBulkDialog}
        onConfirm={handleConfirmBulkAction}
      />
    </Box>
  );
}
