"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowUpRight,
  BadgePercent,
  ShoppingCart,
  Star,
  Trash2,
} from "lucide-react";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import { useCart, cartRemove, cartClear } from "@/lib/cart";
import { checkoutGroups } from "@/lib/checkout";
import { buyUrl, formatPrice, categoryLabel, type KitProduct } from "@/lib/kit";
import { findDeals, dealsSavings, dealsPitch } from "@/lib/deals";

/* The global cart (Phase 8): everything added from gear pages, compare, or a
   quiz kit, persisted in localStorage. Checkout is grouped — one Amazon
   add-to-cart link covers every item with a known ASIN in a single tab; the
   rest group per retailer. */
export default function CartPage() {
  const items = useCart();
  const subtotal = items.reduce((s, p) => s + (p.salePrice ?? p.price), 0);
  const deals = findDeals(items);

  return (
    <>
      <SiteNav />
      <main className="min-h-[70vh] bg-navy text-white">
        <div className="mx-auto w-full max-w-3xl px-5 py-12">
      <p className="text-[0.65rem] font-medium uppercase tracking-[0.25em] text-accent">
        Your cart
      </p>
      <div className="mt-2 flex items-end justify-between gap-4">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-white">
          {items.length ? `${items.length} ${items.length === 1 ? "item" : "items"}` : "Nothing here yet"}
        </h1>
        {items.length > 0 && (
          <button
            type="button"
            onClick={cartClear}
            className="text-xs font-bold text-white/40 transition-colors hover:text-red-400"
          >
            Clear cart
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-white/12 bg-white/[0.04] px-6 py-16 text-center">
          <p className="font-body text-sm font-bold text-white/70">
            Add gear from any product page, the compare tool, or build a kit.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/quiz"
              className="rounded-xl bg-accent px-6 py-3 font-body text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-accent-hover"
            >
              Build my kit
            </Link>
            <Link
              href="/gear"
              className="rounded-xl border border-white/20 px-6 py-3 font-body text-sm font-bold text-white/90 transition-all hover:border-white/40"
            >
              Browse gear
            </Link>
          </div>
        </div>
      ) : (
        <>
          {deals.length > 0 && (
            <div className="mt-6 flex items-start gap-2.5 rounded-2xl border border-win/20 bg-win/[0.06] px-4 py-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-win/15 text-win">
                <BadgePercent className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-win">
                  {deals.length === 1
                    ? "One of your items is on sale"
                    : `${deals.length} of your items are on sale`}{" "}
                  · you save {formatPrice(dealsSavings(deals))}
                </p>
                <p className="mt-0.5 text-[0.72rem] leading-snug text-white/50">
                  {dealsPitch(deals)}
                </p>
              </div>
            </div>
          )}

          <div className="mt-6 divide-y divide-white/8 overflow-hidden rounded-2xl border border-white/12 bg-white/[0.04]">
            {items.map((p) => (
              <CartLine key={p.id} product={p} />
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-white/12 bg-white/[0.04] p-5">
            <div className="flex items-center justify-between">
              <p className="text-[0.6rem] uppercase tracking-wide text-white/40">
                Subtotal
              </p>
              <p className="font-display text-2xl font-extrabold text-accent">
                {formatPrice(subtotal)}
              </p>
            </div>

            {/* Grouped checkout — Amazon items in one tab, rest per store. */}
            <div className="mt-4 flex flex-col gap-3">
              {checkoutGroups(items).map((g) =>
                g.groupUrl ? (
                  <a
                    key={g.retailer}
                    href={g.groupUrl}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                    className="flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 font-body text-sm font-bold text-white shadow-lg shadow-accent/30 transition-all hover:-translate-y-0.5 hover:bg-accent-hover"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    Add {g.products.length === 1 ? "1 item" : `all ${g.products.length} items`} to Amazon cart
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <div
                    key={g.retailer}
                    className="rounded-xl border border-white/12 px-4 py-3"
                  >
                    <p className="text-xs font-bold text-white/70">
                      At {g.retailer} ({g.products.length})
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {g.products.map((p) => (
                        <a
                          key={p.id}
                          href={buyUrl(p)}
                          target="_blank"
                          rel="noopener noreferrer sponsored"
                          className="flex items-center gap-1 rounded-lg bg-white/8 px-3 py-1.5 text-xs font-bold text-white/85 transition-colors hover:bg-accent hover:text-white"
                        >
                          {p.name}
                          <ArrowUpRight className="h-3 w-3" />
                        </a>
                      ))}
                    </div>
                  </div>
                ),
              )}
            </div>
            <p className="mt-3 text-[0.65rem] leading-snug text-white/35">
              Amazon items land in your Amazon cart in one click; other stores
              open their product page. We may earn a commission, at no cost to
              you.
            </p>
          </div>
        </>
      )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

function CartLine({ product: p }: { product: KitProduct }) {
  const [imgOk, setImgOk] = useState(true);
  const price = p.salePrice ?? p.price;
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
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
          <span className="font-display text-sm font-bold text-navy">
            {p.brand.charAt(0)}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-body text-sm font-bold text-white">
          {p.name}
        </p>
        <p className="flex items-center gap-1.5 text-[0.7rem] text-white/45">
          <Star className="h-2.5 w-2.5 fill-accent text-accent" />
          {p.rating}
          <span className="text-white/20">·</span>
          {categoryLabel(p.category)}
        </p>
      </div>
      <div className="text-right leading-tight">
        <span className="block font-display text-sm font-extrabold text-white">
          {formatPrice(price)}
        </span>
        {p.salePrice && (
          <span className="block text-[0.65rem] text-white/30 line-through">
            {formatPrice(p.price)}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={() => cartRemove(p.id)}
        aria-label={`Remove ${p.name}`}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 text-white/45 transition-all hover:border-red-400/50 hover:text-red-400"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
