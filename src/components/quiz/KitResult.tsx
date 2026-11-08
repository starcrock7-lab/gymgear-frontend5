"use client";

import { useEffect, useMemo, useState } from "react";
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
  Trash2,
  ArrowUpRight,
  BadgePercent,
  SlidersHorizontal,
} from "lucide-react";
import {
  findDeals,
  dealsSavings,
  dealsPitch,
  productDeal,
  endsInLabel,
} from "@/lib/deals";
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
import { muscleCoverage } from "@/lib/coverage";
import SwapModal from "@/components/quiz/SwapModal";
import ProductModal from "@/components/quiz/ProductModal";
import PriceCheck from "@/components/quiz/PriceCheck";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowRight, Loader2 } from "lucide-react";
import { toFloorItems, saveFloorItems, saveFloorOrigin, type FloorItem } from "@/lib/floor-plan";
import { autoPlace, emptyGrid } from "@/lib/auto-layout";
import { OWNED_NONE, optionLabel, questionFor, type QuizAnswers } from "@/lib/quiz";

/* three.js only loads once a kit is on screen. */
const Planner3D = dynamic(() => import("@/components/planner/Planner3D"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] w-full items-center justify-center rounded-2xl border border-line bg-navy sm:h-[520px]">
      <Loader2 className="h-8 w-8 animate-spin text-accent" />
    </div>
  ),
});

/* A room the size of the answer to "how much space", in feet, so the kit is
   shown at true scale in a space like the buyer's own. */
const ROOM_FOR_SPACE: Record<string, { w: number; d: number }> = {
  "apartment-corner": { w: 8, d: 8 },
  "small-room": { w: 10, d: 11 },
  garage: { w: 14, d: 12 },
  outdoor: { w: 12, d: 12 },
};

const EASE = [0.16, 1, 0.3, 1] as const;
const priceOf = (p: KitProduct) => p.salePrice ?? p.price;

/* The top of the answered budget. "$2,000+" has no top to measure against. */
const BUDGET_TOP: Record<string, number> = {
  "under-300": 300,
  "300-800": 800,
  "800-2000": 2000,
};

type SwapTarget = { kitType: Kit["type"]; product: KitProduct };

/* One recommended plan, with the other tiers a tap away: what to buy now, then
   whether it fits, then what to add later. Any product can be swapped. */
export default function KitResult({
  data,
  answers,
  edit,
  startEditsOpen,
  onEdit,
  onRetake,
}: {
  data: KitResponse;
  answers: QuizAnswers;
  edit: "idle" | "saving" | "failed";
  startEditsOpen: boolean;
  onEdit: (patch: Partial<QuizAnswers>) => void;
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
  /* Buy links tapped this visit, so the phone bar can move on to the next. */
  const [opened, setOpened] = useState<string[]>([]);
  const selectedKit = kits.find((k) => k.type === selected) ?? kits[0];
  /* A small budget can leave two tiers with the same gear. Show it once, under
     Best Match when that is one of them. */
  const gearOf = (k: Kit) => k.products.map((p) => p.id).join();
  const tiers = kits.filter((k, i) => !kits.some((o, j) =>
    j !== i && gearOf(o) === gearOf(k) && (o.type === "match" || (k.type !== "match" && j < i))));
  const budgetTop = BUDGET_TOP[answers.budget ?? ""];
  const nextToBuy = selectedKit.products.find((p) => !opened.includes(p.id));
  const markOpened = (id: string) =>
    setOpened((prev) => (prev.includes(id) ? prev : [...prev, id]));

  /* Share the selected kit — native share sheet where available, otherwise
     copy a link to the clipboard. */
  async function shareKit() {
    const k = selectedKit;
    const text = `My home gym plan: ${k.products.length} pieces, ${formatPrice(k.totalPrice)}. Build yours free:`;
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

  /* Clear the post-swap highlight after it plays. */
  useEffect(() => {
    if (!flashId) return;
    const t = setTimeout(() => setFlashId(null), 1300);
    return () => clearTimeout(t);
  }, [flashId]);

  /* Persist swaps and removals so returning to the page keeps them. */
  useEffect(() => {
    saveKit({ ...data, kits });
  }, [kits, data]);

  /* Selected kit as a placeable list — handed off to the full-screen
     /planner (kept in sync live, same as the For Gyms plan). */
  const floorItems = useMemo<FloorItem[]>(
    () => toFloorItems(selectedKit?.products ?? []),
    [selectedKit],
  );

  useEffect(() => {
    if (!floorItems.length) return;
    saveFloorItems(floorItems);
    saveFloorOrigin("/quiz");
  }, [floorItems]);

  return (
    <div className="flex flex-col pb-20 lg:pb-0">
      <div className="text-center">
        <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          Your home gym plan
        </h1>
        <p className="mt-3 text-lg font-bold text-white">
          {formatPrice(selectedKit.totalPrice)}
          {budgetTop && (
            <span className="font-normal text-white/60"> of your {formatPrice(budgetTop)} budget</span>
          )}
        </p>
      </div>

      <PriceCheck products={selectedKit.products} stats={data.priceClasses} />
      <QuickEdits answers={answers} edit={edit} onEdit={onEdit} startOpen={startEditsOpen} />

      {/* Tier selector — the kit's starting point (Value / Match / Quality) */}
      <div className="mt-6 flex flex-col items-center">
        <div className="inline-flex max-w-full justify-center gap-1 rounded-2xl border border-white/12 bg-white/5 p-1">
          {tiers.map((k) => {
            const meta = KIT_TIER_META[k.type];
            const on = k.type === selected;
            return (
              <button
                key={k.type}
                type="button"
                onClick={() => setSelected(k.type)}
                className={
                  "relative min-w-0 rounded-xl px-3 py-2.5 text-center transition-all duration-200 sm:px-7 " +
                  (on
                    ? "bg-accent text-white shadow-[0_0_26px_rgba(232,84,42,0.55)]"
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
      </div>

      {/* The fit check and 3D view beside the cart: they stay put on desktop
          while the cart scrolls; on phones they follow the cart, so what to buy
          comes first and the 3D view can't trap the scroll on the way there. */}
      <div className="mt-8 grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="order-2 min-w-0 lg:sticky lg:top-24 lg:order-1">
          <KitStage products={selectedKit.products} answers={answers} />
          {floorItems.length > 0 && (
            <Link
              href="/planner"
              className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-white/60 transition-colors hover:text-accent"
            >
              Place it in your own room
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
        {/* The cart */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedKit.type}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: EASE }}
            className="order-1 min-w-0 lg:order-2"
          >
            <KitCard
              kit={selectedKit}
              flashId={flashId}
              opened={opened}
              onBuy={markOpened}
              onSwap={(product) => setSwap({ kitType: selectedKit.type, product })}
              onRemove={removeProduct}
              onInfo={setDetail}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      <AddLater kit={selectedKit} next={data.nextStage ?? []} onInfo={setDetail} />

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

      {/* Phone bar: the running total and the next piece to buy. */}
      {selectedKit.products.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-white/12 bg-navy px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 lg:hidden">
          <div className="min-w-0">
            <p className="font-display text-lg font-extrabold leading-tight text-white">
              {formatPrice(selectedKit.totalPrice)}
            </p>
            <p className="truncate text-xs text-white/60">
              {nextToBuy ? `Next: ${nextToBuy.name}` : "All pieces opened"}
            </p>
          </div>
          {nextToBuy && (
            <a
              href={buyUrl(nextToBuy)}
              target="_blank"
              rel="noopener noreferrer sponsored"
              onClick={() => markOpened(nextToBuy.id)}
              className="flex h-11 shrink-0 items-center gap-1 rounded-lg bg-accent px-4 text-sm font-bold text-white"
            >
              Buy
              <ArrowUpRight className="h-4 w-4" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

/* Experience and owned gear, changed here instead of on two more quiz screens.
   Each tap rebuilds the plan. */
function QuickEdits({
  answers,
  edit,
  startOpen,
  onEdit,
}: {
  answers: QuizAnswers;
  edit: "idle" | "saving" | "failed";
  /* A rebuild remounts the result; stay open so several edits take one open. */
  startOpen: boolean;
  onEdit: (patch: Partial<QuizAnswers>) => void;
}) {
  const experience = answers.experience ?? "beginner";
  const owned = answers.owned.filter((id) => id !== OWNED_NONE);
  const summary = [
    optionLabel("experience", experience),
    owned.length ? `Own: ${owned.map((id) => optionLabel("owned", id)).join(", ")}` : "No gear yet",
  ].join(" · ");
  const chip = (on: boolean) =>
    "min-h-11 rounded-lg border px-3 text-sm font-bold transition-colors " +
    (on
      ? "border-accent bg-accent/15 text-white"
      : "border-white/12 bg-white/5 text-white/70 hover:border-accent/50 hover:text-white");

  return (
    <details open={startOpen} className="mx-auto mt-6 w-full max-w-xl rounded-xl border border-white/12 bg-navy-deep/60">
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 px-4 py-2.5 text-sm text-white/70">
        <SlidersHorizontal className="h-4 w-4 shrink-0 text-accent" />
        <span className="min-w-0 flex-1 truncate">{summary}</span>
        <span className="shrink-0 font-bold text-white">Edit</span>
      </summary>
      <div className="space-y-4 border-t border-white/10 px-4 py-4">
        <div>
          <p className="text-sm font-bold text-white">{questionFor("experience").title}</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {questionFor("experience").options.map((o) => (
              <button
                key={o.id}
                type="button"
                aria-pressed={experience === o.id}
                onClick={() => onEdit({ experience: o.id })}
                className={chip(experience === o.id)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-bold text-white">{questionFor("owned").title}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {questionFor("owned").options.filter((o) => o.id !== OWNED_NONE).map((o) => {
              const on = owned.includes(o.id);
              return (
                <button
                  key={o.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    onEdit({ owned: on ? owned.filter((id) => id !== o.id) : [...owned, o.id] })
                  }
                  className={chip(on)}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>
        <p role="status" className="text-xs text-white/60">
          {edit === "saving" && "Updating your plan…"}
          {edit === "failed" && "We couldn't update your plan. Tap an option to try again."}
        </p>
      </div>
    </details>
  );
}

/* The selected kit, auto-placed in a room the size of the buyer's space and
   shown with the planner's real-size 3D models. Rebuilds on every swap. The fit
   check above it only states what was measured or filtered for. */
function KitStage({ products, answers }: { products: KitProduct[]; answers: QuizAnswers }) {
  const room = ROOM_FOR_SPACE[answers.space ?? ""] ?? { w: 12, d: 12 };
  const { placed, unplacedCount } = useMemo(() => {
    const items = toFloorItems(products);
    if (!items.length) return { placed: [], unplacedCount: 0 };
    const wIn = room.w * 12, dIn = room.d * 12;
    return autoPlace(items, wIn, dIn, emptyGrid(wIn, dIn));
  }, [products, room.w, room.d]);
  if (!placed.length) return null;
  const spaceName = optionLabel("space", answers.space ?? "").toLowerCase();
  return (
    <>
      <h2 className="font-display text-lg font-extrabold text-white">Will it fit?</h2>
      <ul className="mb-3 mt-2 space-y-1.5 text-sm text-white/75">
        <li className="flex gap-2">
          <Check className={"mt-0.5 h-4 w-4 shrink-0 " + (unplacedCount ? "text-white/30" : "text-win")} />
          {unplacedCount
            ? `${unplacedCount} ${unplacedCount === 1 ? "piece doesn't" : "pieces don't"} fit at once in our ${room.w} × ${room.d} ft ${spaceName} layout. Plan on storing or folding gear.`
            : `Fits our ${room.w} × ${room.d} ft ${spaceName} layout, using approximate footprints.`}
        </li>
        {answers.ceiling && (answers.ceiling === "under-8ft" || products.some((p) => p.category === "racks" || p.category === "machines")) && (
          <li className="flex gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-win" />
            {answers.ceiling === "under-8ft"
              ? "We left out tall racks and machines for your low ceiling. Check each height at the store."
              : "Racks often stand 86–91 in. Check each height against your ceiling at the store."}
          </li>
        )}
      </ul>
      <Planner3D placed={placed} roomW={room.w} roomD={room.d} grid={null} walls={false} />
    </>
  );
}

/* The next stage: what the plan one budget up has that this kit doesn't, and
   what those pieces let the buyer train that they can't yet. Measured from the
   products, so swaps and removals above change it. */
function AddLater({
  kit,
  next,
  onInfo,
}: {
  kit: Kit;
  next: KitProduct[];
  onInfo: (p: KitProduct) => void;
}) {
  const have = new Set(kit.products.map((p) => p.category));
  const add = next.filter((p) => !have.has(p.category));
  const owned = kit.ownedCats ?? [];
  if (!add.length) return null;
  const before = muscleCoverage(kit.products, owned);
  const unlocked = muscleCoverage([...kit.products, ...add], owned)
    .filter((g) => g.level > (before.find((b) => b.key === g.key)?.level ?? 0))
    .map((g) => g.label);

  return (
    <section className="mt-12">
      <h2 className="font-display text-2xl font-extrabold tracking-tight text-white">Add later</h2>
      <p className="mt-1 text-sm text-white/65">
        {`About ${formatPrice(Math.round(kitTotal(add)))} more at today’s prices.${
          unlocked.length > 0 ? ` Trains more: ${unlocked.join(", ").toLowerCase()}.` : ""
        }`}
      </p>
      <ul className="mt-4 divide-y divide-white/8 rounded-xl border border-white/12 bg-navy-deep/60">
        {add.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => onInfo(p)}
              className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-2.5 text-left"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-white">{p.name}</span>
                <span className="block text-xs text-white/55">{categoryLabel(p.category)}</span>
              </span>
              <span className="shrink-0 font-display font-extrabold text-white">{formatPrice(priceOf(p))}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* What this kit can actually train, live. Recomputed from the products on
   screen rather than read off the API response, because the kit is editable:
   pull the bench out and "Chest" has to stop claiming to be covered in the
   same frame. The claim is only worth showing if it tracks the truth. */
function CoveragePanel({ products, ownedCats }: { products: KitProduct[]; ownedCats: string[] }) {
  const groups = useMemo(() => muscleCoverage(products, ownedCats), [products, ownedCats]);
  const full = groups.filter((g) => g.level === 2).length;
  const missing = groups.filter((g) => g.level === 0);

  return (
    <div className="border-b border-white/10 px-4 py-3.5 sm:px-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-body text-xs font-bold text-white/70">
          What you can train
          {ownedCats.length > 0 && (
            <span className="ml-1.5 font-normal text-white/35">
              incl. gear you own
            </span>
          )}
        </p>
        <p className="text-[0.65rem] font-bold uppercase tracking-wide">
          {missing.length === 0 ? (
            <span className="text-win">All {groups.length} groups</span>
          ) : (
            <span className="text-white/45">
              {groups.length - missing.length}/{groups.length} groups
            </span>
          )}
        </p>
      </div>
      <ul className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 sm:grid-cols-4">
        {groups.map((g) => (
          <li
            key={g.key}
            /* `via` names the movements behind the tick, so a green chip is a
               claim the user can check rather than one they have to trust. */
            title={g.via.length ? `${g.label}: ${g.via.join(", ")}` : `${g.label}: nothing in this kit trains it`}
            className="flex items-center gap-1.5"
          >
            <span
              aria-hidden
              className={
                g.level === 2
                  ? "h-1.5 w-1.5 shrink-0 rounded-full bg-win"
                  : g.level === 1
                    ? "h-1.5 w-1.5 shrink-0 rounded-full bg-white/40"
                    : "h-1.5 w-1.5 shrink-0 rounded-full border border-white/25"
              }
            />
            <span
              className={
                g.level === 0
                  ? "truncate text-[0.7rem] text-white/25"
                  : "truncate text-[0.7rem] text-white/70"
              }
            >
              {g.label}
            </span>
          </li>
        ))}
      </ul>
      {full < groups.length && (
        <p className="mt-2 text-[0.65rem] leading-snug text-white/35">
          {missing.length > 0
            ? `No gear here trains ${missing.map((g) => g.label.toLowerCase()).join(" or ")}.`
            : "Solid dots are fully trainable; faded ones only at light resistance."}
        </p>
      )}
    </div>
  );
}

function KitCard({
  kit,
  flashId,
  opened,
  onBuy,
  onSwap,
  onRemove,
  onInfo,
}: {
  kit: Kit;
  flashId: string | null;
  opened: string[];
  onBuy: (id: string) => void;
  onSwap: (product: KitProduct) => void;
  onRemove: (id: string) => void;
  onInfo: (product: KitProduct) => void;
}) {
  const items = kit.products;
  const subtotal = kit.totalPrice;
  const listTotal = items.reduce((s, p) => s + p.price, 0);
  const savings = Math.round(listTotal - subtotal);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/12 bg-white/[0.04] backdrop-blur-sm">
      {/* Kit header — count + live subtotal */}
      <div className="border-b border-white/10 px-4 py-4 sm:px-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
              <PackagePlus className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="font-display text-lg font-extrabold leading-tight text-white">
                Buy now
              </h2>
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
      </div>

      {/* Muscle coverage — the answer to "is this actually a gym?", measured
          from the products on screen. Above the deals strip on purpose: what
          the kit can train matters more than what it saved. */}
      {items.length > 0 && (
        <CoveragePanel products={items} ownedCats={kit.ownedCats ?? []} />
      )}

      {/* Live deals in this cart — derived from curated sale prices
          (lib/deals.ts), recomputes on every swap/remove/add. */}
      <DealsStrip products={items} />

      {/* Line items */}
      {items.length === 0 ? (
        <div className="px-5 py-16 text-center">
          <p className="font-body text-sm font-bold text-white/70">
            Your kit is empty.
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
              opened={opened.includes(p.id)}
              onBuy={() => onBuy(p.id)}
              onSwap={() => onSwap(p)}
              onRemove={() => onRemove(p.id)}
              onInfo={() => onInfo(p)}
            />
          ))}
        </div>
      )}

      {/* Kit total — buy each piece from its own button in the rows above. */}
      {items.length > 0 && (
        <div className="border-t border-white/10 bg-navy-deep/40 px-4 py-4 sm:px-5">
          {savings > 0 && (
            <p className="text-xs font-bold text-win">
              You save {formatPrice(savings)} vs. list price
            </p>
          )}
          <p className="mt-1 text-xs leading-snug text-white/60">
            Totals leave out shipping and tax, which can be large on heavy gear.
            Each Buy link opens the store, where you can see delivery and
            returns.
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
  /* Real countdown only — needs a curated end date within 72h (deals v2). */
  const ends = endsInLabel(deals[0]);
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
          {ends && (
            <span className="ml-1.5 rounded bg-win/15 px-1.5 py-px">
              {ends}
            </span>
          )}
        </p>
        {/* one line keeps the cart calm; the full pitch is on hover */}
        <p title={dealsPitch(deals)} className="mt-0.5 line-clamp-1 text-[0.72rem] leading-snug text-white/50">
          {dealsPitch(deals)}
        </p>
      </div>
    </div>
  );
}

function CartRow({
  product: p,
  flash,
  opened,
  onBuy,
  onSwap,
  onRemove,
  onInfo,
}: {
  product: KitProduct;
  flash: boolean;
  opened: boolean;
  onBuy: () => void;
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
            {p.rating != null && (
              <>
                <span className="flex items-center gap-0.5">
                  <Star className="h-2.5 w-2.5 fill-accent text-accent" />
                  {p.rating}
                  {p.reviewCount != null && ` (${p.reviewCount.toLocaleString("en-US")})`}
                </span>
                <span className="text-white/20">·</span>
              </>
            )}
            {p.bestChoice && (
              <>
                <span className="flex items-center gap-0.5 text-win">
                  <Check className="h-2.5 w-2.5" />
                  Top
                </span>
                <span className="text-white/20">·</span>
              </>
            )}
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
            title="Remove from kit"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/45 transition-all duration-200 hover:border-red-400/50 hover:bg-red-500/10 hover:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <a
            href={buyUrl(p)}
            target="_blank"
            rel="noopener noreferrer sponsored"
            onClick={(e) => {
              e.stopPropagation();
              onBuy();
            }}
            className="flex h-8 items-center gap-1 rounded-lg bg-accent px-3 text-xs font-bold text-white transition-colors hover:bg-accent-hover"
          >
            {opened && <Check className="h-3 w-3" />}
            Buy
            <ArrowUpRight className="h-3 w-3" />
          </a>
        </div>
      </div>
    </motion.div>
  );
}
