"use client";

import * as React from "react";
import {
  motion,
  AnimatePresence,
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

function subscribeHoverMedia(onChange: () => void) {
  const mq = window.matchMedia("(hover: hover)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

const detailVariants: Variants = {
  hidden: { opacity: 0, height: 0, marginTop: 0 },
  visible: {
    opacity: 1,
    height: "auto",
    marginTop: "0.9rem",
    transition: { duration: 0.32, ease: [0.25, 1, 0.5, 1] },
  },
};

/**
 * How-it-works panel: 3D tilt toward the cursor with an ember glow tracking
 * it, content lifted on translateZ layers, scroll-scrubbed progress track,
 * and a detail list that unfolds on hover. Touch devices (no hover) get the
 * details permanently expanded instead of never.
 */
export default function FlowCard({
  step,
  index,
}: {
  step: FlowStep;
  index: number;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = React.useState(false);
  // SSR assumes a hover device; touch devices correct after hydration and
  // get the details permanently expanded.
  const canHover = React.useSyncExternalStore(
    subscribeHoverMedia,
    () => window.matchMedia("(hover: hover)").matches,
    () => true,
  );

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
    setHovered(false);
  };

  const glow = useMotionTemplate`radial-gradient(180px circle at ${mx}% ${my}%, rgba(232, 84, 42, 0.13), transparent 65%)`;
  const expanded = canHover ? hovered : true;

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={onMouseLeave}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{
        duration: 0.6,
        delay: index * 0.12,
        ease: [0.22, 1, 0.36, 1],
      }}
      style={{
        rotateX,
        rotateY,
        transformPerspective: 900,
        transformStyle: "preserve-3d",
      }}
      className="group relative rounded-2xl border border-line bg-white p-7 shadow-sm transition-shadow duration-300 hover:border-accent/40 hover:shadow-xl hover:shadow-accent/10"
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
        className="pointer-events-none absolute inset-0 rounded-2xl bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:28px_28px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_40%,#000_60%,transparent_100%)]"
      />

      <div
        style={{ transform: "translateZ(28px)", transformStyle: "preserve-3d" }}
        className="relative"
      >
        <div className="h-0.5 w-full overflow-hidden rounded bg-line">
          <motion.div
            style={{ scaleX: scrollYProgress }}
            className="h-full origin-left bg-accent"
          />
        </div>

        <div className="mt-5 flex items-center justify-between">
          <p className="font-display text-sm font-bold text-accent transition-transform duration-300 group-hover:scale-110 group-hover:[transform-origin:left]">
            {step.n}
          </p>
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent transition-all duration-300 group-hover:bg-accent group-hover:text-white">
            {step.icon}
          </span>
        </div>

        <h3
          style={{ transform: "translateZ(14px)" }}
          className="mt-3 font-display text-xl font-bold text-ink"
        >
          {step.title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-ink-2">{step.body}</p>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.ul
              key="details"
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={detailVariants}
              className="overflow-hidden border-t border-line"
            >
              {step.details.map((d) => (
                <li
                  key={d}
                  className="mt-2.5 flex items-start gap-2 text-xs leading-relaxed text-ink-2"
                >
                  <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-accent" />
                  {d}
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
