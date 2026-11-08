"use client";

/* The Gear page: search first, then one group of categories at a time. Every
   group stays in the page, hidden, so its links remain crawlable. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Search } from "lucide-react";
import { OPEN_SEARCH } from "@/components/SiteNav";
import SearchHint from "@/components/SearchHint";
import DealsStrip from "@/components/DealsStrip";
import type { Deal } from "@/lib/deals";
import type { Category } from "@/lib/kit";
import { gearArt } from "@/lib/gear-art";

const GROUPS = [
  { key: "equipment", label: "Equipment", cols: "lg:grid-cols-5" },
  { key: "gear", label: "Lifting gear", cols: "lg:grid-cols-5" },
  { key: "accessories", label: "Accessories", cols: "lg:grid-cols-4" },
  { key: "supplements", label: "Supplements", cols: "lg:grid-cols-6" },
];

/* Roughly what people look for first, instead of the catalog's order. */
const FIRST = ["racks", "dumbbells", "barbells", "plates", "benches", "cardio", "machines", "kettlebells", "bands", "flooring"];
const rank = (k: string) => (FIRST.includes(k) ? FIRST.indexOf(k) : FIRST.length);

function Tile({ c, i }: { c: Category; i: number }) {
  return (
    <Link
      href={`/category/${c.key}`}
      className="gear-tile glow-btn group flex flex-col rounded-2xl border border-white/10 bg-card p-3 pb-4"
      style={{ "--d": `${-i * 0.7}s`, "--in": `${i * 35}ms` } as React.CSSProperties}
    >
      <span className="relative flex h-36 items-center justify-center sm:h-44">
        <span aria-hidden className="gear-halo absolute inset-[6%] rounded-full" />
        <span aria-hidden className="gear-halo-hot absolute inset-[2%] rounded-full" />
        <span aria-hidden className="gear-floor absolute bottom-[4%] left-1/2 h-[9%] w-[58%] rounded-[50%]" />
        <span className="gear-lift relative h-full w-full">
          {/* eslint-disable-next-line @next/next/no-img-element -- our own fixed-size art */}
          <img
            src={gearArt(c.key, c.image)}
            alt=""
            draggable={false}
            loading="lazy"
            className="gear-art h-full w-full object-contain"
          />
        </span>
      </span>
      <span className="mt-2 block px-1 font-display text-base font-bold leading-tight text-white">{c.label}</span>
      <span className="mt-0.5 block px-1 text-sm text-white/60">{c.count} ranked</span>
    </Link>
  );
}

export default function GearBrowser({
  cats,
  deals,
  dealCount,
}: {
  cats: Category[];
  deals: Deal[];
  dealCount: number;
}) {
  const [tab, setTab] = useState("equipment");
  const reduce = useReducedMotion();
  const tabs = [
    ...GROUPS.filter((g) => cats.some((c) => c.group === g.key)),
    ...(dealCount ? [{ key: "deals", label: `Deals (${dealCount})`, cols: "" }] : []),
  ];

  /* The hash keeps your tab when you come back from a category. */
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the hash only exists in the browser
    if (hash) setTab(hash);
  }, []);
  const choose = (key: string) => {
    setTab(key);
    window.history.replaceState(null, "", `#${key}`);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:pt-12">
      <div className="text-center">
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-white sm:text-5xl">Find your gear</h1>
        <p className="mt-2 text-white/70">Every product ranked by the GymGear Score.</p>
      </div>

      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event(OPEN_SEARCH))}
        aria-label="Search products"
        className="glow-btn mx-auto mt-6 flex min-h-14 w-full max-w-xl items-center gap-3 rounded-xl border border-white/15 bg-navy px-4 text-left"
      >
        <Search className="h-5 w-5 shrink-0 text-accent" />
        <span className="min-w-0 truncate text-white/70">
          Search <SearchHint />
        </span>
      </button>

      <div className="mt-8 flex sm:justify-center">
        <div className="-mx-4 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:rounded-2xl sm:border sm:border-white/10 sm:bg-white/[0.04] sm:p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              aria-pressed={tab === t.key}
              onClick={() => choose(t.key)}
              className={
                "relative min-h-11 shrink-0 rounded-xl px-4 text-sm font-bold transition-colors duration-200 " +
                (tab === t.key ? "text-white" : "text-white/65 hover:text-white")
              }
            >
              {tab === t.key && (
                <motion.span
                  layoutId="gear-tab"
                  aria-hidden
                  transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 480, damping: 40 }}
                  className="absolute inset-0 rounded-xl bg-accent shadow-[0_0_22px_rgba(240,83,30,0.45)]"
                />
              )}
              <span className="relative">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {cats.length === 0 && (
        <p className="mt-10 text-center text-white/70">We couldn&apos;t load the categories. Try again in a moment.</p>
      )}

      {GROUPS.map((g) => (
        <div
          key={g.key}
          hidden={tab !== g.key}
          className={`mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 max-sm:[&>*:last-child:nth-child(odd)]:col-span-2 ${g.cols}`}
        >
          {cats
            .filter((c) => c.group === g.key)
            .sort((a, b) => rank(a.key) - rank(b.key))
            .map((c, i) => (
              <Tile key={c.key} c={c} i={i} />
            ))}
        </div>
      ))}

      <div hidden={tab !== "deals"} className="mt-8">
        <DealsStrip deals={deals} title="Best deals right now" limit={6} />
      </div>
    </div>
  );
}
