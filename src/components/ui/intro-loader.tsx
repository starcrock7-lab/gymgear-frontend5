"use client";

import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { useEffect, useState } from "react";

/**
 * Vectr-style intro: rings draw around the logo on a navy overlay, then the
 * overlay lifts away and hands off to the hero entrance via onComplete.
 * Skipped entirely for prefers-reduced-motion.
 */
export default function IntroLoader({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const reduce = useReducedMotion();
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (reduce) {
      onComplete();
      return;
    }
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => setLeaving(true), 1650);
    // rAF throttles to zero in hidden tabs, freezing the exit animation —
    // hard deadline so a background-tab load can never trap the overlay.
    const failsafe = setTimeout(() => {
      document.body.style.overflow = "";
      onComplete();
    }, 3200);
    return () => {
      clearTimeout(t);
      clearTimeout(failsafe);
      document.body.style.overflow = "";
    };
  }, [reduce, onComplete]);

  if (reduce) return null;

  return (
    <motion.div
      className="fixed inset-0 z-100 flex flex-col items-center justify-center bg-navy-deep"
      initial={{ y: 0 }}
      animate={leaving ? { y: "-100%" } : { y: 0 }}
      transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1] }}
      onAnimationComplete={() => {
        if (leaving) {
          document.body.style.overflow = "";
          onComplete();
        }
      }}
    >
      <div className="relative flex h-56 w-80 items-center justify-center">
        <svg
          viewBox="0 0 320 220"
          className="absolute inset-0 h-full w-full overflow-visible"
          fill="none"
        >
          <motion.ellipse
            cx="160"
            cy="110"
            rx="150"
            ry="86"
            stroke="var(--accent)"
            strokeWidth="2"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.1, ease: [0.65, 0, 0.35, 1] }}
          />
          <motion.ellipse
            cx="160"
            cy="110"
            rx="118"
            ry="64"
            stroke="rgba(255,255,255,0.25)"
            strokeWidth="1.5"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.1, delay: 0.15, ease: [0.65, 0, 0.35, 1] }}
          />
        </svg>
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <Image src="/logo.svg" alt="" width={96} height={66} priority />
        </motion.div>
      </div>
      <motion.p
        className="font-display text-sm font-bold tracking-[0.3em] text-white/80"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.7 }}
      >
        GYMGEAR<span className="text-accent">COMPARE</span>
      </motion.p>
    </motion.div>
  );
}
