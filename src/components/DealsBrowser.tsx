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

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="-mx-4 flex min-w-0 gap-2 overflow-x-auto px-4 [scrollbar-width:none] [mask-image:linear-gradient(to_right,black_85%,transparent)] sm:mx-0 sm:px-0">
          <button type="button" aria-pressed={cat === "all"} onClick={() => setCat("all")} className={chip(cat === "all")}>
            All ({deals.length})
          </button>
          {cats.map(([key, n]) => (
            <button key={key} type="button" aria-pressed={cat === key} onClick={() => setCat(key)} className={chip(cat === key)}>
              {labels[key] ?? key} ({n})
            </button>
          ))}
        </div>
        <label htmlFor="deals-sort" className="flex shrink-0 items-center gap-2 text-sm text-white/70">
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
