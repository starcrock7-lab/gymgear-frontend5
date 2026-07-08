"use client";

import * as React from "react";

/* Hero wallpaper v5 — part-by-part ignition, no cursor light at all.
   The wall is one inline SVG grid of glass dumbbells (45°). Every bar and
   plate is its own <rect> with a CSS :hover rule: sweep the mouse across a
   dumbbell and the exact parts you touch flash molten orange, hold a beat,
   then cool back to glass (fast transition in, delayed slow transition
   out). Zero JavaScript at runtime, no masks, no filters chasing the
   cursor — just shapes lighting under the pointer. Touch devices never
   hover, so the wall simply rests. */

/* Art is drawn on a 120px grid, then scaled down so the wall reads as a
   dense wallpaper rather than a few big props. */
const ART = 120;
const CELL = 78;
const SCALE = CELL / ART;
const COLS = 28; // ~2180px wide — covers ultrawide, parent clips the rest
const ROWS = 14; // ~1090px tall

/* One dumbbell's parts, local coords (drawn at 0..120, rotated 45°). */
const PARTS = [
  { x: 27, y: 56, w: 66, h: 8 }, // bar
  { x: 17, y: 44, w: 9, h: 32 }, // inner plate L
  { x: 94, y: 44, w: 9, h: 32 }, // inner plate R
  { x: 6, y: 50, w: 8, h: 20 }, // outer plate L
  { x: 106, y: 50, w: 8, h: 20 }, // outer plate R
];

const CELLS = Array.from({ length: COLS * ROWS }, (_, i) => ({
  cx: (i % COLS) * CELL,
  cy: Math.floor(i / COLS) * CELL,
}));

/* Clear the pattern out of the middle so the dumbbells frame the headline
   instead of sitting behind it; they fade in toward the edges. On the
   viewport-sized wrapper, so the clear zone tracks the centered text. */
const FRAME_MASK =
  "radial-gradient(ellipse 54% 48% at 50% 46%, transparent 32%, #000 74%)";

export default function DumbbellWall() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      {/* Reactive ignition: lights the instant you touch a dumbbell, snaps
          back quickly — feels alive as you sweep, not a slow ember. */}
      <style>{`
        .db-part {
          fill: rgba(255,255,255,0.035);
          stroke: url(#db-glass);
          transition:
            stroke 360ms ease 90ms,
            fill 360ms ease 90ms,
            filter 360ms ease 90ms;
        }
        /* Hover anywhere on a dumbbell -> the WHOLE dumbbell ignites now */
        g:hover > .db-part {
          fill: rgba(232,84,42,0.34);
          stroke: #ff9a6a;
          filter: drop-shadow(0 0 4px rgba(232,84,42,1)) drop-shadow(0 0 15px rgba(232,84,42,0.7));
          transition-duration: 0ms;
          transition-delay: 0ms;
        }
      `}</style>

      {/* Different backdrop: a cosmic radial (gym gear in space) instead of
          the flat navy used everywhere else, plus a faint starfield. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_85%_78%_at_50%_38%,#17294f_0%,#0d1b35_46%,#060c1b_100%)]" />
      <div className="starfield absolute inset-0 opacity-50" />

      {/* Dumbbells, masked to frame the text (clear center → dense edges) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ maskImage: FRAME_MASK, WebkitMaskImage: FRAME_MASK }}
      >
        <svg
          width={COLS * CELL}
          height={ROWS * CELL}
          className="absolute left-0 top-0"
        >
          <defs>
            {/* Glass stroke: bright catch-light at the ends, faint middle */}
            <linearGradient id="db-glass" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="rgba(255,255,255,0.32)" />
              <stop offset="0.5" stopColor="rgba(255,255,255,0.05)" />
              <stop offset="1" stopColor="rgba(255,255,255,0.32)" />
            </linearGradient>
          </defs>
          {CELLS.map(({ cx, cy }, i) => (
            <g
              key={i}
              transform={`translate(${cx} ${cy}) scale(${SCALE}) rotate(45 ${ART / 2} ${ART / 2})`}
              strokeWidth="3"
              strokeLinecap="round"
            >
              {PARTS.map((p, j) => (
                <rect
                  key={j}
                  className="db-part"
                  x={p.x}
                  y={p.y}
                  width={p.w}
                  height={p.h}
                  rx="4"
                />
              ))}
            </g>
          ))}
        </svg>
      </div>

      {/* Soft floor fade into the next section */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-navy to-transparent" />
    </div>
  );
}
