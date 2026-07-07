"use client";

import * as React from "react";

/* Hero wallpaper v3 — per-tile ignition, zero per-frame JS.
   v2's cursor spotlight (full-viewport mask + animated turbulence filter)
   re-rasterized the whole layer every mousemove and lagged. Now the lit
   layer is a grid of 240px tiles: each tile ignites the instant the mouse
   enters it (fast fade-in), holds briefly, then fades out on its own
   (delayed slow fade-out) — a cooling-ember trail instead of a following
   spotlight. Pure CSS hover per tile: GPU opacity transitions only, no
   mousemove handler, no SVG filters, and touch devices (no hover) simply
   never ignite. */

const tileSvg = (stroke: string, fill: string) =>
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
    <g fill="${fill}" stroke="${stroke}" stroke-width="2.5" stroke-linecap="round">
      <g transform="rotate(-24 120 62)">
        <rect x="28" y="58" width="184" height="7" rx="3.5"/>
        <rect x="52" y="44" width="9" height="36" rx="3"/>
        <rect x="66" y="48" width="7" height="28" rx="3"/>
        <rect x="179" y="44" width="9" height="36" rx="3"/>
        <rect x="167" y="48" width="7" height="28" rx="3"/>
      </g>
      <g transform="rotate(12 186 172)">
        <circle cx="186" cy="178" r="24"/>
        <path d="M172 162 a20 20 0 0 1 28 0 v-8 a22 22 0 0 0 -28 0 z"/>
        <circle cx="186" cy="182" r="9"/>
      </g>
      <g transform="rotate(42 62 178)">
        <rect x="26" y="174" width="72" height="6" rx="3"/>
        <rect x="20" y="162" width="8" height="30" rx="3"/>
        <rect x="96" y="162" width="8" height="30" rx="3"/>
        <rect x="10" y="167" width="7" height="20" rx="3"/>
        <rect x="107" y="167" width="7" height="20" rx="3"/>
      </g>
      <g transform="rotate(-38 178 34)">
        <rect x="150" y="31" width="56" height="5" rx="2.5"/>
        <rect x="144" y="22" width="7" height="24" rx="3"/>
        <rect x="205" y="22" width="7" height="24" rx="3"/>
      </g>
    </g>
  </svg>`,
  );

const BASE_TILE = `url("data:image/svg+xml,${tileSvg("#ffffff", "rgba(255,255,255,0.06)")}")`;
const LIT_TILE = `url("data:image/svg+xml,${tileSvg("#ff7a45", "rgba(232,84,42,0.16)")}")`;

/* 9 cols × 6 rows covers up to ~2160px wide heroes; overflow is clipped. */
const TILES = Array.from({ length: 54 });

export default function DumbbellWall() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      {/* Faint glassy resting pattern */}
      <div
        style={{
          backgroundImage: BASE_TILE,
          backgroundSize: "240px 240px",
        }}
        className="absolute inset-0 opacity-[0.07]"
      />
      {/* Vignette keeps the headline readable over the resting pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_55%_at_50%_45%,rgba(13,27,53,0.85)_0%,rgba(13,27,53,0.45)_55%,transparent_100%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-navy/80 via-transparent to-navy" />

      {/* Ignition grid — each tile lights fast on hover, holds ~0.4s after
          the mouse leaves, then cools down slowly. */}
      <div className="absolute inset-0 flex flex-wrap content-start">
        {TILES.map((_, i) => (
          <div key={i} className="group h-[240px] w-[240px]">
            <div
              style={{
                backgroundImage: LIT_TILE,
                backgroundSize: "240px 240px",
                filter:
                  "drop-shadow(0 0 5px rgba(232,84,42,0.85)) drop-shadow(0 0 14px rgba(232,84,42,0.4))",
              }}
              className="h-full w-full opacity-0 transition-opacity delay-[400ms] duration-[1200ms] ease-out group-hover:opacity-100 group-hover:delay-0 group-hover:duration-100"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
