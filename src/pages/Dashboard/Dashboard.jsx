// src/pages/Dashboard/Dashboard.jsx
// สร้างจากโครงสร้าง Sidebar ที่ให้มา + เชื่อมกับระบบ Auth จริง:
//   - ชื่อ/อีเมล/สิทธิ์ผู้ใช้ในการ์ดโปรไฟล์ดึงจาก useAuth() จริง (ไม่ใช่ "Harper Nelson" ที่ hardcode ไว้)
//   - ปุ่ม Logout ทำงานจริง (เรียก logout() แล้วพากลับหน้า /login)
//   - เมนู "จัดการผู้ใช้งาน" ใน section System จะโผล่เฉพาะเมื่อ role เป็น admin เท่านั้น
//   - เลือกเมนูนั้นแล้ว จะ render <UserManagementSection /> แทนเนื้อหา placeholder เดิม
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useTheme, alpha } from "@mui/material/styles";
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Avatar from "@mui/material/Avatar";
import Tooltip from "@mui/material/Tooltip";
import Drawer from "@mui/material/Drawer";
import useMediaQuery from "@mui/material/useMediaQuery";

import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import ShoppingBagRoundedIcon from "@mui/icons-material/ShoppingBagRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import LocalOfferRoundedIcon from "@mui/icons-material/LocalOfferRounded";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";

import { useAuth } from "../../context/AuthContext";
import UserManagementSection from "./UserManagementSection";
import SettingsSection from "./SettingsSection";

// ---- Static structure (not visual tokens) --------------------------------
const EXPANDED_WIDTH = 260;
const COLLAPSED_WIDTH = 68;

// key พิเศษที่ใช้สลับไปแสดง UserManagementSection (เฉพาะ admin)
const ADMIN_USERS_KEY = "users";

function buildNavSections(isAdmin) {
  const sections = [
    {
      label: "Overview",
      items: [
        { key: "dashboard", label: "Dashboard", icon: DashboardRoundedIcon },
        { key: "insights", label: "Insights", icon: BarChartRoundedIcon },
      ],
    },
    {
      label: "Manage",
      items: [
        { key: "store", label: "Storefront", icon: StorefrontRoundedIcon },
        { key: "orders", label: "Orders", icon: ShoppingBagRoundedIcon },
        { key: "inventory", label: "Inventory", icon: Inventory2RoundedIcon },
        { key: "customers", label: "Customers", icon: GroupRoundedIcon },
        { key: "discounts", label: "Discounts", icon: LocalOfferRoundedIcon },
      ],
    },
    {
      label: "จัดการระบบ",
      items: [
        { key: "settings", label: "การตั้งค่า", icon: SettingsRoundedIcon },
        // เมนูนี้เพิ่มเข้ามาแบบมีเงื่อนไข ด้านล่าง
      ],
    },
  ];

  if (isAdmin) {
    sections[2].items.push({
      key: ADMIN_USERS_KEY,
      label: "จัดการผู้ใช้งาน",
      icon: AdminPanelSettingsRoundedIcon,
    });
  }

  return sections;
}

// ---- Sidebar content (shared between permanent + mobile drawer) ---------
function SidebarContent({
  open,
  activeKey,
  onSelect,
  onToggle,
  navSections,
  profile,
  onLogout,
}) {
  const theme = useTheme();
  const { primary, background, divider, text } = theme.palette;
  const muted = text.secondary;
  const border = divider;
  const bg = background.default;
  const tint = alpha(primary.main, 0.08);
  const radius = theme.shape.borderRadius;

  return (
    <Box
      className="SideBar"
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRadius: { xs: 0, md: `${radius + 6}px` },
        overflow: "hidden",
        transition: "width 0.28s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {/* Logo + collapse toggle */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: open ? "space-between" : "center",
          px: open ? 2 : 0,
          pt: 2.25,
          pb: 1.5,
        }}
      >
        <Box
          sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}
        >
          <Box
            sx={{
              width: 34,
              height: 34,
              flexShrink: 0,
              borderRadius: `${radius - 1}px`,
              display: open ? "none" : "grid",
              placeItems: "center",
              background: `linear-gradient(135deg, ${primary.main} 0%, ${primary.dark} 100%)`,
              boxShadow: `0 3px 10px ${alpha(primary.main, 0.35)}`,
            }}
          >
            <AutoAwesomeRoundedIcon
              sx={{ color: primary.contrastText, fontSize: 18 }}
            />
          </Box>

          {open && (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                minWidth: 0,
                lineHeight: 1,
              }}
            >
              <Typography
                sx={{
                  color: text.head,
                  fontSize: 18,
                  fontWeight: 800,
                  lineHeight: 1.1,
                  whiteSpace: "nowrap",
                }}
              >
                GISTDA
                <Box component="span" sx={{ color: text.secondary }}>
                  .
                </Box>
              </Typography>

              <Typography
                sx={{
                  mt: 0.35,
                  color: text.secondary,
                  fontSize: 10.5,
                  lineHeight: 1.3,
                  maxWidth: 220,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                ระบบรายงานข้อมูลตรวจวัดการแลกเปลี่ยนก๊าซ ไอน้ำ และสภาพอากาศ
              </Typography>
            </Box>
          )}

          {open && (
            <IconButton
              onClick={onToggle}
              size="small"
              sx={{
                color: primary.main,
                bgcolor: bg,
                width: 26,
                height: 26,
                "&:hover": { bgcolor: tint, color: primary.main },
              }}
            >
              <ChevronLeftRoundedIcon sx={{ fontSize: 24 }} />
            </IconButton>
          )}
        </Box>
      </Box>

      {!open && (
        <Box sx={{ display: "flex", justifyContent: "center", mb: 0.75 }}>
          <IconButton
            onClick={onToggle}
            size="small"
            sx={{
              color: muted,
              bgcolor: bg,
              width: 26,
              height: 26,
              "&:hover": { bgcolor: tint, color: primary.main },
            }}
          >
            <ChevronRightRoundedIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      )}

      {/* Nav */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          px: open ? 1.25 : 0.75,
          pb: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: open ? "space-between" : "center",
        }}
      >
        {navSections.map((section, sIdx) => (
          <Box key={section.label} sx={{ mb: 1 }}>
            {open ? (
              <Typography
                sx={{
                  fontSize: 10,
                  fontWeight: 500,
                  letterSpacing: "0.08em",
                  color: muted,
                  px: 1.25,
                  mt: sIdx === 0 ? 0.25 : 1.5,
                  mb: 0.5,
                  textTransform: "uppercase",
                }}
              >
                {section.label}
              </Typography>
            ) : (
              <Box
                sx={{
                  height: "1px",
                  bgcolor: border,
                  mx: 1.25,
                  mt: sIdx === 0 ? 0.25 : 1.5,
                  mb: 0.75,
                }}
              />
            )}

            <List sx={{ p: 0 }}>
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeKey === item.key;
                const button = (
                  <ListItemButton
                    onClick={() => onSelect(item.key)}
                    sx={{
                      width: open ? "100%" : 32,
                      minHeight: 32,
                      borderRadius: `${radius}px`,
                      px: open ? 1.25 : 0,
                      py: 0.75,
                      justifyContent: open ? "flex-start" : "center",
                      alignItems: "center",
                      mb: 0.25,
                      color: isActive ? primary.contrastText : text.primary,
                      background: isActive ? primary.main : "transparent",
                      "&:hover": { background: isActive ? primary.dark : tint },
                      transition: "all 0.15s ease",
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 0,
                        mr: open ? 1 : 0,
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        color: isActive ? primary.contrastText : muted,
                      }}
                    >
                      <Icon sx={{ fontSize: 15 }} />
                    </ListItemIcon>

                    {open && (
                      <ListItemText
                        primary={item.label}
                        slotProps={{
                          primary: {
                            sx: {
                              fontSize: 14,
                              fontWeight: isActive ? 700 : 400,
                              lineHeight: 1.4,
                            },
                          },
                        }}
                      />
                    )}
                  </ListItemButton>
                );

                return (
                  <ListItem
                    key={item.key}
                    disablePadding
                    sx={{ display: "block" }}
                  >
                    {open ? (
                      button
                    ) : (
                      <Tooltip title={item.label} placement="right" arrow>
                        {button}
                      </Tooltip>
                    )}
                  </ListItem>
                );
              })}
            </List>
          </Box>
        ))}
      </Box>

      {/* User profile — ข้อมูลจริงจาก AuthContext */}
      <Box sx={{ p: open ? 1.25 : 0.75, borderTop: `1px solid ${border}` }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            p: open ? 1 : 0.5,
            borderRadius: `${radius + 2}px`,
            bgcolor: background.paper,
            justifyContent: open ? "flex-start" : "center",
          }}
        >
          <Avatar
            sx={{
              width: 30,
              height: 30,
              bgcolor: primary.main,
              fontSize: 12,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {profile.initials}
          </Avatar>
          {open && (
            <>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography
                  noWrap
                  sx={{
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: text.primary,
                    lineHeight: 1.2,
                  }}
                >
                  {profile.displayName}
                </Typography>
                <Typography noWrap sx={{ fontSize: 11, color: muted }}>
                  {profile.roleLabel}
                </Typography>
              </Box>
              <Tooltip title="Log out" arrow>
                <IconButton
                  size="small"
                  onClick={onLogout}
                  sx={{
                    color: muted,
                    "&:hover": { color: primary.main, bgcolor: tint },
                  }}
                >
                  <LogoutRoundedIcon sx={{ fontSize: 17 }} />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
}

// ---- Root component -------------------------------------------------------
export default function Dashboard() {
  const theme = useTheme();
  const { primary, background, divider, text } = theme.palette;
  const navigate = useNavigate();
  const { user, isAdmin, logout } = useAuth();

  const [open, setOpen] = React.useState(true);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [activeKey, setActiveKey] = React.useState("dashboard");
  const isMobile = useMediaQuery("(max-width:900px)");

  const navSections = React.useMemo(() => buildNavSections(isAdmin), [isAdmin]);
  const width = open ? EXPANDED_WIDTH : COLLAPSED_WIDTH;

  // สร้างข้อมูลโปรไฟล์จาก user จริง (แทนค่า hardcode เดิม)
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
    setActiveKey(key);
    if (isMobile) setMobileOpen(false);
  };

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  const currentLabel =
    navSections.flatMap((s) => s.items).find((i) => i.key === activeKey)
      ?.label ?? "Dashboard";

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
        {activeKey === ADMIN_USERS_KEY && isAdmin ? (
          <UserManagementSection />
        ) : activeKey === "settings" ? (
          <SettingsSection />
        ) : (
          <>
            <Typography
              sx={{ fontSize: 20, fontWeight: 500, color: text.head, mb: 0.5 }}
            >
              {currentLabel}
            </Typography>
            <Typography sx={{ fontSize: 13.5, color: text.secondary, mb: 3 }}>
              เนื้อหาของส่วนนี้จะแสดงที่นี่
              (พื้นที่สำหรับต่อยอดรายงานข้อมูลก๊าซ/ไอน้ำ/สภาพอากาศ)
            </Typography>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 2,
              }}
            >
              {[1, 2, 3, 4].map((n) => (
                <Box
                  key={n}
                  sx={{
                    bgcolor: background.paper,
                    borderRadius: `${theme.shape.borderRadius + 4}px`,
                    border: `1px solid ${divider}`,
                    boxShadow: `0 4px 16px ${alpha(primary.main, 0.06)}`,
                    p: 2.5,
                    height: 96,
                  }}
                />
              ))}
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
}
