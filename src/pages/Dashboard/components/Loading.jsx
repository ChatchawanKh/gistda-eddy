import { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import { alpha, useTheme, keyframes } from "@mui/material/styles";
import SensorsIcon from "@mui/icons-material/Sensors";

const sweep = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const breathe = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.06); }
`;

export default function StationLoading() {
  const theme = useTheme();
  const [showReassurance, setShowReassurance] = useState(false);

  const reduceMotion = {
    "@media (prefers-reduced-motion: reduce)": { animation: "none" },
  };

  // แสดงข้อความเสริมถ้าโหลดนานเกินคาด เพื่อลดความกังวลของผู้ใช้
  useEffect(() => {
    const timer = setTimeout(() => setShowReassurance(true), 6000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        minHeight: "60vh",
        gap: 2.5,
      }}
    >
      {/* เรดาร์กวาดสัญญาณ - motion หลักจุดเดียว สื่อว่ากำลังค้นหา/เชื่อมต่อสถานี */}
      <Box
        sx={{
          position: "relative",
          width: 56,
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* วงแหวนพื้นหลัง (track) นิ่ง */}
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: `1.5px solid ${alpha(theme.palette.primary.main, 0.12)}`,
          }}
        />

        {/* แสงกวาดแบบเรดาร์ */}
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: `conic-gradient(from 0deg, transparent 0deg, transparent 260deg, ${alpha(
              theme.palette.primary.main,
              0.4
            )} 340deg, ${theme.palette.primary.main} 358deg, transparent 360deg)`,
            WebkitMask:
              "radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 2.5px))",
            mask: "radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 2.5px))",
            animation: `${sweep} 1.8s linear infinite`,
            ...reduceMotion,
          }}
        />

        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            bgcolor: alpha(theme.palette.primary.main, 0.12),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: `${breathe} 2.2s ease-in-out infinite`,
            ...reduceMotion,
          }}
        >
          <SensorsIcon
            sx={{ fontSize: 20, color: theme.palette.primary.main }}
          />
        </Box>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5 }}>
        <Typography
          sx={{
            fontSize: 13.5,
            fontWeight: 500,
            color: theme.palette.text.secondary,
          }}
        >
          กำลังโหลดข้อมูลสถานีให้คุณ...
        </Typography>

        {showReassurance && (
          <Typography
            sx={{
              fontSize: 12,
              color: theme.palette.text.disabled,
            }}
          >
            ยังคงเชื่อมต่ออยู่ อาจใช้เวลาสักครู่
          </Typography>
        )}
      </Box>
    </Box>
  );
}