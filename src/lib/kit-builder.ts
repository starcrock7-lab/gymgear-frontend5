/* The deterministic kit builder — selection only, no Next, no fetching.
   ---------------------------------------------------------------------------
   Lives here rather than inside the route so it can be run head-on by
   `npm run audit:kits`, which builds every kit the quiz can produce (432 of
   them) and checks each one is trainable. Selection used to be reachable only
   through an HTTP handler, which made "is this kit any good?" a question you
   could only answer by squinting at JSON.

   This is a port of the backend's builder (server.js — KIT BUILDER section)
   and must stay in LOCKSTEP with it: same constants, same strategies, same
   budget trim, so local and backend kits never diverge. */
import type { KitProduct, KitType } from "@/lib/kit";
import {
  coverageFromTrains, coverageGaps, needsFor, ownedTrains, PATTERNS,
  replacesRack, SPECIALTY_BARS, trainsOf, type Pattern,
} from "@/lib/coverage";

/* Categories that belong in a home-gym kit, in build-priority order. */
export const KIT_CATEGORIES = [
  "racks", "machines", "barbells", "plates", "benches", "dumbbells", "kettlebells",
  "cardio", "bands", "jumpropes", "yogamats", "foamrollers",
];

export const BUDGET_CAP: Record<string, number> = {
  "under-300": 300, "300-800": 800, "800-2000": 2000, "2000-plus": 8000,
};
export const PIECE_TARGET: Record<string, number> = {
  /* "Just the key pieces" still means a bench and something to lift — two
     slots could not hold both an anchor and what makes it usable. */
  "key-pieces": 3, "small-setup": 4, "full-home-gym": 6,
};
export const OWNED_TO_CAT: Record<string, string> = {
  barbell: "barbells", dumbbells: "dumbbells", bench: "benches",
  rack: "racks", cardio: "cardio",
};

/* Per-tier budget tolerance: Best Value stays at budget, Best Match flexes
   slightly, Best Quality is the aspirational stretch shown side by side. */
const TIER_CAP_MULT: Record<KitType, number> = { value: 1, match: 1.15, quality: 1.8 };
export const capFor = (type: KitType, cap: number) => Math.round(cap * (TIER_CAP_MULT[type] || 1));

/* The catalog API also stamps pairsWith (the primary categories an accessory
   completes) onto every product; lib/kit.ts doesn't declare it because only
   this builder reads it. */
export type CatalogProduct = KitProduct & {
  pairsWith?: string[];
  gymgearScore?: number; // backend-computed 0-100 score, used by the match tier
  compact?: boolean;     // machines/cardio: fits a small room / apartment corner
};
export type Catalog = Record<string, CatalogProduct[]>;

export const priceOf = (p: CatalogProduct) => p.salePrice || p.price;

/* Bias the category order so the kit reflects goal + space + kit size.
   Machines placement is the small-vs-big trade: a small setup leads with one
   efficient all-in-one; a full home gym prefers the variety of separates and
   only reaches a machine after the core iron is in. (Lockstep: server.js.) */
export function categoryOrder(goal: string, space: string, pieces: number, experience?: string | null): string[] {
  let order = [...KIT_CATEGORIES];
  const bump = (cats: string[]) => {
    order = [...cats, ...order.filter((c) => !cats.includes(c))];
  };
  if (goal === "lose-weight" || goal === "get-fit")
    bump(["cardio", "kettlebells", "bands", "dumbbells"]);
  if (goal === "build-strength") bump(["racks", "barbells", "plates", "benches"]);
  if (goal === "home-gym-setup") bump(["machines", "racks", "barbells", "benches"]);
  /* Experience shapes the path: beginners get guided, adjustable, machine-led
     gear; advanced lifters get the barbell + rack path reinforced. */
  if (experience === "beginner") bump(["machines", "dumbbells", "kettlebells", "bands"]);
  if (experience === "advanced" && goal !== "lose-weight") bump(["racks", "barbells", "plates", "benches"]);
  /* Few pieces + strength-ish goal → the all-in-one anchors the whole kit. */
  if (pieces <= 4 && (goal === "build-strength" || goal === "home-gym-setup")) bump(["machines"]);
  /* Big builds: machine drops to the back — separates give the variety. */
  if (pieces >= 6 && goal !== "home-gym-setup") {
    order = order.filter((c) => c !== "machines");
    order.push("machines");
  }
  /* Tight spaces can't host a normal rack or a treadmill-class machine, but
     compact units (cable tower, rod gyms, wall-folding rack, folding rower)
     still qualify — buildKit gates non-compact ones at product level. */
  if (space === "apartment-corner" || space === "small-room") {
    const strengthy = goal === "build-strength" || goal === "home-gym-setup";
    const tight = strengthy
      ? ["machines", "racks", "dumbbells", "kettlebells", "bands", "benches", "jumpropes", "yogamats", "foamrollers"]
      : ["dumbbells", "kettlebells", "cardio", "bands", "machines", "racks", "jumpropes", "yogamats", "foamrollers", "benches"];
    order = [...tight.filter((c) => order.includes(c)), ...order.filter((c) => !tight.includes(c))];
  }
  return order;
}

/* Space fit is enforced per-product via the compact flag (see hydrateKits) —
   a wall-folding rack IS apartment-friendly, so no category is banned
   wholesale anymore. Kept as a hook for future hard category bans. */
export function forbiddenCats(_space: string): Set<string> {
  return new Set<string>();
}

/* `price` is what the kit is charged (sale price when there is one); `list` is
   the undiscounted price, kept so the builder can tell a real deal from a
   product that is merely cheap. */
export type Lite = {
  id: string; cat: string; price: number; list: number; quality: number;
  rating: number | null; gs: number; compact: boolean;
  /* What this piece lets you train, and whether it stands in for a rack.
     See lib/coverage.ts — the kit is judged on the union of these. */
  trains: Partial<Record<Pattern, 1 | 2>>;
  rackLike: boolean;
};

/* Ceiling gate (quiz: ceiling === 'under-8ft'). Full racks and most
   all-in-ones stand 86-91" — they don't clear an 8 ft ceiling once flooring
   and pull-up clearance are in. Only these fit a low room. */
const LOW_CEIL_RACKS = new Set(["titan-t2", "rogue-squat", "rep-hr100", "bells-squat"]);
const LOW_CEIL_MACHINES = new Set(["marcy-mwm990", "bowflex-x2se", "bells-cable-tower", "tonal-2", "bodysolid-exm2500"]);

/* How much of the per-slot budget a category deserves. Anchors (machine,
   rack, cardio) soak up multiples of an even share; small accessories a
   fraction. This is what lets a $300 kit and a $2,000 kit pick DIFFERENT
   products in the same category instead of always the same list-topper. */
const CAT_SHARE: Record<string, number> = {
  machines: 2.6, racks: 2.2, cardio: 2.2, plates: 1.6, barbells: 1.4,
  dumbbells: 1.4, benches: 1.2, kettlebells: 0.6, yogamats: 0.3,
  bands: 0.25, foamrollers: 0.25, jumpropes: 0.2,
};

/* Usability floor. A kit has to be trainable, not merely affordable: free
   weights with nowhere to press them, or a single $295 pile of dumbbells that
   happened to fill the budget exactly, is not a gym. These rules may push a
   kit modestly past its tier cap — a little over budget beats unusable.
   (Lockstep: server.js.) */
const MIN_PIECES = 3;
export const ESSENTIAL_OVERFLOW = 1.35;
/* Held back per still-unfilled slot so one greedy anchor can't eat the kit. */
const RESERVE_PER_SLOT = 45;
/* Discount preference. The site's promise is the best price, so a genuine sale
   should win ties and beat marginal alternatives — but never drag in a
   materially worse product, which would turn "best value" into "most stuff on
   sale". Bounded by the discount itself: a 25% cut moves the quality score by
   0.5, so it decides between near-equals and nothing more. (Lockstep: server.js.) */
const DEAL_WEIGHT_MATCH = 1.5;
const DEAL_WEIGHT_QUALITY = 2.0;
/* How much built-quality a same-category swap may give up to land a deal. */
const DEAL_SWAP_MAX_QUALITY_DROP = 1;

/* Own any of these and a bench is what makes them trainable. Soft rule: a kit
   is better with the bench, but dumbbells alone still work standing. */
const NEEDS_BENCH = new Set(["dumbbells", "barbells", "plates", "racks"]);
/* A bench earns its place next to any of these — you can press, row or step
   off it. Wider than NEEDS_BENCH: kettlebells don't oblige a bench, but they
   absolutely use one. Only a bench with no weight at all is dead weight. */
const BENCH_USABLE_WITH = new Set([...NEEDS_BENCH, "kettlebells", "machines"]);
/* Hard rule — these are useless without their partner, so the kit either buys
   the partner or drops the orphan. (Lockstep: server.js.) */
const HARD_PAIRS: Record<string, string[]> = {
  racks: ["barbells", "plates"],
  barbells: ["plates"],
  plates: ["barbells"],
};

/* Greedy one-per-category pick for a tier. Three distinct strategies so the
   kits never collapse into each other: value = cheapest decent option,
   match = personalised (GymGear Score + rating + budget fit), quality = best
   built. `tight` gates non-compact machines/cardio out of small spaces at
   product level (a cable tower fits an apartment corner; a G20 does not). */
export function buildKit(
  strategy: KitType,
  catalog: Lite[],
  { cap, target, ownedCats, order, tight, lowCeil, needs }: { cap: number; target: number; ownedCats: Set<string>; order: string[]; tight: boolean; lowCeil: boolean; needs: Partial<Record<Pattern, 1 | 2>> },
): string[] {
  const perSlot = cap / Math.max(target, 1);
  /* 1.0 when the price sits at the category's ideal share of budget, falling
     off above (over budget hurts fast) and below (a $10 item isn't an anchor). */
  const fit = (p: Lite) => {
    const ideal = perSlot * (CAT_SHARE[p.cat] || 1);
    const r = p.price / Math.max(ideal, 1);
    return r > 1 ? Math.max(0, 2 - r) : 0.4 + 0.6 * r;
  };
  /* Fraction off list, 0 when not on sale. Value already prefers a discount
     implicitly — its score IS the sale price — so only match and quality need
     it made explicit. */
  const dealBoost = (p: Lite) => (p.list > 0 ? Math.max(0, (p.list - p.price) / p.list) : 0);
  const score = {
    value: (p: Lite) => -p.price,                                    // cheapest first (sale price)
    /* Unrated products fall back to our own score on the same 0-1 scale — gs
       already absorbs rating and re-weights when it is absent. Scoring 0
       would bury every unrated product out of the match tier permanently. */
    match: (p: Lite) =>
      (p.gs / 100) * 2 +
      (p.rating != null ? p.rating / 5 : p.gs / 100) +
      fit(p) * 1.5 +
      dealBoost(p) * DEAL_WEIGHT_MATCH,
    quality: (p: Lite) => p.quality + fit(p) * 0.5 + dealBoost(p) * DEAL_WEIGHT_QUALITY,
  }[strategy];
  const picks: Lite[] = [];
  let spent = 0;
  const blocked = new Set<string>();
  /* A rack and the machine that IS one (uprights + cables) are redundant
     together — but only a genuine all-in-one replaces a rack. Deriving this
     per product instead of per category is what stops a single-station leg
     press from blocking the rack and gutting the kit. */
  const conflicted = (p: Lite) =>
    (p.cat === "racks" && picks.some((q) => q.rackLike)) ||
    (p.rackLike && picks.some((q) => q.cat === "racks"));
  /* The gates that come from the buyer's own answers: it doesn't fit the room,
     it doesn't clear the ceiling, they already own it, or it isn't the kind of
     bar a kit can be built on. These hold for ANY slot — separated from
     allowed() because the deal swap replaces a product in a slot that is
     already taken, so it can't use the blocked-category test but absolutely
     must still respect these (it was swapping a compact all-in-one for a
     discounted commercial leg press that then failed the room filter, leaving
     a two-item "kit"). */
  const eligible = (p: Lite) =>
    !ownedCats.has(p.cat) &&
    /* An EZ curl bar is not a barbell you can rack, bench or squat. */
    !SPECIALTY_BARS.has(p.id) &&
    !(tight && (p.cat === "machines" || p.cat === "cardio" || p.cat === "racks") && !p.compact) &&
    !(lowCeil && p.cat === "racks" && !LOW_CEIL_RACKS.has(p.id)) &&
    !(lowCeil && p.cat === "machines" && !LOW_CEIL_MACHINES.has(p.id));
  /* Everything except the budget test — reused by the usability pass, which
     spends against a stretched cap rather than the tier cap. */
  const allowed = (p: Lite) =>
    !blocked.has(p.cat) && !conflicted(p) && eligible(p);
  const fitsIn = (p: Lite, budget: number) => spent + p.price <= budget;
  /* Hold budget back for the slots still to fill. Without this a single
     greedy anchor takes the lot — the $295 dumbbell under a $300 cap that
     left users looking at a one-item "kit". */
  const reserve = () => Math.max(0, target - picks.length - 1) * RESERVE_PER_SLOT;
  /* Cheapest bench the kit could seat, held back while shopping for anything
     that will need one. Without this a $295 set of dumbbells eats a $300
     budget and the bench can never be afforded afterwards. */
  const benchOptions = catalog.filter((p) => p.cat === "benches");
  const benchDecent = benchOptions.filter((p) => p.quality >= 7);
  const cheapestBench = (benchDecent.length ? benchDecent : benchOptions)
    .reduce((m, p) => (!m || p.price < m.price ? p : m), undefined as Lite | undefined);
  const benchHeld = (p: Lite) => {
    if (!cheapestBench || p.cat === "benches") return 0;
    if (ownedCats.has("benches") || picks.some((q) => q.cat === "benches")) return 0;
    /* Held once anything in the kit needs a bench, not just while picking that
       piece — otherwise the accessories that follow spend the bench money. */
    return NEEDS_BENCH.has(p.cat) || picks.some((q) => NEEDS_BENCH.has(q.cat))
      ? cheapestBench.price
      : 0;
  };
  /* Same idea for hard pairs: don't buy a rack you cannot afford a bar and
     plates for. Picking the anchor first and discovering that later just gets
     the anchor thrown away again, taking the kit down with it. */
  const cheapestIn = (cat: string) => {
    const all = catalog.filter((q) => q.cat === cat);
    const good = all.filter((q) => q.quality >= 7);
    return (good.length ? good : all).reduce(
      (m, q) => (!m || q.price < m.price ? q : m),
      undefined as Lite | undefined,
    );
  };
  const cheapestByCat: Record<string, Lite | undefined> = {};
  for (const need of new Set(Object.values(HARD_PAIRS).flat())) cheapestByCat[need] = cheapestIn(need);
  const pairHeld = (p: Lite) =>
    (HARD_PAIRS[p.cat] || []).reduce(
      (s, need) =>
        picks.some((q) => q.cat === need) || ownedCats.has(need)
          ? s
          : s + (cheapestByCat[need]?.price ?? 0),
      0,
    );
  const pickable = (p: Lite) =>
    allowed(p) && fitsIn(p, cap - reserve() - benchHeld(p) - pairHeld(p));
  const take = (p: Lite) => {
    picks.push(p); spent += p.price; blocked.add(p.cat);
  };
  for (const cat of order) {
    if (picks.length >= target) break;
    if (blocked.has(cat) || ownedCats.has(cat)) continue;
    let cands = catalog.filter((p) => p.cat === cat && pickable(p));
    /* Nothing clears the reserve? Fall back to the plain cap, so holding
       budget back can never silently drop a category entirely. */
    if (!cands.length)
      cands = catalog.filter(
        (p) => p.cat === cat && allowed(p) && fitsIn(p, cap - benchHeld(p) - pairHeld(p)),
      );
    /* Value still wants decent gear — gate to quality ≥7 unless nothing fits. */
    if (strategy === "value") {
      const decent = cands.filter((p) => p.quality >= 7);
      if (decent.length) cands = decent;
    }
    const best = cands.sort((a, b) => score(b) - score(a))[0];
    if (best) take(best);
  }
  /* Usability passes. The bench money is held back by benchHeld() while the
     kit is being picked, so seatBench() can afford itself even though it runs
     last — and running last is what lets it judge the FINAL composition
     instead of one that later passes go on to change. */
  const stretch = cap * ESSENTIAL_OVERFLOW;
  const drop = (i: number) => {
    spent -= picks[i].price;
    blocked.delete(picks[i].cat);
    picks.splice(i, 1);
  };
  /* Free weights and nothing to press, row or step on. Trade away the least
     essential picks to seat a bench: an EZ bar is worth less than the bench
     that makes the whole kit trainable. */
  const DROP_FOR_BENCH = new Set(["jumpropes", "foamrollers", "yogamats", "bands", "kettlebells", "plates", "barbells"]);
  const seatBench = () => {
    if (
      !picks.some((p) => NEEDS_BENCH.has(p.cat)) ||
      picks.some((p) => p.cat === "benches") ||
      ownedCats.has("benches")
    ) return;
    const benches = catalog.filter((p) => p.cat === "benches" && allowed(p));
    const decent = benches.filter((p) => p.quality >= 7);
    const bench = (decent.length ? decent : benches).sort((a, b) => a.price - b.price)[0];
    if (bench) {
      /* Plan the trades, then apply them only if the bench actually lands.
         Shedding as we went used to drop the very barbell that required the
         bench, then decline the bench because nothing needed it any more —
         which is how a kit came out as $21 of bands and a massage ball.
         Priciest expendable goes first so the bench costs the fewest pieces. */
      const cut = new Set<number>();
      let sim = spent;
      while (sim + bench.price > stretch) {
        let worst = -1;
        picks.forEach((p, i) => {
          if (cut.has(i) || !DROP_FOR_BENCH.has(p.cat)) return;
          /* Never cut the last piece that justifies the bench. */
          if (NEEDS_BENCH.has(p.cat) && !picks.some((q, j) => j !== i && !cut.has(j) && NEEDS_BENCH.has(q.cat))) return;
          if (worst < 0 || p.price > picks[worst].price) worst = i;
        });
        if (worst < 0) break;
        cut.add(worst);
        sim -= picks[worst].price;
      }
      if (sim + bench.price <= stretch) {
        [...cut].sort((a, b) => b - a).forEach(drop);
        take(bench);
      }
    }
  };

  /* Barbell gear is all-or-nothing. A rack with no bar, or plates with no bar
     to load them on, is money spent on something you physically cannot use.
     Buy the partner if it fits; otherwise drop the orphan and let the budget
     go somewhere useful. Bounded passes — adding one partner can require
     another (rack → bar → plates). */
  for (let pass = 0; pass < 6; pass++) {
    let changed = false;
    for (const [cat, needsCats] of Object.entries(HARD_PAIRS)) {
      if (!picks.some((p) => p.cat === cat)) continue;
      for (const need of needsCats) {
        if (picks.some((p) => p.cat === need) || ownedCats.has(need)) continue;
        const cands = catalog.filter((p) => p.cat === need && allowed(p) && fitsIn(p, stretch));
        const decent = cands.filter((p) => p.quality >= 7);
        const partner = (decent.length ? decent : cands).sort((a, b) => a.price - b.price)[0];
        if (partner) {
          take(partner);
        } else {
          const i = picks.findIndex((p) => p.cat === cat);
          if (i >= 0) drop(i);
        }
        changed = true;
        break;
      }
    }
    if (!changed) break;
  }

  /* Budget left and slots left → add value picks from any remaining category. */
  if (picks.length < target) {
    const extra = catalog
      .filter(pickable)
      .sort((a, b) => b.quality / b.price - a.quality / a.price);
    for (const p of extra) {
      if (picks.length >= target) break;
      if (!pickable(p)) continue;
      take(p);
    }
  }
  /* Still barely a kit → top up on value-per-dollar. take() blocks the
     category each round, so this always terminates. */
  while (picks.length < MIN_PIECES) {
    /* Filler only: standalone gear. Benches are seatBench()'s call, and
       barbell gear drags its partners along — topping up on pure
       value-per-dollar kept adding cheap plates with no bar, which the orphan
       prune then stripped straight back out, leaving the short kit it was
       called in to fix. */
    const next = catalog
      .filter((p) => p.cat !== "benches" && !HARD_PAIRS[p.cat] && allowed(p) && fitsIn(p, stretch))
      .sort((a, b) => b.quality / b.price - a.quality / a.price)[0];
    if (!next) break;
    take(next);
  }
  seatBench();

  /* Coverage repair — the pass that makes a kit a gym rather than a coherent
     pile. Everything above only checks that the pieces work TOGETHER; a rack,
     a bar and plates pass every one of those rules and still cannot train your
     chest. So: for each movement the goal needs and the kit can't deliver, buy
     the cheapest piece that fixes it, spending against the same stretched cap
     the other usability rules use. Cheapest-that-fixes-it (not best) keeps the
     repair from quietly rebuilding the tier's character — a $54 kettlebell
     restores the hinge, it doesn't turn Best Value into Best Quality. */
  /* Owned gear counts toward what the buyer can train — the kit doesn't
     re-sell you the rack you already have, and without this the repair pass
     would "fix" your missing pull-up bar with a resistance band. */
  const owned = ownedTrains(ownedCats);
  const coverNow = () =>
    coverageFromTrains([...picks.map((p) => ({ category: p.cat, trains: p.trains })), ...owned]);
  for (let pass = 0; pass < PATTERNS.length; pass++) {
    const cov = coverNow();
    const missing = (Object.entries(needs) as [Pattern, 1 | 2][])
      .filter(([k, v]) => cov[k] < v)
      /* Deepest hole first: a pattern at 0 is a muscle group you cannot train
         at all, which beats topping a 1 up to a 2. */
      .sort((a, b) => cov[a[0]] - cov[b[0]]);
    if (!missing.length) break;
    const [pat, want] = missing[0];
    /* Simulate: only take a piece that genuinely moves this pattern once the
       kit's own enablers are applied — a bench "covers" chest press only
       alongside something to press. */
    const fixes = catalog
      .filter((p) => allowed(p) && !picks.some((q) => q.cat === p.cat) && fitsIn(p, stretch))
      .filter((p) => coverageFromTrains([...[...picks, p].map((q) => ({ category: q.cat, trains: q.trains })), ...owned])[pat] >= want)
      .sort((a, b) => a.price - b.price);
    if (!fixes.length) break;
    take(fixes[0]);
  }
  /* Repair can bring in the free weights that make a bench worth having. */
  seatBench();

  /* Last look: a kit with no deal in it, when a comparable discounted product
     was sitting right there, is a missed claim on a site that promises the
     best price. Swaps are same-category and same-slot, so the kit's shape is
     untouched — but same CATEGORY is not the same FUNCTION. A leg press and an
     all-in-one trainer are both `machines`, and swapping one for the other on
     the strength of a 16% discount is what silently removed every pulling
     movement from the $4,549 "strength" kit. So the swap has to leave the kit
     able to train everything it could before. */
  const covBefore = coverNow();
  const keepsCoverage = (i: number, alt: Lite) => {
    const after = coverageFromTrains([
      ...picks.map((q, j) => ({ category: j === i ? alt.cat : q.cat, trains: j === i ? alt.trains : q.trains })),
      ...owned,
    ]);
    return PATTERNS.every(
      (k) => after[k] >= (needs[k] ?? 0) && !(covBefore[k] > 0 && after[k] === 0),
    );
  };
  if (!picks.some((p) => dealBoost(p) > 0)) {
    for (let i = 0; i < picks.length; i++) {
      const cur = picks[i];
      const alt = catalog
        .filter(
          (p) =>
            p.cat === cur.cat &&
            p.id !== cur.id &&
            dealBoost(p) > 0 &&
            p.quality >= cur.quality - DEAL_SWAP_MAX_QUALITY_DROP &&
            /* A "deal" that costs more than what it replaced makes the kit
               dearer in the name of the best-price promise — and it was
               shuffling Best Value above Best Match on the results page. */
            p.price <= cur.price &&
            spent - cur.price + p.price <= stretch &&
            eligible(p) &&
            /* An all-in-one swapped in next to a rack is the redundancy the
               rack-like rule exists to prevent. */
            !(p.rackLike && picks.some((q, j) => j !== i && q.cat === "racks")) &&
            keepsCoverage(i, p),
        )
        .sort((a, b) => b.quality + dealBoost(b) * 2 - (a.quality + dealBoost(a) * 2))[0];
      if (alt) {
        spent += alt.price - cur.price;
        picks[i] = alt;
        break;
      }
    }
  }
  return picks.map((p) => p.id);
}

export const KIT_TIERS: { type: KitType; name: string }[] = [
  { type: "value", name: "Best Value" },
  { type: "match", name: "Best Match" },
  { type: "quality", name: "Best Quality" },
];

export type HydratedKit = {
  type: KitType; name: string; description: string;
  products: CatalogProduct[]; totalPrice: number;
};

/* Hydrate the chosen IDs into full product objects, then enforce the hard
   constraints: drop space-forbidden and owned categories, dedupe by category,
   and trim to the tier budget (budget beats piece count). */
export function hydrateKits(
  rawKits: { type: KitType; name: string; productIds: string[] }[],
  byId: Map<string, CatalogProduct>,
  budgetCap: number,
  forbidden: Set<string>,
  ownedCats: Set<string>,
  tight: boolean,
  lowCeil: boolean,
  goal: string,
): HydratedKit[] {
  return rawKits
    .map((k) => {
      let products = k.productIds
        .map((id) => byId.get(id))
        .filter((p): p is CatalogProduct => Boolean(p))
        .filter((p) => !forbidden.has(p.category) && !ownedCats.has(p.category))
        /* Full-size machines, treadmill-class cardio and normal racks can't
           live in a tight space (compact units — cable tower, folding rower,
           wall-folding rack — can). Low ceilings gate tall racks/machines. */
        .filter((p) => !(tight && (p.category === "machines" || p.category === "cardio" || p.category === "racks") && !p.compact))
        .filter((p) => !(lowCeil && p.category === "racks" && !LOW_CEIL_RACKS.has(p.id)))
        .filter((p) => !(lowCeil && p.category === "machines" && !LOW_CEIL_MACHINES.has(p.id)));
      /* Dedupe by category so a kit never lists two benches — and never a rack
         AND the all-in-one that already is one (single-station machines like a
         leg press are not rack replacements and may sit beside a rack). */
      const seen = new Set<string>();
      let rackSeen = false, allInOneSeen = false;
      products = products.filter((p) => {
        if (seen.has(p.category)) return false;
        const isRackLike = replacesRack(p.category, p.specs);
        if (p.category === "racks" && allInOneSeen) return false;
        if (isRackLike && rackSeen) return false;
        if (p.category === "racks") rackSeen = true;
        if (isRackLike) allInOneSeen = true;
        seen.add(p.category);
        return true;
      });
      /* Trim against the same budget buildKit composed to. Trimming to the
         bare tier cap dismantled coherent kits from the outside: it dropped
         the barbell (dearest, and the bench is protected) and left a bench
         with nothing to lift. buildKit already holds itself to this budget,
         so anything caught here is a genuine overrun from the filtering above. */
      const cap = capFor(k.type, budgetCap) * ESSENTIAL_OVERFLOW;
      let total = products.reduce((s, p) => s + priceOf(p), 0);
      /* Trim toward the cap, but never down to something unusable: stop at
         MIN_PIECES, and never drop the bench that makes the free weights
         trainable (this loop used to happily strip a kit to one item). */
      const needsBench = products.some((p) => NEEDS_BENCH.has(p.category));
      for (;;) {
        if (total <= cap || products.length <= MIN_PIECES) break;
        /* Trimming for budget must never re-open a coverage gap: a cheaper kit
           that can no longer train your back isn't cheaper, it's broken. */
        const gapsNow = coverageGaps(products, goal, ownedCats).length;
        const droppable = products
          .map((p, idx) => ({ p, idx }))
          .filter(({ p }) => !(needsBench && p.category === "benches"))
          .filter(({ idx }) => coverageGaps(products.filter((_, i) => i !== idx), goal, ownedCats).length <= gapsNow);
        if (!droppable.length) break;
        const worst = droppable.reduce((m, c) => (priceOf(c.p) > priceOf(m.p) ? c : m));
        total -= priceOf(worst.p);
        products.splice(worst.idx, 1);
      }
      /* The trim can orphan a hard pair — drop the bar and the plates are
         suddenly unusable. Prune whatever is left without its partner. */
      for (let pass = 0; pass < 3; pass++) {
        const cats = new Set(products.map((p) => p.category));
        const orphan = products.findIndex((p) =>
          (HARD_PAIRS[p.category] || []).some((n) => !cats.has(n) && !ownedCats.has(n)),
        );
        if (orphan < 0) break;
        total -= priceOf(products[orphan]);
        products.splice(orphan, 1);
      }
      /* A bench with no weight of any kind beside it is the same dead weight. */
      if (
        products.some((p) => p.category === "benches") &&
        !products.some((p) => BENCH_USABLE_WITH.has(p.category))
      ) {
        const i = products.findIndex((p) => p.category === "benches");
        total -= priceOf(products[i]);
        products.splice(i, 1);
      }
      return { type: k.type, name: k.name, description: "", products, totalPrice: total };
    })
    .filter((k) => k.products.length > 0);
}

/* One entry point for "given a catalog and quiz answers, what are the three
   kits?" — the route and the audit script both call exactly this, so what the
   audit measures is what visitors get. */
export type BuilderAnswers = {
  goal: string; budget: string; space?: string | null;
  ceiling?: string | null; equipmentCount?: string | null;
  experience?: string | null; owned?: string[] | null;
};

export function selectKits(catalog: Catalog, a: BuilderAnswers): HydratedKit[] {
  const all = Object.values(catalog).flat();
  const cap = BUDGET_CAP[a.budget] || 2000;
  const target = PIECE_TARGET[a.equipmentCount || ""] || 4;
  const forbidden = forbiddenCats(a.space || "");
  const ownedCats = new Set((a.owned || []).map((id) => OWNED_TO_CAT[id]).filter(Boolean));
  const order = categoryOrder(a.goal, a.space || "", target, a.experience);
  const tight = a.space === "apartment-corner" || a.space === "small-room";
  const lowCeil = a.ceiling === "under-8ft";
  const needs = needsFor(a.goal);

  const lite: Lite[] = KIT_CATEGORIES.flatMap((cat) =>
    (catalog[cat] || []).map((p) => ({
      id: p.id, cat, price: priceOf(p), list: p.price, quality: p.quality, rating: p.rating,
      gs: p.gymgearScore || 0, compact: !!p.compact,
      trains: trainsOf({ id: p.id, category: cat, specs: p.specs }),
      rackLike: replacesRack(cat, p.specs),
    })),
  );
  const byId = new Map(all.map((p) => [p.id, p]));

  const rawKits = KIT_TIERS.map((t) => ({
    ...t,
    productIds: buildKit(t.type, lite, {
      cap: capFor(t.type, cap), target, ownedCats, order, tight, lowCeil, needs,
    }),
  }));
  return hydrateKits(rawKits, byId, cap, forbidden, ownedCats, tight, lowCeil, a.goal);
}
