/* Server-side catalog access for statically-generated product & category
   pages (SEO/AdSense content layer). Unlike lib/api.ts (browser fetches that
   get an Origin header for free), these run on the server with no browser, so
   we set Origin explicitly — the backend gate requires Origin∈allowed AND the
   site key. https://gymgearcompare.com is allowed by both local and prod
   backends, so it works in every environment. Results are cached (ISR) so the
   build hits the backend once, not per page. */
import type { KitProduct, Category } from "@/lib/kit";
import { saleExpired } from "@/lib/deals";

const BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") ||
  "https://gymgear-backend5.onrender.com";
/* No hardcoded fallback (public repo — a real value here defeats rotation).
   Missing env → backend 403s and the build fails loud, same as lib/api.ts. */
const SITE_KEY = process.env.NEXT_PUBLIC_SITE_KEY || "";
const SITE_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_URL || "https://gymgearcompare.com";

/* Revalidate the catalog hourly — products/prices change rarely, and this
   keeps every generated page fresh without a redeploy. */
export const CATALOG_REVALIDATE = 3600;

/* Categories we keep out of the index/sitemap. Fat burners are a YMYL /
   health-claim risk for AdSense, so we render the pages but don't index them. */
export const NOINDEX_CATEGORIES = new Set(["fatburners"]);

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
  /* Expired-sale strip (deals v2, per-product recheck): a passed saleEndsAt
     means the sale fields never reach a page — every surface (gear, category,
     compare, kit, search) shows the clean list price without opting in.
     Evaluated per ISR revalidate (hourly), and the client-side deal strip
     re-checks live via productDeal(), so a sale can never outlive its date
     by more than the cache window. */
  return (d.products ?? []).map((raw) => {
    const p = { ...raw, category: cat } as KitProduct;
    if (saleExpired(p)) {
      delete p.salePrice;
      delete p.discount;
      delete p.saleEndsAt;
    }
    return p;
  });
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
