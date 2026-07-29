// src/pages/Auth/Register.jsx
// หน้าลงทะเบียนสมัครสมาชิกเอง — บัญชีที่สมัครผ่านหน้านี้จะ "รอการอนุมัติ" จาก admin ก่อนเสมอ
// (ยังเข้าสู่ระบบไม่ได้จนกว่า admin จะกดอนุมัติที่หน้า "จัดการผู้ใช้งาน")
import { useMemo, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import RadioButtonUncheckedRoundedIcon from "@mui/icons-material/RadioButtonUncheckedRounded";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";

import { useTheme } from "@mui/material/styles";

import axiosClient from "../../api/axiosClient";
import AuthLayout from "./AuthLayout";
import { validatePassword } from "../../../server/auth/utils/validatePassword";

// รายการเงื่อนไขที่โชว์เป็น checklist ให้ผู้ใช้เห็นสถานะสด ๆ ระหว่างพิมพ์
// (แยกจาก validatePassword ที่ใช้เช็คตอน submit เพื่อคุม copy ของแต่ละบรรทัดในรายการนี้เอง)
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

function PasswordChecklist({ password }) {
  const theme = useTheme();
  return (
    <Stack spacing={0.5} sx={{ pl: 0.5 }}>
      {PASSWORD_RULES.map((rule) => {
        const passed = rule.test(password);
        return (
          <Box
            key={rule.key}
            sx={{ display: "flex", alignItems: "center", gap: 0.75 }}
          >
            {passed ? (
              <CheckCircleRoundedIcon
                sx={{ fontSize: 16, color: theme.palette.success.main }}
              />
            ) : (
              <RadioButtonUncheckedRoundedIcon
                sx={{
                  fontSize: 16,
                  color: theme.palette.text.secondary,
                  opacity: 0.5,
                }}
              />
            )}
            <Typography
              variant="caption"
              sx={{
                color: passed ? theme.palette.success.main : "text.secondary",
              }}
            >
              {rule.label}
            </Typography>
          </Box>
        );
      })}
    </Stack>
  );
}

export default function Register() {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordErrors = useMemo(
    () => validatePassword(password, email),
    [password, email],
  );
  const isPasswordValid = password.length > 0 && passwordErrors.length === 0;
  const passwordsMatch =
    confirmPassword.length > 0 && password === confirmPassword;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!isPasswordValid) {
      setError(passwordErrors[0] || "รหัสผ่านไม่ตรงตามเงื่อนไข");
      return;
    }
    if (password !== confirmPassword) {
      setError("รหัสผ่านทั้งสองช่องไม่ตรงกัน");
      return;
    }

    setSubmitting(true);
    try {
      await axiosClient.post("/auth/register", {
        email,
        password,
        full_name: fullName,
      });
      setSuccess(true);
    } catch (err) {
      setError(
        err.response?.data?.message || "สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="สมัครสมาชิก"
      subtitle="สมัครด้วยอีเมลองค์กร — ต้องรอผู้ดูแลระบบอนุมัติก่อนเข้าใช้งานได้"
    >
      {success ? (
        <Stack spacing={2}>
          <Alert severity="success">
            สมัครสมาชิกสำเร็จ! บัญชีของคุณอยู่ระหว่างรอการอนุมัติจากผู้ดูแลระบบ
            จะเข้าสู่ระบบได้หลังได้รับการอนุมัติแล้วเท่านั้น
          </Alert>
          <Button
            variant="contained"
            fullWidth
            onClick={() => navigate("/login", { replace: true })}
          >
            กลับไปหน้าเข้าสู่ระบบ
          </Button>
        </Stack>
      ) : (
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}

            <TextField
              label="อีเมล"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@gistda.or.th"
              required
              fullWidth
            />

            <TextField
              label="ชื่อ-นามสกุล"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              fullWidth
            />

            <Box>
              <TextField
                label="รหัสผ่าน"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              <Box sx={{ mt: 1 }}>
                <PasswordChecklist password={password} />
              </Box>
            </Box>

            <TextField
              label="ยืนยันรหัสผ่าน"
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

            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={submitting || !isPasswordValid || !passwordsMatch}
            >
              {submitting ? "กำลังสมัครสมาชิก..." : "สมัครสมาชิก"}
            </Button>

            <Box sx={{ textAlign: "center" }}>
              <Link component={RouterLink} to="/login" variant="body2">
                มีบัญชีอยู่แล้ว? เข้าสู่ระบบ
              </Link>
            </Box>
          </Stack>
        </Box>
      )}
    </AuthLayout>
  );
}
