import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Star, ArrowUpRight, ChevronRight, Scale } from "lucide-react";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import {
  getAllProducts,
  getProductWithPeers,
  NOINDEX_CATEGORIES,
} from "@/lib/catalog";
import { buyUrl, formatPrice, categoryLabel } from "@/lib/kit";
import { checkedLabel, productDeal, rankWithDeals, storeSaleLabel } from "@/lib/deals";
import { aboutProduct, facetWord, factsOf, scoreWord } from "@/lib/product-about";
import ProductPhoto from "@/components/ProductPhoto";
import { DumbbellMark } from "@/components/ui/dumbbell-mark";

export const revalidate = 900;
export const dynamicParams = true;

/* Pre-render every product at build time → real HTML the crawler can read. */
export async function generateStaticParams() {
  try {
    const all = await getAllProducts();
    return all.map((p) => ({ slug: p.id }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getProductWithPeers(slug);
  if (!data) return { title: "Product not found" };
  const { product: p } = data;
  const price = p.salePrice ?? p.price;
  return {
    title: `${p.name} review & GymGear Score`,
    description:
      `${p.name} by ${p.brand}: GymGear Score ${p.gymgearScore ?? "—"}/100, ` +
      (p.rating != null
        ? `${p.rating}/5${p.reviewCount != null ? ` from ${p.reviewCount.toLocaleString()} owners` : ""}, `
        : "") +
      `${formatPrice(price)}. ` +
      (typeof p.expertVerdict === "string" && p.expertVerdict
        ? p.expertVerdict
        : `Our independent take on the ${p.name}.`),
    alternates: { canonical: `/gear/${p.id}` },
    robots: NOINDEX_CATEGORIES.has(p.category)
      ? { index: false, follow: true }
      : undefined,
  };
}

const priceOf = (p: { salePrice?: number; price: number }) =>
  p.salePrice ?? p.price;

/* The score as a gauge, so the number means something at a glance. */
function ScoreRing({ score }: { score: number }) {
  return (
    <span className="relative flex h-24 w-24 shrink-0 items-center justify-center">
      <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="9" />
        <circle
          className="score-arc"
          cx="50"
          cy="50"
          r="44"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="9"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${score} 100`}
          style={{ filter: "drop-shadow(0 0 6px rgba(240,83,30,0.7))" }}
        />
      </svg>
      <span className="font-display text-3xl font-extrabold tabular-nums text-white">{score}</span>
    </span>
  );
}

/* Five blocks and a word instead of a number and a weight. */
function Facet({ label, value, word }: { label: string; value: number; word: string }) {
  const lit = Math.max(1, Math.round(value / 20));
  return (
    <div className="flex items-center gap-3">
      <span className="w-[8.5rem] shrink-0 text-sm text-white/75">{label}</span>
      <span className="flex flex-1 gap-1" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className={`h-2 flex-1 rounded-full ${i < lit ? "bg-accent shadow-[0_0_8px_rgba(240,83,30,0.6)]" : "bg-white/12"}`} />
        ))}
      </span>
      <span className="w-[6.25rem] shrink-0 text-right text-sm font-bold text-white">{word}</span>
    </div>
  );
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getProductWithPeers(slug);
  if (!data) notFound();
  const { product: p, peers, category } = data;

  const price = priceOf(p);
  const deal = productDeal(p);
  const catLabel = category?.label ?? categoryLabel(p.category);
  const facts = factsOf(p.specs).slice(0, 8);
  /* Same order as the category page, so "#3" means the same thing on both. */
  const order = rankWithDeals([p, ...peers]);
  const rank = order.findIndex((x) => x.id === p.id) + 1;
  const others = order.filter((x) => x.id !== p.id).slice(0, 3);
  const score = typeof p.gymgearScore === "number" ? p.gymgearScore : null;
  const facets = (p.scoreBreakdown ?? []).filter((f) => f.key !== "rated" || p.rating != null);
  const heaviest = [...facets].sort((a, b) => b.weight - a.weight)[0];

  return (
    <>
      <SiteNav />
      <main className="min-h-[70vh] bg-off">
        <div className="mx-auto max-w-5xl px-4 pb-14 pt-6">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm text-white/60">
            <Link href={`/gear#${category?.group ?? "equipment"}`} className="hover:text-white">
              Gear
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link href={`/category/${p.category}`} className="hover:text-white">
              {catLabel}
            </Link>
          </nav>

          <div className="mt-4 grid gap-6 md:grid-cols-2 md:gap-10">
            <div className="item-card rounded-2xl p-2.5">
              <div className="relative h-80 overflow-hidden rounded-xl bg-white sm:h-[26rem]">
                <div className="h-full w-full p-5">
                  <ProductPhoto src={p.image} brand={p.brand} alt={p.name} />
                </div>
                {deal && <span className="gg-corner-deal absolute right-0 top-0 h-9 text-sm">{deal.pct}% off</span>}
                {p.awards?.[0] && (
                  <span className="gg-dumbbell absolute bottom-3 left-3">
                    <DumbbellMark />
                    {p.awards[0]}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col">
              <p className="text-white/60">{p.brand}</p>
              <h1 className="mt-0.5 font-display text-3xl font-extrabold leading-tight tracking-tight text-white text-balance sm:text-4xl">
                {p.name}
              </h1>

              {score != null && (
                <div className="mt-5 flex items-center gap-4">
                  <ScoreRing score={score} />
                  <div className="min-w-0">
                    <p className="font-display text-2xl font-extrabold text-white">{scoreWord(score)}</p>
                    <p className="text-sm text-white/70">
                      GymGear Score out of 100
                      {rank > 0 && (
                        <>
                          <br />
                          Ranked #{rank} of {order.length} in {catLabel}
                        </>
                      )}
                    </p>
                  </div>
                </div>
              )}

              {p.rating != null && (
                <p className="mt-4 flex flex-wrap items-center gap-x-1.5 text-white/75">
                  <Star className="h-5 w-5 fill-accent text-accent" />
                  <span className="font-bold text-white">{p.rating} out of 5</span>
                  {p.reviewCount != null && <span>from {p.reviewCount.toLocaleString("en-US")} owner reviews</span>}
                </p>
              )}

              <div className="mt-auto pt-6">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <span className="font-display text-4xl font-extrabold tabular-nums text-white">{formatPrice(price)}</span>
                  {deal && <span className="text-lg tabular-nums text-white/55 line-through">{formatPrice(p.price)}</span>}
                  {deal && (
                    <span className="gg-tag gg-tag--award px-3 py-1.5 text-sm normal-case tracking-normal text-navy-deep">
                      You save {formatPrice(Math.round(deal.save))}
                    </span>
                  )}
                </div>
                {(storeSaleLabel(p) || checkedLabel(p)) && (
                  <p className="mt-2 text-sm text-white/70">
                    {deal && storeSaleLabel(p) && <span className="font-bold text-accent">{storeSaleLabel(p)}. </span>}
                    {checkedLabel(p)}
                  </p>
                )}
                <a
                  href={buyUrl(p)}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="glow-btn mt-4 flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3.5 text-base font-bold text-white hover:bg-accent-hover"
                >
                  Check price at {p.retailer}
                  <ArrowUpRight className="h-4 w-4" />
                </a>
                <p className="mt-2 text-center text-sm text-white/60">
                  We may earn a commission, at no extra cost to you.{" "}
                  <Link href="/disclosure" className="underline">
                    How we make money
                  </Link>
                </p>
              </div>
            </div>
          </div>

          <div className="mt-12 grid gap-10 md:grid-cols-2">
            <section>
              <h2 className="font-display text-2xl font-extrabold tracking-tight text-white">About this product</h2>
              <p className="mt-3 max-w-prose text-lg leading-relaxed text-white/80">{aboutProduct(p)}</p>
              {facts.length > 0 && (
                <dl className="mt-5 divide-y divide-white/10 border-y border-white/10">
                  {facts.map((f) =>
                    f.label ? (
                      <div key={f.label} className="flex items-baseline justify-between gap-4 py-2.5 text-sm">
                        <dt className="text-white/65">{f.label}</dt>
                        <dd className="text-right font-bold text-white">{f.value}</dd>
                      </div>
                    ) : (
                      <div key={f.value} className="py-2.5 text-sm font-bold text-white">
                        {f.value}
                      </div>
                    ),
                  )}
                </dl>
              )}
            </section>

            {score != null && facets.length > 0 && (
              <section>
                <h2 className="font-display text-2xl font-extrabold tracking-tight text-white">How it rates</h2>
                <div className="mt-4 space-y-4">
                  {facets.map((f) => (
                    <Facet key={f.key} label={f.key === "trust" ? "Number of reviews" : f.label} value={f.score} word={facetWord(f.key, f.score)} />
                  ))}
                </div>
                <p className="mt-5 text-sm leading-relaxed text-white/65">
                  {heaviest.label} counts most for {catLabel.toLowerCase()}. Scores come from published data, not hands-on testing.{" "}
                  <Link href="/methodology" className="font-bold text-accent underline-offset-2 hover:underline">
                    How we score
                  </Link>
                </p>
              </section>
            )}
          </div>

          {others.length > 0 && (
            <section className="mt-12">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-2xl font-extrabold tracking-tight text-white">Also worth a look</h2>
                <Link href={`/compare?cat=${p.category}&ids=${p.id}`} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-accent hover:underline">
                  <Scale className="h-4 w-4" />
                  Compare side by side
                </Link>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {others.map((x) => (
                  <Link key={x.id} href={`/gear/${x.id}`} className="item-card glow-btn group flex min-w-0 flex-col rounded-2xl p-2.5">
                    <span className="block h-40 overflow-hidden rounded-xl bg-white">
                      <span className="block h-full w-full p-3 transition-transform duration-500 group-hover:scale-105">
                        <ProductPhoto src={x.image} brand={x.brand} />
                      </span>
                    </span>
                    <span className="mt-3 block truncate px-1 font-bold text-white">{x.name}</span>
                    <span className="block px-1 pb-1 text-sm text-white/70">
                      {formatPrice(priceOf(x))}
                      {typeof x.gymgearScore === "number" && ` \u00b7 ${scoreWord(x.gymgearScore)} (${x.gymgearScore})`}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
