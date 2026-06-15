"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, Check, Star, Sparkles, Repeat2, Info } from "lucide-react";
import {
  KIT_TIER_META,
  buyUrl,
  formatPrice,
  categoryLabel,
  kitTotal,
  type Kit,
  type KitProduct,
  type KitResponse,
} from "@/lib/kit";
import SwapModal from "@/components/quiz/SwapModal";
import ProductModal from "@/components/quiz/ProductModal";

const EASE = [0.16, 1, 0.3, 1] as const;
const priceOf = (p: KitProduct) => p.salePrice ?? p.price;

type SwapTarget = { kitType: Kit["type"]; product: KitProduct };

/* Three generated kits. One kit is always "selected" and lights up — on
   desktop all three show side by side and clicking one selects it; below lg
   a tab switcher shows one at a time. Best Match is selected by default and
   always carries the Recommended badge. Any product can be swapped. */
export default function KitResult({
  data,
  onRetake,
}: {
  data: KitResponse;
  onRetake: () => void;
}) {
  const order: Kit["type"][] = ["value", "match", "quality"];
  const [kits, setKits] = useState<Kit[]>(() =>
    order
      .map((t) => data.kits.find((k) => k.type === t))
      .filter(Boolean) as Kit[],
  );
  const [selected, setSelected] = useState<Kit["type"]>(
    kits.some((k) => k.type === "match") ? "match" : kits[0]?.type,
  );
  const [swap, setSwap] = useState<SwapTarget | null>(null);
  const [detail, setDetail] = useState<KitProduct | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const selectedKit = kits.find((k) => k.type === selected) ?? kits[0];

  function applySwap(replacement: KitProduct) {
    if (!swap) return;
    setKits((prev) =>
      prev.map((k) => {
        if (k.type !== swap.kitType) return k;
        const products = k.products.map((p) =>
          p.id === swap.product.id ? replacement : p,
        );
        return { ...k, products, totalPrice: kitTotal(products) };
      }),
    );
    setFlashId(replacement.id);
    setSwap(null);
  }

  /* Clear the post-swap highlight after it plays. */
  useEffect(() => {
    if (!flashId) return;
    const t = setTimeout(() => setFlashId(null), 1300);
    return () => clearTimeout(t);
  }, [flashId]);

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
          Pick the kit that fits — swap any piece, then buy direct.
        </p>
      </div>

      {/* Desktop: three cards side by side, click a card's header to select */}
      <div className="mt-14 hidden items-stretch gap-5 lg:flex">
        {kits.map((k, i) => (
          <motion.div
            key={k.type}
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: i * 0.08, ease: EASE }}
            className="min-w-0 flex-1"
          >
            <KitCard
              kit={k}
              recommended={k.type === "match"}
              selected={k.type === selected}
              flashId={flashId}
              onSelect={() => setSelected(k.type)}
              onSwap={(product) => setSwap({ kitType: k.type, product })}
              onInfo={setDetail}
            />
          </motion.div>
        ))}
      </div>

      {/* Mobile / tablet: tab switcher + one kit */}
      <div className="lg:hidden">
        <div className="mt-8 grid grid-cols-3 gap-2">
          {kits.map((k) => {
            const meta = KIT_TIER_META[k.type];
            const on = k.type === selected;
            return (
              <button
                key={k.type}
                type="button"
                onClick={() => setSelected(k.type)}
                className={
                  "relative overflow-hidden rounded-xl border px-2 py-3 text-center transition-all duration-200 " +
                  (on
                    ? "border-accent bg-accent/15 shadow-lg shadow-accent/20"
                    : "border-white/12 bg-white/5 hover:border-accent/50 hover:bg-white/10")
                }
              >
                <span className="block font-display text-xs font-bold sm:text-sm">
                  {meta.label}
                </span>
                <span
                  className={
                    "mt-1 block font-display text-base font-extrabold tracking-tight sm:text-lg " +
                    (on ? "text-accent" : "text-white/80")
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
            key={selectedKit.type}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: EASE }}
            className="mt-5"
          >
            <KitCard
              kit={selectedKit}
              recommended={selectedKit.type === "match"}
              selected
              flashId={flashId}
              onSelect={() => {}}
              onSwap={(product) =>
                setSwap({ kitType: selectedKit.type, product })
              }
              onInfo={setDetail}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
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

      {swap && (
        <SwapModal
          category={swap.product.category}
          categoryLabel={categoryLabel(swap.product.category)}
          currentId={swap.product.id}
          currentPrice={priceOf(swap.product)}
          onPick={applySwap}
          onClose={() => setSwap(null)}
        />
      )}

      {detail && (
        <ProductModal product={detail} onClose={() => setDetail(null)} />
      )}
    </div>
  );
}

function KitCard({
  kit,
  recommended,
  selected,
  flashId,
  onSelect,
  onSwap,
  onInfo,
}: {
  kit: Kit;
  recommended: boolean;
  selected: boolean;
  flashId: string | null;
  onSelect: () => void;
  onSwap: (product: KitProduct) => void;
  onInfo: (product: KitProduct) => void;
}) {
  const meta = KIT_TIER_META[kit.type];
  return (
    <div
      className={
        "relative flex h-full flex-col rounded-2xl border p-5 backdrop-blur-sm transition-all duration-300 sm:p-6 " +
        (selected
          ? "border-accent/60 bg-accent/[0.07] shadow-2xl shadow-accent/20 lg:-translate-y-2"
          : recommended
            ? "border-accent/25 bg-white/[0.04] hover:border-accent/40"
            : "border-white/12 bg-white/[0.04] opacity-90 hover:border-white/25 hover:opacity-100")
      }
    >
      {selected && (
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-px -z-10 rounded-2xl bg-accent/20 blur-2xl"
        />
      )}
      {recommended && (
        <span className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-accent px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-white shadow-lg shadow-accent/40">
          <Sparkles className="h-3 w-3" />
          Recommended
        </span>
      )}

      {/* Header is the selection target — no nested interactive elements. */}
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className="block w-full cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 lg:cursor-pointer"
      >
        <span className="flex items-center justify-between">
          <span className="font-display text-sm font-bold text-white">
            {meta.label}
          </span>
          {selected && (
            <span className="flex items-center gap-1 text-[0.6rem] font-bold uppercase tracking-wide text-accent">
              <Check className="h-3 w-3" />
              Selected
            </span>
          )}
        </span>
        <span className="block text-xs text-white/45">{meta.tagline}</span>

        <span className="mt-3 block font-display text-2xl font-extrabold text-white">
          {kit.name}
        </span>
        <span className="mt-1 flex items-baseline gap-2">
          <span className="font-display text-3xl font-extrabold text-accent">
            {formatPrice(kit.totalPrice)}
          </span>
          <span className="text-xs text-white/45">
            {kit.products.length}{" "}
            {kit.products.length === 1 ? "piece" : "pieces"}
          </span>
        </span>
        <span className="mt-3 block text-sm leading-relaxed text-white/60">
          {kit.description}
        </span>
      </button>

      <div className="mt-5 flex flex-1 flex-col gap-2.5">
        {kit.products.map((p) => (
          <ProductRow
            key={p.id}
            product={p}
            flash={flashId === p.id}
            onSwap={() => onSwap(p)}
            onInfo={() => onInfo(p)}
          />
        ))}
      </div>
    </div>
  );
}

function ProductRow({
  product: p,
  flash,
  onSwap,
  onInfo,
}: {
  product: KitProduct;
  flash: boolean;
  onSwap: () => void;
  onInfo: () => void;
}) {
  const [imgOk, setImgOk] = useState(true);
  const price = priceOf(p);

  return (
    <motion.div
      animate={{
        borderColor: flash ? "rgba(232,84,42,0.7)" : "rgba(255,255,255,0.1)",
        backgroundColor: flash ? "rgba(232,84,42,0.12)" : "rgba(8,17,36,0.4)",
      }}
      transition={{ duration: 0.45, ease: EASE }}
      className="flex items-center gap-3 rounded-xl border p-2.5"
    >
      {/* Thumb + info opens the product detail panel */}
      <button
        type="button"
        onClick={onInfo}
        aria-label={`Details for ${p.name}`}
        className="group flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left transition-colors hover:bg-white/[0.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
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
          <p className="flex items-center gap-1 truncate font-display text-sm font-bold text-white">
            <span className="truncate">{p.name}</span>
            <Info className="h-3 w-3 shrink-0 text-white/30 transition-colors group-hover:text-accent" />
          </p>
          <div className="mt-0.5 flex items-center gap-1.5 text-[0.7rem] text-white/45">
            <span className="flex items-center gap-0.5">
              <Star className="h-2.5 w-2.5 fill-accent text-accent" />
              {p.rating}
            </span>
            {p.bestChoice && (
              <>
                <span className="text-white/20">·</span>
                <span className="flex items-center gap-0.5 text-win">
                  <Check className="h-2.5 w-2.5" />
                  Top
                </span>
              </>
            )}
            <span className="text-white/20">·</span>
            <span className="font-bold text-white/70">
              {formatPrice(price)}
            </span>
            {p.salePrice && (
              <span className="text-white/30 line-through">
                {formatPrice(p.price)}
              </span>
            )}
          </div>
          {/* Plain-English reason this pick is good */}
          {p.expertVerdict && (
            <p className="mt-1 line-clamp-2 text-[0.72rem] leading-snug text-white/45">
              {p.expertVerdict}
            </p>
          )}
        </div>
      </button>

      {/* Swap — secondary */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onSwap();
        }}
        aria-label={`Swap ${p.name}`}
        title="Swap this product"
        className="flex h-9 shrink-0 items-center gap-1 rounded-lg border border-white/10 px-2.5 text-[0.7rem] font-bold text-white/55 transition-all duration-200 hover:border-accent/50 hover:bg-accent/10 hover:text-accent"
      >
        <Repeat2 className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Swap</span>
      </button>

      {/* Buy — primary */}
      <a
        href={buyUrl(p)}
        target="_blank"
        rel="noopener noreferrer sponsored"
        onClick={(e) => e.stopPropagation()}
        className="flex h-9 shrink-0 items-center rounded-lg bg-accent px-3 text-xs font-bold text-white transition-colors hover:bg-accent-hover"
      >
        Buy
      </a>
    </motion.div>
  );
}
