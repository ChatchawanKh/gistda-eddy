import { useState, useMemo, useRef } from "react";
import { Outlet, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Drawer from "@mui/material/Drawer";
import useMediaQuery from "@mui/material/useMediaQuery";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";

import { useAuth } from "../../context/auth-context";

import SidebarContent from "./components/SidebarContent";

import { useThings } from "./hooks/useThings";
import { countAlertStations } from "./utils/alertStatus";
import { buildNavSections } from "./navSections";
import {
  EXPANDED_WIDTH,
  COLLAPSED_WIDTH,
  MOBILE_TOPBAR_HEIGHT,
} from "./Dashboard.constants";

// หน้าที่ใช้ ?station= ร่วมกัน — สลับไปมาผ่าน sidebar แล้วสถานีที่เลือกตามไปด้วย
const STATION_PAGES = ["/dashboard", "/alerts"];

// โครงหลักของทุกหน้าหลัง login (sidebar + พื้นที่เนื้อหา)
// โหลด Things ครั้งเดียวที่นี่ แล้วส่งให้หน้าลูกผ่าน <Outlet context>
// แต่ละหน้าอ่านด้วย useOutletContext() — สลับหน้าแล้วไม่ต้องโหลดใหม่
export default function DashboardLayout() {
  const theme = useTheme();
  const { primary, background, divider, text } = theme.palette;
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const { user, isAdmin, logout } = useAuth();

  const [open, setOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  // key ของเมนู = segment แรกของ path (/settings/account -> "settings")
  const activeKey = pathname.split("/")[1] || "dashboard";
  // ใช้ breakpoint เดียวกับ sx ({ xs, md }) — จอ < 900px เป็นโหมดมือถือ
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  // สถานี/ตัวแปรล่าสุดที่เลือกไว้ — ใช้ตอนกลับมาจากหน้าที่ไม่มี ?station= (เช่น settings)
  const lastSelectionRef = useRef({ station: "", ds: "" });

  const width = open ? EXPANDED_WIDTH : COLLAPSED_WIDTH;

  const { things, loading, error } = useThings();
  // นับเทียบเวลาตอนโหลด Things — ใช้แสดง badge ที่เมนูแจ้งเตือน
  // eslint-disable-next-line react-hooks/purity -- อายุข้อมูลต้องเทียบเวลาปัจจุบัน
  const alertCount = useMemo(() => countAlertStations(things, Date.now()), [things]);
  const navSections = useMemo(() => buildNavSections(alertCount), [alertCount]);

  const profile = useMemo(() => {
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
    if (isMobile) setMobileOpen(false);
    // user ทั่วไปมีแค่หน้า account -> ไปหน้านั้นตรง ๆ ไม่ผ่านหน้ารายการตัวเลือก
    const path = key === "settings" && !isAdmin ? "/settings/account" : `/${key}`;
    // อยู่หน้านั้นแล้วไม่ต้องทำอะไร — ยกเว้นอยู่หน้าย่อย (เช่น /settings/account) ให้กลับหน้าหลักของเมนู
    if (pathname.replace(/\/+$/, "") === path) return;

    // จำสถานีของหน้าที่กำลังจะออก (ds มีเฉพาะหน้า dashboard
    // ออกจาก alerts ด้วยสถานีเดิมก็เก็บ ds เดิมไว้)
    if (STATION_PAGES.includes(pathname)) {
      const station = searchParams.get("station") || "";
      const last = lastSelectionRef.current;
      const ds =
        pathname === "/dashboard"
          ? searchParams.get("ds") || ""
          : station === last.station
            ? last.ds
            : "";
      lastSelectionRef.current = { station, ds };
    }

    const next = new URLSearchParams();
    if (STATION_PAGES.includes(path)) {
      const { station, ds } = lastSelectionRef.current;
      if (station) next.set("station", station);
      if (station && ds && path === "/dashboard") next.set("ds", ds);
    }
    const search = next.toString();
    navigate(search ? `${path}?${search}` : path);
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
            height: MOBILE_TOPBAR_HEIGHT,
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
            // แท็บเล็ต: 100vh รวมแถบ URL ที่ยุบ/ขยายได้ ทำให้ล่าง sidebar ล้นจอ
            "@supports (height: 100dvh)": { height: "100dvh" },
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
          // แยก px/pb/pt — ห้ามใช้ p แบบ responsive คู่กับ pt เพราะ p: { xs } ออกมาเป็น
          // @media (min-width:0px) ที่ถูกวางหลัง pt ปกติ แล้ว padding จะทับ padding-top
          px: { xs: 2, md: 3 },
          pb: { xs: 2, md: 3 },
          // จอ < md: เว้นความสูงแถบบน (fixed) + ระยะปกติ 16px (breakpoint เดียวกับ isMobile)
          pt: { xs: `${MOBILE_TOPBAR_HEIGHT + 16}px`, md: 3 },
          minWidth: 0,
          bgcolor: background.paper,
        }}
      >
        <Outlet context={{ things, loading, error }} />

      </Box>
    </Box>
  );
}
