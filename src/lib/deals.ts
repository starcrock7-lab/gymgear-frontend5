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
   carries the stale salePrice. No date on the product = no expiry logic. */
function expired(p: KitProduct): boolean {
  if (!p.saleEndsAt) return false;
  const t = Date.parse(p.saleEndsAt);
  return Number.isFinite(t) && t <= Date.now();
}

export function productDeal(p: KitProduct): Deal | null {
  if (!p.salePrice || p.salePrice >= p.price || expired(p)) return null;
  return {
    product: p,
    save: p.price - p.salePrice,
    pct: Math.round((1 - p.salePrice / p.price) * 100),
  };
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
