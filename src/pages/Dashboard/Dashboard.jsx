import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Drawer from "@mui/material/Drawer";
import useMediaQuery from "@mui/material/useMediaQuery";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";

import { useAuth } from "../../context/AuthContext";
import UserManagementSection from "./UserManagementSection";
import SettingsSection from "./SettingsSection";

import SidebarContent from "./components/SidebarContent";
import DashboardInsight from "./components/DashboardInsight";
import AlertsView from "./components/AlertsView";

import { useThings } from "./hooks/useThings";
import { flattenDatastreams } from "./utils/formatters";
import { buildNavSections } from "./navSections";
import { EXPANDED_WIDTH, COLLAPSED_WIDTH, ADMIN_USERS_KEY } from "./Dashboard.constants";


export default function Dashboard() {
  const theme = useTheme();
  const { primary, background, divider, text } = theme.palette;
  const navigate = useNavigate();
  const { user, isAdmin, logout } = useAuth();

  const [open, setOpen] = React.useState(true);
  const [mobileOpen, setMobileOpen] = React.useState(false);
   const [searchParams, setSearchParams] = useSearchParams();
  const activeKey = searchParams.get("view") || "dashboard";
  const isMobile = useMediaQuery("(max-width:900px)");

  const navSections = React.useMemo(() => buildNavSections(isAdmin), [isAdmin]);
  const width = open ? EXPANDED_WIDTH : COLLAPSED_WIDTH;

  const { things, loading, error } = useThings();
  const datastreams = React.useMemo(() => flattenDatastreams(things), [things]);

  // สร้างข้อมูลโปรไฟล์จาก user จริง (แทนค่า hardcode เดิม) — ไม่แก้ไข logic
  const profile = React.useMemo(() => {
    const displayName = user?.full_name || user?.email || "ผู้ใช้งาน";
    const roleLabel = user?.role === "admin" ? "Admin" : "User";
    const initials =
      displayName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase())
        .join("") || "U";
    return { displayName, roleLabel, initials };
  }, [user]);

    const handleSelect = (key) => {
    const next = new URLSearchParams(searchParams);
    if (key === "dashboard") {
      next.delete("view"); // ค่า default ไม่ต้องโชว์ query param ให้ดู URL สะอาด
    } else {
      next.set("view", key);
    }
    setSearchParams(next, { replace: true });
    if (isMobile) setMobileOpen(false);
  };

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <Box
      sx={{ display: "flex", minHeight: "100vh", bgcolor: background.default }}
    >
      {/* Mobile top bar */}
      {isMobile && (
        <Box
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            height: 52,
            display: "flex",
            alignItems: "center",
            px: 2,
            bgcolor: background.paper,
            borderBottom: `1px solid ${divider}`,
            zIndex: 1200,
          }}
        >
          <IconButton
            onClick={() => setMobileOpen(true)}
            sx={{ color: primary.main }}
          >
            <MenuRoundedIcon fontSize="small" />
          </IconButton>
          <Typography
            sx={{ fontWeight: 800, ml: 1, fontSize: 15, color: text.primary }}
          >
            GISTDA
            <Box component="span" sx={{ color: primary.main }}>
              .
            </Box>
          </Typography>
        </Box>
      )}

      {/* Mobile temporary drawer */}
      {isMobile ? (
        <Drawer
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          slotProps={{
            paper: { sx: { width: EXPANDED_WIDTH, border: "none" } },
          }}
        >
          <SidebarContent
            open={true}
            activeKey={activeKey}
            onSelect={handleSelect}
            onToggle={() => setMobileOpen(false)}
            navSections={navSections}
            profile={profile}
            onLogout={handleLogout}
          />
        </Drawer>
      ) : (
        // Desktop permanent + collapsible drawer
        <Box
          sx={{
            width,
            flexShrink: 0,
            transition: "width 0.28s cubic-bezier(0.4, 0, 0.2, 1)",
            p: 1.25,
            position: "sticky",
            top: 0,
            height: "100vh",
            boxSizing: "border-box",
          }}
        >
          <SidebarContent
            open={open}
            activeKey={activeKey}
            onSelect={handleSelect}
            onToggle={() => setOpen((v) => !v)}
            navSections={navSections}
            profile={profile}
            onLogout={handleLogout}
          />
        </Box>
      )}

      {/* Main content area */}
      <Box
        component="main"
        sx={{
          flex: 1,
          p: { xs: 2, md: 3 },
          pt: isMobile ? 8 : 3,
          mt: isMobile ? 9 : 0,
          minWidth: 0,
          bgcolor: background.paper,
        }}
      >
        {/* ----- ส่วนนี้ตามคำสั่งเดิม: ไม่แก้ไข logic การเรียก UserManagementSection / SettingsSection ----- */}
        {activeKey === ADMIN_USERS_KEY && isAdmin ? (
          <UserManagementSection />
        ) : activeKey === "settings" ? (
          <SettingsSection />
        ) : activeKey === "alerts" ? (
          <AlertsView datastreams={datastreams} loading={loading} />
        ) : (
          <DashboardInsight things={things} loading={loading} error={error} />
        )}
      </Box>
    </Box>
  );
}
