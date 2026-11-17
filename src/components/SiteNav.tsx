"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Search } from "lucide-react";
import { LogoMark } from "@/components/ui/logo-mark";
import SearchModal from "@/components/SearchModal";
import { loadKit } from "@/lib/kit";

/* Fired by the homepage's search bar: the nav owns the one search panel. */
export const OPEN_SEARCH = "gymgear:open-search";

const NAV_LINKS = [
  { href: "/gear", label: "Gear", also: "/category" },
  { href: "/compare", label: "Compare" },
  { href: "/deals", label: "Deals" },
];

export default function SiteNav() {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hasPlan, setHasPlan] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const reduce = useReducedMotion();
  const bar = useRef<HTMLDivElement | null>(null);
  const light = useRef<HTMLDivElement | null>(null);
  const close = () => setOpen(false);
  const path = usePathname();
  const isHome = path === "/";
  const onQuiz = path.startsWith("/quiz");
  /* The homepage and Gear page have their own search bar, and the quiz is the
     plan, so the nav doesn't repeat them there. */
  const showSearch = !isHome && path !== "/gear";
  const showPlan = !isHome && !onQuiz;
  const planLabel = hasPlan ? "My plan" : "Plan my gym";
  const activeHref = NAV_LINKS.find(
    (l) => path.startsWith(l.href) || (l.also && path.startsWith(l.also)),
  )?.href;
  const pillOn = hovered ?? activeHref;
  /* Rendered inside the tap, so the panel can focus its input in time for a
     phone to raise the keyboard. */
  const openSearch = () => flushSync(() => setSearchOpen(true));

  useEffect(() => {
    window.addEventListener(OPEN_SEARCH, openSearch);
    return () => window.removeEventListener(OPEN_SEARCH, openSearch);
  }, []);

  // "/" or Ctrl/Cmd+K opens search from anywhere (unless typing in a field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing =
        el?.tagName === "INPUT" ||
        el?.tagName === "TEXTAREA" ||
        el?.isContentEditable;
      if (e.key === "Escape") setOpen(false);
      if ((e.key === "/" && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k")) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage is only readable after mount */
    setHasPlan(!!loadKit());
    setOpen(false);
  }, [path]);

  /* A tap anywhere else closes the phone menu. */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!bar.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  /* The ember under the cursor. Set directly so moving the mouse never
     re-renders the nav; transform only, so it costs no repaint. */
  const moveLight = (e: React.PointerEvent) => {
    const box = bar.current?.getBoundingClientRect();
    if (box && light.current) light.current.style.transform = `translateX(${e.clientX - box.left - 160}px)`;
  };

  return (
    <nav className="pointer-events-none sticky top-0 z-50 px-2 py-2 sm:px-4">
      <div
        ref={bar}
        onPointerMove={moveLight}
        className={
          "group/bar pointer-events-auto relative mx-auto max-w-6xl rounded-2xl border transition-[background-color,border-color,box-shadow] duration-300 " +
          (scrolled
            ? "border-white/15 bg-[#0b1730]/95 shadow-[0_14px_40px_rgba(3,8,18,0.6)]"
            : "border-white/10 bg-navy/90")
        }
      >
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
          <div ref={light} className="absolute inset-y-0 left-0 w-80 opacity-0 transition-opacity duration-300 group-hover/bar:opacity-100">
            <div className="absolute inset-0 bg-[radial-gradient(closest-side_at_50%_100%,rgba(240,83,30,0.28),transparent)]" />
            <div className="absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent" />
          </div>
        </div>

        <div className="relative flex h-14 items-center gap-1 pl-3 pr-2 sm:pr-2.5">
          <Link href="/" onClick={close} className="group flex shrink-0 items-center gap-2 rounded-xl pr-2">
            <LogoMark className="h-8 w-[2.9rem]" />
            <span className="font-display text-[1.05rem] font-bold tracking-tight text-white">
              GymGear<span className="text-accent">Compare</span>
            </span>
          </Link>

          {/* Desktop links: one lit pill slides to whichever is hovered */}
          <div className="ml-3 hidden items-center sm:flex" onMouseLeave={() => setHovered(null)}>
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={activeHref === l.href ? "page" : undefined}
                onMouseEnter={() => setHovered(l.href)}
                onFocus={() => setHovered(l.href)}
                onBlur={() => setHovered(null)}
                className={
                  "relative flex h-10 items-center rounded-xl px-4 text-sm font-bold transition-colors duration-200 " +
                  (pillOn === l.href ? "text-white" : "text-white/65")
                }
              >
                {pillOn === l.href && (
                  <motion.span
                    layoutId="nav-pill"
                    aria-hidden
                    transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 480, damping: 40 }}
                    className="absolute inset-0 rounded-xl border border-white/10 bg-white/[0.08]"
                  />
                )}
                <span className="relative">{l.label}</span>
              </Link>
            ))}
          </div>

          <div className="flex-1" />

          {showSearch && (
            <button
              type="button"
              onClick={openSearch}
              aria-label="Search products"
              className="hidden h-10 w-44 items-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] px-3 text-sm text-white/60 transition-colors hover:border-accent/50 hover:text-white md:flex"
            >
              <Search className="h-4 w-4" />
              <span className="flex-1 text-left">Search gear</span>
              <kbd className="rounded-md border border-white/15 px-1.5 font-body text-[0.65rem] text-white/50">/</kbd>
            </button>
          )}
          {showSearch && (
            <button
              type="button"
              onClick={openSearch}
              aria-label="Search products"
              className="flex h-11 w-11 items-center justify-center rounded-xl text-white transition-colors hover:bg-white/10 md:hidden"
            >
              <Search className="h-5 w-5" />
            </button>
          )}
          {showPlan && (
            <Link
              href="/quiz"
              className="glow-btn ml-1.5 hidden h-10 items-center rounded-xl bg-accent px-4 text-sm font-bold text-white transition-colors hover:bg-accent-hover sm:flex"
            >
              {planLabel}
            </Link>
          )}

          {/* Phone menu: two lines that fold into an X */}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="relative flex h-11 w-11 items-center justify-center rounded-xl transition-colors hover:bg-white/10 sm:hidden"
          >
            <span className={"absolute h-0.5 w-5 rounded-full bg-white transition-transform duration-300 " + (open ? "rotate-45" : "-translate-y-[4px]")} />
            <span className={"absolute h-0.5 w-5 rounded-full bg-white transition-transform duration-300 " + (open ? "-rotate-45" : "translate-y-[4px]")} />
          </button>
        </div>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={reduce ? false : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-x-0 top-full mt-2 rounded-2xl border border-white/15 bg-[#0b1730] p-2 shadow-[0_18px_44px_rgba(3,8,18,0.7)] sm:hidden"
            >
              {!onQuiz && (
                <Link href="/quiz" onClick={close} className="mb-1 flex min-h-12 items-center justify-center rounded-xl bg-accent font-bold text-white">
                  {planLabel}
                </Link>
              )}
              {NAV_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={close}
                  aria-current={activeHref === l.href ? "page" : undefined}
                  className={
                    "flex min-h-12 items-center rounded-xl px-3 font-bold transition-colors hover:bg-white/5 " +
                    (activeHref === l.href ? "bg-white/[0.08] text-white" : "text-white/75")
                  }
                >
                  {l.label}
                </Link>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="pointer-events-auto">
        <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      </div>
    </nav>
  );
}
