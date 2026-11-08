/* Price check: what the same setup typically costs, from the products we
   track, next to what this plan costs. Every number is computed from catalog
   prices when the kit is built; nothing here is typed in by hand or written by
   a model. The rules this must keep are in docs/plans/price-check.md. */
import type { Catalog, CatalogProduct } from "@/lib/kit-builder";

/* Local copy of kit-builder's priceOf, so the results page can import this
   file without pulling the builder into the browser bundle. */
const priceOf = (p: { price: number; salePrice?: number }) => p.salePrice || p.price;

/* Products that do the same job at a like grade, judged by what each listing
   itself states (name or specs). A product in no class is never compared, and
   when a listing doesn't say enough to place it, it stays out. Different
   grades are different classes: competition plates, smart rowers, folding and
   short racks are left out of the plain classes they resemble. */
export const COMPARE_CLASSES: Record<string, { label: string; ids: string[] }> = {
  "power-rack": {
    label: "power racks",
    ids: [
      "rogue-r3", "rep-pr4000", "rep-pr5000", "titan-x3",
      "bells-manticore-collegiate-power-rack-prebui", "bells-hydra-collegiate-power-rack-prebuilt",
      "bells-manticore-four-post-power-rack-prebuil",
    ],
  },
  "squat-stand": { label: "squat stands", ids: ["bells-squat", "rogue-squat", "rogue-sml2"] },
  "folding-half-rack": {
    label: "folding half racks",
    ids: ["bells-roc-foldable-two-post-cage-prebuilt", "bells-manticore-folding-half-rack-prebuilt", "prx-profile-pro"],
  },
  /* 20 kg / 45 lb bars whose listing states the weight. */
  "olympic-bar": {
    label: "20 kg barbells",
    ids: ["rogue-ohio", "texas-power-bar", "rep-alpine-bar", "bells-power-bar", "rogue-opb"],
  },
  "bumper-set-160": { label: "160 lb bumper plate sets", ids: ["rogue-hg2", "rogue-echo", "rep-color"] },
  "flat-bench": { label: "flat benches", ids: ["rogue-mb2", "rogue-flat2", "rep-fb5000", "bells-bench"] },
  "adjustable-bench": {
    label: "adjustable benches",
    ids: ["rep-ab5200", "rep-ab3000", "rogue-adj-bench", "rep-rep-nighthawk-adjustable-bench", "rep-blackwing-adjustable-bench"],
  },
  "functional-trainer": {
    label: "weight-stack functional trainers",
    ids: ["rep-arcadia", "bells-ft", "bells-functional-trainer-cable-tower"],
  },
  rower: { label: "rowing machines", ids: ["concept2-rower", "sunny-rower", "waterrower-oak"] },
  "yoga-mat": {
    label: "full-size yoga mats",
    ids: [
      "manduka-pro", "jade-harmony", "gaiam-premium", "alo-warrior", "jadeyoga-jade-extra-yoga-mat",
      "jadeyoga-jade-cork-yoga-mat", "jadeyoga-fusion-mat", "jadeyoga-xw-fusion",
    ],
  },
};

/* Fewer than this and "typical" is one or two products' price, not a typical. */
export const MIN_COMPARABLES = 3;

export const CLASS_OF = new Map(
  Object.entries(COMPARE_CLASSES).flatMap(([key, c]) => c.ids.map((id) => [id, key] as const)),
);

/* `alt` beats `cur` when it is in the same class, costs less and has a higher
   GymGear Score. One rule for every tier: the page shows the Score, and tier
   labels are re-sorted by price after building, so a per-tier rule let a
   quality-built kit show as Best Match with a $335 bench scoring 78 beside a
   $195 one scoring 86. The builder never keeps a beaten pick; check:price
   fails if one gets through. */
export function beats(
  alt: { id: string; price: number; gs: number },
  cur: { id: string; price: number; gs: number },
): boolean {
  const cls = CLASS_OF.get(cur.id);
  return !!cls && CLASS_OF.get(alt.id) === cls && alt.price < cur.price && alt.gs > cur.gs;
}

/* One class's prices, keyed in the response by every member's id so the page
   can re-check the kit after a swap without the catalog. */
export type ClassStat = {
  label: string;
  typical: number;
  low: number;
  high: number;
  count: number;
  typicalScore: number | null;
};

export type PriceLine = ClassStat & {
  id: string;
  name: string;
  yours: number;
  yourScore: number | null;
};

export type PriceCheck = {
  lines: PriceLine[];
  /* Sums over the compared pieces only, so the two totals cover the same gear. */
  yours: number;
  typical: number;
  /* Pieces in the kit, compared or not, so the page can say "N of M". */
  pieces: number;
};

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const cents = (n: number) => Math.round(n * 100) / 100;

/* Today's buyer price (sale-aware), so a discount on a comparable lowers the
   typical instead of inflating it with a list price. Only products published
   right now count: shelved and sold-out rows are not in the catalog, and a
   price nobody can buy at is not a typical price. */
export function classStats(catalog: Catalog): Record<string, ClassStat> {
  const byId = new Map(Object.values(catalog).flat().map((p) => [p.id, p]));
  const out: Record<string, ClassStat> = {};
  for (const c of Object.values(COMPARE_CLASSES)) {
    const members = c.ids.map((id) => byId.get(id)).filter((m): m is CatalogProduct => !!m);
    if (members.length < MIN_COMPARABLES) continue;
    const prices = members.map(priceOf);
    const scores = members.map((m) => m.gymgearScore).filter((s): s is number => typeof s === "number");
    const stat: ClassStat = {
      label: c.label,
      typical: cents(median(prices)),
      low: cents(Math.min(...prices)),
      high: cents(Math.max(...prices)),
      count: members.length,
      typicalScore: scores.length >= MIN_COMPARABLES ? Math.round(median(scores)) : null,
    };
    for (const m of members) out[m.id] = stat;
  }
  return out;
}

/* The kit as it stands, swaps and removals included. */
export function priceCheck(
  products: Pick<CatalogProduct, "id" | "name" | "price" | "salePrice" | "gymgearScore">[],
  stats: Record<string, ClassStat>,
): PriceCheck | null {
  const lines: PriceLine[] = products
    .filter((p) => stats[p.id])
    .map((p) => ({
      ...stats[p.id],
      id: p.id,
      name: p.name,
      yours: cents(priceOf(p)),
      yourScore: p.gymgearScore ?? null,
    }));
  if (!lines.length) return null;
  return {
    lines,
    yours: cents(lines.reduce((s, l) => s + l.yours, 0)),
    typical: cents(lines.reduce((s, l) => s + l.typical, 0)),
    pieces: products.length,
  };
}
