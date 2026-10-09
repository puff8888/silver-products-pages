import { memo } from 'react';

/* ============================================================================
  * SilverPathBackground — coordinate-calibrated SVG silver-path background
 * ----------------------------------------------------------------------------
 * Layout grid — viewBox = 1600 × 900  (16 : 9, responsive 100%)
 *
 * Tile spacing formula:
 *   COL_STEP = 200   → 9 columns  at x ∈ { 100, 300, 500, 700, 900, 1100, 1300, 1500 }   (8 anchor columns)
 *   ROW_STEP = 180   → 5 rows      at y ∈ { 90,  270, 450, 630, 810 }                     (5 anchor rows)
 *
 * At every (col,row) anchor we place one of 4 silver-path primitives rotated
 * 90°/180°/270° to produce visual flow without repetition:
 *
 *   Type A  → Arcs       : M(x,y) a rx,ry 0 0 1 dx,dy   (sweeping curves)
 *   Type B  → Diagonals  : L(x+d, y+d)                  (with beveled caps)
 *   Type C  → Circles    : Cx, cy + r                   (1/4/3-quarter rings)
 *   Type D  → Tick marks : short perpendicular L-shapes
 *
 * All strokes use silver-gray palette with calibrated stroke-opacity to
 * harmonize with the 56px apple-grid below and hero-gradient radial wash.
 * ========================================================================== */

const VB_W = 1600;
const VB_H = 900;
const COL_STEP = 200;          // horizontal distance between path anchors
const ROW_STEP = 180;          // vertical   distance between path anchors
const COL_START = 100;         // first anchor x (left padding = 100 = VB_W % 1500 is ok)
const ROW_START = 90;          // first anchor y (top padding)
const COLS = 8;                // → x values: 100, 300, 500, 700, 900, 1100, 1300, 1500
const ROWS = 5;                // → y values:  90, 270, 450, 630, 810

/* Stroke palette — all silver, 4 calibrated opacities for depth layering */
const STROKE = {
  FAR:    '#a1a1a6',           // silver-400  farthest, most transparent
  MID:    '#c7c7cc',           // silver-300  mid
  NEAR:   '#e5e5ea',           // silver-200  nearest / brightest
  HILITE: '#f5f5f7',           // silver-100  only for 8% of intersection markers
};

/* ---------- deterministic pseudo-random so SSR/CSR render the same -------- */
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}
const rand = seeded(0x51ac32);  // replaced invalid 'L' with valid 'a'

/* ---------- path builders ---------- */
const paths = [];

for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    const x = COL_START + c * COL_STEP;
    const y = ROW_START + r * ROW_STEP;

    /* pick primitive by position so it's not random noise — banded layers */
    const roll = rand();
    const layer = (c + r) % 3;             // 0 far, 1 mid, 2 near
    const color = layer === 0 ? STROKE.FAR : layer === 1 ? STROKE.MID : STROKE.NEAR;
    const sw    = layer === 0 ? 1 : layer === 1 ? 1.25 : 1.5;
    const op    = layer === 0 ? 0.18 : layer === 1 ? 0.28 : 0.42;

    if (roll < 0.34) {
      /* Type A — sweeping arc of radius 40..90 */
      const radius = 40 + Math.floor(rand() * 50);
      const sweep  = rand() < 0.5 ? 0 : 1;
      const large  = rand() < 0.22 ? 1 : 0;
      const dx = Math.floor(rand() * 120 - 60);
      const dy = Math.floor(rand() * 100 - 50);
      paths.push(
        <path
          key={`a-${r}-${c}`}
          d={`M${x} ${y} a ${radius} ${radius} 0 ${large} ${sweep} ${dx} ${dy}`}
          fill="none"
          stroke={color}
          strokeWidth={sw}
          strokeOpacity={op}
          strokeLinecap="round"
        />
      );
    } else if (roll < 0.62) {
      /* Type B — diagonal / chevron with two segments */
      const len = 50 + Math.floor(rand() * 90);
      const dir = Math.floor(rand() * 4);  // 0:↘ 1:↙ 2:↖ 3:↗
      const dx = len * (dir === 0 || dir === 3 ? 1 : -1);
      const dy = len * (dir === 0 || dir === 1 ? 1 : -1);
      const bend = rand() < 0.4;
      const d = bend
        ? `M${x} ${y} L${x + Math.floor(dx * 0.6)} ${y} L${x + dx} ${y + dy}`
        : `M${x} ${y} L${x + dx} ${y + dy}`;
      paths.push(
        <path
          key={`b-${r}-${c}`}
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={sw}
          strokeOpacity={op}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    } else if (roll < 0.84) {
      /* Type C — quarter / 3-quarter ring (circular arc paths) */
      const radius = 24 + Math.floor(rand() * 48);
      const quarter = Math.floor(rand() * 4);
      /* start angle = quarter * 90°, sweep 90° or 270° */
      const sweepLarge = rand() < 0.22 ? 1 : 0;
      const arcDx = Math.round(radius * Math.cos(Math.PI / 2 * (quarter + 1)));
      const arcDy = Math.round(radius * Math.sin(Math.PI / 2 * (quarter + 1)));
      const sx    = Math.round(radius * Math.cos(Math.PI / 2 * quarter));
      const sy    = Math.round(radius * Math.sin(Math.PI / 2 * quarter));
      paths.push(
        <path
          key={`c-${r}-${c}`}
          d={`M${x + sx} ${y + sy} A ${radius} ${radius} 0 ${sweepLarge} 1 ${x + arcDx} ${y + arcDy}`}
          fill="none"
          stroke={color}
          strokeWidth={sw + 0.25}
          strokeOpacity={op}
          strokeLinecap="round"
        />
      );
    } else {
      /* Type D — L / tick mark (2 per-leg) */
      const hx = 20 + Math.floor(rand() * 50);
      const hy = 20 + Math.floor(rand() * 50);
      paths.push(
        <path
          key={`d-${r}-${c}`}
          d={`M${x - hx} ${y} L${x} ${y} L${x} ${y + hy}`}
          fill="none"
          stroke={color}
          strokeWidth={sw + 0.25}
          strokeOpacity={Math.min(1, op + 0.05)}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    }

    /* Hilite dots — every 5th anchor, small silver-100 circle at x,y */
    if (((r * COLS) + c) % 5 === 0) {
      paths.push(
        <circle
          key={`h-${r}-${c}`}
          cx={x}
          cy={y}
          r="1.8"
          fill={STROKE.HILITE}
          fillOpacity="0.55"
        />
      );
    }
  }
}

/* Secondary layer: long horizontal guide paths that tie columns together.
 * Rows of thin sweeping lines, 1600px wide — 3 of them at y = 220, 500, 780
 * so the distributed tiles feel anchored to a horizontal baseline grid.
 */
const GUIDES = [
  { y: 220, sw: 0.9, op: 0.14, d: 'M 40 220 Q 400 170 800 220 T 1560 220' },
  { y: 500, sw: 1.1, op: 0.20, d: 'M 20 500 Q 380 550 800 500 T 1580 500' },
  { y: 780, sw: 0.9, op: 0.14, d: 'M 60 780 Q 440 730 820 780 T 1540 780' },
];

const SilverPathBackground = memo(function SilverPathBackground({ className = '', overlay = false }) {
  return (
    <svg
      role="img"
      aria-hidden="true"
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      preserveAspectRatio="xMidYMid slice"
      className={`pointer-events-none absolute inset-0 w-full h-full select-none ${className}`}
      style={{ zIndex: overlay ? 2 : 0, opacity: 0.08 }}
    >
      {/* Silver background path fill wash (very subtle) */}
      <defs>
        <linearGradient id="silverPathBgWash" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#1c1c1e" stopOpacity="0.00" />
          <stop offset="55%" stopColor="#a1a1a6" stopOpacity="0.02" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.00" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width={VB_W} height={VB_H} fill="url(#silverPathBgWash)" />

      {/* Horizontal guide paths */}
      {GUIDES.map((g, i) => (
        <path
          key={`g-${i}`}
          d={g.d}
          fill="none"
          stroke={STROKE.MID}
          strokeWidth={g.sw}
          strokeOpacity={g.op}
          strokeLinecap="round"
        />
      ))}

      {/* Coordinate-calibrated distributed silver paths (40 primitives) */}
      {paths}
    </svg>
  );
});

export default SilverPathBackground;
export { VB_W, VB_H, COL_STEP, ROW_STEP, COL_START, ROW_START, COLS, ROWS };
