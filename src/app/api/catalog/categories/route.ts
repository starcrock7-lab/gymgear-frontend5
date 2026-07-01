import { NextResponse } from "next/server";
import { getCategories } from "@/lib/catalog";

/* Cached proxy for the category list. The browser hits this same-origin route
   (fast, ISR-cached, stale-while-revalidate) instead of the Render backend
   directly, so a cold backend never blocks the compare/browse tools. */
export const revalidate = 3600;

export async function GET() {
  try {
    const categories = await getCategories();
    return NextResponse.json({ categories });
  } catch {
    return NextResponse.json({ categories: [] });
  }
}
