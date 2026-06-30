import type { MetadataRoute } from "next";
import { getCategories, getAllProducts } from "@/lib/catalog";

const BASE = "https://gymgearcompare.com";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Static, indexable pages (the interactive tools are noindex, so omitted).
  const staticRoutes: { path: string; priority: number }[] = [
    { path: "", priority: 1 },
    { path: "/gear", priority: 0.9 },
    { path: "/methodology", priority: 0.6 },
    { path: "/about", priority: 0.5 },
    { path: "/disclosure", priority: 0.4 },
    { path: "/contact", priority: 0.3 },
    { path: "/privacy", priority: 0.3 },
  ];

  let cats: Awaited<ReturnType<typeof getCategories>> = [];
  let products: Awaited<ReturnType<typeof getAllProducts>> = [];
  try {
    [cats, products] = await Promise.all([getCategories(), getAllProducts()]);
  } catch {
    // Backend unreachable at build → ship the static routes; ISR fills the rest.
  }

  const entries: MetadataRoute.Sitemap = staticRoutes.map((r) => ({
    url: `${BASE}${r.path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: r.priority,
  }));

  for (const c of cats) {
    entries.push({
      url: `${BASE}/category/${c.key}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }
  for (const p of products) {
    entries.push({
      url: `${BASE}/gear/${p.id}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  return entries;
}
