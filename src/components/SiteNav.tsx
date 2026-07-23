"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, Search, X } from "lucide-react";
import { LogoMark } from "@/components/ui/logo-mark";
import SearchModal from "@/components/SearchModal";

const NAV_LINKS = [
  { href: "/gear", label: "Gear" },
  { href: "/guides", label: "Guides" },
  { href: "/compare", label: "Compare" },
  { href: "/gym", label: "For Gyms" },
];

export default function SiteNav() {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const close = () => setOpen(false);

  // "/" or Ctrl/Cmd+K opens search from anywhere (unless typing in a field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing =
        el?.tagName === "INPUT" ||
        el?.tagName === "TEXTAREA" ||
        el?.isContentEditable;
      if ((e.key === "/" && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k")) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <nav className="group/nav sticky top-0 z-50 border-b border-white/10 bg-navy/90 backdrop-blur-md">
      {/* The line between nav and page ignites while the nav is hovered */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-accent to-transparent opacity-0 shadow-[0_0_14px_rgba(232,84,42,0.8)] transition-opacity duration-500 group-hover/nav:opacity-100"
      />
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
              className="group/link relative text-sm font-medium text-white/70 transition-all duration-300 hover:text-white hover:[text-shadow:0_0_14px_rgba(232,84,42,0.75)]"
            >
              {l.label}
              {/* Underline sweeps in with a glow */}
              <span
                aria-hidden
                className="absolute -bottom-1.5 left-0 h-px w-full origin-left scale-x-0 bg-gradient-to-r from-accent to-accent/30 shadow-[0_0_10px_rgba(232,84,42,0.9)] transition-transform duration-300 group-hover/link:scale-x-100"
              />
            </Link>
          ))}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm text-white/60 transition-colors hover:border-white/30 hover:text-white"
            aria-label="Search products"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Search</span>
            <kbd className="rounded border border-white/15 px-1 font-body text-[0.65rem] text-white/40">
              /
            </kbd>
          </button>
          <Link
            href="/quiz"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-bold text-white shadow-md shadow-accent/20 transition-all duration-300 hover:bg-accent-hover hover:shadow-[0_0_22px_rgba(232,84,42,0.65)]"
          >
            Build My Kit →
          </Link>
        </div>

        {/* Mobile: search + menu toggles */}
        <div className="flex items-center sm:hidden">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Search products"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-white transition-colors hover:bg-white/10"
          >
            <Search className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="-mr-2 flex h-10 w-10 items-center justify-center rounded-lg text-white transition-colors hover:bg-white/10"
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
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

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </nav>
  );
}
