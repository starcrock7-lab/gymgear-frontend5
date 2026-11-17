import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import ProductPhoto from "@/components/ProductPhoto";
import JsonLd, { breadcrumbs, itemList } from "@/components/JsonLd";
import { coverageSummary } from "@/lib/coverage";
import { distinctTiers, formatPrice, type KitType } from "@/lib/kit";
import type { CatalogProduct, HydratedKit } from "@/lib/kit-builder";
import { optionLabel } from "@/lib/quiz";
import { PLANS, buildPlan, getPlan, loadCatalog, type Plan } from "@/lib/plans";

export const revalidate = 900;
export const dynamicParams = false;

export function generateStaticParams() {
  return PLANS.map((p) => ({ slug: p.slug }));
}

async function load(slug: string) {
  const plan = getPlan(slug);
  if (!plan) return null;
  const catalog = await loadCatalog();
  /* Same rule as the quiz: with several categories missing the kits would be
     visibly wrong, so fail and keep the last good page. */
  if (Object.values(catalog).filter((l) => !l.length).length > 3) throw new Error("catalog unavailable");
  const kits = buildPlan(catalog, plan);
  return { plan, kits };
}

const priceOf = (p: CatalogProduct) => p.salePrice ?? p.price;
const TIER_NOTE: Record<string, string> = {
  value: "The most training for the least money.",
  match: "The closest fit to these answers.",
  quality: "Buy once: the best-built gear the budget allows.",
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await load(slug).catch(() => null);
  const plan = getPlan(slug);
  if (!plan) return { title: "Plan not found" };
  const match = data?.kits.find((k) => k.type === "match");
  const lead = match?.products[0]?.name;
  return {
    title: plan.h1,
    description:
      `${plan.h1}, built by our kit builder from real products at today's prices` +
      (match && lead ? `: the ${lead} plus ${match.products.length - 1} more pieces for ${formatPrice(Math.round(match.totalPrice))} total` : "") +
      ".",
    alternates: { canonical: `/home-gym-plans/${plan.slug}` },
  };
}

const TIER_WORD: Record<KitType, string> = { value: "best value", match: "best match", quality: "best quality" };

function Kit({ kit }: { kit: HydratedKit & { alsoTypes: KitType[] } }) {
  const list = kit.products.reduce((s, p) => s + p.price, 0);
  const saved = Math.round(list - kit.totalPrice);
  return (
    <section className="item-card rounded-2xl p-4 sm:p-6" aria-labelledby={`tier-${kit.type}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id={`tier-${kit.type}`} className="font-display text-2xl font-extrabold tracking-tight text-white">
          {kit.name}
        </h2>
        <p className="font-display text-2xl font-extrabold tabular-nums text-white">
          {formatPrice(Math.round(kit.totalPrice))}
          {saved > 0 && <span className="ml-2 text-base font-bold text-accent">saves {formatPrice(saved)} on sale</span>}
        </p>
      </div>
      <p className="mt-1 text-white/70">{TIER_NOTE[kit.type]}</p>
      {kit.alsoTypes.length > 0 && (
        <p className="mt-1 text-sm font-bold text-accent">
          Also our {kit.alsoTypes.map((t) => TIER_WORD[t]).join(" and ")} pick: at this budget they come out the same.
        </p>
      )}
      <ul className="mt-4 divide-y divide-white/10">
        {kit.products.map((p) => (
          <li key={p.id}>
            <Link href={`/gear/${p.id}`} className="group flex items-center gap-3 py-3">
              <span className="block h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-white p-1.5">
                <ProductPhoto src={p.image} brand={p.brand} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-white/60">{p.brand}</span>
                <span className="block font-bold leading-snug text-white group-hover:underline">{p.name}</span>
              </span>
              <span className="shrink-0 text-right tabular-nums">
                <span className="block font-bold text-white">{formatPrice(priceOf(p))}</span>
                {p.salePrice && <span className="block text-sm text-white/50 line-through">{formatPrice(p.price)}</span>}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-white/70">{coverageSummary(kit.products, new Set())}</p>
    </section>
  );
}

const ASSUMED: { key: "goal" | "budget" | "space" | "ceiling" | "experience" | "equipmentCount"; label: string }[] = [
  { key: "goal", label: "Goal" },
  { key: "budget", label: "Budget" },
  { key: "space", label: "Space" },
  { key: "ceiling", label: "Ceiling" },
  { key: "experience", label: "Experience" },
  { key: "equipmentCount", label: "How much gear" },
];

function related(plan: Plan) {
  return PLANS.filter((p) => p.group === plan.group && p.slug !== plan.slug);
}

export default async function PlanPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  /* Errors throw so the last good page keeps being served. */
  const data = await load(slug);
  if (!data) notFound();
  const { plan, kits } = data;
  const match = kits.find((k) => k.type === "match") ?? kits[0];
  const tiers = distinctTiers(kits);

  return (
    <>
      <SiteNav />
      <main className="min-h-[70vh] bg-navy text-white">
        <div className="mx-auto max-w-4xl px-4 pb-16 pt-6">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm text-white/60">
            <Link href="/home-gym-plans" className="hover:text-white">
              Home gym plans
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span>{plan.label}</span>
          </nav>

          <h1 className="mt-4 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-balance sm:text-5xl">
            {plan.h1}
          </h1>
          {match ? (
            <p className="mt-4 max-w-2xl text-lg text-white/80">
              Our pick: the {match.products[0]?.name} plus {match.products.length - 1} more{" "}
              {match.products.length - 1 === 1 ? "piece" : "pieces"} for {formatPrice(Math.round(match.totalPrice))}{" "}
              total.{" "}
              {tiers.length === 1
                ? "At this budget the cheapest, best-matched and best-built kits come out the same, so there is one plan below"
                : `Below are ${tiers.length} versions`}
              , built by our kit builder from real products at today&apos;s prices.
            </p>
          ) : (
            <p className="mt-4 text-lg text-white/80">We couldn&apos;t load prices just now. Try again in a minute.</p>
          )}

          <div className="mt-8 grid gap-4">
            {tiers.map((k) => (
              <Kit key={k.type} kit={k} />
            ))}
          </div>

          <section className="mt-10 rounded-2xl border border-white/10 p-5 sm:p-6">
            <h2 className="font-display text-xl font-extrabold">What this plan assumes</h2>
            <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
              {ASSUMED.map((a) => (
                <div key={a.key}>
                  <dt className="text-sm text-white/60">{a.label}</dt>
                  <dd className="font-bold">{optionLabel(a.key, plan[a.key])}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-white/80">
              Your room, budget or gear at home different?{" "}
              <Link href="/quiz" className="font-bold text-white underline decoration-accent underline-offset-4">
                Answer three questions
              </Link>{" "}
              and get a plan built for you.
            </p>
            <p className="mt-2 text-sm text-white/60">
              Prices come straight from the store. How we choose and score gear:{" "}
              <Link href="/methodology" className="underline underline-offset-2">
                methodology
              </Link>
              .
            </p>
          </section>

          <section className="mt-10">
            <h2 className="font-display text-xl font-extrabold">More home gym plans</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {related(plan).map((p) => (
                <li key={p.slug}>
                  <Link href={`/home-gym-plans/${p.slug}`} className="glow-btn inline-flex min-h-11 items-center rounded-xl border border-white/15 px-4 text-sm font-bold">
                    {p.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/home-gym-plans" className="inline-flex min-h-11 items-center px-2 text-sm font-bold underline decoration-accent underline-offset-4">
                  All plans
                </Link>
              </li>
            </ul>
          </section>
        </div>
      </main>
      <SiteFooter />
      <JsonLd
        data={breadcrumbs([
          { name: "Home gym plans", path: "/home-gym-plans" },
          { name: plan.label, path: `/home-gym-plans/${plan.slug}` },
        ])}
      />
      {match && <JsonLd data={itemList(plan.h1, match.products.map((p) => ({ name: p.name, path: `/gear/${p.id}` })))} />}
    </>
  );
}
