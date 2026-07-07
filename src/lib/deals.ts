import type { KitProduct } from "@/lib/kit";

/* Deals engine, deterministic layer (v1). Derives every deal from the
   curated salePrice/discount fields already in the cached catalog — no new
   data source, no request-time AI. Hard rule for all later phases: the LLM
   never sources a price or an expiry; it only writes copy over numbers
   computed here (same wall as the kit builder). Phase 1.5 swaps dealsPitch
   for weekly Groq-written copy delivered as a cached artifact; phase 2 adds
   expiresAt + countdowns and per-product rechecks when a deal ends — needs
   expiry data the catalog doesn't carry yet. Roadmap: CONTEXT.md Phase 7. */

export type Deal = {
  product: KitProduct;
  /** Dollars off list, per the curated sale price. */
  save: number;
  /** Percent off list, rounded. */
  pct: number;
};

export function productDeal(p: KitProduct): Deal | null {
  if (!p.salePrice || p.salePrice >= p.price) return null;
  return {
    product: p,
    save: p.price - p.salePrice,
    pct: Math.round((1 - p.salePrice / p.price) * 100),
  };
}

/* Every live deal in a set of products, biggest saving first. */
export function findDeals(products: KitProduct[]): Deal[] {
  return products
    .map(productDeal)
    .filter((d): d is Deal => d !== null)
    .sort((a, b) => b.save - a.save);
}

export function dealsSavings(deals: Deal[]): number {
  return Math.round(deals.reduce((s, d) => s + d.save, 0));
}

/* Templated pitch under the savings headline — deterministic v1 copy, house
   style (plain words, no dash characters, no invented facts). Sale end dates
   aren't in the data yet, so the urgency stays honest: "can end without
   notice", never a countdown we can't back. */
export function dealsPitch(deals: Deal[]): string {
  if (!deals.length) return "";
  const name = (d: Deal) => d.product.name;
  if (deals.length === 1) {
    const d = deals[0];
    return `The ${name(d)} is ${d.pct}% off right now. Sale prices can end without notice, so it is a smart time to lock it in.`;
  }
  if (deals.length === 2) {
    return `The ${name(deals[0])} and the ${name(deals[1])} are both discounted right now. Deals rotate all the time, so buying them while the discounts overlap saves you the most.`;
  }
  return `${deals.length} of your picks are discounted at the same time, led by the ${name(deals[0])}. Overlaps like this rotate away quickly, so it is a good week to buy the bundle.`;
}
