"use client";

import Link from "next/link";
import { useRef } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useMotionTemplate,
} from "framer-motion";

const navLinks = [
  { href: "/quiz", label: "Build My Kit" },
  { href: "/compare", label: "Compare Tool" },
  { href: "/sponsors", label: "Partners" },
] as const;

const MotionLink = motion.create(Link);

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M4 12h14M12 5l7 7-7 7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Footer nav row with award-badge-style physicality: the panel tilts toward
 * the cursor in 3D (springs back on leave) while a soft light tracks the
 * pointer across the surface, on top of the fill-rise + arrow-swap hover.
 */
function TiltRow({ href, label }: { href: string; label: string }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useSpring(rx, { stiffness: 220, damping: 18 });
  const rotateY = useSpring(ry, { stiffness: 220, damping: 18 });
  const lightX = useSpring(mx, { stiffness: 300, damping: 30 });
  const lightY = useSpring(my, { stiffness: 300, damping: 30 });

  const onMouseMove = (e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    ry.set(px * 6);
    rx.set(-py * 10);
    mx.set(e.clientX - rect.left);
    my.set(e.clientY - rect.top);
  };

  const onMouseLeave = () => {
    rx.set(0);
    ry.set(0);
  };

  const shine = useMotionTemplate`radial-gradient(220px circle at ${lightX}px ${lightY}px, rgba(255,255,255,0.22), transparent 70%)`;

  return (
    <MotionLink
      href={href}
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      whileTap={{ scale: 0.985 }}
      className="group relative flex items-center justify-between overflow-hidden border-t border-white/10 py-7 will-change-transform last:border-b"
    >
        <span
          aria-hidden
          className="absolute inset-0 origin-bottom scale-y-0 bg-accent transition-transform duration-400 ease-[cubic-bezier(0.76,0,0.24,1)] group-hover:scale-y-100"
        />
        <motion.span
          aria-hidden
          style={{ background: shine }}
          className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        />
        <span className="relative font-display text-2xl font-bold text-white transition-colors duration-300 sm:text-3xl">
          {label}
        </span>
        <span className="relative h-8 w-8 overflow-hidden">
          <ArrowIcon className="absolute inset-0 h-8 w-8 text-white transition-transform duration-400 ease-[cubic-bezier(0.76,0,0.24,1)] group-hover:translate-x-10" />
          <ArrowIcon className="absolute inset-0 h-8 w-8 -translate-x-10 text-white transition-transform duration-400 ease-[cubic-bezier(0.76,0,0.24,1)] group-hover:translate-x-0" />
        </span>
      </MotionLink>
  );
}

export default function SiteFooter() {
  return (
    <footer className="mt-auto bg-navy-deep text-white/60">
      <nav className="mx-auto max-w-6xl px-5 pt-14 [perspective:1200px]">
        {navLinks.map((l) => (
          <TiltRow key={l.href} href={l.href} label={l.label} />
        ))}
      </nav>

      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-sm font-bold text-white">
            GymGear<span className="text-accent">Compare</span>™
          </p>
          <p className="mt-1 max-w-md text-xs leading-relaxed">
            Some links are affiliate links — we may earn a commission at no
            extra cost to you. Verdicts stay independent.
          </p>
        </div>
        <div className="flex gap-5 text-xs font-medium">
          <Link href="/privacy" className="transition-colors hover:text-white">
            Privacy
          </Link>
        </div>
      </div>
    </footer>
  );
}
