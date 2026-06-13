"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, RotateCcw, Check, Star, Sparkles } from "lucide-react";
import {
  KIT_TIER_META,
  buyUrl,
  formatPrice,
  type Kit,
  type KitProduct,
  type KitResponse,
} from "@/lib/kit";

const EASE = [0.16, 1, 0.3, 1] as const;

/* Three generated kits. Desktop shows all three side by side with Best Match
   elevated and badged (CONTEXT spec). Below lg the switcher becomes a tab bar
   and one kit shows at a time. */
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
  const activeKit = kits.find((k) => k.type === active) ?? kits[0];

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

      {/* Desktop: three cards side by side, Best Match elevated */}
      <div className="mt-12 hidden items-stretch gap-5 lg:flex">
        {kits.map((k, i) => (
          <motion.div
            key={k.type}
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: i * 0.1, ease: EASE }}
            className="flex-1"
          >
            <KitCard kit={k} recommended={k.type === "match"} />
          </motion.div>
        ))}
      </div>

      {/* Mobile / tablet: tab switcher + one kit */}
      <div className="lg:hidden">
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
                <span
                  className={
                    "mt-1 block font-display text-lg font-extrabold " +
                    (selected ? "text-accent" : "text-white/80")
                  }
                >
                  {formatPrice(k.totalPrice)}
                </span>
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeKit.type}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: EASE }}
            className="mt-5"
          >
            <KitCard kit={activeKit} recommended={false} />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
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

function KitCard({
  kit,
  recommended,
}: {
  kit: Kit;
  recommended: boolean;
}) {
  const meta = KIT_TIER_META[kit.type];
  return (
    <div
      className={
        "relative flex h-full flex-col rounded-2xl border p-5 backdrop-blur-sm transition-all duration-300 sm:p-6 " +
        (recommended
          ? "border-accent/60 bg-accent/[0.07] shadow-2xl shadow-accent/20 lg:-translate-y-3 lg:scale-[1.02]"
          : "border-white/12 bg-white/[0.04] hover:border-white/25")
      }
    >
      {recommended && (
        <>
          {/* Ambient accent glow behind the recommended card */}
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-px -z-10 rounded-2xl bg-accent/20 blur-2xl"
          />
          <span className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-white shadow-lg shadow-accent/40">
            <Sparkles className="h-3 w-3" />
            Recommended
          </span>
        </>
      )}

      <div className="flex items-baseline justify-between">
        <span className="font-display text-sm font-bold text-white">
          {meta.label}
        </span>
        <span className="text-xs text-white/45">{meta.tagline}</span>
      </div>

      <h2 className="mt-3 font-display text-2xl font-extrabold text-white">
        {kit.name}
      </h2>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-display text-3xl font-extrabold text-accent">
          {formatPrice(kit.totalPrice)}
        </span>
        <span className="text-xs text-white/45">
          {kit.products.length}{" "}
          {kit.products.length === 1 ? "piece" : "pieces"}
        </span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-white/60">
        {kit.description}
      </p>

      <div className="mt-5 flex flex-1 flex-col gap-2.5">
        {kit.products.map((p) => (
          <ProductRow key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}

function ProductRow({ product: p }: { product: KitProduct }) {
  const [imgOk, setImgOk] = useState(true);
  const price = p.salePrice ?? p.price;

  return (
    <a
      href={buyUrl(p)}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="group flex items-center gap-3 rounded-xl border border-white/10 bg-navy-deep/40 p-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:bg-navy-deep/70"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
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
          <span className="font-display text-base font-bold text-navy">
            {p.brand.charAt(0)}
          </span>
        )}
      </div>

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
          {p.bestChoice && (
            <span className="flex items-center gap-0.5 text-win">
              <Check className="h-2.5 w-2.5" />
              Top
            </span>
          )}
        </div>
      </div>

      <div className="shrink-0 text-right">
        <div className="font-display text-sm font-bold text-white">
          {formatPrice(price)}
        </div>
        {p.salePrice && (
          <div className="text-[0.7rem] text-white/35 line-through">
            {formatPrice(p.price)}
          </div>
        )}
      </div>
      <ArrowUpRight className="h-4 w-4 shrink-0 text-white/25 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent" />
    </a>
  );
}
