import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/maintenance", "/stats"] },
    sitemap: "https://gymgearcompare.com/sitemap.xml",
  };
}
