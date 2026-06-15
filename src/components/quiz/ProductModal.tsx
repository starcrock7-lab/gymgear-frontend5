"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Star, Check, ArrowUpRight, Quote } from "lucide-react";
import {
  buyUrl,
  formatPrice,
  categoryLabel,
  type KitProduct,
} from "@/lib/kit";

const EASE = [0.16, 1, 0.3, 1] as const;

/* Full detail panel for one product — image, the expert "why", rating,
   the complete spec sheet, and a buy button. Same modal idiom as SwapModal
   (backdrop, Escape, bottom-sheet on mobile / centered dialog on desktop). */
export default function ProductModal({
  product: p,
  onClose,
}: {
  product: KitProduct;
  onClose: () => void;
}) {
  const [imgOk, setImgOk] = useState(true);
  const price = p.salePrice ?? p.price;
  const specs = Object.entries(p.specs ?? {});
  // Label the buy button by where it actually goes (affiliate → Amazon).
  const dest = /amazon\./.test(buyUrl(p)) ? "Amazon" : p.retailer;

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
          className="relative flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-white/12 bg-navy shadow-2xl sm:rounded-2xl"
        >
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 z-10 rounded-lg bg-navy-deep/60 p-1.5 text-white/60 backdrop-blur-sm transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex-1 overflow-y-auto">
            {/* Image / brand banner */}
            <div className="flex h-44 items-center justify-center overflow-hidden bg-white">
              {imgOk && p.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.image}
                  alt={p.name}
                  onError={() => setImgOk(false)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="font-display text-5xl font-extrabold text-navy/80">
                  {p.brand}
                </span>
              )}
            </div>

            <div className="p-5 sm:p-6">
              <p className="text-[0.6rem] font-medium uppercase tracking-[0.2em] text-accent">
                {categoryLabel(p.category)}
              </p>
              <h2 className="mt-1 font-display text-2xl font-extrabold text-white">
                {p.name}
              </h2>
              <p className="text-sm text-white/50">{p.brand}</p>

              {/* badges */}
              {(p.bestChoice || p.discount || p.aspects?.length) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {p.bestChoice && (
                    <span className="flex items-center gap-1 rounded-full bg-win/20 px-2.5 py-1 text-[0.65rem] font-bold uppercase text-win">
                      <Check className="h-3 w-3" />
                      Top pick
                    </span>
                  )}
                  {p.discount ? (
                    <span className="rounded-full bg-accent/20 px-2.5 py-1 text-[0.65rem] font-bold uppercase text-accent">
                      {p.discount}% off
                    </span>
                  ) : null}
                  {p.aspects?.slice(0, 3).map((a) => (
                    <span
                      key={a}
                      className="rounded-full border border-white/12 px-2.5 py-1 text-[0.65rem] font-medium text-white/70"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              )}

              {/* price + rating */}
              <div className="mt-4 flex items-end justify-between">
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-3xl font-extrabold text-accent">
                    {formatPrice(price)}
                  </span>
                  {p.salePrice && (
                    <span className="text-sm text-white/35 line-through">
                      {formatPrice(p.price)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-sm text-white/60">
                  <Star className="h-4 w-4 fill-accent text-accent" />
                  <span className="font-bold text-white">{p.rating}</span>
                  <span className="text-white/40">
                    ({p.reviewCount.toLocaleString()})
                  </span>
                </div>
              </div>

              {/* the "why" — expert verdict */}
              {p.expertVerdict && (
                <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <Quote className="h-4 w-4 text-accent" />
                  <p className="mt-2 text-sm leading-relaxed text-white/80">
                    {p.expertVerdict}
                  </p>
                  {p.expertSource && (
                    <p className="mt-2 text-xs text-white/40">
                      — {p.expertSource}
                    </p>
                  )}
                </div>
              )}

              {/* spec sheet */}
              {specs.length > 0 && (
                <div className="mt-5">
                  <p className="text-[0.65rem] font-bold uppercase tracking-wide text-white/50">
                    Specs
                  </p>
                  <dl className="mt-2 divide-y divide-white/8 overflow-hidden rounded-xl border border-white/10">
                    {specs.map(([k, v]) => (
                      <div
                        key={k}
                        className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm"
                      >
                        <dt className="text-white/50">{k}</dt>
                        <dd className="text-right font-medium text-white">
                          {v}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </div>
          </div>

          {/* sticky buy footer */}
          <div className="border-t border-white/10 bg-navy/95 p-4 backdrop-blur-sm">
            <a
              href={buyUrl(p)}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent font-display text-base font-bold text-white shadow-lg shadow-accent/30 transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-xl hover:shadow-accent/50"
            >
              Buy on {dest} · {formatPrice(price)}
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
