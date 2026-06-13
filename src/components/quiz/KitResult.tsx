"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, RotateCcw, Check, Star } from "lucide-react";
import {
  KIT_TIER_META,
  buyUrl,
  formatPrice,
  type Kit,
  type KitProduct,
  type KitResponse,
} from "@/lib/kit";

/* Three generated kits with a tier switcher. Best Match is selected first;
   the chosen kit expands below with its products and buy links. Works the
   same on mobile and desktop — the switcher is the tab bar. */
export default function KitResult({
  data,
  onRetake,
}: {
  data: KitResponse;
  onRetake: () => void;
}) {
  const order: Kit["type"][] = ["value", "match", "quality"];
  const kits = order
    .map((t) => data.kits.find((k) => k.type === t))
    .filter(Boolean) as Kit[];
  const [active, setActive] = useState<Kit["type"]>(
    kits.some((k) => k.type === "match") ? "match" : kits[0]?.type,
  );
  const kit = kits.find((k) => k.type === active) ?? kits[0];

  return (
    <div className="flex flex-col">
      <div className="text-center">
        <p className="text-[0.65rem] font-medium uppercase tracking-[0.25em] text-accent">
          Your kits are ready
        </p>
        <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          Three ways to build it.
        </h1>
        <p className="mt-3 text-white/55">
          Pick the kit that fits — every product is real, priced, and ready to
          buy.
        </p>
      </div>

      {/* Tier switcher */}
      <div className="mt-8 grid grid-cols-3 gap-2 sm:gap-3">
        {kits.map((k) => {
          const meta = KIT_TIER_META[k.type];
          const selected = k.type === active;
          return (
            <button
              key={k.type}
              type="button"
              onClick={() => setActive(k.type)}
              className={
                "group relative overflow-hidden rounded-xl border px-3 py-3.5 text-left transition-all duration-200 " +
                (selected
                  ? "border-accent bg-accent/15 shadow-lg shadow-accent/20"
                  : "border-white/12 bg-white/5 hover:-translate-y-0.5 hover:border-accent/50 hover:bg-white/10")
              }
            >
              <span className="block font-display text-sm font-bold sm:text-base">
                {meta.label}
              </span>
              <span className="mt-0.5 hidden text-xs text-white/50 sm:block">
                {meta.tagline}
              </span>
              <span
                className={
                  "mt-1.5 block font-display text-lg font-extrabold " +
                  (selected ? "text-accent" : "text-white/80")
                }
              >
                {formatPrice(k.totalPrice)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected kit detail */}
      <AnimatePresence mode="wait">
        <motion.div
          key={kit.type}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="mt-5 rounded-2xl border border-white/12 bg-white/5 p-5 sm:p-6"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-xl font-bold text-white">
              {kit.name}
            </h2>
            <span className="font-display text-sm text-white/50">
              {kit.products.length}{" "}
              {kit.products.length === 1 ? "piece" : "pieces"} ·{" "}
              {formatPrice(kit.totalPrice)}
            </span>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/65">
            {kit.description}
          </p>

          <div className="mt-5 flex flex-col gap-3">
            {kit.products.map((p) => (
              <ProductRow key={p.id} product={p} />
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <a
          href="/compare"
          className="rounded-xl border border-white/20 bg-white/5 px-6 py-3 font-display font-bold text-white/90 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/10 hover:text-white"
        >
          Compare products
        </a>
        <button
          type="button"
          onClick={onRetake}
          className="flex items-center gap-2 rounded-xl px-6 py-3 font-display font-bold text-white/60 transition-colors hover:text-white"
        >
          <RotateCcw className="h-4 w-4" />
          Retake quiz
        </button>
      </div>
    </div>
  );
}

function ProductRow({ product: p }: { product: KitProduct }) {
  const [imgOk, setImgOk] = useState(true);
  const price = p.salePrice ?? p.price;

  return (
    <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-navy-deep/40 p-3 transition-colors hover:border-white/20">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
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
          <span className="font-display text-lg font-bold text-navy">
            {p.brand.charAt(0)}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-display text-sm font-bold text-white">
            {p.name}
          </p>
          {p.bestChoice && (
            <span className="hidden shrink-0 items-center gap-1 rounded-full bg-win/20 px-2 py-0.5 text-[0.6rem] font-bold text-win sm:flex">
              <Check className="h-2.5 w-2.5" />
              Top pick
            </span>
          )}
        </div>
        <p className="text-xs text-white/45">{p.brand}</p>
        <div className="mt-1 flex items-center gap-2 text-xs text-white/55">
          <span className="flex items-center gap-0.5">
            <Star className="h-3 w-3 fill-accent text-accent" />
            {p.rating}
          </span>
          <span className="text-white/25">·</span>
          <span>{p.reviewCount.toLocaleString()} reviews</span>
        </div>
      </div>

      <div className="shrink-0 text-right">
        <div className="font-display font-bold text-white">
          {formatPrice(price)}
        </div>
        {p.salePrice && (
          <div className="text-xs text-white/40 line-through">
            {formatPrice(p.price)}
          </div>
        )}
        <a
          href={buyUrl(p)}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="mt-1.5 inline-flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-accent-hover"
        >
          Buy
          <ArrowUpRight className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
