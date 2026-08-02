import { NextResponse } from "next/server";
import { getCategoryProducts } from "@/lib/catalog";
import type { QuizAnswers } from "@/lib/quiz";
import { coverageGaps, coverageOf, coverageSummary, muscleCoverage } from "@/lib/coverage";
import {
  KIT_CATEGORIES, OWNED_TO_CAT, selectKits,
  type Catalog, type CatalogProduct, type HydratedKit,
} from "@/lib/kit-builder";

/* The quiz's "Building your kit..." screen is the site's one conversion
   moment, and the Render free tier sleeps after 15 minutes — a direct POST
   there costs the first visitor a 30–60s cold start. Building the kit here
   means the funnel never waits on Render: product data comes from the same
   hourly ISR fetch cache the catalog pages already use (see lib/catalog.ts),
   which is populated at build time and refreshed in the background, so a
   sleeping backend never blocks a response.

   Selection itself lives in lib/kit-builder.ts (a port of server.js — KIT
   BUILDER section, kept in lockstep with it). This route is the HTTP shell:
   load the catalog, call selectKits, add copy. The backend's optional Groq
   copy pass is deliberately dropped — it needs a server-side key we don't
   keep on Vercel, and the templated copy below is the same text the backend
   falls back to. */

/* Accessory categories for "frequently bought together", in research-backed
   priority order (flooring, then grip/support, then recovery/bag, then
   supplements). fatburners deliberately excluded — never cross-sold. */
const ACCESSORY_PRIORITY = [
  "yogamats", "chalk", "belts", "sleeves", "straps", "wraps", "foamrollers",
  "jumpropes", "gymbags", "protein", "creatine", "preworkout", "recovery",
  "vitamins",
];

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
  /* State the coverage in the blurb — it is the strongest thing we can say
     about a kit, and saying it here keeps the claim honest when it isn't
     complete (coverageSummary names what's missing rather than hiding it). */
  return { name: kit.name, description: `${blurb} ${coverageSummary(kit.products)}` };
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
    /* quality/2 maps our 0-10 onto the 0-5 rating scale, so an unrated
       accessory sorts on merit instead of NaN-ing the comparator. */
    const rk = (p: CatalogProduct) => (p.rating != null ? p.rating : p.quality / 2);
    const best = [...list].sort((a, b) => rk(b) - rk(a) || b.quality - a.quality)[0];
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

  const ownedCats = new Set(
    (a.owned || []).map((id) => OWNED_TO_CAT[id]).filter(Boolean),
  );
  const kits = selectKits(catalog, { ...a, goal: a.goal, budget: a.budget }).map((k) => ({
    ...k,
    ...defaultCopy(k, a.goal as string),
    /* What the kit can actually train — rendered as the coverage panel, and
       the site's proof that "complete" is a measurement, not a slogan. */
    coverage: coverageOf(k.products),
    coverageGaps: coverageGaps(k.products, a.goal as string),
    muscles: muscleCoverage(k.products),
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
