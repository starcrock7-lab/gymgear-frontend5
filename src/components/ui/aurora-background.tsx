"use client";

import React from "react";
import { cn } from "@/lib/utils";

/**
 * Aurora layer, brand-toned (ember oranges over navy). Adapted from the
 * aceternity aurora-background: absolute overlay instead of full-page main,
 * literal colors instead of the Tailwind-v3 palette-variable plugin.
 */
export default function AuroraBackground({
  className,
  showRadialGradient = true,
}: {
  className?: string;
  showRadialGradient?: boolean;
}) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      <div
        className={cn(
          `animate-aurora
          [--dark-band:repeating-linear-gradient(100deg,rgba(8,17,36,0.9)_0%,rgba(8,17,36,0.9)_7%,transparent_10%,transparent_12%,rgba(8,17,36,0.9)_16%)]
          [--aurora:repeating-linear-gradient(100deg,#e8542a_10%,#ff7a4d_15%,#ffb199_20%,#c94020_25%,#ff6a3d_30%)]
          [background-image:var(--dark-band),var(--aurora)]
          [background-size:300%_200%,200%_100%]
          [background-position:50%_50%,50%_50%]
          absolute -inset-[10px] opacity-25 blur-[10px] will-change-transform`,
          showRadialGradient &&
            "[mask-image:radial-gradient(ellipse_at_50%_0%,black_10%,transparent_70%)]",
        )}
      />
    </div>
  );
}
