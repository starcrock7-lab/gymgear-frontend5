/* Shapes returned by /api/kit — our local Next route (src/app/api/kit), a
   port of the backend builder; keep in sync with server.js hydrateKits. The
   catalog owns all product data; the frontend only renders it. */

export type KitProduct = {
  id: string;
  name: string;
  brand: string;
  price: number;
  retailer: string;
  url: string;
  affiliateUrl: string;
  image: string | null;
  quality: number;
  rating: number;
  reviewCount: number;
  expertVerdict: string;
  expertSource: string;
  specs: Record<string, string>;
  aspects: string[];
  bestChoice: boolean;
  salePrice?: number;
  discount?: number;
  /** Deals v2 — hand-curated sale end (ISO); absent = end date unknown. */
  saleEndsAt?: string;
  category: string;
  /* F4 — GymGear Score rubric (data/spec-derived, see /methodology). */
  gymgearScore?: number;
  scoreBreakdown?: ScoreFacet[];
  awards?: string[];
  /* FBT — one-line "why add this" copy for the frequently-bought-together
     panel (Groq, grounded in the kit; deterministic fallback). */
  whyAdd?: string;
};

export type ScoreFacet = {
  key: string;
  label: string;
  score: number;
  weight: number;
};

export type KitType = "value" | "match" | "quality";

/* A product category as returned by /api/categories. */
export type Category = {
  key: string;
  label: string;
  group: string;
  count: number;
  /** Lead category photo (browse-page thumbnails); older backends omit it. */
  image?: string;
};

export type Kit = {
  type: KitType;
  name: string;
  description: string;
  products: KitProduct[];
  totalPrice: number;
};

export type KitResponse = {
  kits: Kit[];
  /* Complementary accessories for the kit ("frequently bought together"). */
  accessories?: KitProduct[];
  generatedBy: "groq" | "fallback";
  generatedAt: string;
};

/* Display metadata per tier — order here is the order kits render in. */
export const KIT_TIER_META: Record<
  KitType,
  { label: string; tagline: string }
> = {
  value: { label: "Best Value", tagline: "Most gym per dollar" },
  match: { label: "Best Match", tagline: "Dialed to your answers" },
  quality: { label: "Best Quality", tagline: "Buy once, cry once" },
};

/* Human labels for the kit-eligible categories (mirrors the backend meta),
   used as the title when swapping a product. */
export const CATEGORY_LABEL: Record<string, string> = {
  racks: "Racks & Rigs",
  machines: "All-in-One Machines",
  flooring: "Gym Flooring",
  barbells: "Barbells",
  plates: "Weight Plates",
  benches: "Weight Benches",
  dumbbells: "Dumbbells",
  kettlebells: "Kettlebells",
  cardio: "Cardio",
  bands: "Resistance Bands",
  jumpropes: "Jump Ropes",
  yogamats: "Yoga Mats",
  foamrollers: "Foam Rollers",
};

export function categoryLabel(cat: string): string {
  return CATEGORY_LABEL[cat] ?? cat;
}

/* Sum a kit's products at their effective (sale-aware) price. */
export function kitTotal(products: KitProduct[]): number {
  return products.reduce((s, p) => s + (p.salePrice ?? p.price), 0);
}

/* Amazon Associates tag — every buy link earns commission through it. */
export const AMAZON_TAG = "gymgearcompar-20";

/* The buy link for a product. Prefer the backend-supplied affiliate link;
   otherwise build an Amazon affiliate search from the name + brand. We never
   fall back to the product's direct brand URL — those are frequently dead
   pages (404), whereas an Amazon search always resolves. */
export function buyUrl(p: KitProduct): string {
  if (p.affiliateUrl) return p.affiliateUrl;
  const q = encodeURIComponent(`${p.brand} ${p.name}`.trim());
  return `https://www.amazon.com/s?k=${q}&tag=${AMAZON_TAG}`;
}

export function formatPrice(n: number): string {
  return `$${n.toLocaleString("en-US")}`;
}

/* --- Persistence (sessionStorage) -------------------------------------
   The generated kits are cached so returning to /quiz can show the last
   result instantly instead of re-calling the backend. */
const KIT_STORAGE_KEY = "gymgear.kit.v3";

export function saveKit(resp: KitResponse): void {
  try {
    sessionStorage.setItem(KIT_STORAGE_KEY, JSON.stringify(resp));
  } catch {
    /* private mode / storage full — results just won't persist */
  }
}

export function loadKit(): KitResponse | null {
  try {
    const raw = sessionStorage.getItem(KIT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as KitResponse) : null;
  } catch {
    return null;
  }
}

export function clearKit(): void {
  try {
    sessionStorage.removeItem(KIT_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
