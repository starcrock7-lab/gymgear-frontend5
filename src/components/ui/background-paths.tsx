"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * Flowing stroke field from the background-paths block. Layer inside a
 * `relative` dark section; inherits currentColor. Path count trimmed for
 * paint cost; static strokes under prefers-reduced-motion.
 */
export default function FloatingPaths({ position = 1 }: { position?: number }) {
  const reduce = useReducedMotion();
  const paths = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
      380 - i * 5 * position
    } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
      152 - i * 5 * position
    } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
      684 - i * 5 * position
    } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    width: 0.5 + i * 0.03,
  }));

  return (
    <div className="pointer-events-none absolute inset-0">
      <svg className="h-full w-full" viewBox="0 0 696 316" fill="none">
        {paths.map((path) => (
          <motion.path
            key={path.id}
            d={path.d}
            stroke="currentColor"
            strokeWidth={path.width}
            strokeOpacity={0.08 + path.id * 0.02}
            initial={{ pathLength: 0.3, opacity: 0.5 }}
            animate={
              reduce
                ? { pathLength: 1, opacity: 0.5 }
                : {
                    pathLength: 1,
                    opacity: [0.25, 0.5, 0.25],
                    pathOffset: [0, 1, 0],
                  }
            }
            transition={
              reduce
                ? { duration: 0 }
                : {
                    duration: 24 + (path.id % 5) * 2,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "linear",
                  }
            }
          />
        ))}
      </svg>
    </div>
  );
}
