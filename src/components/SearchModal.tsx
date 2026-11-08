"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Clock, Search, Sparkles, Star, X } from "lucide-react";
import { clearKit, formatPrice, type Category } from "@/lib/kit";
import { EMPTY_ANSWERS, saveAnswers, type QuizAnswers } from "@/lib/quiz";
import {
  clearRecent,
  loadRecent,
  saveRecent,
  searchProducts,
  suggestTerms,
  type SearchProduct,
} from "@/lib/search";

type Index = { products: SearchProduct[]; categories: Category[] };

/* Fetched once per session, shared across opens. */
let indexCache: Index | null = null;

async function loadIndex(): Promise<Index> {
  if (indexCache) return indexCache;
  const res = await fetch("/api/catalog/all");
  indexCache = (await res.json()) as Index;
  return indexCache;
}

/* Common starting points: each fills in what it already knows, and the quiz
   only asks for what's left. */
const PLANS: { label: string; answers: Partial<QuizAnswers> }[] = [
  { label: "Affordable apartment gym", answers: { space: "apartment-corner", budget: "under-300" } },
  { label: "Moderate garage gym", answers: { space: "garage", budget: "300-800" } },
  { label: "Premium garage gym", answers: { space: "garage", budget: "800-2000" } },
  { label: "Gym for a low ceiling", answers: { space: "garage", ceiling: "under-8ft" } },
];

/* The categories people start a home gym with, in buying order. */
const START_CATS = ["racks", "dumbbells", "benches", "barbells", "plates", "cardio"];
const SHORT_LABEL: Record<string, string> = { racks: "Racks", benches: "Benches", plates: "Plates" };

const RESULTS_FIRST = 5;

/* The letters they typed stay plain and the rest goes bold, as the big retail
   search boxes do, so the eye lands on what the suggestion adds. */
function Completion({ text, typed }: { text: string; typed: string }) {
  const at = text.toLowerCase().indexOf(typed.trim().toLowerCase());
  if (at < 0 || !typed.trim()) return <span className="font-bold text-white">{text}</span>;
  const end = at + typed.trim().length;
  return (
    <span className="font-bold text-white">
      {text.slice(0, at)}
      <span className="font-normal text-white/70">{text.slice(at, end)}</span>
      {text.slice(end)}
    </span>
  );
}

function Thumb({ p, size = "h-11 w-11" }: { p: SearchProduct; size?: string }) {
  return p.image ? (
    // eslint-disable-next-line @next/next/no-img-element -- remote retailer photo, fixed size
    <img src={p.image} alt="" loading="lazy" className={`${size} shrink-0 rounded-lg bg-white object-contain`} />
  ) : (
    <span className={`${size} flex shrink-0 items-center justify-center rounded-lg bg-white/10 font-display text-xs font-bold text-white/70`}>
      {p.brand?.charAt(0) ?? "?"}
    </span>
  );
}

function SectionLabel({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-1.5 flex items-center justify-between px-2">
      <h3 className="text-sm font-bold text-white/70">{children}</h3>
      {action}
    </div>
  );
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
  const listRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState<Index | null>(indexCache);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);

  /* Layout effect, so focus lands inside the tap that opened search: phones
     only raise the keyboard for focus that happens during a tap. */
  useLayoutEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset per open
    setQ("");
    setActive(0);
    setShowAll(false);
    setRecent(loadRecent());
    loadIndex().then(setIndex).catch(() => setIndex({ products: [], categories: [] }));
    // Lock page scroll behind the overlay.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const labelOf = useMemo(() => {
    const m = new Map(index?.categories.map((c) => [c.key, c.label]));
    return (k: string) => m.get(k) ?? k;
  }, [index]);

  const typed = q.trim();
  const typing = typed.length >= 2;

  const matches = useMemo(
    () => (index && typing ? searchProducts(index.products, typed, labelOf) : []),
    [index, typing, typed, labelOf],
  );
  const terms = useMemo(() => suggestTerms(typed), [typed]);
  const matchedCats = useMemo(() => {
    if (!index || !typing) return [];
    const low = typed.toLowerCase();
    return index.categories.filter((c) => ` ${c.label.toLowerCase()}`.includes(` ${low}`)).slice(0, 2);
  }, [index, typing, typed]);
  const matchedPlans = useMemo(() => {
    if (!typing) return [];
    const words = typed.toLowerCase().split(/\s+/);
    return PLANS.filter((p) => words.every((w) => ` ${p.label.toLowerCase()}`.includes(` ${w}`))).slice(0, 2);
  }, [typing, typed]);
  const shown = showAll ? matches : matches.slice(0, RESULTS_FIRST);

  /* The strongest pick in each starting category, from the score we publish. */
  const best = useMemo(() => {
    if (!index) return new Map<string, SearchProduct>();
    const m = new Map<string, SearchProduct>();
    for (const p of index.products) {
      if (!START_CATS.includes(p.category) || !p.image) continue;
      const cur = m.get(p.category);
      if (!cur || (p.gymgearScore ?? 0) > (cur.gymgearScore ?? 0)) m.set(p.category, p);
    }
    return m;
  }, [index]);
  const topRated = useMemo(
    () => [...best.values()].sort((a, b) => (b.gymgearScore ?? 0) - (a.gymgearScore ?? 0)).slice(0, 3),
    [best],
  );

  const remember = (term: string) => setRecent(saveRecent(term));
  const go = (href: string) => {
    if (typing) remember(typed);
    onClose();
    router.push(href);
  };
  const startPlan = (answers: Partial<QuizAnswers>) => {
    clearKit();
    saveAnswers({ ...EMPTY_ANSWERS, ...answers });
    go("/quiz");
  };
  const fill = (term: string) => {
    setQ(term);
    setShowAll(false);
    remember(term);
    inputRef.current?.focus();
  };

  /* Every row in screen order, so the arrow keys walk what's on screen. */
  const rows: { id: string; run: () => void }[] = typing
    ? [
        ...terms.map((t) => ({ id: `t-${t.term}`, run: () => fill(t.term) })),
        ...matchedCats.map((c) => ({ id: `c-${c.key}`, run: () => go(`/category/${c.key}`) })),
        ...matchedPlans.map((p) => ({ id: `p-${p.label}`, run: () => startPlan(p.answers) })),
        ...shown.map((p) => ({ id: `r-${p.id}`, run: () => go(`/gear/${p.id}`) })),
      ]
    : [];
  const rowIndex = (id: string) => rows.findIndex((r) => r.id === id);
  const rowClass = (id: string) =>
    `flex min-h-12 w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors ${
      rowIndex(id) === active ? "bg-white/10" : "hover:bg-white/5"
    }`;

  useEffect(() => setActive(0), [q]); // eslint-disable-line react-hooks/set-state-in-effect -- new query, new list

  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  const productRow = (p: SearchProduct, id: string, withTerm: boolean) => (
    <button
      key={id}
      id={id}
      type="button"
      role="option"
      aria-selected={rowIndex(id) === active}
      data-active={rowIndex(id) === active}
      onClick={() => go(`/gear/${p.id}`)}
      onMouseEnter={() => rowIndex(id) >= 0 && setActive(rowIndex(id))}
      className={rowClass(id)}
    >
      <Thumb p={p} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-white">
          {withTerm ? <Completion text={p.name} typed={typed} /> : p.name}
        </span>
        <span className="flex items-center gap-1 truncate text-xs text-white/60">
          {p.rating != null && (
            <>
              <Star className="h-3 w-3 shrink-0 fill-accent text-accent" />
              {p.rating} ·{" "}
            </>
          )}
          <span className="truncate">{p.brand}</span>
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-sm font-bold text-white">{formatPrice(p.salePrice ?? p.price)}</span>
        {typeof p.gymgearScore === "number" && (
          <span className="block text-xs text-white/60">Score {p.gymgearScore}</span>
        )}
      </span>
    </button>
  );

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-navy-deep/85 sm:px-4 sm:pt-[9vh]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Search products"
    >
      <div
        className="flex h-full w-full max-w-2xl flex-col overflow-hidden border-white/10 bg-navy shadow-2xl sm:h-auto sm:max-h-[80vh] sm:rounded-2xl sm:border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-white/10 py-1 pl-4 pr-2">
          <Search className="h-5 w-5 shrink-0 text-accent" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setShowAll(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, rows.length - 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              }
              if (e.key === "Enter") rows[active]?.run();
            }}
            role="combobox"
            aria-expanded={rows.length > 0}
            aria-controls="search-results"
            aria-activedescendant={rows[active]?.id}
            aria-label="Search products"
            placeholder="What are you looking for?"
            enterKeyHint="search"
            autoComplete="off"
            className="h-13 min-w-0 flex-1 bg-transparent font-body text-base text-white placeholder:text-white/50 focus:outline-none"
          />
          {q && (
            <button
              type="button"
              onClick={() => {
                setQ("");
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 shrink-0 items-center rounded-lg px-3 text-sm font-bold text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            Close
          </button>
        </div>

        <div ref={listRef} id="search-results" role="listbox" aria-label="Suggestions" className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2.5 pb-6">
          {!typing ? (
            <div className="space-y-5">
              {recent.length > 0 && (
                <section>
                  <SectionLabel
                    action={
                      <button
                        type="button"
                        onClick={() => {
                          clearRecent();
                          setRecent([]);
                        }}
                        className="min-h-8 px-1 text-xs font-bold text-white/60 hover:text-white"
                      >
                        Clear
                      </button>
                    }
                  >
                    Recent searches
                  </SectionLabel>
                  <div className="flex flex-wrap gap-2 px-2">
                    {recent.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => fill(r)}
                        className="flex min-h-10 items-center gap-1.5 rounded-lg border border-white/15 px-3 text-sm text-white/85 transition-colors hover:border-accent/60 hover:text-white"
                      >
                        <Clock className="h-3.5 w-3.5 text-white/50" />
                        {r}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              <section>
                <SectionLabel>Shop by category</SectionLabel>
                <div className="grid grid-cols-3 gap-2 px-2 sm:grid-cols-6">
                  {START_CATS.map((key) => {
                    const p = best.get(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => go(`/category/${key}`)}
                        className="group rounded-xl border border-white/10 p-2 text-center transition-colors hover:border-accent/60"
                      >
                        {p ? (
                          <Thumb p={p} size="mx-auto aspect-square h-auto w-full" />
                        ) : (
                          <span className="block aspect-square w-full animate-pulse rounded-lg bg-white/5" />
                        )}
                        <span className="mt-1.5 block truncate text-xs font-bold text-white/85 group-hover:text-white">
                          {SHORT_LABEL[key] ?? labelOf(key)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section>
                <SectionLabel>Start a plan</SectionLabel>
                <div className="flex flex-wrap gap-2 px-2">
                  {PLANS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => startPlan(p.answers)}
                      className="min-h-10 rounded-lg border border-white/15 px-3 text-sm text-white/85 transition-colors hover:border-accent/60 hover:text-white"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </section>

              {topRated.length > 0 && (
                <section>
                  <SectionLabel>Highest GymGear Scores</SectionLabel>
                  {topRated.map((p) => productRow(p, `top-${p.id}`, false))}
                </section>
              )}
            </div>
          ) : !index ? (
            <p className="px-3 py-8 text-center text-sm text-white/60">Searching…</p>
          ) : (
            <>
              {terms.map((t) => {
                const id = `t-${t.term}`;
                return (
                  <button
                    key={id}
                    id={id}
                    type="button"
                    role="option"
                    aria-selected={rowIndex(id) === active}
                    data-active={rowIndex(id) === active}
                    onClick={() => fill(t.term)}
                    onMouseEnter={() => setActive(rowIndex(id))}
                    className={rowClass(id)}
                  >
                    <Search className="mx-1 h-4 w-4 shrink-0 text-white/50" />
                    <span className="min-w-0 flex-1 truncate text-sm">
                      <Completion text={t.term} typed={typed} />
                      <span className="ml-1.5 text-xs text-white/60">in {labelOf(t.cat)}</span>
                    </span>
                  </button>
                );
              })}
              {matchedCats.map((c) => {
                const id = `c-${c.key}`;
                return (
                  <button
                    key={id}
                    id={id}
                    type="button"
                    role="option"
                    aria-selected={rowIndex(id) === active}
                    data-active={rowIndex(id) === active}
                    onClick={() => go(`/category/${c.key}`)}
                    onMouseEnter={() => setActive(rowIndex(id))}
                    className={rowClass(id)}
                  >
                    <ArrowUpRight className="mx-1 h-4 w-4 shrink-0 text-accent" />
                    <span className="min-w-0 flex-1 truncate text-sm font-bold text-white">
                      All {c.label}
                      <span className="ml-1.5 text-xs font-normal text-white/60">{c.count} ranked</span>
                    </span>
                  </button>
                );
              })}
              {matchedPlans.map((p) => {
                const id = `p-${p.label}`;
                return (
                  <button
                    key={id}
                    id={id}
                    type="button"
                    role="option"
                    aria-selected={rowIndex(id) === active}
                    data-active={rowIndex(id) === active}
                    onClick={() => startPlan(p.answers)}
                    onMouseEnter={() => setActive(rowIndex(id))}
                    className={rowClass(id)}
                  >
                    <Sparkles className="mx-1 h-4 w-4 shrink-0 text-accent" />
                    <span className="min-w-0 flex-1 truncate text-sm font-bold text-white">
                      Plan: {p.label}
                    </span>
                  </button>
                );
              })}

              {shown.length > 0 && (
                <section className="mt-3">
                  <SectionLabel>
                    {matches.length} {matches.length === 1 ? "product" : "products"}
                  </SectionLabel>
                  {shown.map((p) => productRow(p, `r-${p.id}`, true))}
                  {!showAll && matches.length > RESULTS_FIRST && (
                    <button
                      type="button"
                      onClick={() => setShowAll(true)}
                      className="mt-1 min-h-11 w-full rounded-xl border border-white/15 text-sm font-bold text-white/85 transition-colors hover:border-accent/60 hover:text-white"
                    >
                      Show all {matches.length} products
                    </button>
                  )}
                </section>
              )}

              {!rows.length && (
                <div className="px-2 py-5">
                  <p className="text-sm text-white/85">No matches for &ldquo;{typed}&rdquo;.</p>
                  <p className="mt-1 text-sm text-white/60">
                    Try a type of gear or a brand, or start from one of these.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {PLANS.slice(0, 2).map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => startPlan(p.answers)}
                        className="min-h-10 rounded-lg border border-white/15 px-3 text-sm text-white/85 transition-colors hover:border-accent/60 hover:text-white"
                      >
                        {p.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => go("/gear")}
                      className="min-h-10 rounded-lg border border-white/15 px-3 text-sm font-bold text-white transition-colors hover:border-accent/60"
                    >
                      Browse all gear
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
