"use client";

import * as React from "react";

/* Hero wallpaper: a tiled dumbbell pattern instead of the old photo blur.
   Two identical pattern layers — a faint white base, and an orange "lit"
   layer with a glow that is clipped to a circle following the cursor, so
   the dumbbell edges ignite around the mouse and fade when it leaves.
   The cursor circle is driven by a ref (no React re-render per mousemove). */

const DUMBBELL_SVG = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
    <g fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round">
      <rect x="30" y="44" width="36" height="8" rx="3"/>
      <rect x="20" y="32" width="8" height="32" rx="3"/>
      <rect x="68" y="32" width="8" height="32" rx="3"/>
      <rect x="10" y="38" width="7" height="20" rx="3"/>
      <rect x="79" y="38" width="7" height="20" rx="3"/>
    </g>
  </svg>`,
);

const MASK: React.CSSProperties = {
  maskImage: `url("data:image/svg+xml,${DUMBBELL_SVG}")`,
  WebkitMaskImage: `url("data:image/svg+xml,${DUMBBELL_SVG}")`,
  maskSize: "96px 96px",
  WebkitMaskSize: "96px 96px",
  maskRepeat: "repeat",
  WebkitMaskRepeat: "repeat",
};

export default function DumbbellWall() {
  const litRef = React.useRef<HTMLDivElement>(null);
  const frame = React.useRef(0);

  const onMove = (e: React.MouseEvent) => {
    const el = litRef.current;
    if (!el) return;
    /* Touch devices fire compatibility mouse events on tap — without a real
       hover the lit layer would stick on. Glow is a pointer-only garnish. */
    if (window.matchMedia("(hover: none)").matches) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      el.style.clipPath = `circle(190px at ${x}px ${y}px)`;
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
      {/* Faint resting pattern */}
      <div
        style={MASK}
        className="absolute inset-0 bg-white opacity-[0.05]"
      />
      {/* Vignette keeps the headline readable over the resting pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_55%_at_50%_45%,rgba(13,27,53,0.85)_0%,rgba(13,27,53,0.45)_55%,transparent_100%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-navy/80 via-transparent to-navy" />
      {/* Lit pattern above the veils, revealed in a circle at the cursor */}
      <div
        ref={litRef}
        style={{
          ...MASK,
          clipPath: "circle(0px at 50% 50%)",
          background:
            "linear-gradient(180deg, #ff8a5c 0%, #e8542a 55%, #b13a16 100%)",
          filter:
            "drop-shadow(0 0 6px rgba(232,84,42,0.9)) drop-shadow(0 0 18px rgba(232,84,42,0.45))",
        }}
        className="absolute inset-0 opacity-0 transition-opacity duration-300"
      />
    </div>
  );
}
