/* Server-side catalog access for statically-generated product & category
   pages (SEO/AdSense content layer). Unlike lib/api.ts (browser fetches that
   get an Origin header for free), these run on the server with no browser, so
   we set Origin explicitly — the backend gate requires Origin∈allowed AND the
   site key. https://gymgearcompare.com is allowed by both local and prod
   backends, so it works in every environment. Results are cached (ISR) so the
   build hits the backend once, not per page. */
import type { KitProduct, Category } from "@/lib/kit";

const BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") ||
  "https://gymgear-backend5.onrender.com";
const SITE_KEY = process.env.NEXT_PUBLIC_SITE_KEY || "ggcp-2026-xK9m";
const SITE_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_URL || "https://gymgearcompare.com";

/* Revalidate the catalog hourly — products/prices change rarely, and this
   keeps every generated page fresh without a redeploy. */
export const CATALOG_REVALIDATE = 3600;

async function serverFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      "X-Site-Key": SITE_KEY,
      Origin: SITE_ORIGIN,
    },
    next: { revalidate: CATALOG_REVALIDATE },
  });
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return (await res.json()) as T;
}

export async function getCategories(): Promise<Category[]> {
  const d = await serverFetch<{ categories: Category[] }>("/api/categories");
  return d.categories ?? [];
}

export async function getCategoryProducts(cat: string): Promise<KitProduct[]> {
  const d = await serverFetch<{ products: Omit<KitProduct, "category">[] }>(
    `/api/products/${cat}`,
  );
  return (d.products ?? []).map((p) => ({ ...p, category: cat }));
}

/* Every product across every category. Underlying per-category fetches are
   deduped/cached by Next, so calling this from many pages is cheap. */
export async function getAllProducts(): Promise<KitProduct[]> {
  const cats = await getCategories();
  const lists = await Promise.all(
    cats.map((c) => getCategoryProducts(c.key).catch(() => [])),
  );
  return lists.flat();
}

export async function getProduct(id: string): Promise<KitProduct | null> {
  const all = await getAllProducts();
  return all.find((p) => p.id === id) ?? null;
}

/* A product plus its same-category peers (for "how it ranks" context and
   internal links — both help crawlability and information gain). */
export async function getProductWithPeers(
  id: string,
): Promise<{ product: KitProduct; peers: KitProduct[]; category: Category | null } | null> {
  const all = await getAllProducts();
  const product = all.find((p) => p.id === id);
  if (!product) return null;
  const peers = all
    .filter((p) => p.category === product.category && p.id !== product.id)
    .sort((a, b) => (b.gymgearScore ?? 0) - (a.gymgearScore ?? 0));
  const cats = await getCategories();
  const category = cats.find((c) => c.key === product.category) ?? null;
  return { product, peers, category };
}
