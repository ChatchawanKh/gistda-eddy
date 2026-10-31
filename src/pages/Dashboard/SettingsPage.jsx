import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useTheme, alpha } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import ManageAccountsRoundedIcon from "@mui/icons-material/ManageAccountsRounded";
import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";

import { useAuth } from "../../context/auth-context";

const OPTIONS = [
  {
    key: "account",
    label: "ตั้งค่าบัญชีของฉัน",
    description: "แก้ไขข้อมูลส่วนตัวและเปลี่ยนรหัสผ่าน",
    icon: ManageAccountsRoundedIcon,
  },
  {
    key: "manage-user",
    label: "จัดการผู้ใช้งาน",
    description: "อนุมัติบัญชีและกำหนดสิทธิ์ผู้ใช้งานในระบบ",
    icon: AdminPanelSettingsRoundedIcon,
    adminOnly: true,
  },
];

// /settings/* — หน้าย่อย (account, manage-user) เปิดเป็นหน้าเต็ม
// มีปุ่มย้อนกลับไปหน้ารายการตัวเลือก (/settings) — เฉพาะ admin
// (user ทั่วไปมีแค่ account หน้าเดียว ไม่มีหน้ารายการให้ย้อนกลับ)
export default function SettingsLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const isMenu = pathname.replace(/\/+$/, "") === "/settings";

  return (
    <Box>
      {!isMenu && isAdmin && (
        <Button
          size="small"
          startIcon={<ArrowBackRoundedIcon />}
          onClick={() => navigate("/settings")}
          sx={{ mb: 1, px: 1, color: "text.secondary", fontWeight: 400 }}
        >
          การตั้งค่า
        </Button>
      )}
      <Outlet />
    </Box>
  );
}

// /settings — รายการตัวเลือกเรียงบน-ล่าง กดแล้วเปิดหน้านั้น
// user ทั่วไปมีตัวเลือกเดียว -> ไปหน้า /settings/account ทันที
export function SettingsMenu() {
  const theme = useTheme();
  const { primary, text, divider, background } = theme.palette;
  const radius = theme.shape.borderRadius;
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const options = OPTIONS.filter((o) => !o.adminOnly || isAdmin);

  if (!isAdmin) return <Navigate to="/settings/account" replace />;

  return (
    <Box sx={{ width: "100%", maxWidth: 1050 }}>
      <Box sx={{ py: 1.5, mb: 1.5 }}>
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
            <SettingsRoundedIcon sx={{ fontSize: 20, color: text.head }} />
          </Box>
          <Typography sx={{ fontSize: 20, fontWeight: 400, color: text.head }}>
            การตั้งค่า
          </Typography>
        </Box>
        <Typography sx={{ fontSize: 13, color: text.secondary }}>
          เลือกรายการที่ต้องการตั้งค่า
        </Typography>
      </Box>

      <Stack spacing={1.25}>
        {options.map((option) => {
          const Icon = option.icon;
          return (
            <ButtonBase
              key={option.key}
              onClick={() => navigate(`/settings/${option.key}`)}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.75,
                width: "100%",
                p: 2,
                textAlign: "left",
                border: `1px solid ${divider}`,
                borderRadius: `${radius + 4}px`,
                bgcolor: background.paper,
                transition: "all 0.15s ease",
                "&:hover": {
                  borderColor: primary.main,
                  bgcolor: alpha(primary.main, 0.04),
                },
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  flexShrink: 0,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  bgcolor: alpha(primary.main, 0.1),
                  color: primary.main,
                }}
              >
                <Icon sx={{ fontSize: 22 }} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: 15, fontWeight: 600, color: text.primary }}>
                  {option.label}
                </Typography>
                <Typography sx={{ fontSize: 12.5, color: text.secondary }}>
                  {option.description}
                </Typography>
              </Box>
              <ChevronRightRoundedIcon sx={{ color: text.secondary }} />
            </ButtonBase>
          );
        })}
      </Stack>
    </Box>
  );
}
