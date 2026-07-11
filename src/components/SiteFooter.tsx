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
  { href: "/start", label: "Build My Kit" },
  { href: "/gear", label: "Browse Gear" },
  { href: "/guides", label: "Buying Guides" },
  { href: "/compare", label: "Compare Tool" },
  { href: "/extras", label: "Gear & Extras" },
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
 * Footer nav row — glow-up hover (per Roe: no 3D tilt on these): the orange
 * fill rises, a soft light tracks the pointer, the label and row edges
 * ignite. Arrow-swap stays.
 */
function GlowRow({ href, label }: { href: string; label: string }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const lightX = useSpring(mx, { stiffness: 300, damping: 30 });
  const lightY = useSpring(my, { stiffness: 300, damping: 30 });

  const onMouseMove = (e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    mx.set(e.clientX - rect.left);
    my.set(e.clientY - rect.top);
  };

  const shine = useMotionTemplate`radial-gradient(220px circle at ${lightX}px ${lightY}px, rgba(255,255,255,0.22), transparent 70%)`;

  return (
    <MotionLink
      href={href}
      ref={ref}
      onMouseMove={onMouseMove}
      whileTap={{ scale: 0.985 }}
      className="group relative flex items-center justify-between overflow-hidden border-t border-white/10 py-7 transition-shadow duration-400 last:border-b hover:shadow-[0_0_34px_rgba(232,84,42,0.35)]"
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
        <span className="relative font-display text-2xl font-bold text-white transition-all duration-300 group-hover:[text-shadow:0_0_20px_rgba(255,255,255,0.65)] sm:text-3xl">
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
      <nav className="mx-auto max-w-6xl px-5 pt-14">
        {/* Section transition 3 (CTA → footer): the six nav rows rise in */}
        <motion.div
          initial={{ opacity: 0, y: 70 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-120px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          {navLinks.map((l) => (
            <GlowRow key={l.href} href={l.href} label={l.label} />
          ))}
        </motion.div>
      </nav>

      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-sm font-bold text-white">
            GymGear<span className="text-accent">Compare</span>™
          </p>
          <p className="mt-1 max-w-md text-xs leading-relaxed">
            As an Amazon Associate, we earn from qualifying purchases. Some
            links are affiliate links — we may earn a commission at no extra
            cost to you. Verdicts stay independent.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium">
          <Link href="/about" className="transition-colors hover:text-white">
            About
          </Link>
          <Link href="/methodology" className="transition-colors hover:text-white">
            How we score
          </Link>
          <Link href="/disclosure" className="transition-colors hover:text-white">
            Disclosure
          </Link>
          <Link href="/contact" className="transition-colors hover:text-white">
            Contact
          </Link>
          <Link href="/privacy" className="transition-colors hover:text-white">
            Privacy
          </Link>
        </div>
      </div>
    </footer>
  );
}
