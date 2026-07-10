"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Star, ArrowUpRight } from "lucide-react";
import { DumbbellMark } from "@/components/ui/dumbbell-mark";
import { requestCategories, requestAlternatives } from "@/lib/api";
import { buyUrl, formatPrice, type Category, type KitProduct } from "@/lib/kit";
import ProductModal from "@/components/quiz/ProductModal";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { Skeleton } from "@/components/ui/skeleton";

const priceOf = (p: KitProduct) => p.salePrice ?? p.price;

/* The separate "finder" for accessories & supplements shoppers — a lighter,
   browse-and-buy flow scoped to the non-equipment groups (the equipment quiz
   stays the hero). Reuses the categories/products API + ProductModal. */
const GROUPS = [
  { key: "gear", label: "Lifting Gear" },
  { key: "accessories", label: "Accessories" },
  { key: "supplements", label: "Supplements" },
  { key: "clothing", label: "Apparel" },
] as const;

export default function GearFinder() {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [group, setGroup] = useState<string>("gear");
  const [cat, setCat] = useState<string>("");
  const [products, setProducts] = useState<KitProduct[] | null>(null);
  const [detail, setDetail] = useState<KitProduct | null>(null);

  useEffect(() => {
    let live = true;
    requestCategories()
      .then((cs) => {
        if (!live) return;
        setCategories(cs);
        const first = cs.find((c) => c.group === "gear");
        if (first) setCat(first.key);
      })
      .catch(() => live && setCategories([]));
    return () => {
      live = false;
    };
  }, []);

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

  function chooseCat(key: string) {
    if (key === cat) return;
    setProducts(null);
    setCat(key);
  }

  const inGroup = useMemo(
    () => (categories ?? []).filter((c) => c.group === group),
    [categories, group],
  );

  if (!categories) {
    return (
      <div className="flex items-center justify-center gap-2 py-32 text-ink-3">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading the finder…
      </div>
    );
  }

  return (
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
                ? "bg-accent text-white shadow-[0_0_16px_rgba(232,84,42,0.35)]"
                : "bg-card text-ink-2 ring-1 ring-line hover:text-ink")
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
                : "text-ink-2 hover:bg-card hover:text-ink")
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
        ) : products.length === 0 ? (
          <p className="py-20 text-center text-ink-3">Nothing here yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <FinderCard
                key={p.id}
                product={p}
                onDetail={() => setDetail(p)}
              />
            ))}
          </div>
        )}
      </div>

      {detail && (
        <ProductModal product={detail} onClose={() => setDetail(null)} />
      )}
    </>
  );
}

function FinderCard({
  product: p,
  onDetail,
}: {
  product: KitProduct;
  onDetail: () => void;
}) {
  return (
    <SpotlightCard className="flex flex-col overflow-hidden rounded-2xl border border-line bg-card transition-all duration-300 hover:-translate-y-1.5 hover:border-accent/60 hover:shadow-2xl hover:shadow-accent/15">
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
          <span className="gg-dumbbell absolute left-1/2 top-2.5 z-[3] -translate-x-1/2">
            <DumbbellMark />
            {p.awards[0]}
          </span>
        ) : null}
        {p.discount ? (
          <span className="gg-tag gg-tag--deal absolute right-2 top-2 z-[2]">
            {p.discount}% off
          </span>
        ) : null}
        {typeof p.gymgearScore === "number" && (
          <span className="gg-tag gg-tag--score absolute bottom-2 left-2 z-[2]">
            <span className="gg-tag__num">{p.gymgearScore}</span>
            <span className="gg-tag__lbl">GymGear</span>
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
        <a
          href={buyUrl(p)}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="mt-3 flex items-center justify-center gap-1 rounded-lg bg-accent py-2 text-xs font-bold text-white transition-colors hover:bg-accent-hover"
        >
          Buy {formatPrice(priceOf(p))}
          <ArrowUpRight className="h-3 w-3" />
        </a>
      </div>
    </SpotlightCard>
  );
}

function SkeletonCard() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-line bg-card">
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
