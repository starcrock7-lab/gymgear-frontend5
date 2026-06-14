"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Star, Loader2 } from "lucide-react";
import { requestAlternatives } from "@/lib/api";
import { formatPrice, type KitProduct } from "@/lib/kit";

const EASE = [0.16, 1, 0.3, 1] as const;

/* Picker for swapping one product in a kit. Loads every product in the same
   category and lets the user choose a replacement. */
export default function SwapModal({
  category,
  currentId,
  categoryLabel,
  onPick,
  onClose,
}: {
  category: string;
  currentId: string;
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

  /* Close on Escape. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

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
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div>
              <p className="text-[0.6rem] font-medium uppercase tracking-[0.2em] text-accent">
                Swap your pick
              </p>
              <h3 className="mt-0.5 font-display text-lg font-bold text-white">
                {categoryLabel}
              </h3>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="rounded-lg p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {error ? (
              <p className="px-3 py-10 text-center text-sm text-white/55">
                Couldn&apos;t load alternatives. Close and try again.
              </p>
            ) : !items ? (
              <div className="flex items-center justify-center gap-2 py-12 text-white/50">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading options…
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {items.map((p) => {
                  const isCurrent = p.id === currentId;
                  const price = p.salePrice ?? p.price;
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        disabled={isCurrent}
                        onClick={() => onPick(p)}
                        className={
                          "flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-all duration-200 " +
                          (isCurrent
                            ? "cursor-default border-accent/60 bg-accent/10"
                            : "border-white/10 bg-white/[0.03] hover:-translate-y-0.5 hover:border-accent/50 hover:bg-white/[0.07]")
                        }
                      >
                        <ProductThumb product={p} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-display text-sm font-bold text-white">
                            {p.name}
                          </p>
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
                            {formatPrice(price)}
                          </div>
                          {isCurrent ? (
                            <span className="flex items-center justify-end gap-0.5 text-[0.65rem] font-bold text-accent">
                              <Check className="h-3 w-3" />
                              In kit
                            </span>
                          ) : (
                            <span className="text-[0.65rem] font-bold text-white/40 group-hover:text-accent">
                              Choose
                            </span>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function ProductThumb({ product: p }: { product: KitProduct }) {
  const [imgOk, setImgOk] = useState(true);
  return (
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
  );
}
