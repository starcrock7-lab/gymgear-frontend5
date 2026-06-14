"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Star, Loader2, ArrowDown, ArrowUp } from "lucide-react";
import { requestAlternatives } from "@/lib/api";
import { formatPrice, type KitProduct } from "@/lib/kit";

const EASE = [0.16, 1, 0.3, 1] as const;
const priceOf = (p: KitProduct) => p.salePrice ?? p.price;

/* Picker for swapping one product in a kit. Loads every product in the same
   category, sorts cheapest-first, and shows each option's price difference
   against the current pick so the budget impact is obvious. */
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

  const sorted = useMemo(
    () => (items ? [...items].sort((a, b) => priceOf(a) - priceOf(b)) : null),
    [items],
  );

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
          className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-white/12 bg-navy shadow-2xl sm:rounded-2xl"
        >
          <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
            <div className="min-w-0">
              <p className="text-[0.6rem] font-medium uppercase tracking-[0.2em] text-accent">
                Swap your {categoryLabel.toLowerCase()} pick
              </p>
              <h3 className="mt-1 truncate font-display text-lg font-bold text-white">
                {categoryLabel}
              </h3>
              <p className="text-xs text-white/45">
                Currently {formatPrice(currentPrice)} · cheapest first
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

          <div className="flex-1 overflow-y-auto p-3">
            {error ? (
              <p className="px-3 py-10 text-center text-sm text-white/55">
                Couldn&apos;t load alternatives. Close and try again.
              </p>
            ) : !sorted ? (
              <div className="flex items-center justify-center gap-2 py-12 text-white/50">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading options…
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {sorted.map((p) => (
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
  return (
    <button
      type="button"
      disabled={isCurrent}
      onClick={onPick}
      className={
        "flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-all duration-200 " +
        (isCurrent
          ? "cursor-default border-accent/60 bg-accent/10"
          : "border-white/10 bg-white/[0.03] hover:-translate-y-0.5 hover:border-accent/50 hover:bg-white/[0.07]")
      }
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
        {imgOk && p.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.image}
            alt={p.name}
            loading="lazy"
            onError={() => setImgOk(false)}
            className="h-full w-full object-contain"
          />
        ) : (
          <span className="font-display text-sm font-bold text-navy">
            {p.brand.charAt(0)}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate font-display text-sm font-bold text-white">
            {p.name}
          </p>
          {p.bestChoice && (
            <span className="shrink-0 text-[0.6rem] font-bold text-win">
              ★ Top
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[0.7rem] text-white/45">
          <span>{p.brand}</span>
          <span className="text-white/20">·</span>
          <span className="flex items-center gap-0.5">
            <Star className="h-2.5 w-2.5 fill-accent text-accent" />
            {p.rating}
          </span>
          <span className="text-white/20">·</span>
          <span>q{p.quality}</span>
        </div>
      </div>

      <div className="shrink-0 text-right">
        <div className="font-display text-sm font-bold text-white">
          {formatPrice(priceOf(p))}
        </div>
        {isCurrent ? (
          <span className="flex items-center justify-end gap-0.5 text-[0.65rem] font-bold text-accent">
            <Check className="h-3 w-3" />
            In kit
          </span>
        ) : delta !== 0 ? (
          <span
            className={
              "flex items-center justify-end gap-0.5 text-[0.65rem] font-bold " +
              (delta > 0 ? "text-white/45" : "text-win")
            }
          >
            {delta > 0 ? (
              <ArrowUp className="h-2.5 w-2.5" />
            ) : (
              <ArrowDown className="h-2.5 w-2.5" />
            )}
            {delta > 0 ? "+" : "−"}
            {formatPrice(Math.abs(delta))}
          </span>
        ) : (
          <span className="text-[0.65rem] font-bold text-white/40">
            Same price
          </span>
        )}
      </div>
    </button>
  );
}
