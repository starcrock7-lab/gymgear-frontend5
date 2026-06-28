"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Star, Loader2, Search, ChevronDown } from "lucide-react";
import { requestAlternatives } from "@/lib/api";
import { formatPrice, type KitProduct } from "@/lib/kit";

const EASE = [0.16, 1, 0.3, 1] as const;
const priceOf = (p: KitProduct) => p.salePrice ?? p.price;

/* Picker for swapping one product in a kit. Loads every product in the same
   category, lets the user search by name or brand, sorts cheapest-first, and
   explains why each option is good (expert verdict) with the price difference
   against the current pick. */
export default function SwapModal({
  category,
  currentId,
  currentPrice,
  categoryLabel,
  onPick,
  onClose,
}: {
  category: string;
  currentId: string;
  currentPrice: number;
  categoryLabel: string;
  onPick: (product: KitProduct) => void;
  onClose: () => void;
}) {
  const [items, setItems] = useState<KitProduct[] | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let live = true;
    requestAlternatives(category)
      .then((list) => live && setItems(list))
      .catch(() => live && setError(true));
    return () => {
      live = false;
    };
  }, [category]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const shown = useMemo(() => {
    if (!items) return null;
    const q = query.trim().toLowerCase();
    const filtered = q
      ? items.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.brand.toLowerCase().includes(q),
        )
      : items;
    return [...filtered].sort((a, b) => priceOf(a) - priceOf(b));
  }, [items, query]);

  const label = categoryLabel.toLowerCase();

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <button
          aria-label="Close"
          onClick={onClose}
          className="absolute inset-0 cursor-default bg-navy-deep/80 backdrop-blur-sm"
        />
        <motion.div
          role="dialog"
          aria-modal="true"
          initial={{ y: 40, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ duration: 0.32, ease: EASE }}
          className="relative flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-white/12 bg-navy shadow-2xl sm:rounded-2xl"
        >
          <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
            <div className="min-w-0">
              <p className="text-[0.6rem] font-medium uppercase tracking-[0.2em] text-accent">
                Choose a different {label}
              </p>
              <h3 className="mt-1 truncate font-display text-lg font-bold text-white">
                {categoryLabel}
              </h3>
              <p className="text-xs text-white/45">
                Yours costs {formatPrice(currentPrice)} — pick any swap below
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="shrink-0 rounded-lg p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Search */}
          <div className="border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 focus-within:border-accent/50">
              <Search className="h-4 w-4 shrink-0 text-white/40" />
              <input
                type="text"
                value={query}
                autoComplete="off"
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${label} by name or brand…`}
                className="w-full bg-transparent text-sm text-white placeholder:text-white/35 focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="shrink-0 text-white/40 transition-colors hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {error ? (
              <p className="px-3 py-10 text-center text-sm text-white/55">
                Couldn&apos;t load options. Close and try again.
              </p>
            ) : !shown ? (
              <div className="flex items-center justify-center gap-2 py-12 text-white/50">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading options…
              </div>
            ) : shown.length === 0 ? (
              <p className="px-3 py-10 text-center text-sm text-white/55">
                No {label} match “{query}”.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {shown.map((p) => (
                  <li key={p.id}>
                    <SwapOption
                      product={p}
                      isCurrent={p.id === currentId}
                      delta={priceOf(p) - currentPrice}
                      onPick={() => onPick(p)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function SwapOption({
  product: p,
  isCurrent,
  delta,
  onPick,
}: {
  product: KitProduct;
  isCurrent: boolean;
  delta: number;
  onPick: () => void;
}) {
  const [imgOk, setImgOk] = useState(true);
  const [showSpecs, setShowSpecs] = useState(false);
  const specs = Object.entries(p.specs ?? {});

  return (
    <div
      className={
        "rounded-xl border transition-colors duration-200 " +
        (isCurrent
          ? "border-accent/60 bg-accent/10"
          : "border-white/10 bg-white/[0.03] hover:border-accent/40")
      }
    >
      <button
        type="button"
        disabled={isCurrent}
        onClick={onPick}
        className="flex w-full items-start gap-3 p-3 text-left"
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
          {imgOk && p.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.image}
              alt={p.name}
              loading="lazy"
              onError={() => setImgOk(false)}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="font-display text-base font-bold text-navy">
              {p.brand.charAt(0)}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate font-body text-sm font-bold text-white">
              {p.name}
            </p>
            {p.bestChoice && (
              <span className="shrink-0 rounded bg-win/20 px-1.5 py-0.5 text-[0.55rem] font-bold uppercase text-win">
                Top pick
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[0.7rem] text-white/45">
            <span>{p.brand}</span>
            <span className="text-white/20">·</span>
            <span className="flex items-center gap-0.5">
              <Star className="h-2.5 w-2.5 fill-accent text-accent" />
              {p.rating} ({p.reviewCount.toLocaleString()})
            </span>
          </div>
          {p.expertVerdict && (
            <p className="mt-1 line-clamp-2 text-[0.72rem] leading-snug text-white/45">
              {p.expertVerdict}
            </p>
          )}
        </div>

        <div className="shrink-0 text-right">
          <div className="font-body text-sm font-bold text-white">
            {formatPrice(priceOf(p))}
          </div>
          {isCurrent ? (
            <span className="mt-0.5 flex items-center justify-end gap-0.5 text-[0.65rem] font-bold text-accent">
              <Check className="h-3 w-3" />
              In your kit
            </span>
          ) : delta !== 0 ? (
            <span
              className={
                "mt-0.5 block text-[0.65rem] font-bold " +
                (delta > 0 ? "text-white/45" : "text-win")
              }
            >
              {delta > 0 ? `+${formatPrice(delta)}` : `−${formatPrice(-delta)}`}
            </span>
          ) : (
            <span className="mt-0.5 block text-[0.65rem] font-bold text-white/40">
              Same price
            </span>
          )}
        </div>
      </button>

      {/* Inline specs — peek before you pick */}
      {specs.length > 0 && (
        <div className="border-t border-white/8 px-3">
          <button
            type="button"
            onClick={() => setShowSpecs((s) => !s)}
            className="flex w-full items-center justify-center gap-1 py-1.5 text-[0.65rem] font-bold uppercase tracking-wide text-white/45 transition-colors hover:text-accent"
          >
            {showSpecs ? "Hide specs" : "View specs"}
            <ChevronDown
              className={
                "h-3 w-3 transition-transform duration-200 " +
                (showSpecs ? "rotate-180" : "")
              }
            />
          </button>
          <AnimatePresence initial={false}>
            {showSpecs && (
              <motion.dl
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: EASE }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pb-3 pt-1">
                  {specs.map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-2 text-xs">
                      <dt className="text-white/40">{k}</dt>
                      <dd className="text-right font-medium text-white/80">
                        {v}
                      </dd>
                    </div>
                  ))}
                </div>
              </motion.dl>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
