"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  Plus,
  Check,
  Star,
  X,
  ArrowLeft,
  ArrowUpRight,
  Scale,
  Trophy,
  BadgeDollarSign,
} from "lucide-react";
import { requestCategories, requestAlternatives } from "@/lib/api";
import {
  buyUrl,
  formatPrice,
  type Category,
  type KitProduct,
} from "@/lib/kit";
import ProductModal from "@/components/quiz/ProductModal";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { Skeleton } from "@/components/ui/skeleton";

const EASE = [0.16, 1, 0.3, 1] as const;
const MAX = 4;
const priceOf = (p: KitProduct) => p.salePrice ?? p.price;

const GROUPS = [
  { key: "equipment", label: "Equipment" },
  { key: "clothing", label: "Clothing" },
  { key: "supplements", label: "Supplements" },
  { key: "gear", label: "Gear" },
  { key: "accessories", label: "Accessories" },
] as const;

export default function CompareTool() {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [group, setGroup] = useState<string>("equipment");
  const [cat, setCat] = useState<string>("");
  const [products, setProducts] = useState<KitProduct[] | null>(null);
  const [selected, setSelected] = useState<KitProduct[]>([]);
  const [comparing, setComparing] = useState(false);
  const [detail, setDetail] = useState<KitProduct | null>(null);

  /* Load categories once; default to the first equipment category. */
  useEffect(() => {
    let live = true;
    requestCategories()
      .then((cs) => {
        if (!live) return;
        setCategories(cs);
        const first = cs.find((c) => c.group === "equipment");
        if (first) setCat(first.key);
      })
      .catch(() => live && setCategories([]));
    return () => {
      live = false;
    };
  }, []);

  /* Fetch products whenever the category changes. The reset happens in
     chooseCat (a handler), so this effect only does the async fetch — no
     synchronous setState in the effect body. products === null = loading. */
  useEffect(() => {
    if (!cat) return;
    let live = true;
    requestAlternatives(cat)
      .then((ps) => live && setProducts(ps))
      .catch(() => live && setProducts([]));
    return () => {
      live = false;
    };
  }, [cat]);

  /* Switch category: clear the per-category selection and show the loader. */
  function chooseCat(key: string) {
    if (key === cat) return;
    setProducts(null);
    setSelected([]);
    setComparing(false);
    setCat(key);
  }

  const inGroup = useMemo(
    () => (categories ?? []).filter((c) => c.group === group),
    [categories, group],
  );

  function toggle(p: KitProduct) {
    setSelected((prev) => {
      if (prev.some((x) => x.id === p.id))
        return prev.filter((x) => x.id !== p.id);
      if (prev.length >= MAX) return prev;
      return [...prev, p];
    });
  }
  const isSelected = (id: string) => selected.some((p) => p.id === id);

  if (!categories) {
    return (
      <div className="flex items-center justify-center gap-2 py-32 text-ink-3">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading the comparison tool…
      </div>
    );
  }

  return (
    <>
      {comparing ? (
        <ComparisonMatrix
          products={selected}
          onBack={() => setComparing(false)}
          onDetail={setDetail}
        />
      ) : (
        <>
          {/* Group tabs */}
          <div className="flex flex-wrap justify-center gap-2">
            {GROUPS.map((g) => (
              <button
                key={g.key}
                type="button"
                onClick={() => {
                  setGroup(g.key);
                  const first = categories.find((c) => c.group === g.key);
                  if (first) chooseCat(first.key);
                }}
                className={
                  "rounded-full px-4 py-2 text-sm font-bold transition-colors " +
                  (group === g.key
                    ? "bg-ink text-white"
                    : "bg-white text-ink-2 ring-1 ring-line hover:text-ink")
                }
              >
                {g.label}
              </button>
            ))}
          </div>

          {/* Category pills */}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {inGroup.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => chooseCat(c.key)}
                className={
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors " +
                  (cat === c.key
                    ? "bg-accent/10 text-accent ring-1 ring-accent/40"
                    : "text-ink-2 hover:bg-white hover:text-ink")
                }
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Product grid */}
          <div className="mt-10 min-h-[40vh]">
            {!products ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {products.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    selected={isSelected(p.id)}
                    disabled={
                      !isSelected(p.id) && selected.length >= MAX
                    }
                    onToggle={() => toggle(p)}
                    onDetail={() => setDetail(p)}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Sticky compare bar */}
      <AnimatePresence>
        {selected.length > 0 && !comparing && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-navy/95 backdrop-blur-md"
          >
            <div className="mx-auto flex max-w-5xl items-center gap-4 px-5 py-3">
              <div className="flex flex-1 items-center gap-2 overflow-x-auto">
                {selected.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggle(p)}
                    title={`Remove ${p.name}`}
                    className="group flex shrink-0 items-center gap-1.5 rounded-lg border border-white/12 bg-white/5 py-1 pl-1 pr-2 text-xs text-white/80"
                  >
                    <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded bg-white">
                      <ProductThumb product={p} className="h-full w-full" />
                    </span>
                    <span className="max-w-[7rem] truncate">{p.name}</span>
                    <X className="h-3 w-3 text-white/40 group-hover:text-white" />
                  </button>
                ))}
                <span className="shrink-0 text-xs text-white/40">
                  {selected.length}/{MAX}
                </span>
              </div>
              <button
                type="button"
                disabled={selected.length < 2}
                onClick={() => setComparing(true)}
                className="flex shrink-0 items-center gap-2 rounded-xl bg-accent px-5 py-2.5 font-body text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
              >
                <Scale className="h-4 w-4" />
                Compare {selected.length >= 2 ? selected.length : ""}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {detail && (
        <ProductModal product={detail} onClose={() => setDetail(null)} />
      )}
    </>
  );
}

/* --- Product card -------------------------------------------------------- */

function ProductCard({
  product: p,
  selected,
  disabled,
  onToggle,
  onDetail,
}: {
  product: KitProduct;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
  onDetail: () => void;
}) {
  return (
    <SpotlightCard
      className={
        "flex flex-col overflow-hidden rounded-2xl border bg-white transition-all duration-300 " +
        (selected
          ? "border-accent shadow-lg shadow-accent/10"
          : "border-line hover:-translate-y-1.5 hover:border-accent/60 hover:shadow-2xl hover:shadow-accent/15")
      }
    >
      <button
        type="button"
        onClick={onDetail}
        className="relative z-[1] aspect-square overflow-hidden bg-off"
      >
        <ProductThumb
          product={p}
          className="h-full w-full transition-transform duration-500 group-hover/spot:scale-105"
          cover
        />
        {p.awards?.[0] ? (
          <span className="absolute left-2 top-2 rounded bg-win px-1.5 py-0.5 text-[0.6rem] font-bold uppercase text-white">
            {p.awards[0]}
          </span>
        ) : null}
        {p.discount ? (
          <span className="absolute right-2 top-2 rounded bg-accent px-1.5 py-0.5 text-[0.6rem] font-bold text-white">
            {p.discount}% off
          </span>
        ) : null}
        {typeof p.gymgearScore === "number" && (
          <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-md bg-navy/90 px-1.5 py-0.5 text-[0.6rem] font-bold text-white backdrop-blur-sm">
            <span className="text-accent">{p.gymgearScore}</span>
            <span className="text-white/60">GymGear</span>
          </span>
        )}
      </button>

      <div className="relative z-[1] flex flex-1 flex-col p-3">
        <button onClick={onDetail} className="text-left">
          <p className="truncate font-body text-sm font-bold text-ink">
            {p.name}
          </p>
          <p className="text-xs text-ink-3">{p.brand}</p>
        </button>
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-2">
          <Star className="h-3 w-3 fill-accent text-accent" />
          {p.rating}
          <span className="text-ink-3">·</span>
          <span className="font-bold text-ink">{formatPrice(priceOf(p))}</span>
          {p.salePrice && (
            <span className="text-ink-3 line-through">
              {formatPrice(p.price)}
            </span>
          )}
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={onToggle}
          className={
            "mt-3 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-colors " +
            (selected
              ? "bg-accent text-white"
              : disabled
                ? "cursor-not-allowed bg-off text-ink-3"
                : "bg-ink text-white hover:bg-ink/90")
          }
        >
          {selected ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Added
            </>
          ) : (
            <>
              <Plus className="h-3.5 w-3.5" />
              Compare
            </>
          )}
        </button>
      </div>
    </SpotlightCard>
  );
}

/* --- Loading skeleton ---------------------------------------------------- */

function SkeletonCard() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-line bg-white">
      <Skeleton className="aspect-square rounded-none" />
      <div className="flex flex-1 flex-col gap-2 p-3">
        <Skeleton className="h-3.5 w-4/5" />
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="mt-1.5 h-3 w-2/3" />
        <Skeleton className="mt-3 h-8 w-full rounded-lg" />
      </div>
    </div>
  );
}

/* --- Comparison matrix --------------------------------------------------- */

function ComparisonMatrix({
  products,
  onBack,
  onDetail,
}: {
  products: KitProduct[];
  onBack: () => void;
  onDetail: (p: KitProduct) => void;
}) {
  const cheapestId = products.reduce((a, b) =>
    priceOf(a) <= priceOf(b) ? a : b,
  ).id;
  const bestQualityId = products.reduce((a, b) =>
    a.quality >= b.quality ? a : b,
  ).id;
  const bestValueId = products.reduce((a, b) =>
    a.quality / priceOf(a) >= b.quality / priceOf(b) ? a : b,
  ).id;

  // Union of spec keys across the (same-category) products, in order.
  const specKeys: string[] = [];
  for (const p of products)
    for (const k of Object.keys(p.specs ?? {}))
      if (!specKeys.includes(k)) specKeys.push(k);

  const valueName = products.find((p) => p.id === bestValueId)?.name;
  const qualityName = products.find((p) => p.id === bestQualityId)?.name;

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm font-bold text-ink-2 transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to browse
      </button>

      {/* Verdict */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <SpotlightCard
          glow="var(--win)"
          className="flex items-center gap-3 rounded-xl border border-line bg-white p-4 transition-colors hover:border-win/40"
        >
          <BadgeDollarSign className="relative z-[1] h-5 w-5 shrink-0 text-win" />
          <p className="relative z-[1] text-sm text-ink-2">
            <span className="font-bold text-ink">Best value:</span> {valueName}
          </p>
        </SpotlightCard>
        <SpotlightCard
          glow="var(--accent)"
          className="flex items-center gap-3 rounded-xl border border-line bg-white p-4 transition-colors hover:border-accent/40"
        >
          <Trophy className="relative z-[1] h-5 w-5 shrink-0 text-accent" />
          <p className="relative z-[1] text-sm text-ink-2">
            <span className="font-bold text-ink">Best quality:</span>{" "}
            {qualityName}
          </p>
        </SpotlightCard>
      </div>

      {/* Matrix */}
      <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line">
              <th className="sticky left-0 z-[2] w-32 bg-white p-4" />
              {products.map((p) => (
                <th key={p.id} className="p-4 align-top">
                  <button
                    onClick={() => onDetail(p)}
                    className="block w-full text-left"
                  >
                    <span className="block h-20 w-full overflow-hidden rounded-lg bg-off">
                      <ProductThumb product={p} className="h-full w-full" cover />
                    </span>
                    <span className="mt-2 block font-body text-sm font-bold text-ink">
                      {p.name}
                    </span>
                    <span className="block text-xs text-ink-3">{p.brand}</span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <Row label="Price">
              {products.map((p) => (
                <Cell key={p.id} highlight={p.id === cheapestId}>
                  <span className="font-body font-bold text-ink">
                    {formatPrice(priceOf(p))}
                  </span>
                  {p.salePrice && (
                    <span className="ml-1 text-xs text-ink-3 line-through">
                      {formatPrice(p.price)}
                    </span>
                  )}
                  {p.id === cheapestId && (
                    <span className="ml-1 text-[0.6rem] font-bold uppercase text-win">
                      cheapest
                    </span>
                  )}
                </Cell>
              ))}
            </Row>
            <Row label="Rating">
              {products.map((p) => (
                <Cell key={p.id}>
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-3 w-3 fill-accent text-accent" />
                    {p.rating}
                    <span className="text-ink-3">
                      ({p.reviewCount.toLocaleString()})
                    </span>
                  </span>
                  <MetricBar value={p.rating} max={5} />
                </Cell>
              ))}
            </Row>
            <Row label="Quality">
              {products.map((p) => (
                <Cell key={p.id} highlight={p.id === bestQualityId}>
                  <span className="font-bold text-ink">{p.quality}/10</span>
                  {p.id === bestQualityId && (
                    <span className="ml-1 text-[0.6rem] font-bold uppercase text-accent">
                      best
                    </span>
                  )}
                  <MetricBar
                    value={p.quality}
                    max={10}
                    best={p.id === bestQualityId}
                  />
                </Cell>
              ))}
            </Row>
            {specKeys.map((k) => (
              <Row key={k} label={k}>
                {products.map((p) => (
                  <Cell key={p.id}>
                    <span className="text-ink-2">{p.specs?.[k] ?? "—"}</span>
                  </Cell>
                ))}
              </Row>
            ))}
            <tr>
              <td className="sticky left-0 z-[1] bg-white p-4" />
              {products.map((p) => (
                <td key={p.id} className="p-4 align-top">
                  <a
                    href={buyUrl(p)}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                    className="flex items-center justify-center gap-1 rounded-lg bg-accent px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-accent-hover"
                  >
                    Buy {formatPrice(priceOf(p))}
                    <ArrowUpRight className="h-3 w-3" />
                  </a>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <tr className="border-b border-line last:border-0">
      <th className="sticky left-0 z-[1] bg-off p-4 text-left text-xs font-bold uppercase tracking-wide text-ink-3">
        {label}
      </th>
      {children}
    </tr>
  );
}

function Cell({
  highlight,
  children,
}: {
  highlight?: boolean;
  children: React.ReactNode;
}) {
  return (
    <td
      className={
        "p-4 align-top " + (highlight ? "bg-accent/[0.04]" : "")
      }
    >
      {children}
    </td>
  );
}

/* A thin proportional bar that makes a numeric metric scannable across the
   comparison columns. The exact value stays labelled in the cell above it
   (per the bar-chart guideline: always keep value labels visible). */
function MetricBar({
  value,
  max,
  best = false,
}: {
  value: number;
  max: number;
  best?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <span
      role="presentation"
      className="mt-1.5 block h-1.5 w-full max-w-[120px] overflow-hidden rounded-full bg-line"
    >
      <span
        className={
          "block h-full rounded-full transition-[width] duration-500 " +
          (best ? "bg-win" : "bg-accent/70")
        }
        style={{ width: `${pct}%` }}
      />
    </span>
  );
}

/* --- Shared thumbnail ---------------------------------------------------- */

function ProductThumb({
  product: p,
  className = "",
  cover = false,
}: {
  product: KitProduct;
  className?: string;
  cover?: boolean;
}) {
  const [ok, setOk] = useState(true);
  if (ok && p.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={p.image}
        alt={p.name}
        loading="lazy"
        onError={() => setOk(false)}
        className={`${className} ${cover ? "object-cover" : "object-contain"}`}
      />
    );
  }
  return (
    <span
      className={`${className} flex items-center justify-center bg-white font-display font-bold text-navy`}
    >
      {p.brand.charAt(0)}
    </span>
  );
}
