import type { MetadataRoute } from "next";

const BASE = "https://gymgearcompare.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes: { path: string; priority: number }[] = [
    { path: "", priority: 1 },
    { path: "/quiz", priority: 0.9 },
    { path: "/compare", priority: 0.8 },
    { path: "/sponsors", priority: 0.5 },
    { path: "/privacy", priority: 0.3 },
  ];
  return routes.map((r) => ({
    url: `${BASE}${r.path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: r.priority,
  }));
}
