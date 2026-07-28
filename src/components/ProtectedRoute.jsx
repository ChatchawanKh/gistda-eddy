// src/components/ProtectedRoute.jsx
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import { Box, Paper, Typography, CircularProgress } from "@mui/material";

import { useTheme, alpha } from "@mui/material/styles";

export default function ProtectedRoute({ requiredRole }) {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const theme = useTheme();

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: `
            linear-gradient(
              135deg,
              ${alpha(theme.palette.primary.light, 0.25)} 0%,
              ${theme.palette.background.default} 45%,
              ${alpha(theme.palette.secondary.light, 0.2)} 100%
            )
          `,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            width: 360,
            p: 2,
            borderRadius: 1,
            textAlign: "center",
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: theme.shadows[3],
            backdropFilter: "blur(10px)",
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              mb: 1,
              color: theme.palette.text.primary,
            }}
          >
            กำลังตรวจสอบสิทธิ์
          </Typography>

          <Typography
            variant="body2"
            sx={{
              color: theme.palette.text.secondary,
            }}
          >
            ระบบกำลังตรวจสอบข้อมูลผู้ใช้งาน
            <br />
            กรุณารอสักครู่...
          </Typography>

        </Paper>
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole === "admin" && !isAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
