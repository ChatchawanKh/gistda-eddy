import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme, alpha } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

// ดาวเทียมจาก lottie.host (52e137f0…/1FZRAwrsiD.lottie) — ปรับสีโทนเขียวเดิมเป็นน้ำเงินของ theme แล้ว
// ใช้เป็นไฟล์ asset แยก (?url) ไม่รวมเข้า bundle หลัก
import satelliteLottieUrl from "../assets/lotties/satellite.lottie?url";

// ปิดการเคลื่อนไหวทั้งหน้าเมื่อผู้ใช้ตั้ง prefers-reduced-motion
const REDUCED_MOTION = "@media (prefers-reduced-motion: reduce)";

// ฝุ่นลอยขึ้นช้า ๆ เต็มจอ — สีตาม primary/secondary ของ theme
function ParticleCanvas({ colors }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let animId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const particles = Array.from({ length: 70 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2.5 + 0.5,
      dx: (Math.random() - 0.5) * 0.3,
      dy: -(Math.random() * 0.4 + 0.1),
      opacity: Math.random() * 0.4 + 0.1,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: Math.random() * 0.01 + 0.005,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        if (!reduceMotion) {
          p.wobble += p.wobbleSpeed;
          p.x += p.dx + Math.sin(p.wobble) * 0.3;
          p.y += p.dy;

          if (p.y < -10) {
            p.y = canvas.height + 10;
            p.x = Math.random() * canvas.width;
          }
          if (p.x < -10) p.x = canvas.width + 10;
          if (p.x > canvas.width + 10) p.x = -10;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      if (!reduceMotion) animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [colors]);

  return (
    <Box
      component="canvas"
      ref={canvasRef}
      aria-hidden
      sx={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    />
  );
}

// วงแสงเบลอลอยเป็นจังหวะด้านหลังการ์ด
const glowSx = (color, delay) => ({
  position: "absolute",
  borderRadius: "50%",
  bgcolor: color,
  filter: "blur(72px)",
  pointerEvents: "none",
  animation: `notFoundPulse 3s ease-in-out ${delay}s infinite`,
  "@keyframes notFoundPulse": {
    "0%, 100%": { opacity: 0.6, transform: "scale(1)" },
    "50%": { opacity: 1, transform: "scale(1.08)" },
  },
  [REDUCED_MOTION]: { animation: "none" },
});

// หน้า 404 — route "*" ใน App.jsx (อยู่นอก ProtectedRoute ให้ทุกคนเห็นได้)
export default function NotFound() {
  const navigate = useNavigate();
  const theme = useTheme();
  const { primary, secondary, background, text, divider } = theme.palette;
  const radius = theme.shape.borderRadius;
  const [reduceMotion] = useState(
    () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
  );

  // history.state.idx มาจาก BrowserRouter — 0 = เปิดหน้านี้เป็นหน้าแรกของแท็บ
  // ย้อนกลับไม่ได้ จึงพาไปหน้าหลักแทน
  const goBack = () => {
    if ((window.history.state?.idx ?? 0) > 0) navigate(-1);
    else navigate("/", { replace: true });
  };

  const gradient = `linear-gradient(135deg, ${primary.main}, ${secondary.main})`;
  // อ้างอิงคงที่ต่อ theme — กัน ParticleCanvas สร้างฝุ่นใหม่ทุก render
  const particleColors = useMemo(
    () => [primary.main, secondary.main],
    [primary.main, secondary.main],
  );

  return (
    <Box
      sx={{
        minHeight: "100vh",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: { xs: 2, sm: 4 },
        overflow: "hidden",
        bgcolor: background.default,
        backgroundImage:
          `radial-gradient(70% 60% at 50% 0%, ${background.paper} 0%, transparent 70%), ` +
          `radial-gradient(60% 50% at 4% -4%, ${alpha(primary.main, 0.12)}, transparent 62%), ` +
          `radial-gradient(55% 45% at 100% 4%, ${alpha(secondary.main, 0.1)}, transparent 60%)`,
      }}
    >
      <ParticleCanvas colors={particleColors} />

      <Box
        sx={{
          ...glowSx(alpha(primary.main, 0.08), 0),
          top: "15%",
          left: "15%",
          width: 300,
          height: 300,
        }}
      />
      <Box
        sx={{
          ...glowSx(alpha(secondary.main, 0.07), 1),
          bottom: "18%",
          right: "15%",
          width: 360,
          height: 360,
        }}
      />

      {/* การ์ดหลัก */}
      <Box
        sx={{
          position: "relative",
          width: "100%",
          maxWidth: 560,
          px: { xs: 3, sm: 6 },
          py: { xs: 4, sm: 5 },
          textAlign: "center",
          bgcolor: background.paper,
          border: `1px solid ${divider}`,
          borderRadius: `${radius + 6}px`,
          boxShadow: theme.shadows[3],
        }}
      >
        {/* Logo + ชื่อระบบ (แบบเดียวกับ AuthLayout) */}
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                flexShrink: 0,
                borderRadius: 50,
                display: "grid",
                placeItems: "center",
                background: `linear-gradient(135deg, ${primary.main} 0%, ${primary.dark} 100%)`,
                boxShadow: `0 3px 10px ${alpha(primary.main, 0.35)}`,
              }}
            >
              <Typography sx={{ color: primary.contrastText, fontSize: 20 }}>
                G
              </Typography>
            </Box>
            <Box sx={{ textAlign: "start", minWidth: 0 }}>
              <Typography
                sx={{ fontSize: 22, fontWeight: 800, color: text.head, lineHeight: 1.1 }}
              >
                GISTDA
                <Box component="span" sx={{ color: text.secondary }}>
                  .
                </Box>
              </Typography>
              <Typography sx={{ fontSize: 12, color: text.secondary, lineHeight: 1.35 }}>
                ระบบรายงานข้อมูลตรวจวัดการแลกเปลี่ยนก๊าซ ไอน้ำ และสภาพอากาศ
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* ดาวเทียม (lottie) บนจานวงกลม */}
        <Box
          aria-hidden
          sx={{
            mx: "auto",
            mt: 3,
            width: { xs: 180, sm: 210 },
            height: { xs: 180, sm: 210 },
            borderRadius: "50%",
            overflow: "hidden",
            // bgcolor: alpha(primary.main, 0.06),
            // border: `1px solid ${alpha(primary.main, 0.16)}`,
          }}
        >
          <DotLottieReact
            src={satelliteLottieUrl}
            loop
            autoplay={!reduceMotion}
            style={{ width: "100%", height: "100%" }}
          />
        </Box>

        <Typography
          component="h1"
          sx={{
            mt: 2,
            fontSize: { xs: "2rem", sm: "3.5rem" },
            fontWeight: 500,
            lineHeight: 1,
            background: gradient,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          404
        </Typography>

        <Typography
          sx={{
            mt: 1.5,
            fontSize: { xs: "0.95rem", sm: "1.15rem" },
            fontWeight: 500,
            color: text.head,
          }}
        >
          ไม่พบหน้าที่คุณต้องการ
        </Typography>

        <Typography sx={{ mt: 1, fontSize: "0.95rem", color: text.secondary }}>
          หน้าที่คุณกำลังค้นหาไม่มีอยู่ หรืออาจถูกย้ายไปยังตำแหน่งอื่น
        </Typography>

        {/* กล่องคำแนะนำ */}
        <Box
          sx={{
            mt: 3,
            px: 2,
            py: 1.5,
            display: "flex",
            alignItems: "flex-start",
            gap: 1.25,
            textAlign: "left",
            bgcolor: alpha(primary.main, 0.06),
            border: `1px solid ${alpha(primary.main, 0.2)}`,
            borderRadius: `${radius}px`,
          }}
        >
          <InfoOutlinedIcon sx={{ fontSize: 20, color: primary.main, mt: "1px" }} />
          <Box>
            <Typography sx={{ fontSize: "0.9rem", fontWeight: 500, color: primary.main }}>
              ไม่ต้องกังวล
            </Typography>
            <Typography sx={{ fontSize: "0.85rem", color: text.secondary }}>
              กดปุ่มด้านล่างเพื่อย้อนกลับ หรือกลับไปยังหน้าหลักของระบบ
            </Typography>
          </Box>
        </Box>

        <Stack
          spacing={1.5}
          direction={{ xs: "column", sm: "row" }}
          sx={{ mt: 3.5, justifyContent: "center" }}
        >
          <Button
            variant="outlined"
            startIcon={<ArrowBackRoundedIcon />}
            onClick={goBack}
            sx={{
              px: 3.5,
              py: 1.25,
              fontSize: "0.95rem",
              fontWeight: 500,
              borderColor: divider,
              transition: "all 0.25s ease",
              "&:hover": {
                bgcolor: alpha(primary.main, 0.06),
                borderColor: primary.main,
                transform: "translateY(-1px)",
              },
            }}
          >
            ย้อนกลับ
          </Button>

          <Button
            variant="contained"
            disableElevation
            startIcon={<HomeRoundedIcon />}
            onClick={() => navigate("/", { replace: true })}
            sx={{
              px: 3.5,
              py: 1.25,
              fontSize: "0.95rem",
              fontWeight: 500,
              background: gradient,
              boxShadow: `0 6px 16px -6px ${alpha(primary.main, 0.5)}`,
              transition: "all 0.25s ease",
              "&:hover": {
                background: gradient,
                filter: "brightness(1.06)",
                boxShadow: `0 8px 20px -6px ${alpha(primary.main, 0.6)}`,
                transform: "translateY(-1px)",
              },
            }}
          >
            กลับหน้าหลัก
          </Button>
        </Stack>

        <Typography sx={{ mt: 3.5, fontSize: "0.8rem", color: text.secondary }}>
          Error Code: 404
        </Typography>
      </Box>
    </Box>
  );
}
