// เลย์เอาต์กลางสำหรับหน้า Login / ForgotPassword / ResetPassword
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import { useTheme, alpha } from "@mui/material/styles";

export default function AuthLayout({ title, subtitle, children }) {
  const theme = useTheme();
  const { primary, background, text } = theme.palette;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: background.default,
        p: 2,
      }}
    >
      <Card sx={{ width: 400 }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 3 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                flexShrink: 0,
                borderRadius: 50,
                display: "grid",
                placeItems: "center",
                background: `linear-gradient(135deg, ${primary.main} 0%, ${primary.dark} 100%)`,
                boxShadow: `0 3px 10px ${alpha(primary.main, 0.35)}`,
                mr: 1.5
              }}
            >
              <Typography sx={{ color: primary.contrastText, fontSize: 18 }}>
                G
              </Typography>
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="h6"
                sx={{ color: text.head, lineHeight: 1.1 }}
              >
                GISTDA
                <Box component="span" sx={{ color: text.secondary }}>
                  .
                </Box>
              </Typography>
              <Typography
                variant="caption"
                sx={{ display: "block", lineHeight: 1.2 }}
              >
                EDDY
              </Typography>
            </Box>
          </Box>

          <Typography variant="h5" sx={{ color: text.head, mb: 0.5 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {subtitle}
            </Typography>
          )}

          {children}
        </CardContent>
      </Card>
    </Box>
  );
}
