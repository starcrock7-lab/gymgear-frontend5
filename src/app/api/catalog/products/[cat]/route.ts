import { NextResponse } from "next/server";
import { getCategoryProducts } from "@/lib/catalog";

/* Cached proxy for a category's products (see ../categories/route.ts). */
export const revalidate = 3600;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ cat: string }> },
) {
  const { cat } = await params;
  try {
    const products = await getCategoryProducts(cat);
    return NextResponse.json({ products });
  } catch {
    return NextResponse.json({ products: [] });
  }
}
