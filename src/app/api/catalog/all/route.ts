import { NextResponse } from "next/server";
import { getAllProducts, getCategories } from "@/lib/catalog";

/* Slim search index: every product + category in one cached response, so the
   nav search costs a single request instead of one per category (see ../categories/route.ts
   for the proxy pattern). Payload stays lean — search needs names, not specs. */
export const revalidate = 3600;

export async function GET() {
  try {
    const [products, categories] = await Promise.all([
      getAllProducts(),
      getCategories(),
    ]);
    return NextResponse.json({
      categories,
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        brand: p.brand,
        category: p.category,
        price: p.price,
        salePrice: p.salePrice ?? null,
        rating: p.rating,
        gymgearScore: p.gymgearScore ?? null,
        image: p.image,
      })),
    });
  } catch {
    return NextResponse.json({ categories: [], products: [] });
  }
}
