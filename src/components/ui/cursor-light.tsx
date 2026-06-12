"use client";

import { useEffect, useRef } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useMotionTemplate,
} from "framer-motion";

/**
 * Soft light that trails the cursor inside the parent section. Two layers:
 * a wide warm wash and a tighter core. Spring-smoothed, compositor-cheap,
 * pointer-events-none. Sits centered until the first mouse move.
 */
export default function CursorLight({
  size = 600,
  color = "232, 84, 42",
}: {
  size?: number;
  color?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0.5 * size);
  const my = useMotionValue(0.3 * size);
  const x = useSpring(mx, { stiffness: 120, damping: 25, mass: 0.6 });
  const y = useSpring(my, { stiffness: 120, damping: 25, mass: 0.6 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const parent = el.parentElement ?? el;
    // Center the glow in the section before the cursor shows up.
    const rect0 = parent.getBoundingClientRect();
    mx.set(rect0.width / 2);
    my.set(rect0.height * 0.35);

    const onMove = (e: MouseEvent) => {
      const rect = parent.getBoundingClientRect();
      mx.set(e.clientX - rect.left);
      my.set(e.clientY - rect.top);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [mx, my]);

  const background = useMotionTemplate`
    radial-gradient(${size}px circle at ${x}px ${y}px, rgba(${color}, 0.14), transparent 70%),
    radial-gradient(${size / 3.2}px circle at ${x}px ${y}px, rgba(${color}, 0.18), transparent 70%)
  `;

  return (
    <motion.div
      ref={ref}
      aria-hidden
      style={{ background }}
      className="pointer-events-none absolute inset-0"
    />
  );
}
