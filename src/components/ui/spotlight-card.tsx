"use client";

import { cn } from "@/lib/utils";
import {
  useRef,
  type CSSProperties,
  type HTMLAttributes,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

type SpotlightCardProps = {
  children: ReactNode;
  className?: string;
  /** Glow color — any CSS color. Defaults to the brand accent. */
  glow?: string;
  /** Spotlight radius in px. */
  radius?: number;
  style?: CSSProperties;
} & HTMLAttributes<HTMLDivElement>;

/* A surface that paints a soft, brand-tinted highlight tracking the pointer.
   Tuned for the light theme: the glow sits behind the card content (z-0) so it
   reads as a halo around the text/controls rather than washing them out. Pure
   CSS custom properties driven by a local pointermove — no requestAnimationFrame
   and no global document listeners, so dozens can live in a grid cheaply. The
   card content should sit at z-[1] or above (see CompareTool ProductCard). */
export function SpotlightCard({
  children,
  className,
  glow = "var(--accent)",
  radius = 230,
  style,
  ...rest
}: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  function handleMove(e: ReactPointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  }

  return (
    <div
      ref={ref}
      onPointerMove={handleMove}
      className={cn("group/spot relative isolate", className)}
      style={
        {
          "--glow": glow,
          "--spot": `${radius}px`,
          ...style,
        } as CSSProperties
      }
      {...rest}
    >
      {/* Soft halo behind the content — reads on the card's flat/white areas. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover/spot:opacity-100"
        style={{
          background:
            "radial-gradient(var(--spot) circle at var(--mx, 50%) var(--my, 0%), color-mix(in srgb, var(--glow) 26%, transparent), transparent 70%)",
        }}
      />
      {children}
      {/* Brightening sheen above the content — lights up imagery under the
         cursor. mix-blend-screen is a near no-op over white, so text on the
         card's flat areas stays crisp. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[3] rounded-[inherit] opacity-0 mix-blend-screen transition-opacity duration-300 group-hover/spot:opacity-100"
        style={{
          background:
            "radial-gradient(calc(var(--spot) * 0.8) circle at var(--mx, 50%) var(--my, 0%), color-mix(in srgb, var(--glow) 32%, transparent), transparent 65%)",
        }}
      />
    </div>
  );
}
