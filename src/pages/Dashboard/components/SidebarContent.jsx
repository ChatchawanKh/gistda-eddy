// src/pages/Dashboard/components/SidebarContent.jsx
// แยกออกมาจาก Dashboard.jsx — logic และโครงสร้างเดิมไม่เปลี่ยนแปลง
import * as React from "react";
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

import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";

export default function SidebarContent({
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
                      <Tooltip
                        title={item.label}
                        placement="right"
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
              <Tooltip
                placement="right"
                title="ออกจากระบบ"
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
