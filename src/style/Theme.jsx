import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// Design tokens
const BLUE = {
  50: '#EAF2FF',
  100: '#D6E4FF',
  200: '#ADC9FF',
  300: '#85ADFF',
  400: '#5790FF',
  500: '#0057FF', // primary main
  600: '#0047D6',
  700: '#0038AD',
  800: '#00277A',
  900: '#001A52',
};

const SKY = {
  50: '#F0F8FF',
  100: '#DCEEFF',
  200: '#B9DCFF',
  300: '#8CC6FF',
  400: '#5AAEFF',
  500: '#2D8CFF', // secondary main
  600: '#1672E8',
  700: '#0B5BC2',
  800: '#084594',
  900: '#052A5C',
};

const GRAY = {
  25: '#FCFBF8',
  50: '#F8F7F4', // background main
  100: '#F1EFEA',
  200: '#E6E2DA',
  300: '#D5D0C6',
  400: '#B2ABA0',
  500: '#8A8378',
  600: '#625D55',
  700: '#46423C',
  800: '#2D2A26',
  900: '#171512',
};

const RADIUS = 12;

const SHADOW_SM = '0 1px 2px rgba(15, 23, 42, 0.06), 0 1px 1px rgba(15, 23, 42, 0.04)';
const SHADOW_MD = '0 4px 12px rgba(15, 23, 42, 0.08), 0 2px 4px rgba(15, 23, 42, 0.04)';
const SHADOW_LG = '0 12px 28px rgba(15, 23, 42, 0.10), 0 4px 10px rgba(15, 23, 42, 0.05)';
const SHADOW_XL = '0 24px 48px rgba(15, 23, 42, 0.14), 0 8px 16px rgba(15, 23, 42, 0.06)';

// A soft, layered elevation ramp so MUI's `elevation` prop stays consistent
// with the "soft shadow" enterprise look instead of the default hard shadows.
const buildShadows = () => {
  const base = [
    'none',
    SHADOW_SM,
    SHADOW_SM,
    SHADOW_MD,
    SHADOW_MD,
    SHADOW_MD,
    SHADOW_LG,
    SHADOW_LG,
    SHADOW_LG,
    SHADOW_LG,
    SHADOW_XL,
    SHADOW_XL,
    SHADOW_XL,
    SHADOW_XL,
    SHADOW_XL,
    SHADOW_XL,
    SHADOW_XL,
    SHADOW_XL,
    SHADOW_XL,
    SHADOW_XL,
    SHADOW_XL,
    SHADOW_XL,
    SHADOW_XL,
    SHADOW_XL,
    SHADOW_XL,
  ];
  return base;
};

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: BLUE[500],
      light: BLUE[300],
      dark: BLUE[700],
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: SKY[500],
      light: SKY[300],
      dark: SKY[700],
      contrastText: '#0B2436',
    },
    background: {
      default: GRAY[50],
      paper: '#FFFFFF',
      light: BLUE[100],
    },
    text: {
      head: BLUE[500],
      primary: GRAY[900],
      secondary: GRAY[600],
      disabled: GRAY[400],
    },
    divider: GRAY[200],
    grey: GRAY,
    success: { main: '#16A34A' },
    warning: { main: '#D97706' },
    error: { main: '#DC2626' },
    info: { main: SKY[600] },
    action: {
      hover: BLUE[50],
      selected: BLUE[100],
      disabledBackground: GRAY[100],
    },
  },

  shape: {
    borderRadius: RADIUS,
  },

  shadows: buildShadows(),

  // ---------------------------------------------------------------------------
  // Custom tokens (นอกเหนือจาก MUI spec) — ใช้ร่วมกันทั่วแอป
  // ---------------------------------------------------------------------------
  custom: {
    // มุมโค้งขององค์ประกอบย่อยในการ์ด (icon badge, ป้ายเล็ก) — เท่ากับ MuiChip
    radiusSm: 8,
    // กล่องการ์ดของหน้า Dashboard (การ์ดกราฟ / แผนที่ / แถบค้นหา ฯลฯ) ให้หน้าตา
    // ตรงกับ MuiCard ด้านล่าง: ขอบ GRAY[200] + มุม RADIUS + เงา SHADOW_SM
    card: {
      backgroundColor: '#FFFFFF',
      border: `1px solid ${GRAY[200]}`,
      borderRadius: `${RADIUS}px`,
      boxShadow: SHADOW_SM,
    },
    // การ์ดที่คลิกได้ — hover ยกเงาเป็น SHADOW_MD และขอบเป็นสีหลัก
    cardInteractive: {
      cursor: 'pointer',
      transition: 'border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease',
      '&:hover': {
        borderColor: BLUE[400],
        boxShadow: SHADOW_MD,
      },
      '&:focus-visible': {
        outline: `2px solid ${BLUE[300]}`,
        outlineOffset: 2,
      },
    },
    // ปุ่มลอยบนแผนที่ (zoom / home / basemap / ขยาย / เต็มจอ)
    floatingControl: {
      backgroundColor: '#FFFFFF',
      border: `1px solid ${GRAY[200]}`,
      borderRadius: '8px',
      boxShadow: SHADOW_MD,
    },
    // ปุ่มเมนู 3 จุด (MoreVertRoundedIcon) ที่มุมขวาของหัวการ์ดกราฟทุกใบ
    // ทุกกราฟใช้ style ก้อนเดียวกันนี้ (BarChart / Heatmap / WindRose / RangedChart)
    chartMenuButton: {
      color: GRAY[500],
      borderRadius: '8px',
      padding: '4px',
      transition: 'background-color 120ms ease, color 120ms ease',
      '&:hover': { backgroundColor: GRAY[100], color: GRAY[700] },
      '&.Mui-focusVisible': { backgroundColor: GRAY[100] },
      '&.Mui-disabled': { color: GRAY[300] },
    },
    // Paper ของ dropdown menu ให้เข้าชุดกับเมนู export เดิมของ Highcharts
    chartMenuPaper: {
      borderRadius: '12px',
      border: `1px solid ${GRAY[200]}`,
      boxShadow: SHADOW_LG,
      padding: '6px',
      '& .MuiList-root': { padding: 0 },
      '& .MuiMenuItem-root': {
        fontSize: '12.5px',
        fontWeight: 500,
        color: GRAY[700],
        borderRadius: '8px',
        padding: '8px 12px',
        margin: '1px 0',
        minHeight: 'auto',
        '& .MuiListItemIcon-root': { minWidth: 28, color: 'inherit' },
        '& .MuiSvgIcon-root': { fontSize: 18 },
        '&:hover': { backgroundColor: BLUE[50], color: BLUE[700] },
      },
    },
  },

  typography: {
    fontFamily: '"Kanit", "Noto Sans Thai", sans-serif',

    h1: { fontWeight: 600, fontSize: '2.5rem', letterSpacing: '-0.02em', lineHeight: 1.2 },
    h2: { fontWeight: 600, fontSize: '2rem', letterSpacing: '-0.02em', lineHeight: 1.25 },
    h3: { fontWeight: 500, fontSize: '1.625rem', letterSpacing: '-0.015em', lineHeight: 1.3 },
    h4: { fontWeight: 500, fontSize: '1.375rem', letterSpacing: '-0.01em', lineHeight: 1.35 },
    h5: { fontWeight: 500, fontSize: '1.125rem', letterSpacing: '-0.01em', lineHeight: 1.4 },
    h6: { fontWeight: 500, fontSize: '1rem', letterSpacing: '-0.005em', lineHeight: 1.4 },
    subtitle1: { fontWeight: 400, fontSize: '0.9375rem' },
    subtitle2: { fontWeight: 400, fontSize: '0.8125rem', color: GRAY[600] },
    body1: { fontSize: '0.9375rem', lineHeight: 1.55 },
    body2: { fontSize: '0.8125rem', lineHeight: 1.55, color: GRAY[600] },
    button: { fontWeight: 400, textTransform: 'none', letterSpacing: 0 },
    caption: { fontSize: '0.75rem', color: GRAY[500] },
    overline: {
      fontSize: '0.6875rem',
      fontWeight: 500,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: GRAY[500],
    },
  },

  components: {
    // -- Global reset -----------------------------------------------------
    MuiCssBaseline: {
      styleOverrides: {
        '*': {
          boxSizing: 'border-box',
        },
        html: {
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        },
        body: {
          backgroundColor: GRAY[50],
          color: GRAY[900],
        },
        '::selection': {
          backgroundColor: BLUE[200],
          color: GRAY[900],
        },
        '::-webkit-scrollbar': {
          width: 8,
          height: 8,
        },
        '::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '::-webkit-scrollbar-thumb': {
          background: GRAY[300],
          borderRadius: 8,
        },
        '::-webkit-scrollbar-thumb:hover': {
          background: GRAY[400],
        },
        a: {
          color: BLUE[600],
          textDecoration: 'none',
        },
        // ดูกราฟแบบเต็มจอ (Highcharts full-screen) ให้พื้นหลังเป็นสีขาวเสมอ
        ':fullscreen': { backgroundColor: '#FFFFFF' },
        ':-webkit-full-screen': { backgroundColor: '#FFFFFF' },
      },
    },

    // -- Button -------------------------------------------------------------
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: RADIUS,
          padding: '8px 18px',
          fontWeight: 600,
          transition: 'all 0.15s ease',
        },
        sizeLarge: {
          padding: '11px 24px',
          fontSize: '0.9375rem',
        },
        sizeSmall: {
          padding: '5px 12px',
          fontSize: '0.8125rem',
        },
        contained: {
          boxShadow: SHADOW_SM,
          '&:hover': {
            boxShadow: SHADOW_MD,
          },
        },
        containedPrimary: {
          background: `linear-gradient(135deg, ${BLUE[500]} 0%, ${BLUE[600]} 100%)`,
          '&:hover': {
            background: `linear-gradient(135deg, ${BLUE[600]} 0%, ${BLUE[700]} 100%)`,
          },
        },
        outlined: {
          borderColor: GRAY[300],
          '&:hover': {
            borderColor: BLUE[400],
            backgroundColor: BLUE[50],
          },
        },
        text: {
          '&:hover': {
            backgroundColor: BLUE[50],
          },
        },
      },
    },

    // -- Card ---------------------------------------------------------------
    MuiCard: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          borderRadius: RADIUS,
          border: `1px solid ${GRAY[200]}`,
          boxShadow: SHADOW_SM,
          backgroundColor: '#FFFFFF',
          backgroundImage: 'none',
          transition: 'box-shadow 0.2s ease, transform 0.2s ease',
        },
      },
    },
    MuiCardHeader: {
      styleOverrides: {
        root: { padding: '20px 20px 0' },
        title: { fontSize: '1rem', fontWeight: 700 },
        subheader: { fontSize: '0.8125rem', color: GRAY[500] },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: 20,
          '&:last-child': { paddingBottom: 20 },
        },
      },
    },

    // -- Paper ----------------------------------------------------------------
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        rounded: {
          borderRadius: RADIUS,
        },
        elevation0: {
          border: `1px solid ${GRAY[200]}`,
        },
        elevation1: {
          boxShadow: SHADOW_SM,
        },
      },
    },

    // -- AppBar -----------------------------------------------------------
    MuiAppBar: {
      defaultProps: {
        elevation: 0,
        color: 'inherit',
      },
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          color: GRAY[900],
          boxShadow: `inset 0 -1px 0 ${GRAY[200]}`,
          backgroundImage: 'none',
        },
        colorPrimary: {
          backgroundColor: '#FFFFFF',
          color: GRAY[900],
        },
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: {
          minHeight: 64,
        },
      },
    },

    // -- Drawer ---------------------------------------------------------------
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#FFFFFF',
          borderRight: `1px solid ${GRAY[200]}`,
          backgroundImage: 'none',
        },
      },
    },

    // -- TextField / inputs --------------------------------------------------
    MuiTextField: {
      defaultProps: {
        size: 'small',
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: RADIUS,
          backgroundColor: GRAY[50],
          transition: 'background-color 0.15s ease, box-shadow 0.15s ease',
          '& fieldset': {
            borderColor: GRAY[300],
          },
          '&:hover fieldset': {
            borderColor: BLUE[400],
          },
          '&.Mui-focused': {
            backgroundColor: '#FFFFFF',
          },
          '&.Mui-focused fieldset': {
            borderColor: BLUE[500],
            borderWidth: 1.5,
          },
        },
        notchedOutline: {
          borderColor: GRAY[300],
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontSize: '0.9375rem',
          '&.Mui-focused': {
            color: BLUE[600],
          },
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        input: {
          fontSize: '0.9375rem',
        },
      },
    },

    // -- Chip -----------------------------------------------------------------
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
          fontSize: '0.75rem',
        },
        filled: {
          backgroundColor: GRAY[100],
          color: GRAY[700],
        },
        filledPrimary: {
          backgroundColor: BLUE[50],
          color: BLUE[700],
        },
        filledSecondary: {
          backgroundColor: SKY[50],
          color: SKY[800],
        },
        outlined: {
          borderColor: GRAY[300],
        },
        deleteIcon: {
          color: GRAY[400],
          '&:hover': { color: GRAY[600] },
        },
      },
    },

    // -- Misc enterprise touches --------------------------------------------
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: GRAY[800],
          fontSize: '0.75rem',
          borderRadius: 8,
          padding: '6px 10px',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: RADIUS - 2,
          '&.Mui-selected': {
            backgroundColor: BLUE[50],
            color: BLUE[700],
            '&:hover': { backgroundColor: BLUE[100] },
          },
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: GRAY[200],
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          backgroundColor: BLUE[500],
          fontWeight: 700,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: GRAY[200],
        },
        head: {
          fontSize: '0.75rem',
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: GRAY[500],
          backgroundColor: GRAY[50],
        },
      },
    },
  },
});

export default function Theme({ children }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}