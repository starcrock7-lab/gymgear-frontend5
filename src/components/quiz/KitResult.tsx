"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RotateCcw,
  Check,
  Star,
  Sparkles,
  Repeat2,
  Info,
  Share2,
  PackagePlus,
  ShoppingCart,
  Trash2,
  ArrowUpRight,
  Plus,
  BadgePercent,
} from "lucide-react";
import { findDeals, dealsSavings, dealsPitch, productDeal } from "@/lib/deals";
import { useCart, cartAdd } from "@/lib/cart";
import {
  KIT_TIER_META,
  buyUrl,
  formatPrice,
  categoryLabel,
  kitTotal,
  saveKit,
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
  const [shared, setShared] = useState(false);
  const selectedKit = kits.find((k) => k.type === selected) ?? kits[0];
  const accessories = data.accessories ?? [];

  /* Share the selected kit — native share sheet where available, otherwise
     copy a link to the clipboard. */
  async function shareKit() {
    const k = selectedKit;
    const text = `My AI-built home gym: ${k.name} — ${k.products.length} pieces, ${formatPrice(k.totalPrice)}. Build yours free:`;
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/quiz`
        : "https://gymgearcompare.com/quiz";
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "GymGear Compare", text, url });
      } catch {
        /* user dismissed the share sheet */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

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

  /* Add the ticked "frequently bought together" accessories to the selected
     kit in one action (Amazon-style bundle), skipping any already in it. */
  function addAccessories(accs: KitProduct[]) {
    if (!accs.length) return;
    setKits((prev) =>
      prev.map((k) => {
        if (k.type !== selected) return k;
        const have = new Set(k.products.map((p) => p.id));
        const fresh = accs.filter((a) => !have.has(a.id));
        if (!fresh.length) return k;
        const products = [...k.products, ...fresh];
        return { ...k, products, totalPrice: kitTotal(products) };
      }),
    );
    setFlashId(accs[accs.length - 1].id);
  }

  /* Remove a line item from the selected cart (Amazon-style delete). */
  function removeProduct(id: string) {
    setKits((prev) =>
      prev.map((k) => {
        if (k.type !== selected) return k;
        const products = k.products.filter((p) => p.id !== id);
        return { ...k, products, totalPrice: kitTotal(products) };
      }),
    );
  }

  /* "Buy all" — open each line item's store page. Affiliate links are
     per-product (no shared checkout), so we fire one tab per item from the
     single user click. Per-item Buy buttons remain the reliable fallback. */
  function buyAll() {
    if (typeof window === "undefined") return;
    for (const p of selectedKit.products) {
      window.open(buyUrl(p), "_blank", "noopener,noreferrer");
    }
  }

  /* Clear the post-swap highlight after it plays. */
  useEffect(() => {
    if (!flashId) return;
    const t = setTimeout(() => setFlashId(null), 1300);
    return () => clearTimeout(t);
  }, [flashId]);

  /* Persist swaps + added accessories so returning to the page keeps them. */
  useEffect(() => {
    saveKit({ ...data, kits });
  }, [kits, data]);

  return (
    <div className="flex flex-col">
      <div className="text-center">
        <p className="text-[0.65rem] font-medium uppercase tracking-[0.25em] text-accent">
          Your cart is ready
        </p>
        <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          Everything for your gym.
        </h1>
        <p className="mt-3 text-white/55">
          Start from an AI build, then swap, remove, or add anything — and buy
          it all in one place.
        </p>
      </div>

      {/* Tier selector — the cart's starting point (Value / Match / Quality) */}
      <div className="mt-10 flex flex-col items-center">
        <div className="inline-flex flex-wrap justify-center gap-1 rounded-2xl border border-white/12 bg-white/5 p-1">
          {kits.map((k) => {
            const meta = KIT_TIER_META[k.type];
            const on = k.type === selected;
            return (
              <button
                key={k.type}
                type="button"
                onClick={() => setSelected(k.type)}
                className={
                  "relative rounded-xl px-5 py-2.5 text-center transition-all duration-200 sm:px-7 " +
                  (on
                    ? "bg-accent text-white shadow-lg shadow-accent/25"
                    : "text-white/65 hover:bg-white/5 hover:text-white")
                }
              >
                <span className="flex items-center justify-center gap-1 font-body text-xs font-bold">
                  {k.type === "match" && <Sparkles className="h-3 w-3" />}
                  {meta.label}
                </span>
                <span className="mt-0.5 block font-display text-base font-extrabold tracking-tight">
                  {formatPrice(k.totalPrice)}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-white/40">
          Your starting point — edit anything in the cart below.
        </p>
      </div>

      {/* The cart */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedKit.type}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28, ease: EASE }}
          className="mt-8"
        >
          <Cart
            kit={selectedKit}
            flashId={flashId}
            onSwap={(product) => setSwap({ kitType: selectedKit.type, product })}
            onRemove={removeProduct}
            onInfo={setDetail}
            onBuyAll={buyAll}
          />
        </motion.div>
      </AnimatePresence>

      {accessories.length > 0 && (
        <FbtPanel
          accessories={accessories}
          kit={selectedKit}
          onAdd={addAccessories}
        />
      )}

      <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
        <button
          type="button"
          onClick={shareKit}
          className="flex items-center gap-2 rounded-xl bg-accent px-6 py-3 font-body font-bold text-white shadow-lg shadow-accent/30 transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent-hover"
        >
          {shared ? (
            <>
              <Check className="h-4 w-4" />
              Link copied
            </>
          ) : (
            <>
              <Share2 className="h-4 w-4" />
              Share my kit
            </>
          )}
        </button>
        <a
          href="/compare"
          className="rounded-xl border border-white/20 bg-white/5 px-6 py-3 font-body font-bold text-white/90 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/10 hover:text-white"
        >
          Compare products
        </a>
        <button
          type="button"
          onClick={onRetake}
          className="flex items-center gap-2 rounded-xl px-6 py-3 font-body font-bold text-white/60 transition-colors hover:text-white"
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

function Cart({
  kit,
  flashId,
  onSwap,
  onRemove,
  onInfo,
  onBuyAll,
}: {
  kit: Kit;
  flashId: string | null;
  onSwap: (product: KitProduct) => void;
  onRemove: (id: string) => void;
  onInfo: (product: KitProduct) => void;
  onBuyAll: () => void;
}) {
  const items = kit.products;
  const subtotal = kit.totalPrice;
  const listTotal = items.reduce((s, p) => s + p.price, 0);
  const savings = Math.round(listTotal - subtotal);
  /* Live: true once every line item is in the global cart. */
  const cartIds = new Set(useCart().map((p) => p.id));
  const allInCart = items.length > 0 && items.every((p) => cartIds.has(p.id));

  return (
    <div className="overflow-hidden rounded-2xl border border-white/12 bg-white/[0.04] backdrop-blur-sm">
      {/* Cart header — count + live subtotal */}
      <div className="border-b border-white/10 px-4 py-4 sm:px-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
              <ShoppingCart className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="font-display text-lg font-extrabold leading-tight text-white">
                Your cart
              </p>
              <p className="truncate text-xs text-white/45">
                {items.length} {items.length === 1 ? "item" : "items"} ·{" "}
                {kit.name}
              </p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[0.6rem] uppercase tracking-wide text-white/40">
              Subtotal
            </p>
            <p className="font-display text-2xl font-extrabold text-accent">
              {formatPrice(subtotal)}
            </p>
          </div>
        </div>
        {kit.description && (
          <p className="mt-2 text-xs leading-relaxed text-white/45">
            {kit.description}
          </p>
        )}
      </div>

      {/* Live deals in this cart — derived from curated sale prices
          (lib/deals.ts), recomputes on every swap/remove/add. */}
      <DealsStrip products={items} />

      {/* Line items */}
      {items.length === 0 ? (
        <div className="px-5 py-16 text-center">
          <p className="font-body text-sm font-bold text-white/70">
            Your cart is empty.
          </p>
          <p className="mt-1 text-sm text-white/40">
            Switch a build above, or retake the quiz to start fresh.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-white/8">
          {items.map((p) => (
            <CartRow
              key={p.id}
              product={p}
              flash={flashId === p.id}
              onSwap={() => onSwap(p)}
              onRemove={() => onRemove(p.id)}
              onInfo={() => onInfo(p)}
            />
          ))}
        </div>
      )}

      {/* Buy-all footer */}
      {items.length > 0 && (
        <div className="border-t border-white/10 bg-navy-deep/40 px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              {savings > 0 && (
                <p className="text-xs font-bold text-win">
                  You save {formatPrice(savings)} vs. list price
                </p>
              )}
              <p className="font-display text-xl font-extrabold text-white">
                {items.length} {items.length === 1 ? "item" : "items"} ·{" "}
                <span className="text-accent">{formatPrice(subtotal)}</span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Bridge into the site-wide cart (Phase 8) — keeps this
                  tier's picks reachable from any page via the nav badge. */}
              <button
                type="button"
                onClick={() => cartAdd(items)}
                disabled={allInCart}
                className={
                  "flex items-center gap-2 rounded-xl border px-5 py-3 font-body text-sm font-bold transition-all duration-300 " +
                  (allInCart
                    ? "cursor-default border-win/40 bg-win/10 text-win"
                    : "border-white/20 bg-white/5 text-white/90 hover:-translate-y-0.5 hover:border-accent/60 hover:text-accent")
                }
              >
                {allInCart ? (
                  <>
                    <Check className="h-4 w-4" />
                    In your cart
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Add kit to cart
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onBuyAll}
                className="flex items-center gap-2 rounded-xl bg-accent px-6 py-3 font-body text-sm font-bold text-white shadow-lg shadow-accent/30 transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-xl hover:shadow-accent/50"
              >
                <ShoppingCart className="h-4 w-4" />
                Buy all{items.length > 1 ? ` (${items.length})` : ""}
              </button>
            </div>
          </div>
          <p className="mt-2.5 text-[0.65rem] leading-snug text-white/35">
            &ldquo;Buy all&rdquo; opens each item&rsquo;s store page in a new tab
            — or buy pieces one at a time above. We may earn a commission, at no
            cost to you.
          </p>
        </div>
      )}
    </div>
  );
}

/* "We find you deals" — the strip only renders when the cart really holds
   sale-priced picks, with a templated pitch (Groq-written weekly copy is
   phase 1.5, countdown timers phase 2 — see CONTEXT.md Phase 7). */
function DealsStrip({ products }: { products: KitProduct[] }) {
  const deals = findDeals(products);
  if (!deals.length) return null;
  const save = dealsSavings(deals);
  return (
    <div className="flex items-start gap-2.5 border-b border-white/10 bg-win/[0.06] px-4 py-3 sm:px-5">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-win/15 text-win">
        <BadgePercent className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-bold text-win">
          {deals.length === 1
            ? "One of your picks is on sale"
            : `${deals.length} of your picks are on sale`}{" "}
          · you save {formatPrice(save)}
        </p>
        <p className="mt-0.5 text-[0.72rem] leading-snug text-white/50">
          {dealsPitch(deals)}
        </p>
      </div>
    </div>
  );
}

function CartRow({
  product: p,
  flash,
  onSwap,
  onRemove,
  onInfo,
}: {
  product: KitProduct;
  flash: boolean;
  onSwap: () => void;
  onRemove: () => void;
  onInfo: () => void;
}) {
  const [imgOk, setImgOk] = useState(true);
  const price = priceOf(p);
  const deal = productDeal(p);

  return (
    <motion.div
      animate={{
        backgroundColor: flash ? "rgba(232,84,42,0.12)" : "rgba(0,0,0,0)",
      }}
      transition={{ duration: 0.45, ease: EASE }}
      className="flex items-start gap-3 px-4 py-3.5 sm:px-5"
    >
      {/* Thumb + info opens the product detail panel */}
      <button
        type="button"
        onClick={onInfo}
        aria-label={`Details for ${p.name}`}
        className="group flex min-w-0 flex-1 items-start gap-3 rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
      >
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
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
          <p className="flex items-center gap-1 font-body text-sm font-bold text-white">
            <span className="truncate">{p.name}</span>
            <Info className="h-3 w-3 shrink-0 text-white/30 transition-colors group-hover:text-accent" />
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[0.7rem] text-white/45">
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
            <span className="text-white/50">{categoryLabel(p.category)}</span>
          </div>
          {/* Plain-English reason this pick is good */}
          {p.expertVerdict && (
            <p className="mt-1 line-clamp-2 text-[0.72rem] leading-snug text-white/45">
              {p.expertVerdict}
            </p>
          )}
        </div>
      </button>

      {/* Price + actions */}
      <div className="flex shrink-0 flex-col items-end gap-2">
        <div className="text-right leading-tight">
          <span className="block font-display text-base font-extrabold text-white">
            {formatPrice(price)}
          </span>
          {deal && (
            <span className="flex items-center justify-end gap-1 text-[0.65rem]">
              <span className="text-white/30 line-through">
                {formatPrice(p.price)}
              </span>
              <span className="rounded bg-win/15 px-1 py-px font-bold text-win">
                {deal.pct}% off
              </span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onSwap}
            aria-label={`Swap ${p.name}`}
            title="Swap this product"
            className="flex h-8 items-center gap-1 rounded-lg border border-white/10 px-2 text-[0.7rem] font-bold text-white/55 transition-all duration-200 hover:border-accent/50 hover:bg-accent/10 hover:text-accent"
          >
            <Repeat2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Swap</span>
          </button>
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${p.name}`}
            title="Remove from cart"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/45 transition-all duration-200 hover:border-red-400/50 hover:bg-red-500/10 hover:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <a
            href={buyUrl(p)}
            target="_blank"
            rel="noopener noreferrer sponsored"
            onClick={(e) => e.stopPropagation()}
            className="flex h-8 items-center gap-1 rounded-lg bg-accent px-3 text-xs font-bold text-white transition-colors hover:bg-accent-hover"
          >
            Buy
            <ArrowUpRight className="h-3 w-3" />
          </a>
        </div>
      </div>
    </motion.div>
  );
}

/* --- Frequently bought together ----------------------------------------- */

function FbtPanel({
  accessories,
  kit,
  onAdd,
}: {
  accessories: KitProduct[];
  kit: Kit;
  onAdd: (accs: KitProduct[]) => void;
}) {
  const inKit = new Set(kit.products.map((p) => p.id));

  return (
    <section className="mt-16">
      <p className="flex items-center gap-2 text-[0.65rem] font-medium uppercase tracking-[0.25em] text-accent">
        <PackagePlus className="h-3.5 w-3.5" />
        Frequently bought together
      </p>
      <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-white">
        Complete your setup
      </h2>
      <p className="mt-1 text-sm text-white/50">
        Hand-picked for your {KIT_TIER_META[kit.type].label}. Here&rsquo;s why
        each one earns its place — add the ones you want.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {accessories.map((a) => (
          <AccessoryCard
            key={a.id}
            product={a}
            inKit={inKit.has(a.id)}
            onAdd={() => onAdd([a])}
          />
        ))}
      </div>
    </section>
  );
}

function AccessoryCard({
  product: a,
  inKit,
  onAdd,
}: {
  product: KitProduct;
  inKit: boolean;
  onAdd: () => void;
}) {
  const [imgOk, setImgOk] = useState(true);
  const price = priceOf(a);

  return (
    <div
      className={
        "flex flex-col rounded-2xl border bg-white/[0.04] p-4 backdrop-blur-sm transition-colors duration-300 " +
        (inKit ? "border-win/40" : "border-white/12 hover:border-accent/40")
      }
    >
      <div className="flex flex-1 flex-col">
        <div className="flex items-start gap-3">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white">
            {imgOk && a.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={a.image}
                alt={a.name}
                loading="lazy"
                onError={() => setImgOk(false)}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="font-display text-xl font-bold text-navy">
                {a.brand.charAt(0)}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-body text-sm font-bold text-white">{a.name}</p>
            <p className="text-[0.7rem] text-white/45">{a.brand}</p>
            <div className="mt-1 flex items-center gap-1.5 text-[0.7rem] text-white/55">
              <Star className="h-2.5 w-2.5 fill-accent text-accent" />
              {a.rating}
              <span className="text-white/20">·</span>
              <span className="font-bold text-white/80">
                {formatPrice(price)}
              </span>
              {a.salePrice && (
                <span className="text-white/30 line-through">
                  {formatPrice(a.price)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* The AI "why people add it" reason, grounded in the kit. */}
        {a.whyAdd && (
          <p className="mt-3 text-[0.78rem] leading-relaxed text-white/65">
            <span className="font-bold text-accent">Why add it:</span>{" "}
            {a.whyAdd}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onAdd}
        disabled={inKit}
        className={
          "mt-4 flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-bold transition-colors " +
          (inKit
            ? "cursor-default bg-win/15 text-win"
            : "bg-accent text-white hover:bg-accent-hover")
        }
      >
        {inKit ? (
          <>
            <Check className="h-3.5 w-3.5" />
            In your cart
          </>
        ) : (
          <>
            <Plus className="h-3.5 w-3.5" />
            Add to cart
          </>
        )}
      </button>
    </div>
  );
}
