import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import { getCategories } from "@/lib/catalog";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Browse all gym gear, ranked",
  description:
    "Every category we score: barbells, racks, benches, dumbbells, supplements, apparel and more — each ranked by the GymGear Score.",
  alternates: { canonical: "/gear" },
};

const GROUPS: { key: string; label: string }[] = [
  { key: "equipment", label: "Equipment" },
  { key: "gear", label: "Lifting Gear" },
  { key: "accessories", label: "Accessories" },
  { key: "supplements", label: "Supplements" },
  { key: "clothing", label: "Apparel" },
];

export default async function GearIndexPage() {
  let cats: Awaited<ReturnType<typeof getCategories>> = [];
  try {
    cats = await getCategories();
  } catch {
    cats = [];
  }

  return (
    <>
      <SiteNav />
      <main className="min-h-[70vh] bg-off">
        <section className="bg-navy px-5 py-14 text-center text-white">
          <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            Browse every category
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-white/60">
            Pick a category to see it ranked by the GymGear Score — build
            quality, owner rating, value, and review confidence.
          </p>
        </section>

        <div className="mx-auto max-w-4xl px-5 py-12">
          {GROUPS.map((g) => {
            const inGroup = cats.filter((c) => c.group === g.key);
            if (!inGroup.length) return null;
            return (
              <div key={g.key} className="mb-10">
                <h2 className="font-display text-xl font-extrabold tracking-tight text-ink">
                  {g.label}
                </h2>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {inGroup.map((c) => (
                    <Link
                      key={c.key}
                      href={`/category/${c.key}`}
                      className="group flex items-center gap-3 rounded-xl border border-line bg-card p-2.5 pr-4 transition-colors hover:border-accent/40"
                    >
                      {c.image ? (
                        // eslint-disable-next-line @next/next/no-img-element -- remote unsplash thumb, fixed size
                        <img
                          src={c.image}
                          alt=""
                          loading="lazy"
                          className="h-12 w-12 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <span className="h-12 w-12 shrink-0 rounded-lg bg-navy/10" />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-bold text-ink">
                          {c.label}
                        </span>
                        <span className="block text-xs text-ink-3">
                          {c.count} products ranked
                        </span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
