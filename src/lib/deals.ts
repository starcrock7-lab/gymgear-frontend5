import type { KitProduct } from "@/lib/kit";
import pitchData from "@/data/deal-pitches.json";

/* Weekly Groq-written pitch per sale product (deals engine v1.5) — refreshed
   by .github/workflows/weekly-deal-pitches.yml, bundled at build time. Empty
   map until the workflow's repo secrets are set; templates cover always. */
const AI_PITCH: Record<string, string> = pitchData.pitches;

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

/* Deals v2: a sale with a known, PASSED end date is not a deal anymore —
   the strip and pitches drop it immediately, even if the catalog still
   carries the stale salePrice. No date on the product = no expiry logic.
   Exported so the catalog layer (lib/catalog.ts) can strip expired sale
   fields at fetch time — every surface then shows clean prices for free. */
export function saleExpired(p: KitProduct): boolean {
  if (!p.saleEndsAt) return false;
  const t = Date.parse(p.saleEndsAt);
  return Number.isFinite(t) && t <= Date.now();
}

/* Smallest cut we will call a deal. Retailers publish 1% "sales" — a $2,315
   rack listed at $2,298 — and badging those as deals is what turns "the best
   deals available right now" into noise nobody trusts. Below this the price
   is still real, it just isn't news. */
export const MIN_DEAL_PCT = 5;

const salePct = (p: KitProduct): number =>
  p.salePrice && p.salePrice < p.price
    ? Math.round((1 - p.salePrice / p.price) * 100)
    : 0;

/* Resolve what a product's price actually IS, once expiry and the deal floor
   are applied. Run at the catalog boundary so every surface — cards, kit,
   compare, planner — reads clean fields instead of each re-deriving the rule.

   Two different outcomes, and mixing them up misprices the product:
   - Sale expired  → the sale is gone, they pay list. Drop the sale fields.
   - Under the floor → they still pay the lower number, we just don't call it
     a deal. So the sale price BECOMES the price. Dropping the field here
     would quote them the higher list price, which is worse than a small
     badge. */
export function settleSale<T extends KitProduct>(p: T): T {
  if (!p.salePrice) return p;
  const out = { ...p };
  if (saleExpired(p)) {
    delete out.salePrice;
    delete out.discount;
    delete out.saleEndsAt;
    return out;
  }
  if (salePct(p) < MIN_DEAL_PCT) {
    out.price = p.salePrice;
    delete out.salePrice;
    delete out.discount;
    delete out.saleEndsAt;
  }
  return out;
}

export function productDeal(p: KitProduct): Deal | null {
  if (!p.salePrice || p.salePrice >= p.price || saleExpired(p)) return null;
  const pct = salePct(p);
  if (pct < MIN_DEAL_PCT) return null;
  return {
    product: p,
    save: p.price - p.salePrice,
    pct,
  };
}

/* Ranking score for browse surfaces: quality first, with a live discount
   lifting a product up a bounded amount — the same bargain the kit builder
   already strikes, so the whole site agrees about what a deal is worth.

   Bounded hard on purpose. Sorting on discount alone puts a product nobody
   should buy above the category benchmark, which is the opposite of "best
   deals" — the best deal is a good product that happens to be cheap today.
   Scores inside a category cluster in a ~10-point band, so the cap is 5: a
   deal wins ties and near-ties and cannot jump a clearly better product. At
   /2 a 17%-off rack scoring 82 displaced the 90s, which is the ranking
   lying. Deals get their prominence from the strip at the top of the page,
   not from being pretended to be better than they are. */
export function dealRank(p: KitProduct & { gymgearScore?: number }): number {
  const deal = productDeal(p);
  const boost = deal ? Math.min(deal.pct, 30) / 6 : 0;
  return (p.gymgearScore ?? 0) + boost;
}

/* Best products first, deals boosted. Ties break toward the bigger discount
   so an on-sale row is never buried under an identical full-price one. */
export function rankWithDeals<T extends KitProduct & { gymgearScore?: number }>(
  products: T[],
): T[] {
  return [...products].sort((a, b) => {
    const d = dealRank(b) - dealRank(a);
    if (d !== 0) return d;
    return (productDeal(b)?.pct ?? 0) - (productDeal(a)?.pct ?? 0);
  });
}

/* Honest countdown — only when a real end date exists and is close enough
   to matter (< 72h). Returns e.g. "ends in 7h" / "ends in 2d", else null.
   Never shown without curated data; we never fake urgency. */
export function endsInLabel(d: Deal): string | null {
  const raw = d.product.saleEndsAt;
  if (!raw) return null;
  const ms = Date.parse(raw) - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const hours = ms / 3.6e6;
  if (hours > 72) return null;
  if (hours >= 48) return "ends in 2d";
  if (hours >= 1) return `ends in ${Math.round(hours)}h`;
  return "ends within the hour";
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
    /* AI line when the weekly job wrote one for this product; template else. */
    return (
      AI_PITCH[d.product.id] ||
      `The ${name(d)} is ${d.pct}% off right now. Sale prices can end without notice, so it is a smart time to lock it in.`
    );
  }
  if (deals.length === 2) {
    return `The ${name(deals[0])} and the ${name(deals[1])} are both discounted right now. Deals rotate all the time, so buying them while the discounts overlap saves you the most.`;
  }
  return `${deals.length} of your picks are discounted at the same time, led by the ${name(deals[0])}. Overlaps like this rotate away quickly, so it is a good week to buy the bundle.`;
}
