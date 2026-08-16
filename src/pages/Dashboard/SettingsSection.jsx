import * as React from "react";
import { useMemo, useState } from "react";

import { useNavigate } from "react-router-dom";
import { useTheme, alpha } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import Avatar from "@mui/material/Avatar";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import RadioButtonUncheckedRoundedIcon from "@mui/icons-material/RadioButtonUncheckedRounded";
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';

import { Collapse, Fade } from "@mui/material";

import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";

import { useAuth } from "../../context/AuthContext";
import axiosClient from "../../api/axiosClient";
// หมายเหตุ: ใช้ util ฝั่ง client (src/utils/validatePassword.js) ไม่ใช่ import จาก server —
// โค้ด server ไม่ควรถูกดึงเข้ามาอยู่ใน frontend bundle
import { validatePassword } from "../../../server/auth/utils/validatePassword";

// เงื่อนไขรหัสผ่านที่โชว์เป็น checklist สด ๆ ระหว่างพิมพ์ (ไม่รวมกฎ blacklist/ผูกกับอีเมล
// เพราะเป็น edge case ที่ค่อยแจ้งผ่าน error message ตอน submit แทน จะได้ไม่ดู noisy เกินไป)
const PASSWORD_RULES = [
  {
    key: "length",
    label: "มากกว่า 10 ตัวอักษร",
    test: (v) => v.length >= 10 ,
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

const PasswordChecklist = React.memo(function PasswordChecklist({ password }) {
  const theme = useTheme();
  const isVisible = password.length > 0;

  const passedCount = PASSWORD_RULES.filter((rule) => rule.test(password)).length;
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
  const barWidthPercent = Math.max(strengthRatio * 100, password.length > 0 ? 6 : 0);

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
              sx={{ color: activeLevel?.color, fontWeight: 600, letterSpacing: 0.2 }}
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
                sx={{ display: "flex", alignItems: "center", gap: 0.625, minWidth: 0 }}
              >
                <Box sx={{ position: "relative", width: 14, height: 14, flexShrink: 0 }}>
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

export default function SettingsSection() {
  const theme = useTheme();
  const { primary, text } = theme.palette;
  const { user, isAdmin, refreshUser, logout } = useAuth();
  const navigate = useNavigate();

  // ---- toggle แสดง/ซ่อนรหัสผ่าน ----
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ---- ข้อมูลส่วนตัว ----
  const [fullName, setFullName] = useState(user?.full_name || "");
  const originalFullName = user?.full_name || "";

  const isProfileUnchanged = fullName.trim() === originalFullName.trim();

  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // ---- เปลี่ยนรหัสผ่าน ----
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // เช็ค policy เต็มรูปแบบ (รวมกฎห้ามพ้องกับอีเมลของ user คนนี้)
  const newPasswordErrors = useMemo(
    () => validatePassword(newPassword, user?.email),
    [newPassword, user?.email],
  );

  const isNewPasswordValid =
    newPassword.length > 0 && newPasswordErrors.length === 0;
  const passwordsMatch =
    confirmPassword.length > 0 && newPassword === confirmPassword;

  const isPasswordInvalid =
    !currentPassword || !isNewPasswordValid || !passwordsMatch;

  const initials =
    (user?.full_name || user?.email || "U")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "U";

  async function handleSaveProfile(e) {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess("");
    setSavingProfile(true);
    try {
      await axiosClient.patch("/auth/me", { full_name: fullName });
      await refreshUser();

      setProfileSuccess("บันทึกข้อมูลส่วนตัวสำเร็จ");
      setTimeout(() => {
        setProfileSuccess("");
      }, 3000);
    } catch (err) {
      setProfileError(err.response?.data?.message || "บันทึกข้อมูลไม่สำเร็จ");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPasswordError("");

    if (!isNewPasswordValid) {
      setPasswordError(newPasswordErrors[0] || "รหัสผ่านใหม่ไม่ตรงตามเงื่อนไข");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน");
      return;
    }

    setSavingPassword(true);
    try {
      await axiosClient.post("/auth/change-password", {
        currentPassword,
        newPassword,
      });
      // เปลี่ยนรหัสผ่านสำเร็จ -> server เพิกถอน session เดิมทั้งหมดแล้ว บังคับให้ login ใหม่
      await logout();
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      navigate("/login", {
        replace: true,
        state: {
          message: "เปลี่ยนรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบใหม่ด้วยรหัสผ่านใหม่",
        },
      });
    } catch (err) {
      setPasswordError(
        err.response?.data?.message || "เปลี่ยนรหัสผ่านไม่สำเร็จ",
      );
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <Box sx={{ maxWidth: 560 }}>
      <Box sx={{ minWidth: 0, py: 1.5, }}>
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
                mr: 1
              }}
            >
          <SettingsRoundedIcon sx={{ fontSize: 20, color: text.head }} />
          </Box>
          <Typography
            sx={{
              fontSize: 20,
              fontWeight: 400,
              color: text.head,
            }}
          >
            ตั้งค่าบัญชีของฉัน
          </Typography>
        </Box>

        <Typography sx={{ fontSize: 13, color: text.secondary, mb: 3 }}>
          จัดการข้อมูลส่วนตัวและความปลอดภัยของบัญชีคุณเอง
        </Typography>
      </Box>

      {/* การ์ด: ข้อมูลส่วนตัว */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack
            direction="row"
            spacing={2}
            sx={{ mb: 2.5, alignItems: "center" }}
          >
            <Avatar
              sx={{
                width: 48,
                height: 48,
                bgcolor: primary.main,
                fontWeight: 700,
              }}
            >
              {initials}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: 15 }} noWrap>
                {user?.email}
              </Typography>
              <Chip
                size="small"
                label={isAdmin ? "Admin" : "User"}
                color={isAdmin ? "primary" : "default"}
                sx={{ mt: 0.5, fontSize: 11 }}
              />
            </Box>
          </Stack>

          <Divider sx={{ mb: 2.5 }} />

          <Typography sx={{ fontWeight: 500, fontSize: 14, mb: 2 }}>
            ข้อมูลส่วนตัว
          </Typography>

          <Box component="form" onSubmit={handleSaveProfile}>
            <Stack spacing={2}>
              {profileSuccess && (
                <Alert severity="success">{profileSuccess}</Alert>
              )}
              {profileError && <Alert severity="error">{profileError}</Alert>}

              <TextField
                label="อีเมล"
                value={user?.email || ""}
                fullWidth
                disabled
                // helperText="ไม่สามารถเปลี่ยนอีเมลได้ด้วยตัวเอง ติดต่อผู้ดูแลระบบหากต้องการเปลี่ยน"
              />

              <TextField
                label="ชื่อ-นามสกุล"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                fullWidth
                placeholder="กรอกชื่อ-นามสกุลของคุณ"
              />

              <Box>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={savingProfile || isProfileUnchanged}
                >
                  {savingProfile ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                </Button>
              </Box>
            </Stack>
          </Box>
        </CardContent>
      </Card>

      {/* การ์ด: เปลี่ยนรหัสผ่าน */}
      <Card>
        <CardContent>
          <Typography sx={{ fontWeight: 500, fontSize: 14, mb: 0.5 }}>
            เปลี่ยนรหัสผ่าน
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: text.secondary, mb: 2 }}>
            หลังเปลี่ยนรหัสผ่านสำเร็จ
            ระบบจะให้เข้าสู่ระบบใหม่อีกครั้งเพื่อความปลอดภัย
          </Typography>

          <Box component="form" onSubmit={handleChangePassword}>
            <Stack spacing={2}>
              {passwordError && <Alert severity="error">{passwordError}</Alert>}

              <TextField
                label="รหัสผ่านปัจจุบัน"
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                fullWidth
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          tabIndex={-1}
                          onClick={() => setShowCurrentPassword((v) => !v)}
                          edge="end"
                        >
                          {showCurrentPassword ? (
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

              <Box>
                <TextField
                  label="รหัสผ่านใหม่"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  fullWidth
                  slotProps={{
                    htmlInput: { minLength: 10 },
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            tabIndex={-1}
                            onClick={() => setShowNewPassword((v) => !v)}
                            edge="end"
                          >
                            {showNewPassword ? (
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
                <Box sx={{ mt: 1 }}>
                  <PasswordChecklist password={newPassword} />
                </Box>
              </Box>

              <TextField
                label="ยืนยันรหัสผ่านใหม่"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                fullWidth
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
                error={confirmPassword.length > 0 && !passwordsMatch}
                helperText={
                  confirmPassword.length > 0 && !passwordsMatch
                    ? "รหัสผ่านไม่ตรงกัน"
                    : " "
                }
              />

              <Box>
                <Button
                  type="submit"
                  variant="contained"
                  // color="error"
                  disabled={savingPassword || isPasswordInvalid}
                >
                  {savingPassword ? "กำลังบันทึก..." : "เปลี่ยนรหัสผ่าน"}
                </Button>
              </Box>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
