/* Ready-made home gym plans: fixed quiz answers run through the real kit
   builder, so each plan page shows the same kits a visitor with those answers
   would get, at today's prices. Also home to loadCatalog, shared with the
   quiz's /api/kit route. */
import { getCategoryProducts } from "@/lib/catalog";
import { KIT_CATEGORIES, selectKits, type Catalog, type CatalogProduct, type HydratedKit } from "@/lib/kit-builder";

/* Fetch in small waves rather than one 25-wide burst — on a cold cache every
   category is a live request, and bursts have dropped connections (observed
   locally: five core categories failed silently and the builder shipped a
   visibly thinner kit). Anything that still fails gets one sequential retry;
   a category that fails twice stays empty and is reported by the caller. */
export async function loadCatalog(): Promise<Catalog> {
  const out: Catalog = {};
  const failed: string[] = [];
  const cats = [...KIT_CATEGORIES];
  const WAVE = 8;
  for (let i = 0; i < cats.length; i += WAVE) {
    await Promise.all(
      cats.slice(i, i + WAVE).map(async (cat) => {
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

export type PlanGroup = "budget" | "goal" | "space";

export type Plan = {
  slug: string;
  group: PlanGroup;
  h1: string;
  /** Short label for link lists. */
  label: string;
  goal: string;
  budget: string;
  space: string;
  ceiling: string;
  experience: string;
  equipmentCount: string;
};

const BUDGET_WORD: Record<string, string> = {
  "under-300": "under $300",
  "300-800": "under $800",
  "800-2000": "under $2,000",
  "2000-plus": "over $2,000",
};
const BUDGET_SLUG: Record<string, string> = {
  "under-300": "under-300",
  "300-800": "under-800",
  "800-2000": "under-2000",
  "2000-plus": "over-2000",
};
const BUDGETS = Object.keys(BUDGET_WORD);

/* Sensible answers for everything a page doesn't fix: more pieces, more room
   and more experience as the budget grows. */
const defaults = (budget: string) => ({
  space: budget === "under-300" || budget === "300-800" ? "small-room" : "garage",
  ceiling: "8-9ft",
  experience: budget === "under-300" ? "beginner" : "intermediate",
  equipmentCount: budget === "800-2000" || budget === "2000-plus" ? "full-home-gym" : "small-setup",
});

const GOALS = [
  { goal: "build-strength", slug: "strength", word: "strength" },
  { goal: "lose-weight", slug: "weight-loss", word: "weight loss" },
  { goal: "get-fit", slug: "fitness", word: "general fitness" },
];

const SPACES: { slug: string; label: string; h1: string; space: string; ceiling?: string; budget: string; experience?: string }[] = [
  { slug: "apartment-home-gym", label: "Apartment", h1: "Best apartment home gym", space: "apartment-corner", budget: "300-800" },
  { slug: "small-room-home-gym", label: "Small room", h1: "Best home gym for a small room", space: "small-room", budget: "800-2000" },
  { slug: "garage-gym", label: "Garage", h1: "Best garage gym setup", space: "garage", budget: "800-2000", experience: "advanced" },
  { slug: "outdoor-home-gym", label: "Outdoor", h1: "Best outdoor home gym", space: "outdoor", budget: "300-800" },
  { slug: "low-ceiling-home-gym", label: "Low ceiling", h1: "Best home gym for a low ceiling", space: "garage", ceiling: "under-8ft", budget: "800-2000" },
];

export const PLANS: Plan[] = [
  ...BUDGETS.map((budget) => ({
    slug: `home-gym-${BUDGET_SLUG[budget]}`,
    group: "budget" as const,
    h1: `Best home gym ${BUDGET_WORD[budget]}`,
    label: `Home gym ${BUDGET_WORD[budget]}`,
    goal: "home-gym-setup",
    budget,
    ...defaults(budget),
  })),
  ...GOALS.flatMap((g) =>
    BUDGETS.map((budget) => ({
      slug: `${g.slug}-home-gym-${BUDGET_SLUG[budget]}`,
      group: "goal" as const,
      h1: `Best ${g.word} home gym ${BUDGET_WORD[budget]}`,
      label: `${g.word[0].toUpperCase()}${g.word.slice(1)}, ${BUDGET_WORD[budget]}`,
      goal: g.goal,
      budget,
      ...defaults(budget),
    })),
  ),
  ...SPACES.map((s) => ({
    slug: s.slug,
    group: "space" as const,
    h1: s.h1,
    label: s.label,
    goal: "home-gym-setup",
    budget: s.budget,
    ...defaults(s.budget),
    space: s.space,
    ceiling: s.ceiling ?? "8-9ft",
    experience: s.experience ?? defaults(s.budget).experience,
  })),
];

export const getPlan = (slug: string) => PLANS.find((p) => p.slug === slug);

export const budgetWord = (b: string) => BUDGET_WORD[b] ?? b;

export function buildPlan(catalog: Catalog, plan: Plan): HydratedKit[] {
  return selectKits(catalog, {
    goal: plan.goal,
    budget: plan.budget,
    space: plan.space,
    ceiling: plan.ceiling,
    experience: plan.experience,
    equipmentCount: plan.equipmentCount,
    owned: ["nothing"],
  });
}
