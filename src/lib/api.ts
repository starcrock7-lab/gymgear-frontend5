import type { QuizAnswers } from "@/lib/quiz";
import type { KitResponse, KitProduct, Category } from "@/lib/kit";

/* All backend calls go through apiFetch so the base URL and the site-key
   header are applied in one place (mirrors the classic site's apiFetch).
   Local dev sets NEXT_PUBLIC_BACKEND_URL=http://localhost:3001 in .env.local;
   on Vercel (no .env.local) it falls back to the production Render backend.
   NEXT_PUBLIC_SITE_KEY must be set in Vercel env vars — never hardcode it
   here (this repo is public; the old hardcoded value forced a rotation). */
const BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") ||
  "https://gymgear-backend5.onrender.com";
const SITE_KEY = process.env.NEXT_PUBLIC_SITE_KEY || "";

export async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (SITE_KEY) headers.set("X-Site-Key", SITE_KEY);
  return fetch(`${BASE}${path}`, { ...init, headers });
}

/* POST the quiz answers, get three kits back. Throws on network/HTTP error
   so the caller can show a retry. Goes to our own Next route (src/app/api/
   kit), not the Render backend — kit building is the conversion moment, and
   a sleeping free-tier backend used to cost the first visitor a 30–60s cold
   start right at the "Building your kit" screen. The local route builds from
   the same ISR-cached catalog the /api/catalog/* routes use. */
export async function requestKit(answers: QuizAnswers): Promise<KitResponse> {
  const res = await fetch("/api/kit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(answers),
  });
  if (!res.ok) {
    throw new Error(`Kit request failed (${res.status})`);
  }
  return (await res.json()) as KitResponse;
}

/* Products in a category, for the compare/browse tools and kit swaps. Goes
   through our own cached Next route (not the Render backend directly), so a
   sleeping backend never makes the browser wait — the route serves cached,
   stale-while-revalidate data. */
export async function requestAlternatives(
  category: string,
): Promise<KitProduct[]> {
  const res = await fetch(`/api/catalog/products/${category}`);
  if (!res.ok) throw new Error(`Products request failed (${res.status})`);
  const data = (await res.json()) as { products: KitProduct[] };
  return (data.products ?? []).map((p) => ({ ...p, category }));
}

/* The full category list (grouped) for the comparison tool — cached route. */
export async function requestCategories(): Promise<Category[]> {
  const res = await fetch(`/api/catalog/categories`);
  if (!res.ok) throw new Error(`Categories request failed (${res.status})`);
  const data = (await res.json()) as { categories: Category[] };
  return data.categories ?? [];
}
