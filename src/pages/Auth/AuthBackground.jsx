// พื้นหลังหน้า Auth: mesh gradient + gradient spheres แบบฝ้า + กริดบาง ๆ (ไม่มี animation)
import Box from "@mui/material/Box";

const W = 1600;
const H = 900;

const C = {
  blue: "#4FA3F7",
  sky: "#9FD3FF",
  ice: "#D6EAFF",
  lavender: "#AEB5EE",
  pink: "#F4C6D8",
};

// ก้อนสีเบลอ ๆ ด้านหลัง (mesh gradient)
const BLOBS = [
  [980, 430, 540, 300, C.sky, 0.95],
  [800, 540, 380, 210, C.lavender, 0.75],
  [1230, 290, 300, 190, C.pink, 0.6],
  [1320, 620, 360, 230, C.blue, 0.55],
  [620, 330, 300, 200, C.ice, 0.9],
  [460, 700, 260, 160, C.pink, 0.45],
];

// [cx, cy, r, ชุดสีด้านใน, phase ของคลื่น]
const SPHERES = [
  [170, 860, 330, [C.pink, C.ice, C.blue], 0.4],
  [1440, 50, 250, [C.lavender, C.pink, C.sky], 2.2],
  [1190, 650, 92, [C.ice, C.pink, C.blue], 1.1],
  [470, 245, 52, [C.pink, C.ice, C.blue], 3.0],
  [1090, 185, 30, [C.lavender, C.ice, C.sky], 4.2],
];

function wave(cx, cy, r, yOff, amp, phase) {
  const x0 = cx - r - 10;
  const x1 = cx + r + 10;
  let d = `M${x0} ${cy + r + 10}`;
  for (let x = x0; x <= x1; x += r / 12) {
    const t = (x - x0) / (x1 - x0);
    const y = cy + yOff * r + amp * r * Math.sin(t * Math.PI * 2 + phase);
    d += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return `${d} L${x1} ${cy + r + 10} Z`;
}

const GRID_X = [200, 400, 600, 800, 1000, 1200, 1400];
const GRID_Y = [150, 350, 550, 750];

export default function AuthBackground() {
  return (
    <Box
      aria-hidden="true"
      sx={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        background: "linear-gradient(160deg, #F7F9FD 0%, #EEF2F8 100%)",
      }}
    >
      <Box
        component="svg"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid slice"
        sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
      >
        <defs>
          <filter id="bg-mesh" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="90" />
          </filter>
          <filter id="bg-soft" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="10" />
          </filter>
          {/* ขอบทรงกลมสว่างขึ้นแบบกระจกฝ้า */}
          <radialGradient id="bg-rim">
            <stop offset="0.7" stopColor="#FFFFFF" stopOpacity="0" />
            <stop offset="1" stopColor="#FFFFFF" stopOpacity="0.55" />
          </radialGradient>
          <radialGradient id="bg-fade">
            <stop offset="0.2" stopColor="#FFFFFF" />
            <stop offset="1" stopColor="#000000" />
          </radialGradient>
          <mask id="bg-grid-mask">
            <rect width={W} height={H} fill="url(#bg-fade)" />
          </mask>
          {SPHERES.map(([cx, cy, r], i) => (
            <clipPath key={i} id={`bg-clip-${i}`}>
              <circle cx={cx} cy={cy} r={r} />
            </clipPath>
          ))}
          {SPHERES.map(([, , , [top, mid, bottom]], i) => (
            <linearGradient key={i} id={`bg-sph-${i}`} x1="0" y1="0" x2="0.3" y2="1">
              <stop offset="0" stopColor={top} />
              <stop offset="0.5" stopColor={mid} />
              <stop offset="1" stopColor={bottom} />
            </linearGradient>
          ))}
        </defs>

        <g filter="url(#bg-mesh)">
          {BLOBS.map(([cx, cy, rx, ry, fill, o]) => (
            <ellipse key={`${cx}-${cy}`} cx={cx} cy={cy} rx={rx} ry={ry} fill={fill} opacity={o} />
          ))}
        </g>

        {/* กริด + จุดตัด */}
        <g mask="url(#bg-grid-mask)">
          <g stroke="#FFFFFF" strokeOpacity="0.7" strokeWidth="1">
            {GRID_X.map((x) => (
              <line key={`x${x}`} x1={x} y1="0" x2={x} y2={H} />
            ))}
            {GRID_Y.map((y) => (
              <line key={`y${y}`} x1="0" y1={y} x2={W} y2={y} />
            ))}
          </g>
          <g fill="#FFFFFF" stroke="#9FB7DA" strokeOpacity="0.5">
            {GRID_X.flatMap((x) =>
              GRID_Y.map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="3" />),
            )}
          </g>
        </g>

        <ellipse cx="800" cy="1420" rx="1150" ry="640" fill="none" stroke="#FFFFFF" strokeOpacity="0.8" strokeWidth="1.5" />
        <ellipse cx="800" cy="-560" rx="1100" ry="700" fill="none" stroke="#FFFFFF" strokeOpacity="0.5" strokeWidth="1.5" />

        {SPHERES.map(([cx, cy, r, [top, mid, bottom], ph], i) => (
          <g key={i}>
            <g clipPath={`url(#bg-clip-${i})`}>
              <g filter="url(#bg-soft)">
                <rect x={cx - r - 20} y={cy - r - 20} width={2 * r + 40} height={2 * r + 40} fill={`url(#bg-sph-${i})`} />
                <path d={wave(cx, cy, r, -0.25, 0.12, ph)} fill={mid} opacity="0.85" />
                <path d={wave(cx, cy, r, 0.05, 0.1, ph + 1.4)} fill={top} opacity="0.55" />
                <path d={wave(cx, cy, r, 0.3, 0.08, ph + 2.6)} fill={bottom} opacity="0.9" />
              </g>
              <circle cx={cx} cy={cy} r={r} fill="url(#bg-rim)" />
            </g>
            <circle cx={cx} cy={cy} r={r - 0.75} fill="none" stroke="#FFFFFF" strokeOpacity="0.6" strokeWidth="1.5" />
          </g>
        ))}
      </Box>
    </Box>
  );
}
