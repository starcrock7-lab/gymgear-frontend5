"use client";

import * as React from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useScroll,
  useMotionTemplate,
  type Variants,
} from "framer-motion";

export interface FlowStep {
  n: string;
  icon: React.ReactNode;
  title: string;
  body: string;
  details: string[];
}

/* Deck deal: each card snaps up fast with a little tilt and springs
   straight, one after another — quick and playful, not a slow fade. The
   hover lift/grow lives on the card itself. */
export const TILE_REVEAL: Variants = {
  hidden: { opacity: 0, y: 42, scale: 0.9, rotate: -2.5 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    rotate: 0,
    transition: { type: "spring", stiffness: 420, damping: 26 },
  },
};

/**
 * How-it-works panel (dark tech variant): 3D tilt toward the cursor with an
 * ember glow tracking it, content lifted on translateZ layers, a
 * scroll-scrubbed progress track, and the detail list always visible so the
 * cards read tall and full on every device.
 */
export default function FlowCard({ step }: { step: FlowStep }) {
  const ref = React.useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 92%", "start 40%"],
  });

  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const mx = useMotionValue(50);
  const my = useMotionValue(50);
  const rotateX = useSpring(rx, { stiffness: 280, damping: 22 });
  const rotateY = useSpring(ry, { stiffness: 280, damping: 22 });

  const onMouseMove = (e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    ry.set((px - 0.5) * 10);
    rx.set(-(py - 0.5) * 12);
    mx.set(px * 100);
    my.set(py * 100);
  };

  const onMouseLeave = () => {
    rx.set(0);
    ry.set(0);
  };

  const glow = useMotionTemplate`radial-gradient(200px circle at ${mx}% ${my}%, rgba(232, 84, 42, 0.16), transparent 65%)`;

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      variants={TILE_REVEAL}
      whileHover={{
        y: -14,
        scale: 1.05,
        transition: { type: "spring", stiffness: 300, damping: 20 },
      }}
      style={{
        rotateX,
        rotateY,
        transformPerspective: 900,
        transformStyle: "preserve-3d",
      }}
      className="group relative flex h-full flex-col rounded-2xl border border-white/12 bg-white/[0.04] p-8 backdrop-blur-sm transition-all duration-300 hover:border-accent/60 hover:shadow-[0_0_30px_rgba(232,84,42,0.18),inset_0_0_20px_rgba(232,84,42,0.05)]"
    >
      {/* Cursor-tracked ember glow */}
      <motion.div
        aria-hidden
        style={{ background: glow }}
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />
      {/* Faint grid texture for depth */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl bg-[linear-gradient(to_right,#ffffff09_1px,transparent_1px),linear-gradient(to_bottom,#ffffff09_1px,transparent_1px)] bg-[size:28px_28px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_40%,#000_60%,transparent_100%)]"
      />

      <div
        style={{ transform: "translateZ(28px)", transformStyle: "preserve-3d" }}
        className="relative"
      >
        <div className="h-0.5 w-full overflow-hidden rounded bg-white/10">
          <motion.div
            style={{ scaleX: scrollYProgress }}
            className="h-full origin-left bg-accent shadow-[0_0_8px_rgba(232,84,42,0.8)]"
          />
        </div>

        <div className="mt-6 flex items-center justify-between">
          <p className="font-display text-2xl font-extrabold text-accent/90 transition-all duration-300 group-hover:[text-shadow:0_0_16px_rgba(232,84,42,0.7)]">
            {step.n}
          </p>
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-accent/25 bg-accent/10 text-accent transition-all duration-300 group-hover:border-accent group-hover:bg-accent group-hover:text-white group-hover:shadow-[0_0_18px_rgba(232,84,42,0.6)]">
            {step.icon}
          </span>
        </div>

        <h3
          style={{ transform: "translateZ(14px)" }}
          className="mt-4 font-display text-2xl font-bold text-white"
        >
          {step.title}
        </h3>
        <p className="mt-2.5 text-sm leading-relaxed text-white/60">
          {step.body}
        </p>

        {/* Details always visible — the card reads tall and complete */}
        <ul className="mt-6 border-t border-white/10 pt-1.5">
          {step.details.map((d) => (
            <li
              key={d}
              className="mt-3 flex items-start gap-2.5 text-[0.8rem] leading-relaxed text-white/55"
            >
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent shadow-[0_0_6px_rgba(232,84,42,0.9)]" />
              {d}
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}
