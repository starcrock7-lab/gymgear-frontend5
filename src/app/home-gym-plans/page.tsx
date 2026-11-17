import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import JsonLd, { itemList } from "@/components/JsonLd";
import { formatPrice } from "@/lib/kit";
import { PLANS, buildPlan, loadCatalog, type PlanGroup } from "@/lib/plans";

export const revalidate = 900;

export const metadata: Metadata = {
  title: "Home gym plans by budget, goal and space",
  description:
    "Ready-made home gym plans for every budget, goal and room, built from real products at today's prices. Pick one, or answer three questions for your own.",
  alternates: { canonical: "/home-gym-plans" },
};

const GROUPS: { key: PlanGroup; title: string }[] = [
  { key: "budget", title: "By budget" },
  { key: "goal", title: "By goal" },
  { key: "space", title: "By space" },
];

export default async function PlansIndex() {
  const catalog = await loadCatalog().catch(() => null);
  const total = (slug: string) => {
    if (!catalog) return null;
    const plan = PLANS.find((p) => p.slug === slug)!;
    const match = buildPlan(catalog, plan).find((k) => k.type === "match");
    return match ? Math.round(match.totalPrice) : null;
  };

  return (
    <>
      <SiteNav />
      <main className="min-h-[70vh] bg-navy text-white">
        <div className="mx-auto max-w-5xl px-4 pb-16 pt-10 sm:pt-14">
          <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-balance sm:text-6xl">
            Home gym plans
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-white/80">
            Every plan is built by our kit builder from real products at today&apos;s prices. Pick the closest one, or{" "}
            <Link href="/quiz" className="font-bold text-white underline decoration-accent underline-offset-4">
              answer three questions
            </Link>{" "}
            for a plan made for your room.
          </p>

          {GROUPS.map((g) => (
            <section key={g.key} className="mt-10">
              <h2 className="font-display text-2xl font-extrabold tracking-tight">{g.title}</h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {PLANS.filter((p) => p.group === g.key).map((p) => {
                  const t = total(p.slug);
                  return (
                    <li key={p.slug}>
                      <Link
                        href={`/home-gym-plans/${p.slug}`}
                        className="item-card glow-btn flex h-full flex-col rounded-2xl p-4"
                      >
                        <span className="font-bold leading-snug text-white">{p.h1}</span>
                        {t != null && <span className="mt-1 text-sm text-white/70">Our pick: {formatPrice(t)} total</span>}
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
      <JsonLd data={itemList("Home gym plans", PLANS.map((p) => ({ name: p.h1, path: `/home-gym-plans/${p.slug}` })))} />
    </>
  );
}
