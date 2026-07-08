"use client";

import * as React from "react";

/* Hero wallpaper v4 — glass dumbbells at 45°, liquid partial ignition.
   Pattern is the original uniform dumbbell wall, every piece rotated 45°
   so it points to the corners. Strokes are drawn as glass: a diagonal
   white gradient (bright catch-light fading to almost nothing) over a
   faint body fill — no flat grey edges.

   Ignition lights only the PART of a dumbbell under the cursor: a small
   (~130px) soft-masked window of the orange pattern rides a spring-lagged
   position, so the light visibly flows behind the mouse like liquid; a
   static turbulence displacement wobbles its boundary. Perf: the lit
   element is a small fixed-size div moved with translate3d — no full-layer
   filters, no animated turbulence, and the rAF loop only runs while the
   pointer is over the hero. background-attachment: fixed on BOTH layers
   keeps the moving window pixel-registered with the resting pattern.
   Touch devices (hover: none) never ignite. */

const tileSvg = (bright: string, dim: string, fill: string) =>
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
    <defs>
      <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${bright}"/>
        <stop offset="0.5" stop-color="${dim}"/>
        <stop offset="1" stop-color="${bright}"/>
      </linearGradient>
    </defs>
    <g transform="rotate(45 60 60)" fill="${fill}" stroke="url(#glass)" stroke-width="2.5" stroke-linecap="round">
      <rect x="27" y="56" width="66" height="8" rx="4"/>
      <rect x="17" y="44" width="9" height="32" rx="4"/>
      <rect x="94" y="44" width="9" height="32" rx="4"/>
      <rect x="6" y="50" width="8" height="20" rx="4"/>
      <rect x="106" y="50" width="8" height="20" rx="4"/>
    </g>
  </svg>`,
  );

/* Glass at rest: bright catch-light corners, near-invisible middles. */
const BASE_TILE = `url("data:image/svg+xml,${tileSvg(
  "rgba(255,255,255,0.55)",
  "rgba(255,255,255,0.06)",
  "rgba(255,255,255,0.035)",
)}")`;
/* Molten version revealed under the cursor. */
const LIT_TILE = `url("data:image/svg+xml,${tileSvg(
  "#ffb088",
  "#e8542a",
  "rgba(232,84,42,0.18)",
)}")`;

const WINDOW = 260; // lit window size (px) — reveal radius is ~130px

export default function DumbbellWall() {
  const litRef = React.useRef<HTMLDivElement>(null);
  const target = React.useRef({ x: -9999, y: -9999 });
  const pos = React.useRef({ x: -9999, y: -9999 });
  const raf = React.useRef(0);
  const running = React.useRef(false);

  /* Spring-lagged chase: the lit window flows toward the cursor instead of
     snapping — this trailing motion is the "liquid" feel. */
  const tick = React.useCallback(() => {
    const el = litRef.current;
    if (!el) return;
    pos.current.x += (target.current.x - pos.current.x) * 0.16;
    pos.current.y += (target.current.y - pos.current.y) * 0.16;
    const tx = pos.current.x - WINDOW / 2;
    const ty = pos.current.y - WINDOW / 2;
    el.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
    /* Counter-offset the tile so the lit pattern stays pixel-registered
       with the resting glass pattern (filter breaks bg-attachment:fixed,
       so registration is done by hand). */
    el.style.backgroundPosition = `${-tx}px ${-ty}px`;
    if (
      running.current ||
      Math.hypot(
        target.current.x - pos.current.x,
        target.current.y - pos.current.y,
      ) > 0.5
    ) {
      raf.current = requestAnimationFrame(tick);
    }
  }, []);

  const onMove = (e: React.MouseEvent) => {
    if (window.matchMedia("(hover: none)").matches) return;
    const rect = e.currentTarget.getBoundingClientRect();
    target.current.x = e.clientX - rect.left;
    target.current.y = e.clientY - rect.top;
    const el = litRef.current;
    if (!el) return;
    el.style.opacity = "1";
    if (!running.current) {
      running.current = true;
      /* First entry: start the chase from the cursor itself. */
      if (pos.current.x < -999) {
        pos.current.x = target.current.x;
        pos.current.y = target.current.y;
      }
      raf.current = requestAnimationFrame(tick);
    }
  };

  const onLeave = () => {
    running.current = false;
    const el = litRef.current;
    if (el) el.style.opacity = "0";
  };

  React.useEffect(() => () => cancelAnimationFrame(raf.current), []);

  return (
    <div
      aria-hidden
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="absolute inset-0 overflow-hidden"
    >
      {/* Static turbulence — displaces the lit window's edge so the light
          boundary reads liquid. No animation = no per-frame filter cost. */}
      <svg className="absolute h-0 w-0">
        <defs>
          <filter id="liquid-flow" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.02 0.028"
              numOctaves="2"
              seed="11"
              result="n"
            />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="18" />
          </filter>
        </defs>
      </svg>

      {/* Glass resting pattern */}
      <div
        style={{
          backgroundImage: BASE_TILE,
          backgroundSize: "120px 120px",
        }}
        className="absolute inset-0"
      />
      {/* Vignette keeps the headline readable */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_55%_at_50%_45%,rgba(13,27,53,0.82)_0%,rgba(13,27,53,0.42)_55%,transparent_100%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-navy/80 via-transparent to-navy" />

      {/* The liquid light window — small, masked, chases the cursor */}
      <div
        ref={litRef}
        style={{
          width: WINDOW,
          height: WINDOW,
          backgroundImage: LIT_TILE,
          backgroundSize: "120px 120px",
          maskImage:
            "radial-gradient(circle 130px at 50% 50%, #000 42%, transparent 78%)",
          WebkitMaskImage:
            "radial-gradient(circle 130px at 50% 50%, #000 42%, transparent 78%)",
          filter:
            "url(#liquid-flow) drop-shadow(0 0 6px rgba(232,84,42,0.8)) drop-shadow(0 0 16px rgba(232,84,42,0.35))",
          transform: "translate3d(-9999px, -9999px, 0)",
        }}
        className="absolute left-0 top-0 opacity-0 transition-opacity duration-500 will-change-transform"
      />
    </div>
  );
}
