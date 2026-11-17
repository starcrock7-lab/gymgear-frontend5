/* Brand pages: every brand with enough products to be worth a page. */
import { getAllProducts, NOINDEX_CATEGORIES } from "@/lib/catalog";
import type { KitProduct } from "@/lib/kit";

/* Listings sometimes append a line after a bar ("Bells of Steel | Canada"). */
export const brandName = (b: string) => b.split(" | ")[0].trim();
export const brandSlug = (b: string) =>
  brandName(b).toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/* A brand with one or two products is a thin page; skip it. */
const MIN_PRODUCTS = 3;

export type Brand = { slug: string; name: string; products: KitProduct[] };

export async function getBrands(): Promise<Brand[]> {
  const all = (await getAllProducts()).filter((p) => !NOINDEX_CATEGORIES.has(p.category));
  const by = new Map<string, Brand>();
  for (const p of all) {
    const slug = brandSlug(p.brand);
    if (!slug) continue;
    const b = by.get(slug) ?? { slug, name: brandName(p.brand), products: [] };
    b.products.push(p);
    by.set(slug, b);
  }
  return [...by.values()]
    .filter((b) => b.products.length >= MIN_PRODUCTS)
    .sort((a, b) => b.products.length - a.products.length);
}
