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
  coverageFromTrains, coverageGaps, FIXED_PAIR_DUMBBELLS, HEAVY_FIXED_PAIR_DUMBBELLS, isPlateLoaded,
  LIGHT_PIECES, PRICED_BY_SIZE, needsFor, ownedTrains, PATTERNS, replacesRack, SMALL_PLATE_PAIRS, SPECIALTY_BARS, trainsOf, type Coverage, type Pattern,
} from "@/lib/coverage";
import { footprintOf } from "@/lib/floor-plan";

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
/* Each answer states how much it WANTS a category, and the weights add up.
   This used to be a sequence of prepends, which meant the last prepend won
   the front of the order outright: the experience list landed on top of the
   goal list and erased it, so every beginner got a machine-led kit and every
   advanced lifter a barbell-led one no matter what they said their goal was.
   The personalization probe caught it as goal changes leaving 43% of kits
   byte-identical. Weights compose — a beginner chasing strength now gets a
   beginner's slant ON a strength kit, instead of one answer deleting the
   other. Signs matter as much as sizes: a goal pushes gear DOWN as well as up,
   which is what makes a fat-loss kit look different rather than merely
   re-sorted. */
const GOAL_WEIGHT: Record<string, Record<string, number>> = {
  /* Conditioning leads, but strength gear stays present — holding lean mass
     in a deficit is what stops fat loss becoming weight loss. */
  "lose-weight": { cardio: 10, jumpropes: 6, kettlebells: 6, bands: 4, dumbbells: 3, yogamats: 1, racks: -6, plates: -5, barbells: -4, machines: -2 },
  "get-fit": { cardio: 7, kettlebells: 5, dumbbells: 4, bands: 3, jumpropes: 2, yogamats: 1, racks: -2, plates: -2 },
  "build-strength": { racks: 10, barbells: 9, plates: 8, benches: 6, dumbbells: 2, cardio: -6, jumpropes: -5, yogamats: -3, foamrollers: -1 },
  "home-gym-setup": { machines: 8, racks: 7, barbells: 5, benches: 5, plates: 4, cardio: 3, dumbbells: 2 },
};
/* Deliberately smaller than the goal weights: experience should slant a kit,
   never redefine it. Beginners do better on guided, adjustable, machine-led
   gear; advanced lifters want the barbell path reinforced. */
const EXPERIENCE_WEIGHT: Record<string, Record<string, number>> = {
  beginner: { machines: 4, dumbbells: 3, kettlebells: 2, bands: 2, barbells: -3, plates: -3, racks: -2 },
  intermediate: {},
  advanced: { racks: 4, barbells: 4, plates: 3, benches: 2, machines: -3, bands: -1 },
};
/* The room's taste, on top of the hard gates in eligible(). A tight space
   leans on gear that stores upright or under a bed; a garage has the floor
   to spend on an anchor. */
const SPACE_WEIGHT: Record<string, Record<string, number>> = {
  "apartment-corner": { dumbbells: 5, bands: 4, kettlebells: 4, jumpropes: 3, yogamats: 2, foamrollers: 1, racks: -8, cardio: -3, machines: -1 },
  "small-room": { dumbbells: 4, kettlebells: 3, bands: 2, jumpropes: 1, racks: -3, cardio: -2 },
  garage: { racks: 3, plates: 2, barbells: 2, cardio: 1 },
  /* Conditioning outdoors is a rope and a kettlebell, not a treadmill —
     the machines and cardio it would otherwise reach for are banned above. */
  outdoor: { kettlebells: 4, jumpropes: 3, racks: 2, plates: 1, barbells: 1 },
};

export function categoryOrder(goal: string, space: string, pieces: number, experience?: string | null): string[] {
  const goalW = GOAL_WEIGHT[goal] || {};
  const expW = EXPERIENCE_WEIGHT[experience || ""] || {};
  const spaceW = SPACE_WEIGHT[space] || {};
  const weight = (c: string) => {
    /* Base priority is the hand-tuned build order, kept as a tiebreak so a
       category with no opinion attached still lands where it always did. */
    let w = (KIT_CATEGORIES.length - KIT_CATEGORIES.indexOf(c)) * 0.5;
    w += goalW[c] || 0;
    w += expW[c] || 0;
    w += spaceW[c] || 0;
    /* Few pieces and a strength-ish goal → one all-in-one has to carry the
       whole kit, so it earns the anchor slot. Many pieces → separates give
       more range for the money, and the machine drops to the back. */
    const strengthy = goal === "build-strength" || goal === "home-gym-setup";
    if (c === "machines") {
      if (pieces <= 4 && strengthy) w += 9;
      if (pieces >= 6 && goal !== "home-gym-setup") w -= 12;
    }
    return w;
  };
  /* Stable: equal weights keep KIT_CATEGORIES order, so the result is
     deterministic and the lockstep check can compare it against server.js. */
  return [...KIT_CATEGORIES].sort((a, b) => weight(b) - weight(a));
}

/* Most space fit is per-product via the compact flag (a wall-folding rack IS
   apartment-friendly), but some gear is ruled out by the room itself rather
   than by its size. A barbell needs seven feet of clear length, somewhere to
   load and unload plates, and a floor you are allowed to drop weight on —
   none of which exists in the corner of a flat you share a wall and a
   ceiling with. Recommending bumper plates there is the kind of answer that
   tells a buyer we did not read their answer. */
const SPACE_BANS: Record<string, string[]> = {
  "apartment-corner": ["racks", "barbells", "plates"],
  /* "Outdoor" promises weather-proof picks, and until now the word appeared
     nowhere outside the quiz file — an outdoor answer built exactly the same
     kit as a garage. Weather is unkind to specific things, not to iron in
     general: cable stacks, bearings and consoles corrode, foam soaks and
     rots, and a mat left in UV goes brittle. Powder-coated iron, bumper
     rubber and a bench you can cover are genuinely fine, so they stay. */
  outdoor: ["machines", "cardio", "yogamats", "foamrollers"],
};
export function forbiddenCats(space: string): Set<string> {
  return new Set(SPACE_BANS[space] || []);
}

/* --- The room as a budget ---------------------------------------------
   Space used to be one boolean (`tight`), which made "garage" and "spare
   room" the same query: the personalization probe found garage and
   spare-room kits identical in 100% of cases, and apartment-corner and
   small-room likewise. A boolean can gate a category; only a budget can
   grade one, so the room is now spent in square feet the way money is
   spent in dollars.

   These are EQUIPMENT footprint budgets, not room sizes. A gym you can
   still move in fills roughly half its floor, and the accepted working
   minimum around a rack alone is an 8x8 ft platform. Raw footprints, no
   clearance halo — halos overlap in any real layout, so summing them
   would double-count the same aisle several times over. */
export const SPACE_SQFT: Record<string, number> = {
  "apartment-corner": 24, // a corner of a room you also live in
  "small-room": 55,       // a 10x10 spare room or home office
  garage: 150,            // a single-car bay given over to training
  outdoor: 120,           // a patio, deck or driveway
};
/* An unanswered space must not silently shrink anyone's kit. */
export const SPACE_SQFT_DEFAULT = 9999;

/* Folding and stowable gear — the `compact` flag: wall-folding racks,
   folding rowers, a cable tower — only holds its deployed footprint while
   you are actually training. Charging it full area is what would keep the
   folding rack, the one honest way to run a barbell in an apartment, out
   of apartments. */
const COMPACT_AREA_MULT = 0.5;
/* Held back per still-unfilled slot, so one big anchor cannot take the
   whole room and leave the bench that makes it usable with nowhere to go.
   The square-foot twin of RESERVE_PER_SLOT. */
const AREA_RESERVE_PER_SLOT = 2.5;

/* Floor area one piece costs the room, in square feet. */
export const areaOf = (id: string, cat: string, compact: boolean): number => {
  const { w, d } = footprintOf(id, cat);
  return ((w * d) / 144) * (compact ? COMPACT_AREA_MULT : 1);
};

/* `price` is what the kit is charged (sale price when there is one); `list` is
   the undiscounted price, kept so the builder can tell a real deal from a
   product that is merely cheap. */
export type Lite = {
  id: string; cat: string; price: number; list: number; quality: number;
  rating: number | null; gs: number; compact: boolean;
  /* Square feet of floor this piece costs — spent against the room budget
     exactly as `price` is spent against the money budget. */
  area: number;
  /* What this piece lets you train, and whether it stands in for a rack.
     See lib/coverage.ts — the kit is judged on the union of these. */
  trains: Partial<Record<Pattern, 1 | 2>>;
  rackLike: boolean;
  /* Ships without weight: useless until the kit has plates. */
  plateLoaded: boolean;
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
   happened to fill the budget exactly, is not a gym. The budget itself is never
   stretched on any tier: the answer is what they can spend, and two tiers used
   to overrun it by up to 2.4x. Footprints are documented approximations, so the
   room alone keeps a margin. (Lockstep: server.js.) */
const MIN_PIECES = 3;
const AREA_OVERFLOW = 1.35;
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
/* Plate-loaded machines need plates, and give plates a job without a barbell. */
const PLATE_LOADED_PAIR: [string, string[]] = ["machines", ["plates"]];
const usesPlates = (kit: { plateLoaded: boolean }[]) => kit.some((p) => p.plateLoaded);

/* Greedy one-per-category pick for a tier. Three distinct strategies so the
   kits never collapse into each other: value = cheapest decent option,
   match = personalised (GymGear Score + rating + budget fit), quality = best
   built. `tight` gates non-compact machines/cardio out of small spaces at
   product level (a cable tower fits an apartment corner; a G20 does not). */
export function buildKit(
  strategy: KitType,
  catalog: Lite[],
  { cap, areaCap, target, ownedCats, banned, order, tight, lowCeil, needs, goal, experience }: { cap: number; areaCap: number; target: number; ownedCats: Set<string>; banned: Set<string>; order: string[]; tight: boolean; lowCeil: boolean; needs: Partial<Record<Pattern, 1 | 2>>; goal: string; experience?: string | null },
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
  /* A single fixed-weight dumbbell pair is a real, buyable thing — just a
     worse "the kit's dumbbells" than an adjustable or a boxed multi-weight
     set, because it offers no range to progress through. Bounded like the
     deal weight: enough to decide between near-equal options, never enough to
     price an affordable fixed pair out of a kit that cannot afford a real
     range. Value stays untouched — "the cheapest thing that trains you" is
     its whole purpose, and a fixed pair is often exactly that. */
  const FIXED_PAIR_PENALTY = 0.5;
  const versatilityPenalty = (p: Lite) =>
    p.cat === "dumbbells" && FIXED_PAIR_DUMBBELLS.has(p.id) ? FIXED_PAIR_PENALTY : 0;
  const score = {
    value: (p: Lite) => -p.price,                                    // cheapest first (sale price)
    /* Unrated products fall back to our own score on the same 0-1 scale — gs
       already absorbs rating and re-weights when it is absent. Scoring 0
       would bury every unrated product out of the match tier permanently. */
    match: (p: Lite) =>
      (p.gs / 100) * 2 +
      (p.rating != null ? p.rating / 5 : p.gs / 100) +
      fit(p) * 1.5 +
      dealBoost(p) * DEAL_WEIGHT_MATCH -
      versatilityPenalty(p),
    quality: (p: Lite) => p.quality + fit(p) * 0.5 + dealBoost(p) * DEAL_WEIGHT_QUALITY - versatilityPenalty(p),
  }[strategy];
  const picks: Lite[] = [];
  let spent = 0;
  /* The room's running total, kept in step with `spent` by take()/drop(). */
  let areaUsed = 0;
  const blocked = new Set<string>();
  /* A rack and the machine that IS one (uprights + cables) are redundant
     together — but only a genuine all-in-one replaces a rack. Deriving this
     per product instead of per category is what stops a single-station leg
     press from blocking the rack and gutting the kit. */
  const conflicted = (p: Lite) =>
    (p.cat === "racks" && picks.some((q) => q.rackLike)) ||
    (p.rackLike && picks.some((q) => q.cat === "racks"));
  /* A leg press, row or GHD is an add-on to a gym, not the start of one: it
     once anchored kits as a $600 hack squat with no way to train anything else. */
  const hasBase = () => ownedCats.has("racks") || picks.some((q) => q.cat === "racks" || q.rackLike);
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
    /* The room rules this category out outright. Gated here as well as in
       hydrateKits: letting the builder spend slots on gear hydration will
       strip is how a kit arrives two pieces short. */
    !banned.has(p.cat) &&
    /* An EZ curl bar is not a barbell you can rack, bench or squat. */
    !SPECIALTY_BARS.has(p.id) &&
    /* One 10 lb pair is not the kit's plates. */
    !SMALL_PLATE_PAIRS.has(p.id) &&
    /* A kit total has to be what the buyer pays for what we list. */
    !PRICED_BY_SIZE.has(p.id) &&
    /* A foam roller or massage ball trains nothing, so it never takes one of
       the kit's slots: a $99 "strength kit" once spent $20 of it on a ball. */
    p.cat !== "foamrollers" &&
    !(p.cat === "machines" && !p.rackLike && !hasBase()) &&
    /* The room bans plates, so a plate-loaded machine could never be loaded. */
    !(p.plateLoaded && banned.has("plates")) &&
    /* A 90-115 lb-per-hand fixed pair is only anyone's dumbbells if they said
       they are advanced: the quiz no longer asks everyone, and unstated must not
       read as strong. It is also not what lose-weight/get-fit training needs,
       which wants a load light enough to do many reps at, not one heavy top-end
       number. The softer versatility penalty above still nudges an advanced
       lifter toward a real range when they can afford it. */
    !(HEAVY_FIXED_PAIR_DUMBBELLS.has(p.id) && (experience !== "advanced" || goal === "lose-weight" || goal === "get-fit")) &&
    !(tight && (p.cat === "machines" || p.cat === "cardio" || p.cat === "racks") && !p.compact) &&
    !(lowCeil && p.cat === "racks" && !LOW_CEIL_RACKS.has(p.id)) &&
    !(lowCeil && p.cat === "machines" && !LOW_CEIL_MACHINES.has(p.id));
  /* Everything except the budget test — reused by the usability pass, which
     spends against a stretched cap rather than the tier cap. */
  const allowed = (p: Lite) =>
    !blocked.has(p.cat) && !conflicted(p) && eligible(p);
  const fitsIn = (p: Lite, budget: number) => spent + p.price <= budget;
  /* The room's twin of fitsIn — same shape, same reserve discipline, so a
     piece has to clear BOTH budgets to be picked. */
  const areaFits = (p: Lite, budget: number) => areaUsed + p.area <= budget;
  /* Hold budget back for the slots still to fill. Without this a single
     greedy anchor takes the lot — the $295 dumbbell under a $300 cap that
     left users looking at a one-item "kit". */
  const reserve = () => Math.max(0, target - picks.length - 1) * RESERVE_PER_SLOT;
  const areaReserve = () => Math.max(0, target - picks.length - 1) * AREA_RESERVE_PER_SLOT;
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
    /* Eligible only: reserving the price of a curl bar or a 10 lb pair left too
       little for the bar and plates the kit would really buy. */
    const eligibleHere = catalog.filter((q) => q.cat === cat && eligible(q));
    const full = eligibleHere.filter((q) => !LIGHT_PIECES.has(q.id));
    const all = full.length ? full : eligibleHere;
    const good = all.filter((q) => q.quality >= 7);
    return (good.length ? good : all).reduce(
      (m, q) => (!m || q.price < m.price ? q : m),
      undefined as Lite | undefined,
    );
  };
  const cheapestByCat: Record<string, Lite | undefined> = {};
  for (const need of new Set(Object.values(HARD_PAIRS).flat())) cheapestByCat[need] = cheapestIn(need);
  const partnersOf = (p: Lite, kit: Lite[]) =>
    p.plateLoaded ? PLATE_LOADED_PAIR[1] : p.cat === "plates" && usesPlates(kit) ? [] : HARD_PAIRS[p.cat] || [];
  const pairHeld = (p: Lite) =>
    partnersOf(p, picks).reduce(
      (s, need) =>
        picks.some((q) => q.cat === need) || ownedCats.has(need)
          ? s
          : s + (cheapestByCat[need]?.price ?? 0),
      0,
    );
  const pickable = (p: Lite) =>
    allowed(p) &&
    fitsIn(p, cap - reserve() - benchHeld(p) - pairHeld(p)) &&
    areaFits(p, areaCap - areaReserve());
  const take = (p: Lite) => {
    picks.push(p); spent += p.price; areaUsed += p.area; blocked.add(p.cat);
  };
  for (const cat of order) {
    if (picks.length >= target) break;
    if (blocked.has(cat) || ownedCats.has(cat)) continue;
    let cands = catalog.filter((p) => p.cat === cat && pickable(p));
    /* Nothing clears the reserve? Fall back to the plain cap, so holding
       budget back can never silently drop a category entirely. */
    if (!cands.length)
      cands = catalog.filter(
        (p) => p.cat === cat && allowed(p) && fitsIn(p, cap - benchHeld(p) - pairHeld(p)) &&
          /* The room is a hard fact, so it keeps its full budget here even
             though the money reserve is being relaxed. */
          areaFits(p, areaCap),
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
  const stretch = cap;
  /* The usability passes may overrun the room, not the money: these footprints
     are documented approximations, and a kit that is a few square feet
     optimistic beats one with free weights and nothing to press them on. */
  const areaStretch = areaCap * AREA_OVERFLOW;
  const drop = (i: number) => {
    spent -= picks[i].price;
    areaUsed -= picks[i].area;
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
      let simArea = areaUsed;
      /* Both budgets, one plan: a bench can be unaffordable OR homeless, and
         trading only against the money would seat it in a room with no floor
         left for it. */
      while (sim + bench.price > stretch || simArea + bench.area > areaStretch) {
        let worst = -1;
        picks.forEach((p, i) => {
          if (cut.has(i) || !DROP_FOR_BENCH.has(p.cat)) return;
          if (p.cat === "plates" && usesPlates(picks)) return;
          /* Never cut the last piece that justifies the bench. */
          if (NEEDS_BENCH.has(p.cat) && !picks.some((q, j) => j !== i && !cut.has(j) && NEEDS_BENCH.has(q.cat))) return;
          if (worst < 0 || p.price > picks[worst].price) worst = i;
        });
        if (worst < 0) break;
        cut.add(worst);
        sim -= picks[worst].price;
        simArea -= picks[worst].area;
      }
      if (sim + bench.price <= stretch && simArea + bench.area <= areaStretch) {
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
    for (const [cat, needsCats] of [...Object.entries(HARD_PAIRS), PLATE_LOADED_PAIR]) {
      const anchor = picks.findIndex((p) => p.cat === cat && (cat !== "machines" || p.plateLoaded));
      if (anchor < 0) continue;
      const missing = (cat === "plates" && usesPlates(picks) ? [] : needsCats)
        .filter((n) => !picks.some((p) => p.cat === n) && !ownedCats.has(n));
      if (!missing.length) continue;
      /* Price the WHOLE set of missing partners before buying any of it.
         Buying them one at a time and dropping the last one bought when the
         next turned out unaffordable made this oscillate: it bought a bar to
         satisfy the rack, dropped the bar because it could not also afford
         plates, then bought the bar again next pass — six times over, ending
         with the rack still orphaned for hydrateKits to strip. The piece that
         has to go is the anchor that cannot afford its partners, not the
         partner that exposed it. */
      const chosen: Lite[] = [];
      let ok = true, sim = spent, simArea = areaUsed;
      for (const need of missing) {
        const cands = catalog.filter((p) =>
          p.cat === need && allowed(p) && sim + p.price <= stretch && simArea + p.area <= areaStretch);
        const decent = cands.filter((p) => p.quality >= 7);
        const partner = (decent.length ? decent : cands).sort((a, b) => a.price - b.price)[0];
        if (!partner) { ok = false; break; }
        chosen.push(partner);
        sim += partner.price;
        simArea += partner.area;
      }
      if (ok) chosen.forEach(take);
      else drop(anchor);
      changed = true;
      break;
    }
    if (!changed) break;
  }

  /* Budget left and slots left → add value picks from any remaining category. */
  if (picks.length < target) {
    const extra = catalog
      .filter(pickable)
      /* The partner pass has already run, so nothing here could get its
         partners: hydrateKits would strip it and the kit would come up short. */
      .filter((p) => partnersOf(p, picks).every((n) => picks.some((q) => q.cat === n) || ownedCats.has(n)))
      /* Fill the remaining slots the way this tier picks everything else — a
         filler slot is still a slot the buyer sees, and value-per-dollar
         regardless of tier would put the cheapest thing that clears the bar
         into a Best Quality kit. Latent today (the greedy pass almost always
         reaches `target` on its own, and this changed no kit across the 8,640
         the audit builds), but the sort is wrong on its own terms.
         The coverage repair below stays deliberately cheapest-first: that one
         is closing a gap, not expressing the tier. */
      .sort((a, b) => score(b) - score(a));
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
      .filter((p) => p.cat !== "benches" && !HARD_PAIRS[p.cat] && !p.plateLoaded && allowed(p) && fitsIn(p, stretch) && areaFits(p, areaStretch))
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
  /* The repair runs AFTER the hard-pair pass, so anything it adds keeps
     whatever partners it arrives with. A rack bought here to restore
     pull-ups has no bar and no plates behind it, and hydrateKits' orphan
     prune then strips it right back out — reopening the exact gap this pass
     just closed, which is how an outdoor "home gym" went out with no way to
     pull. A patch may only use gear that stands on its own. */
  const standsAlone = (p: Lite) =>
    partnersOf(p, picks).every((n) => picks.some((q) => q.cat === n) || ownedCats.has(n));
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
      .filter((p) => allowed(p) && !picks.some((q) => q.cat === p.cat) && standsAlone(p) && fitsIn(p, stretch) && areaFits(p, areaStretch))
      .filter((p) => coverageFromTrains([...[...picks, p].map((q) => ({ category: q.cat, trains: q.trains })), ...owned])[pat] >= want)
      .sort((a, b) => a.price - b.price);
    if (!fixes.length) {
      /* Nothing AFFORDABLE closes the gap — which on a small budget can mean
         the kit spent its last $3 on a jump rope and cannot reach a $12 band.
         Coverage outranks an accessory, so trade the priciest piece the kit
         can lose for the piece that closes the hole. seatBench() trades the
         same way and for the same reason. */
      const cheapestFix = catalog
        .filter((p) => allowed(p) && !picks.some((q) => q.cat === p.cat) && standsAlone(p) && areaFits(p, areaStretch))
        .filter((p) => coverageFromTrains([...[...picks, p].map((q) => ({ category: q.cat, trains: q.trains })), ...owned])[pat] >= want)
        .sort((a, b) => a.price - b.price)[0];
      if (!cheapestFix) break;
      const traded = picks
        .map((p, i) => ({ p, i }))
        /* Never trade away the bench, the free weights that justify it, or
           either half of a hard pair — those trades just move the breakage. */
        .filter(({ p }) => p.cat !== "benches" && !NEEDS_BENCH.has(p.cat) && !HARD_PAIRS[p.cat])
        /* Only a trade that actually pays for the fix, so the kit never loses
           a piece for nothing. */
        .filter(({ p }) => spent - p.price + cheapestFix.price <= stretch)
        /* And never one that surrenders a need the kit already meets, judged
           with the fix in place: dumbbells can take over a kettlebell's job. */
        .filter(({ i }) => {
          const after = coverageFromTrains([
            ...[...picks.filter((_, j) => j !== i), cheapestFix].map((q) => ({ category: q.cat, trains: q.trains })),
            ...owned,
          ]);
          return (Object.entries(needs) as [Pattern, 1 | 2][])
            .every(([k, v]) => cov[k] < v || after[k] >= v);
        })
        .sort((a, b) => b.p.price - a.p.price)[0];
      if (!traded) break;
      drop(traded.i);
      take(cheapestFix);
      continue;
    }
    take(fixes[0]);
  }
  /* Repair can bring in the free weights that make a bench worth having. */
  seatBench();

  /* With the budget now a hard limit, a greedy kit can spend itself out of ever
     being a gym: a $295 bench and kettlebell, no way left to pull. When that
     happens, find the cheapest set that does work and spend what remains the
     way this tier spends everything. Only the cheapest usable piece of each
     category is tried, which keeps the search small (at most 4,096 sets). */
  const meetsNeeds = (kit: Lite[]) => {
    const cov = coverageFromTrains([...kit.map((q) => ({ category: q.cat, trains: q.trains })), ...owned]);
    return (Object.entries(needs) as [Pattern, 1 | 2][]).every(([k, v]) => cov[k] >= v);
  };
  const unseated = () =>
    picks.some((p) => NEEDS_BENCH.has(p.cat)) && !ownedCats.has("benches") && !picks.some((p) => p.cat === "benches");
  /* seatBench can trade away a bar, leaving a rack hydrateKits would then strip. */
  const orphaned = () =>
    picks.some((p) => partnersOf(p, picks).some((n) => !ownedCats.has(n) && !picks.some((q) => q.cat === n)));
  if (picks.length < MIN_PIECES || !meetsNeeds(picks) || unseated() || orphaned()) {
    while (picks.length) drop(0);
    const pool = KIT_CATEGORIES.map(cheapestIn).filter((p): p is Lite => Boolean(p));
    let plan: Lite[] | null = null;
    let planCost = Infinity;
    for (let mask = 1; mask < 1 << pool.length; mask++) {
      const kit = pool.filter((_, i) => mask & (1 << i));
      const cost = kit.reduce((t, p) => t + p.price, 0);
      if (cost > cap || cost >= planCost || kit.length < MIN_PIECES) continue;
      if (kit.reduce((t, p) => t + p.area, 0) > areaStretch) continue;
      if (kit.some((p) => p.cat === "racks") && kit.some((p) => p.rackLike)) continue;
      if (kit.some((p) => NEEDS_BENCH.has(p.cat)) && !ownedCats.has("benches") && !kit.some((p) => p.cat === "benches")) continue;
      if (kit.some((p) => partnersOf(p, kit).some((n) => !ownedCats.has(n) && !kit.some((q) => q.cat === n)))) continue;
      if (!meetsNeeds(kit)) continue;
      plan = kit;
      planCost = cost;
    }
    (plan ?? []).forEach(take);
    const seated = ownedCats.has("benches") || picks.some((p) => p.cat === "benches");
    for (const p of catalog.filter((q) => !HARD_PAIRS[q.cat] && !q.plateLoaded && q.cat !== "benches" && (seated || !NEEDS_BENCH.has(q.cat))).sort((a, b) => score(b) - score(a))) {
      if (picks.length >= target) break;
      if (allowed(p) && fitsIn(p, cap) && areaFits(p, areaStretch)) take(p);
    }
  }

  /* Money left after the planned number of pieces may buy up to two more, but
     only pieces that let the buyer train something they couldn't before. A
     $300 fat-loss plan once stopped at $107 because three pieces was the count.
     Not in an apartment corner or small room: there the floor runs out first,
     so spare money goes to better pieces below instead. */
  const levels = (c: Coverage) => PATTERNS.reduce((s, k) => s + c[k], 0);
  if (strategy !== "value" && !tight) {
    while (picks.length < target + 2) {
      const before = levels(coverNow());
      const seatedNow = ownedCats.has("benches") || picks.some((q) => q.cat === "benches");
      const gainOf = (p: Lite) =>
        levels(coverageFromTrains([...[...picks, p].map((q) => ({ category: q.cat, trains: q.trains })), ...owned])) - before;
      const add = catalog
        .filter((p) => allowed(p) && standsAlone(p) && (seatedNow || !NEEDS_BENCH.has(p.cat)) &&
          fitsIn(p, cap) && areaFits(p, areaCap) && gainOf(p) > 0)
        .sort((a, b) => gainOf(b) - gainOf(a) || score(b) - score(a))[0];
      if (!add) break;
      take(add);
    }
  }

  /* Spend what's left on better pieces, not more of them. The recommended plan
     once used $99 of a $300 budget and padded it with a massage ball. Each
     piece may move to a better one of the same kind, as this tier judges
     better, if the kit stays in budget, in the room, and able to train
     everything it could before. Value is left alone: cheapest is its job. */
  if (strategy !== "value") {
    for (let i = 0; i < picks.length; i++) {
      const cur = picks[i];
      const before = coverNow();
      const up = catalog
        .filter((p) => {
          if (p.cat !== cur.cat || p.id === cur.id || score(p) <= score(cur) || !eligible(p)) return false;
          if (p.plateLoaded !== cur.plateLoaded || p.rackLike !== cur.rackLike) return false;
          if (spent - cur.price + p.price > cap) return false;
          if (areaUsed - cur.area + p.area > Math.max(areaCap, areaUsed)) return false;
          const after = coverageFromTrains([
            ...picks.map((q, j) => (j === i ? p : q)).map((q) => ({ category: q.cat, trains: q.trains })),
            ...owned,
          ]);
          return PATTERNS.every((k) => after[k] >= before[k]);
        })
        .sort((a, b) => score(b) - score(a))[0];
      if (up) {
        spent += up.price - cur.price;
        areaUsed += up.area - cur.area;
        picks[i] = up;
      }
    }
  }

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
            /* Same slot, but not necessarily the same size — a discounted
               piece that no longer fits the room is not a deal. */
            areaUsed - cur.area + p.area <= areaStretch &&
            eligible(p) &&
            /* An all-in-one swapped in next to a rack is the redundancy the
               rack-like rule exists to prevent. */
            !(p.rackLike && picks.some((q, j) => j !== i && q.cat === "racks")) &&
            /* Nor may a swap bring in a machine the kit has no plates for. */
            (!p.plateLoaded || cur.plateLoaded || picks.some((q) => q.cat === "plates")) &&
            keepsCoverage(i, p),
        )
        .sort((a, b) => b.quality + dealBoost(b) * 2 - (a.quality + dealBoost(a) * 2))[0];
      if (alt) {
        spent += alt.price - cur.price;
        areaUsed += alt.area - cur.area;
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
  return labelByPrice(rawKits
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
      /* buildKit already holds itself to this budget, so anything caught here
         is a genuine overrun from the filtering above. */
      const cap = budgetCap;
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
        const loaded = products.some(isPlateLoaded);
        const base = cats.has("racks") || ownedCats.has("racks") || products.some((p) => replacesRack(p.category, p.specs));
        const orphan = products.findIndex((p) =>
          (isPlateLoaded(p) ? PLATE_LOADED_PAIR[1] : p.category === "plates" && loaded ? [] : HARD_PAIRS[p.category] || [])
            .some((n) => !cats.has(n) && !ownedCats.has(n)) ||
          (p.category === "machines" && !replacesRack(p.category, p.specs) && !base),
        );
        if (orphan < 0) break;
        total -= priceOf(products[orphan]);
        products.splice(orphan, 1);
      }
      /* A bench with no weight of any kind beside it is the same dead weight. */
      if (
        products.some((p) => p.category === "benches") &&
        !products.some((p) => BENCH_USABLE_WITH.has(p.category)) &&
        /* Their own barbell or dumbbells count: that is what the bench is for. */
        ![...ownedCats].some((c) => BENCH_USABLE_WITH.has(c))
      ) {
        const i = products.findIndex((p) => p.category === "benches");
        total -= priceOf(products[i]);
        products.splice(i, 1);
      }
      return { type: k.type, name: k.name, description: "", products, totalPrice: total };
    })
    .filter((k) => k.products.length > 0));
}

/* The labels go by final price: each tier is its own search, so "Best Value"
   came out dearer than "Best Match" in 1 of 12 answer sets, once $796 against
   $259. A buyer reads the label as a price promise. (Lockstep: server.js.) */
function labelByPrice(kits: HydratedKit[]): HydratedKit[] {
  const slots = kits.map(({ type, name }) => ({ type, name }));
  return [...kits]
    .sort((a, b) => a.totalPrice - b.totalPrice)
    .map((k, i) => ({ ...k, ...slots[i] }));
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

  const areaCap = SPACE_SQFT[a.space || ""] ?? SPACE_SQFT_DEFAULT;

  const lite: Lite[] = KIT_CATEGORIES.flatMap((cat) =>
    (catalog[cat] || []).map((p) => ({
      id: p.id, cat, price: priceOf(p), list: p.price, quality: p.quality, rating: p.rating,
      gs: p.gymgearScore || 0, compact: !!p.compact,
      area: areaOf(p.id, cat, !!p.compact),
      trains: trainsOf({ id: p.id, category: cat, specs: p.specs }),
      rackLike: replacesRack(cat, p.specs),
      plateLoaded: isPlateLoaded({ category: cat, name: p.name, specs: p.specs }),
    })),
  );
  const byId = new Map(all.map((p) => [p.id, p]));

  const rawKits = KIT_TIERS.map((t) => ({
    ...t,
    productIds: buildKit(t.type, lite, {
      cap, areaCap, target, ownedCats, banned: forbidden, order, tight, lowCeil, needs,
      goal: a.goal, experience: a.experience,
    }),
  }));
  return hydrateKits(rawKits, byId, cap, forbidden, ownedCats, tight, lowCeil, a.goal);
}
