"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X, ArrowUpRight } from "lucide-react";
import { formatPrice, type Category } from "@/lib/kit";

/* Lean rows from /api/catalog/all — search needs names, not full specs. */
type SearchProduct = {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  salePrice: number | null;
  rating: number;
  gymgearScore: number | null;
  image: string;
};

type Index = { products: SearchProduct[]; categories: Category[] };

/* Fetched once per session, shared across opens. */
let indexCache: Index | null = null;

async function loadIndex(): Promise<Index> {
  if (indexCache) return indexCache;
  const res = await fetch("/api/catalog/all");
  indexCache = (await res.json()) as Index;
  return indexCache;
}

/* Rank: name prefix > name substring > category label > brand. Category
   beats brand so "barbell" lists actual barbells before products that merely
   carry a brand like "CAP Barbell". */
function rank(p: SearchProduct, q: string, catLabel: string): number {
  const name = p.name.toLowerCase();
  const brand = p.brand.toLowerCase();
  if (name.startsWith(q)) return 0;
  if (name.includes(q)) return 1;
  if (catLabel.includes(q)) return 2;
  if (brand.includes(q)) return 3;
  return -1;
}

export default function SearchModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [index, setIndex] = useState<Index | null>(indexCache);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setActive(0);
    loadIndex().then(setIndex).catch(() => setIndex({ products: [], categories: [] }));
    // Lock page scroll behind the overlay.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => {
      document.body.style.overflow = prev;
      clearTimeout(t);
    };
  }, [open]);

  const catLabelByKey = useMemo(() => {
    const m = new Map<string, string>();
    index?.categories.forEach((c) => m.set(c.key, c.label));
    return m;
  }, [index]);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!index || query.length < 2) return { cats: [], prods: [] };
    const cats = index.categories
      .filter((c) => c.label.toLowerCase().includes(query))
      .slice(0, 3);
    const prods = index.products
      .map((p) => ({
        p,
        r: rank(p, query, (catLabelByKey.get(p.category) ?? "").toLowerCase()),
      }))
      .filter((x) => x.r >= 0)
      .sort((a, b) => a.r - b.r || (b.p.gymgearScore ?? 0) - (a.p.gymgearScore ?? 0))
      .slice(0, 8)
      .map((x) => x.p);
    return { cats, prods };
  }, [index, q, catLabelByKey]);

  /* Flat list for arrow-key navigation: categories first, then products. */
  const flat = useMemo(
    () => [
      ...results.cats.map((c) => ({ kind: "cat" as const, href: `/category/${c.key}` })),
      ...results.prods.map((p) => ({ kind: "prod" as const, href: `/gear/${p.id}` })),
    ],
    [results],
  );

  useEffect(() => setActive(0), [q]);

  const go = (href: string) => {
    onClose();
    router.push(href);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-navy/70 px-4 pt-[12vh] backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Search products"
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-navy shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-4">
          <Search className="h-4 w-4 shrink-0 text-white/40" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, flat.length - 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              }
              if (e.key === "Enter" && flat[active]) go(flat[active].href);
            }}
            placeholder="Search products, brands, categories…"
            className="h-14 w-full bg-transparent font-body text-base text-white placeholder:text-white/35 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[55vh] overflow-y-auto overscroll-contain p-2">
          {q.trim().length < 2 ? (
            <p className="px-3 py-6 text-center text-sm text-white/40">
              Type at least 2 letters — try “barbell”, “creatine”, or “Rogue”.
            </p>
          ) : !flat.length ? (
            <p className="px-3 py-6 text-center text-sm text-white/40">
              No matches. Try a broader term, or{" "}
              <button
                type="button"
                className="font-bold text-accent underline-offset-2 hover:underline"
                onClick={() => go("/gear")}
              >
                browse every category
              </button>
              .
            </p>
          ) : (
            <>
              {results.cats.map((c, i) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => go(`/category/${c.key}`)}
                  onMouseEnter={() => setActive(i)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                    active === i ? "bg-white/10" : "hover:bg-white/5"
                  }`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
                    <Search className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold text-white">
                      Best {c.label}
                    </span>
                    <span className="block text-xs text-white/45">
                      Category · {c.count} ranked
                    </span>
                  </span>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-white/40" />
                </button>
              ))}
              {results.prods.map((p, j) => {
                const i = results.cats.length + j;
                const price = p.salePrice ?? p.price;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => go(`/gear/${p.id}`)}
                    onMouseEnter={() => setActive(i)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                      active === i ? "bg-white/10" : "hover:bg-white/5"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- remote unsplash thumb, fixed size */}
                    <img
                      src={p.image}
                      alt=""
                      loading="lazy"
                      className="h-9 w-9 shrink-0 rounded-lg object-cover"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold text-white">
                        {p.name}
                      </span>
                      <span className="block truncate text-xs text-white/45">
                        {p.brand} · {catLabelByKey.get(p.category) ?? p.category}
                      </span>
                    </span>
                    {typeof p.gymgearScore === "number" && (
                      <span className="shrink-0 rounded-md bg-accent/15 px-1.5 py-0.5 text-xs font-bold text-accent">
                        {p.gymgearScore}
                      </span>
                    )}
                    <span className="shrink-0 text-sm font-bold text-white/80">
                      {formatPrice(price)}
                    </span>
                  </button>
                );
              })}
            </>
          )}
        </div>

        <div className="hidden items-center justify-end gap-3 border-t border-white/10 px-4 py-2 text-[0.65rem] text-white/35 sm:flex">
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}
