"use client";

import * as React from "react";

/* Hero wallpaper v2: mixed gym equipment scattered at angles (barbell,
   kettlebell, dumbbells — like a print-pattern wall) instead of a straight
   grid. Two pattern layers: a faint glassy base, and an orange "lit" layer
   revealed around the cursor through a soft radial mask whose edge is
   distorted by an animated turbulence filter — the ignition reads as liquid
   light, not a hard circle. Cursor position drives CSS vars via a ref (no
   React re-render per mousemove); the whole effect is skipped on touch
   devices where compatibility mouse events would stick it on. */

const TILE = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
    <g fill="rgba(255,255,255,0.06)" stroke="#fff" stroke-width="2.5" stroke-linecap="round">
      <!-- long barbell, tilted like the reference wallpaper -->
      <g transform="rotate(-24 120 62)">
        <rect x="28" y="58" width="184" height="7" rx="3.5"/>
        <rect x="52" y="44" width="9" height="36" rx="3"/>
        <rect x="66" y="48" width="7" height="28" rx="3"/>
        <rect x="179" y="44" width="9" height="36" rx="3"/>
        <rect x="167" y="48" width="7" height="28" rx="3"/>
      </g>
      <!-- kettlebell -->
      <g transform="rotate(12 186 172)">
        <circle cx="186" cy="178" r="24"/>
        <path d="M172 162 a20 20 0 0 1 28 0 v-8 a22 22 0 0 0 -28 0 z"/>
        <circle cx="186" cy="182" r="9"/>
      </g>
      <!-- compact dumbbell, hard diagonal -->
      <g transform="rotate(42 62 178)">
        <rect x="26" y="174" width="72" height="6" rx="3"/>
        <rect x="20" y="162" width="8" height="30" rx="3"/>
        <rect x="96" y="162" width="8" height="30" rx="3"/>
        <rect x="10" y="167" width="7" height="20" rx="3"/>
        <rect x="107" y="167" width="7" height="20" rx="3"/>
      </g>
      <!-- small dumbbell, opposite tilt -->
      <g transform="rotate(-38 178 34)">
        <rect x="150" y="31" width="56" height="5" rx="2.5"/>
        <rect x="144" y="22" width="7" height="24" rx="3"/>
        <rect x="205" y="22" width="7" height="24" rx="3"/>
      </g>
    </g>
  </svg>`,
);

const PATTERN_MASK = `url("data:image/svg+xml,${TILE}")`;

const BASE_MASK: React.CSSProperties = {
  maskImage: PATTERN_MASK,
  WebkitMaskImage: PATTERN_MASK,
  maskSize: "240px 240px",
  WebkitMaskSize: "240px 240px",
  maskRepeat: "repeat",
  WebkitMaskRepeat: "repeat",
};

/* Lit layer: pattern mask ∩ soft cursor spotlight — the feathered radial
   edge (40%→78%) plus the goo filter is what makes the reveal liquid. */
const LIT_MASK: React.CSSProperties = {
  maskImage: `${PATTERN_MASK}, radial-gradient(230px circle at var(--mx, 50%) var(--my, 50%), #000 40%, transparent 78%)`,
  WebkitMaskImage: `${PATTERN_MASK}, radial-gradient(230px circle at var(--mx, 50%) var(--my, 50%), #000 40%, transparent 78%)`,
  maskSize: "240px 240px, 100% 100%",
  WebkitMaskSize: "240px 240px, 100% 100%",
  maskRepeat: "repeat, no-repeat",
  WebkitMaskRepeat: "repeat, no-repeat",
  maskComposite: "intersect",
  WebkitMaskComposite: "source-in",
};

export default function DumbbellWall() {
  const litRef = React.useRef<HTMLDivElement>(null);
  const frame = React.useRef(0);

  const onMove = (e: React.MouseEvent) => {
    const el = litRef.current;
    if (!el) return;
    if (window.matchMedia("(hover: none)").matches) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      el.style.setProperty("--mx", `${x}px`);
      el.style.setProperty("--my", `${y}px`);
      el.style.opacity = "1";
    });
  };

  const onLeave = () => {
    const el = litRef.current;
    if (el) el.style.opacity = "0";
  };

  return (
    <div
      aria-hidden
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="absolute inset-0 overflow-hidden"
    >
      {/* Liquid-edge filter: slowly morphing turbulence displaces the masked
          lit layer so its boundary wobbles like molten light. */}
      <svg className="absolute h-0 w-0">
        <defs>
          <filter id="liquid-ignite">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.012 0.018"
              numOctaves="2"
              seed="7"
              result="noise"
            >
              <animate
                attributeName="baseFrequency"
                dur="7s"
                values="0.012 0.018;0.017 0.024;0.012 0.018"
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="26" />
          </filter>
        </defs>
      </svg>

      {/* Faint glassy resting pattern */}
      <div style={BASE_MASK} className="absolute inset-0 bg-white opacity-[0.06]" />
      {/* Vignette keeps the headline readable over the resting pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_55%_at_50%_45%,rgba(13,27,53,0.85)_0%,rgba(13,27,53,0.45)_55%,transparent_100%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-navy/80 via-transparent to-navy" />
      {/* Lit pattern above the veils — liquid ignition at the cursor */}
      <div
        ref={litRef}
        style={{
          ...LIT_MASK,
          background:
            "linear-gradient(180deg, #ff8a5c 0%, #e8542a 55%, #b13a16 100%)",
          filter:
            "url(#liquid-ignite) drop-shadow(0 0 6px rgba(232,84,42,0.9)) drop-shadow(0 0 20px rgba(232,84,42,0.45))",
        }}
        className="absolute inset-0 opacity-0 transition-opacity duration-300"
      />
    </div>
  );
}
