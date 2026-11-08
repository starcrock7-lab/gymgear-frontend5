import { NextResponse } from "next/server";
import { getCategoryProducts } from "@/lib/catalog";
import type { QuizAnswers } from "@/lib/quiz";
import { coverageGaps, coverageOf, coverageSummary, LIGHT_PIECES, muscleCoverage } from "@/lib/coverage";
import {
  KIT_CATEGORIES, OWNED_TO_CAT, selectKits,
  type Catalog, type CatalogProduct, type HydratedKit,

} from "@/lib/kit-builder";
import { classStats } from "@/lib/price-check";

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

/* The stage after this one: what the next budget up would add, given the gear
   this kit already bought. Most of a barbell setup costs more than $800, so a
   small budget needs to see what it grows into. From $800 up the kit is already
   a full gym, and the next budget only suggests $3,000+ single machines. */
const NEXT_BUDGET: Record<string, string> = {
  "under-300": "300-800", "300-800": "800-2000",
};
const NEXT_PIECES: Record<string, string> = {
  "300-800": "small-setup", "800-2000": "full-home-gym",
};
/* A stage is what opens up new training, not a mat or a small light piece. */
const NOT_A_STAGE = new Set(["yogamats", "foamrollers", "jumpropes"]);
const CAT_TO_OWNED = Object.fromEntries(
  Object.entries(OWNED_TO_CAT).map(([id, cat]) => [cat, id]),
);

/* Templated copy — identical to the backend's no-Groq fallback, never blank. */
const GOAL_WORD: Record<string, string> = {
  "build-strength": "strength", "lose-weight": "fat-loss",
  "get-fit": "all-round fitness", "home-gym-setup": "complete home-gym",
};
function defaultCopy(kit: HydratedKit, goal: string, ownedCats: Set<string>): { name: string; description: string } {
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
  return { name: kit.name, description: `${blurb} ${coverageSummary(kit.products, ownedCats)}` };
}

/* Every category the builder can draw from. Each getCategoryProducts call is
   an ISR-cached fetch (deduped by Next), so a warm cache answers this without
   touching the backend at all. */
const ALL_CATS = [...KIT_CATEGORIES];

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
    ...defaultCopy(k, a.goal as string, ownedCats),
    /* What the kit can actually train — rendered as the coverage panel, and
       the site's proof that "complete" is a measurement, not a slogan. Owned
       gear is folded in: the kit doesn't re-sell you the rack you have, but
       you can still do pull-ups on it. */
    coverage: coverageOf(k.products, ownedCats),
    coverageGaps: coverageGaps(k.products, a.goal as string, ownedCats),
    muscles: muscleCoverage(k.products, ownedCats),
    ownedCats: [...ownedCats],
  }));

  const nextBudget = NEXT_BUDGET[a.budget];
  const bought = kits.find((k) => k.type === "match")?.products ?? [];
  const ownedNext = [...new Set([
    ...(a.owned || []).filter((id) => id !== "nothing"),
    ...bought.map((p) => CAT_TO_OWNED[p.category]).filter(Boolean),
  ])];
  const nextKits = nextBudget
    ? selectKits(catalog, {
        ...a, goal: a.goal, budget: nextBudget,
        equipmentCount: NEXT_PIECES[nextBudget],
        owned: ownedNext.length ? ownedNext : ["nothing"],
      })
    : [];
  const nextStage = (nextKits.find((k) => k.type === "match")?.products ?? [])
    .filter((p) => !NOT_A_STAGE.has(p.category) && !LIGHT_PIECES.has(p.id));

  return NextResponse.json({
    kits,
    nextStage,
    priceClasses: classStats(catalog),
    generatedBy: "fallback",
    generatedAt: new Date().toISOString(),
  });
}
