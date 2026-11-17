"use client";

import { useState } from "react";
import { DealCard } from "@/components/DealsStrip";
import type { Deal } from "@/lib/deals";

const SORTS = [
  { key: "save", label: "Biggest saving" },
  { key: "pct", label: "Biggest % off" },
  { key: "price", label: "Lowest price" },
] as const;
type Sort = (typeof SORTS)[number]["key"];

const now = (d: Deal) => d.product.salePrice ?? d.product.price;
const ORDER: Record<Sort, (a: Deal, b: Deal) => number> = {
  save: (a, b) => b.save - a.save,
  pct: (a, b) => b.pct - a.pct || b.save - a.save,
  price: (a, b) => now(a) - now(b),
};

/* Category filter and sort over every live deal. */
export default function DealsBrowser({ deals, labels }: { deals: Deal[]; labels: Record<string, string> }) {
  const [cat, setCat] = useState("all");
  const [sort, setSort] = useState<Sort>("save");

  const counts = new Map<string, number>();
  for (const d of deals) counts.set(d.product.category, (counts.get(d.product.category) ?? 0) + 1);
  const cats = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const shown = deals.filter((d) => cat === "all" || d.product.category === cat).sort(ORDER[sort]);

  const chip = (on: boolean) =>
    "min-h-11 shrink-0 rounded-xl px-4 text-sm font-bold transition-colors duration-200 " +
    (on ? "bg-accent text-white shadow-[0_0_22px_rgba(240,83,30,0.45)]" : "border border-white/15 text-white/70 hover:text-white");

  /* Slide the tapped chip to the middle of the row, so the categories after
     it come into view instead of hiding past the edge. */
  const choose = (key: string, el: HTMLElement) => {
    setCat(key);
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: smooth ? "smooth" : "auto", inline: "center", block: "nearest" });
  };

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="-mx-4 flex gap-2 overflow-x-auto scroll-px-4 px-4 py-1 [scrollbar-width:none] [mask-image:linear-gradient(to_right,transparent,black_16px,black_calc(100%-40px),transparent)] [&::-webkit-scrollbar]:hidden">
          <button type="button" aria-pressed={cat === "all"} onClick={(e) => choose("all", e.currentTarget)} className={chip(cat === "all")}>
            All ({deals.length})
          </button>
          {cats.map(([key, n]) => (
            <button key={key} type="button" aria-pressed={cat === key} onClick={(e) => choose(key, e.currentTarget)} className={chip(cat === key)}>
              {labels[key] ?? key} ({n})
            </button>
          ))}
        </div>
        <label htmlFor="deals-sort" className="flex shrink-0 items-center gap-2 self-end text-sm text-white/70">
          Sort
          <select
            id="deals-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="min-h-11 rounded-xl border border-white/15 bg-navy-deep px-3 font-bold text-white"
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((d) => (
          <DealCard key={d.product.id} d={d} />
        ))}
      </div>
    </>
  );
}
