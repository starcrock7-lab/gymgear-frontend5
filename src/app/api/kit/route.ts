import { NextResponse } from "next/server";
import { getCategoryProducts } from "@/lib/catalog";
import type { KitProduct, KitType } from "@/lib/kit";
import type { QuizAnswers } from "@/lib/quiz";

/* Local port of the backend's deterministic kit builder (server.js — KIT
   BUILDER section). The quiz's "Building your kit..." screen is the site's
   one conversion moment, and the Render free tier sleeps after 15 minutes —
   a direct POST there costs the first visitor a 30–60s cold start. Building
   the kit here means the funnel never waits on Render: product data comes
   from the same hourly ISR fetch cache the catalog pages already use (see
   lib/catalog.ts), which is populated at build time and refreshed in the
   background, so a sleeping backend never blocks a response.

   Selection is a straight port and must stay in lockstep with server.js —
   same constants, same strategies, same budget trim — so local and backend
   kits never diverge. The backend's optional Groq copy pass is deliberately
   dropped: it needs a server-side key we don't keep on Vercel, and the
   templated copy below is the same text the backend falls back to. */

/* Categories that belong in a home-gym kit, in build-priority order. */
const KIT_CATEGORIES = [
  "racks", "machines", "barbells", "plates", "benches", "dumbbells", "kettlebells",
  "cardio", "bands", "jumpropes", "yogamats", "foamrollers",
];

/* Accessory categories for "frequently bought together", in research-backed
   priority order (flooring, then grip/support, then recovery/bag, then
   supplements). fatburners deliberately excluded — never cross-sold. */
const ACCESSORY_PRIORITY = [
  "yogamats", "chalk", "belts", "sleeves", "straps", "wraps", "foamrollers",
  "jumpropes", "gymbags", "protein", "creatine", "preworkout", "recovery",
  "vitamins",
];

const BUDGET_CAP: Record<string, number> = {
  "under-300": 300, "300-800": 800, "800-2000": 2000, "2000-plus": 8000,
};
const PIECE_TARGET: Record<string, number> = {
  "key-pieces": 2, "small-setup": 4, "full-home-gym": 6,
};
const OWNED_TO_CAT: Record<string, string> = {
  barbell: "barbells", dumbbells: "dumbbells", bench: "benches",
  rack: "racks", cardio: "cardio",
};

/* Per-tier budget tolerance: Best Value stays at budget, Best Match flexes
   slightly, Best Quality is the aspirational stretch shown side by side. */
const TIER_CAP_MULT: Record<KitType, number> = { value: 1, match: 1.15, quality: 1.8 };
const capFor = (type: KitType, cap: number) => Math.round(cap * (TIER_CAP_MULT[type] || 1));

/* The catalog API also stamps pairsWith (the primary categories an accessory
   completes) onto every product; lib/kit.ts doesn't declare it because only
   this builder reads it. */
type CatalogProduct = KitProduct & {
  pairsWith?: string[];
  gymgearScore?: number; // backend-computed 0-100 score, used by the match tier
  compact?: boolean;     // machines/cardio: fits a small room / apartment corner
};
type Catalog = Record<string, CatalogProduct[]>;

const priceOf = (p: CatalogProduct) => p.salePrice || p.price;

/* Bias the category order so the kit reflects goal + space + kit size.
   Machines placement is the small-vs-big trade: a small setup leads with one
   efficient all-in-one; a full home gym prefers the variety of separates and
   only reaches a machine after the core iron is in. (Lockstep: server.js.) */
function categoryOrder(goal: string, space: string, pieces: number): string[] {
  let order = [...KIT_CATEGORIES];
  const bump = (cats: string[]) => {
    order = [...cats, ...order.filter((c) => !cats.includes(c))];
  };
  if (goal === "lose-weight" || goal === "get-fit")
    bump(["cardio", "kettlebells", "bands", "dumbbells"]);
  if (goal === "build-strength") bump(["racks", "barbells", "plates", "benches"]);
  if (goal === "home-gym-setup") bump(["machines", "racks", "barbells", "benches"]);
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
function forbiddenCats(_space: string): Set<string> {
  return new Set();
}

type Lite = { id: string; cat: string; price: number; quality: number; rating: number; gs: number; compact: boolean };

/* A machine already IS a rack + cables — a kit holding both is redundant;
   whichever lands first blocks the other. (Lockstep: server.js.) */
const EXCLUSIVE_WITH: Record<string, string[]> = { machines: ["racks"], racks: ["machines"] };

/* How much of the per-slot budget a category deserves. Anchors (machine,
   rack, cardio) soak up multiples of an even share; small accessories a
   fraction. This is what lets a $300 kit and a $2,000 kit pick DIFFERENT
   products in the same category instead of always the same list-topper. */
const CAT_SHARE: Record<string, number> = {
  machines: 2.6, racks: 2.2, cardio: 2.2, plates: 1.6, barbells: 1.4,
  dumbbells: 1.4, benches: 1.2, kettlebells: 0.6, yogamats: 0.3,
  bands: 0.25, foamrollers: 0.25, jumpropes: 0.2,
};

/* Greedy one-per-category pick for a tier. Three distinct strategies so the
   kits never collapse into each other: value = cheapest decent option,
   match = personalised (GymGear Score + rating + budget fit), quality = best
   built. `tight` gates non-compact machines/cardio out of small spaces at
   product level (a cable tower fits an apartment corner; a G20 does not). */
function buildKit(
  strategy: KitType,
  catalog: Lite[],
  { cap, target, ownedCats, order, tight }: { cap: number; target: number; ownedCats: Set<string>; order: string[]; tight: boolean },
): string[] {
  const perSlot = cap / Math.max(target, 1);
  /* 1.0 when the price sits at the category's ideal share of budget, falling
     off above (over budget hurts fast) and below (a $10 item isn't an anchor). */
  const fit = (p: Lite) => {
    const ideal = perSlot * (CAT_SHARE[p.cat] || 1);
    const r = p.price / Math.max(ideal, 1);
    return r > 1 ? Math.max(0, 2 - r) : 0.4 + 0.6 * r;
  };
  const score = {
    value: (p: Lite) => -p.price,                                    // cheapest first
    match: (p: Lite) => (p.gs / 100) * 2 + p.rating / 5 + fit(p) * 1.5, // score+rating+budget fit
    quality: (p: Lite) => p.quality + fit(p) * 0.5,                  // best built, fit breaks ties
  }[strategy];
  const picks: Lite[] = [];
  let spent = 0;
  const blocked = new Set<string>();
  const pickable = (p: Lite) =>
    !blocked.has(p.cat) && !ownedCats.has(p.cat) && spent + p.price <= cap &&
    !(tight && (p.cat === "machines" || p.cat === "cardio" || p.cat === "racks") && !p.compact);
  const take = (p: Lite) => {
    picks.push(p); spent += p.price; blocked.add(p.cat);
    for (const c of EXCLUSIVE_WITH[p.cat] || []) blocked.add(c);
  };
  for (const cat of order) {
    if (picks.length >= target) break;
    if (blocked.has(cat) || ownedCats.has(cat)) continue;
    let cands = catalog.filter((p) => p.cat === cat && pickable(p));
    /* Value still wants decent gear — gate to quality ≥7 unless nothing fits. */
    if (strategy === "value") {
      const decent = cands.filter((p) => p.quality >= 7);
      if (decent.length) cands = decent;
    }
    const best = cands.sort((a, b) => score(b) - score(a))[0];
    if (best) take(best);
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
  return picks.map((p) => p.id);
}

const KIT_TIERS: { type: KitType; name: string }[] = [
  { type: "value", name: "Best Value" },
  { type: "match", name: "Best Match" },
  { type: "quality", name: "Best Quality" },
];

type HydratedKit = {
  type: KitType; name: string; description: string;
  products: CatalogProduct[]; totalPrice: number;
};

/* Hydrate the chosen IDs into full product objects, then enforce the hard
   constraints: drop space-forbidden and owned categories, dedupe by category,
   and trim to the tier budget (budget beats piece count). */
function hydrateKits(
  rawKits: { type: KitType; name: string; productIds: string[] }[],
  byId: Map<string, CatalogProduct>,
  budgetCap: number,
  forbidden: Set<string>,
  ownedCats: Set<string>,
  tight: boolean,
): HydratedKit[] {
  return rawKits
    .map((k) => {
      let products = k.productIds
        .map((id) => byId.get(id))
        .filter((p): p is CatalogProduct => Boolean(p))
        .filter((p) => !forbidden.has(p.category) && !ownedCats.has(p.category))
        /* Full-size machines, treadmill-class cardio and normal racks can't
           live in a tight space (compact units — cable tower, folding rower,
           wall-folding rack — can). */
        .filter((p) => !(tight && (p.category === "machines" || p.category === "cardio" || p.category === "racks") && !p.compact));
      /* Dedupe by category so a kit never lists two benches — and never a
         machine AND a rack (the machine already is one). */
      const seen = new Set<string>();
      products = products.filter((p) => {
        if (seen.has(p.category)) return false;
        for (const c of EXCLUSIVE_WITH[p.category] || []) if (seen.has(c)) return false;
        seen.add(p.category);
        return true;
      });
      const cap = capFor(k.type, budgetCap);
      let total = products.reduce((s, p) => s + priceOf(p), 0);
      while (total > cap && products.length > 1) {
        const i = products.reduce((mi, p, idx, a) => (priceOf(p) > priceOf(a[mi]) ? idx : mi), 0);
        total -= priceOf(products[i]);
        products.splice(i, 1);
      }
      return { type: k.type, name: k.name, description: "", products, totalPrice: total };
    })
    .filter((k) => k.products.length > 0);
}

/* Templated copy — identical to the backend's no-Groq fallback, never blank. */
const GOAL_WORD: Record<string, string> = {
  "build-strength": "strength", "lose-weight": "fat-loss",
  "get-fit": "all-round fitness", "home-gym-setup": "complete home-gym",
};
function defaultCopy(kit: HydratedKit, goal: string): { name: string; description: string } {
  const lead = kit.products[0]?.name || "your essentials";
  const word = GOAL_WORD[goal] || "training";
  const blurb = {
    value: `The smartest ${word} setup for the money, anchored by the ${lead}.`,
    match: `Balanced for your space and budget — built around the ${lead}.`,
    quality: `Buy-once gear that lasts a lifetime, led by the ${lead}.`,
  }[kit.type] || `A ${word} kit built around the ${lead}.`;
  return { name: kit.name, description: blurb };
}

/* Top complementary accessories for the kit — relevant (pairsWith ∩ kit
   categories), not already in the kit or owned, best-rated per category. */
function accessoryPool(kits: HydratedKit[], catalog: Catalog, ownedCats: Set<string>, max = 8): CatalogProduct[] {
  const kitCats = new Set<string>();
  for (const k of kits) for (const p of k.products) kitCats.add(p.category);
  if (!kitCats.size) return [];
  const pool: CatalogProduct[] = [];
  for (const cat of ACCESSORY_PRIORITY) {
    if (pool.length >= max) break;
    if (kitCats.has(cat) || ownedCats.has(cat)) continue;
    const list = catalog[cat];
    if (!list || !list.length) continue;
    const pw = list[0].pairsWith || [];
    if (!pw.some((c) => kitCats.has(c))) continue;
    const best = [...list].sort((a, b) => b.rating - a.rating || b.quality - a.quality)[0];
    if (best) pool.push(best);
  }
  return pool;
}

/* "Why add this" per accessory category — the backend's deterministic copy,
   dash-free house style. */
const WHY_FALLBACK: Record<string, string> = {
  yogamats: "Your setup is built for standing lifts with nothing for floor core, mobility, or stretching. The mat fills that gap, it is the cheapest piece here, and you will use it every session.",
  chalk: "Heavy pulls and presses slip at the grip long before the muscle gives out. A little chalk keeps the bar locked in and adds clean reps to every working set.",
  belts: "As your squat and deadlift climb, your lower back becomes the limit. A belt braces your core so you can load heavier with confidence and keep progressing.",
  sleeves: "Heavy squats and leg work wear on the knees over time. Sleeves add warmth, support, and rebound out of the bottom so you train harder and recover faster.",
  straps: "Your back and legs will outwork your grip on rows and pulls. Straps remove grip as the weak link so you can drive the target muscle all the way to failure.",
  wraps: "Heavy pressing loads the wrists hard. Wraps keep the joint stacked and stable so you can push your bench and overhead work without holding back.",
  foamrollers: "Hard sessions leave tight, sore muscles that drag into the next one. A few minutes on the roller restores range of motion and keeps you training pain free.",
  jumpropes: "Your kit has no fast conditioning option. A rope packs high intensity cardio into almost no space and pairs cleanly with your strength work.",
  gymbags: "Plates, belt, sleeves, and chalk add up quickly. A dedicated bag keeps your gear organized and ready so nothing slows your session down.",
  protein: "Building muscle needs more protein than most meals deliver. One scoop after training hits your daily target and turns the work into real results.",
  creatine: "Creatine is the most proven supplement for strength and size. A few grams a day buys extra reps, faster recovery, and lean mass for pocket change.",
  preworkout: "Some days the drive just is not there. A single scoop sharpens focus and energy so even the flat days turn into productive sessions.",
  recovery: "Your training is only as good as how well you recover from it. This keeps soreness down and gets you back under the bar sooner.",
  vitamins: "Consistent training raises what your body needs to perform. Covering the basics keeps your energy, recovery, and immunity steady so you never miss a session.",
};
const defaultWhy = (p: CatalogProduct) =>
  WHY_FALLBACK[p.category] ||
  "A smart, low cost addition that rounds out your setup and earns its place fast.";

/* Every category the builder or the accessory pool can draw from. Each
   getCategoryProducts call is an ISR-cached fetch (deduped by Next), so a
   warm cache answers this without touching the backend at all. */
const ALL_CATS = [...new Set([...KIT_CATEGORIES, ...ACCESSORY_PRIORITY])];

/* Fetch in small waves rather than one 25-wide burst — on a cold cache every
   category is a live request, and bursts have dropped connections (observed
   locally: five core categories failed silently and the builder shipped a
   visibly thinner kit). Anything that still fails gets one sequential retry;
   a category that fails twice stays empty and is reported by the caller. */
async function loadCatalog(): Promise<Catalog> {
  const out: Catalog = {};
  const failed: string[] = [];
  const WAVE = 8;
  for (let i = 0; i < ALL_CATS.length; i += WAVE) {
    await Promise.all(
      ALL_CATS.slice(i, i + WAVE).map(async (cat) => {
        try {
          out[cat] = (await getCategoryProducts(cat)) as CatalogProduct[];
        } catch {
          failed.push(cat);
        }
      }),
    );
  }
  for (const cat of failed) {
    try {
      out[cat] = (await getCategoryProducts(cat)) as CatalogProduct[];
    } catch {
      out[cat] = [];
    }
  }
  return out;
}

export async function POST(req: Request) {
  let a: Partial<QuizAnswers>;
  try {
    a = (await req.json()) as Partial<QuizAnswers>;
  } catch {
    a = {};
  }
  if (!a.goal || !a.budget)
    return NextResponse.json({ error: "Send at least goal and budget." }, { status: 400 });

  const catalog = await loadCatalog();
  const all = Object.values(catalog).flat();
  /* A few missing categories degrade gracefully; more than that means the
     catalog source is down and the kit would be visibly wrong — surface the
     quiz's retry state instead of quietly shipping a junk cart. */
  const missing = KIT_CATEGORIES.filter((c) => !(catalog[c] || []).length);
  if (missing.length > 3) {
    console.warn(`kit route: catalog missing [${missing.join(", ")}] — refusing degraded kit`);
    return NextResponse.json({ error: "Catalog unavailable, try again." }, { status: 503 });
  }
  if (missing.length)
    console.warn(`kit route: building without [${missing.join(", ")}]`);

  const cap = BUDGET_CAP[a.budget] || 2000;
  const target = PIECE_TARGET[a.equipmentCount || ""] || 4;
  const forbidden = forbiddenCats(a.space || "");
  const ownedCats = new Set((a.owned || []).map((id) => OWNED_TO_CAT[id]).filter(Boolean));
  const order = categoryOrder(a.goal, a.space || "", target);
  const tight = a.space === "apartment-corner" || a.space === "small-room";

  const lite: Lite[] = KIT_CATEGORIES.flatMap((cat) =>
    (catalog[cat] || []).map((p) => ({
      id: p.id, cat, price: priceOf(p), quality: p.quality, rating: p.rating,
      gs: p.gymgearScore || 0, compact: !!p.compact,
    })),
  );
  const byId = new Map(all.map((p) => [p.id, p]));

  const rawKits = KIT_TIERS.map((t) => ({
    ...t,
    productIds: buildKit(t.type, lite, {
      cap: capFor(t.type, cap), target, ownedCats, order, tight,
    }),
  }));
  const kits = hydrateKits(rawKits, byId, cap, forbidden, ownedCats, tight).map((k) => ({
    ...k,
    ...defaultCopy(k, a.goal as string),
  }));

  const accessories = accessoryPool(kits, catalog, ownedCats)
    .slice(0, 4)
    .map((p) => ({ ...p, whyAdd: defaultWhy(p) }));

  return NextResponse.json({
    kits,
    accessories,
    generatedBy: "fallback",
    generatedAt: new Date().toISOString(),
  });
}
