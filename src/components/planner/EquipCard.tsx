"use client";

/* Product info card for the floor planner (2D + 3D). Opens when a placed
   piece is clicked: image, brand, price, GymGear Score and a buy link, in
   the same dark-glass + ember-glow language as the home page's FlowCards.
   Product data comes from the cached catalog route by category, found by id
   — no new endpoints, and the fetch only happens when a card opens. */

import { useEffect, useState } from "react";
import { ExternalLink, Loader2, X } from "lucide-react";
import { requestAlternatives } from "@/lib/api";
import { buyUrl, formatPrice, type KitProduct } from "@/lib/kit";
import type { PlacedItem } from "@/lib/floor-plan";
import { familyColor } from "@/components/planner/equipment-icon";

const cache = new Map<string, KitProduct[]>();

const ft = (inches: number) => Math.round((inches / 12) * 10) / 10;

export default function EquipCard({ item, onClose }: { item: PlacedItem; onClose: () => void }) {
  const [product, setProduct] = useState<KitProduct | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setProduct(null);
    (async () => {
      try {
        const list =
          cache.get(item.category) ?? (await requestAlternatives(item.category));
        cache.set(item.category, list);
        if (live) setProduct(list.find((p) => p.id === item.id) ?? null);
      } catch {
        /* card still shows name + dims */
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [item.id, item.category]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const fc = familyColor(item.category);
  const price = product ? (product.salePrice ?? product.price) : null;

  return (
    <div
      className="gg-pop-in absolute right-3 top-3 z-30 w-64 overflow-hidden rounded-2xl border border-white/12 bg-navy/95 shadow-2xl"
      style={{ boxShadow: `0 8px 40px rgba(0,0,0,0.5), 0 0 24px ${fc}33` }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Faint grid texture — same depth trick as the home cards */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#ffffff09_1px,transparent_1px),linear-gradient(to_bottom,#ffffff09_1px,transparent_1px)] bg-[size:28px_28px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_30%,#000_60%,transparent_100%)]"
      />
      <button
        onClick={onClose}
        className="absolute right-2 top-2 z-10 rounded-full border border-white/10 bg-navy/80 p-1 text-white/70 transition-colors hover:text-white"
        aria-label="Close"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      {product?.image ? (
        <div className="relative h-32 w-full bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={product.image} alt={product.name} className="h-full w-full object-contain p-2" />
        </div>
      ) : null}

      <div className="relative p-4">
        <p className="text-[0.6rem] font-bold uppercase tracking-wider" style={{ color: fc }}>
          {product?.brand ?? item.category}
        </p>
        <h3 className="mt-0.5 font-display text-sm font-extrabold leading-snug text-white">
          {item.name}
        </h3>
        <p className="mt-1 text-xs text-white/50">
          {ft(item.w)} × {ft(item.d)} ft footprint
        </p>

        {loading ? (
          <div className="mt-3 flex items-center gap-2 text-xs text-white/50">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
          </div>
        ) : product ? (
          <>
            <div className="mt-2.5 flex items-center gap-2.5">
              <span className="font-display text-lg font-extrabold text-white">
                {price != null ? formatPrice(price) : ""}
              </span>
              {product.salePrice ? (
                <span className="text-xs text-white/40 line-through">
                  {formatPrice(product.price)}
                </span>
              ) : null}
              {product.gymgearScore ? (
                <span className="ml-auto rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[0.65rem] font-bold text-accent">
                  {product.gymgearScore} score
                </span>
              ) : null}
            </div>
            <a
              href={buyUrl(product)}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-accent px-3 py-2 text-xs font-bold text-white shadow-md shadow-accent/25 transition-colors hover:bg-accent-hover"
            >
              View product <ExternalLink className="h-3 w-3" />
            </a>
          </>
        ) : (
          <p className="mt-3 text-xs text-white/45">Product details unavailable.</p>
        )}
      </div>
    </div>
  );
}
