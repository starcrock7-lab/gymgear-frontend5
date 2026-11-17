import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import ProductPhoto from "@/components/ProductPhoto";
import JsonLd, { breadcrumbs, itemList } from "@/components/JsonLd";
import { getBrands } from "@/lib/brands";
import { getCategories } from "@/lib/catalog";
import { productDeal } from "@/lib/deals";
import { formatPrice } from "@/lib/kit";

export const revalidate = 900;
export const dynamicParams = true;

export async function generateStaticParams() {
  return (await getBrands().catch(() => [])).map((b) => ({ slug: b.slug }));
}

async function load(slug: string) {
  const [brands, cats] = await Promise.all([getBrands(), getCategories()]);
  const brand = brands.find((b) => b.slug === slug);
  if (!brand) return null;
  const labels = new Map(cats.map((c) => [c.key, c.label]));
  const groups = new Map<string, typeof brand.products>();
  for (const p of [...brand.products].sort((a, b) => (b.gymgearScore ?? 0) - (a.gymgearScore ?? 0))) {
    groups.set(p.category, [...(groups.get(p.category) ?? []), p]);
  }
  return { brand, labels, groups };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await load(slug).catch(() => null);
  if (!data) return { title: "Brand not found" };
  const { brand, labels, groups } = data;
  const cats = [...groups.keys()].map((k) => (labels.get(k) ?? k).toLowerCase());
  return {
    title: `${brand.name} home gym equipment, ranked`,
    description: `${brand.products.length} ${brand.name} products ranked by GymGear Score, with today's prices and sales: ${cats.slice(0, 5).join(", ")}${cats.length > 5 ? " and more" : ""}.`,
    alternates: { canonical: `/brands/${brand.slug}` },
  };
}

export default async function BrandPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  /* A backend error throws, so the last good page keeps being served,
     instead of a 404 that search engines would remember. */
  const data = await load(slug);
  if (!data) notFound();
  const { brand, labels, groups } = data;
  const onSale = brand.products.filter((p) => productDeal(p)).length;

  return (
    <>
      <SiteNav />
      <main className="min-h-[70vh] bg-navy text-white">
        <div className="mx-auto max-w-5xl px-4 pb-16 pt-6">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm text-white/60">
            <Link href="/brands" className="hover:text-white">
              Brands
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span>{brand.name}</span>
          </nav>
          <h1 className="mt-4 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-balance sm:text-5xl">
            {brand.name} home gym equipment
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-white/80">
            {brand.products.length} {brand.name} products we track, ranked by{" "}
            <Link href="/methodology" className="font-bold text-white underline decoration-accent underline-offset-4">
              GymGear Score
            </Link>{" "}
            within each category.
            {onSale > 0 && (
              <>
                {" "}
                {onSale} {onSale === 1 ? "is" : "are"} on sale right now.
              </>
            )}
          </p>

          {[...groups.entries()].map(([cat, list]) => (
            <section key={cat} className="mt-10">
              <h2 className="font-display text-2xl font-extrabold tracking-tight">
                <Link href={`/category/${cat}`} className="hover:underline">
                  {labels.get(cat) ?? cat}
                </Link>
              </h2>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {list.map((p) => {
                  const deal = productDeal(p);
                  return (
                    <li key={p.id}>
                      <Link href={`/gear/${p.id}`} className="item-card glow-btn flex items-center gap-3 rounded-2xl p-2.5">
                        <span className="relative block h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-white p-2">
                          <ProductPhoto src={p.image} brand={p.brand} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-2 font-bold leading-snug text-white">{p.name}</span>
                          <span className="mt-1 flex flex-wrap items-baseline gap-x-2 text-sm tabular-nums">
                            <span className="font-bold text-white">{formatPrice(p.salePrice ?? p.price)}</span>
                            {deal && (
                              <>
                                <span className="text-white/50 line-through">{formatPrice(p.price)}</span>
                                <span className="font-bold text-accent">{deal.pct}% off</span>
                              </>
                            )}
                            {typeof p.gymgearScore === "number" && <span className="text-white/60">Score {p.gymgearScore}</span>}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
      <JsonLd
        data={breadcrumbs([
          { name: "Brands", path: "/brands" },
          { name: brand.name, path: `/brands/${brand.slug}` },
        ])}
      />
      <JsonLd data={itemList(`${brand.name} home gym equipment`, brand.products.map((p) => ({ name: p.name, path: `/gear/${p.id}` })))} />
    </>
  );
}
