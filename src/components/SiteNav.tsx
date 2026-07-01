"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { LogoMark } from "@/components/ui/logo-mark";

const NAV_LINKS = [
  { href: "/gear", label: "Gear" },
  { href: "/guides", label: "Guides" },
  { href: "/compare", label: "Compare" },
];

export default function SiteNav() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-navy/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link
          href="/"
          onClick={close}
          className="group flex shrink-0 items-center gap-2.5"
        >
          <LogoMark className="h-9 w-[3.25rem]" />
          <span className="font-display text-lg font-bold tracking-tight text-white">
            GymGear<span className="text-accent">Compare</span>
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-6 sm:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-white/70 transition-colors hover:text-white"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/quiz"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-bold text-white transition-all hover:-translate-y-px hover:bg-accent-hover"
          >
            Build My Kit →
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="-mr-2 flex h-10 w-10 items-center justify-center rounded-lg text-white transition-colors hover:bg-white/10 sm:hidden"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="border-t border-white/10 bg-navy px-5 pb-4 pt-2 sm:hidden">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={close}
              className="block rounded-lg px-2 py-3 font-medium text-white/80 transition-colors hover:bg-white/5 hover:text-white"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/quiz"
            onClick={close}
            className="mt-2 flex items-center justify-center rounded-lg bg-accent px-4 py-3 font-bold text-white"
          >
            Build My Kit →
          </Link>
        </div>
      )}
    </nav>
  );
}
