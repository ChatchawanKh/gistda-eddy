import * as React from "react";
import { useState, useEffect } from 'react';

import { useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
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

import { useAuth } from "../../context/AuthContext";
import axiosClient from "../../api/axiosClient";

export default function SettingsSection() {
  const theme = useTheme();
  const { primary, text } = theme.palette;
  const { user, isAdmin, refreshUser, logout } = useAuth();
  const navigate = useNavigate();

  // ---- ข้อมูลส่วนตัว ----
  const [fullName, setFullName] = useState(user?.full_name || "");
  const originalFullName = user?.full_name || "";

  const isProfileUnchanged =
    fullName.trim() === originalFullName.trim();

  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // ---- เปลี่ยนรหัสผ่าน ----
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const isPasswordInvalid =
    !currentPassword ||
    !newPassword ||
    !confirmPassword ||
    newPassword !== confirmPassword;


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

    if (newPassword.length < 8) {
      setPasswordError("รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร");
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
      <Typography
        sx={{ fontSize: 20, fontWeight: 500, color: text.head, mb: 0.5 }}
      >
        ตั้งค่าบัญชีของฉัน
      </Typography>
      <Typography sx={{ fontSize: 13, color: text.secondary, mb: 3 }}>
        จัดการข้อมูลส่วนตัวและความปลอดภัยของบัญชีคุณเอง
      </Typography>
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
              <Typography sx={{fontSize: 15 }} noWrap>
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
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                fullWidth
              />
              <TextField
                label="รหัสผ่านใหม่"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                fullWidth
                slotProps={{ htmlInput: { minLength: 8 } }}
                helperText="อย่างน้อย 8 ตัวอักษร"
              />
              <TextField
                label="ยืนยันรหัสผ่านใหม่"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                fullWidth
              />

              <Box>
                <Button
                  type="submit"
                  variant="contained"
                  color="error"
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
