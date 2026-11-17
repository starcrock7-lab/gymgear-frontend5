import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import { getBrands } from "@/lib/brands";

export const revalidate = 900;

export const metadata: Metadata = {
  title: "Home gym equipment brands",
  description: "Every home gym brand we track, with each brand's products ranked by GymGear Score and today's prices.",
  alternates: { canonical: "/brands" },
};

export default async function BrandsIndex() {
  const brands = await getBrands().catch(() => []);
  return (
    <>
      <SiteNav />
      <main className="min-h-[70vh] bg-navy text-white">
        <div className="mx-auto max-w-5xl px-4 pb-16 pt-10 sm:pt-14">
          <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">Brands</h1>
          <p className="mt-4 max-w-2xl text-lg text-white/80">
            Home gym brands we track, each with its products ranked and priced.
          </p>
          {brands.length ? (
            <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {brands.map((b) => (
                <li key={b.slug}>
                  <Link href={`/brands/${b.slug}`} className="item-card glow-btn flex h-full flex-col rounded-2xl p-4">
                    <span className="font-bold text-white">{b.name}</span>
                    <span className="mt-1 text-sm text-white/60">{b.products.length} products</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-8 text-white/70">We couldn&apos;t load the brands. Try again in a moment.</p>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
