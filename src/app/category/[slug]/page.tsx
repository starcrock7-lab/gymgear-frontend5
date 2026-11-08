import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Star, ArrowUpRight, ChevronRight } from "lucide-react";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import {
  getCategories,
  getCategoryProducts,
  NOINDEX_CATEGORIES,
} from "@/lib/catalog";
import { buyUrl, formatPrice, type KitProduct } from "@/lib/kit";
import { findDeals, productDeal, rankWithDeals } from "@/lib/deals";
import DealsStrip from "@/components/DealsStrip";
import ProductPhoto from "@/components/ProductPhoto";
import { DumbbellMark } from "@/components/ui/dumbbell-mark";
import { gearArt } from "@/lib/gear-art";

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const cats = await getCategories();
    return cats.map((c) => ({ slug: c.key }));
  } catch {
    return [];
  }
}

const priceOf = (p: { salePrice?: number; price: number }) =>
  p.salePrice ?? p.price;

async function load(slug: string) {
  const [cats, products] = await Promise.all([
    getCategories(),
    getCategoryProducts(slug).catch(() => []),
  ]);
  /* A category the backend no longer offers is gone, whatever cached products
     may still be lying around for it. Without this check a retired category
     kept rendering from stale data — the page only 404s on an empty ranking,
     and the stale ranking was not empty. */
  const category = cats.find((c) => c.key === slug) ?? null;
  if (!category) return { category: null, ranked: [], deals: [] };
  /* Score first, live discounts boosted — same bargain the kit builder makes,
     so the ranking and the kits never disagree about what a deal is worth. */
  const ranked = rankWithDeals(products);
  return { category, ranked, deals: findDeals(ranked) };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { category, ranked } = await load(slug);
  if (!category || !ranked.length)
    return { title: "Category not found" };
  const top = ranked[0];
  return {
    title: `Best ${category.label} (2026) — ranked by GymGear Score`,
    description:
      `Our ${category.label.toLowerCase()} ranking: ${ranked.length} options scored on build, ` +
      `owner rating, value, and review confidence. Top pick: ${top.name} ` +
      `(${top.gymgearScore ?? "—"}/100, ${formatPrice(priceOf(top))}).`,
    alternates: { canonical: `/category/${slug}` },
    robots: NOINDEX_CATEGORIES.has(slug)
      ? { index: false, follow: true }
      : undefined,
  };
}

/* The photo with everything that sets a product apart pinned to it: its place
   in the ranking, any live discount, its score and its award. */
function ItemPhoto({ p, rank, className }: { p: KitProduct; rank: number; className: string }) {
  const deal = productDeal(p);
  return (
    <Link href={`/gear/${p.id}`} className={`relative block overflow-hidden rounded-xl bg-white ${className}`}>
      <span className="block h-full w-full p-4 pb-10 transition-transform duration-500 group-hover:scale-105">
        <ProductPhoto src={p.image} brand={p.brand} alt={p.name} />
      </span>
      <span className="absolute left-2 top-2 flex h-9 min-w-9 items-center justify-center rounded-lg bg-navy px-2 font-display text-sm font-extrabold text-white shadow-md">
        #{rank}
      </span>
      {deal && <span className="gg-corner-deal absolute right-0 top-0 h-9 text-sm">{deal.pct}% off</span>}
      {typeof p.gymgearScore === "number" && (
        <span className="gg-tag gg-tag--score absolute bottom-2 left-2 bg-navy px-3 py-1.5 text-sm backdrop-blur-none">
          <span className="gg-tag__num text-base">{p.gymgearScore}</span>
          <span className="gg-tag__lbl">Score</span>
        </span>
      )}
      {p.awards?.[0] && (
        <span className="gg-dumbbell absolute bottom-2 right-2">
          <DumbbellMark />
          {p.awards[0]}
        </span>
      )}
    </Link>
  );
}

function ItemFacts({ p, large }: { p: KitProduct; large?: boolean }) {
  const deal = productDeal(p);
  /* Extra awards first: the first one is already on the photo. */
  const chips = [...(p.awards ?? []).slice(1), ...(p.aspects ?? [])].slice(0, large ? 4 : 2);
  return (
    <>
      <p className="text-sm text-white/60">{p.brand}</p>
      <Link href={`/gear/${p.id}`} className={`block font-display font-bold leading-snug text-white hover:text-accent ${large ? "text-2xl sm:text-3xl" : "line-clamp-2 text-lg"}`}>
        {p.name}
      </Link>
      {p.rating != null && (
        <p className="mt-1.5 flex items-center gap-1 text-sm text-white/75">
          <Star className="h-4 w-4 fill-accent text-accent" />
          <span className="font-bold text-white">{p.rating}</span>
          {p.reviewCount != null && <span>({p.reviewCount.toLocaleString("en-US")})</span>}
        </p>
      )}
      {large && p.expertVerdict && <p className="mt-3 max-w-prose leading-relaxed text-white/75">{p.expertVerdict}</p>}
      {chips.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <span key={c} className="rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-1 text-xs font-bold text-white/85">
              {c}
            </span>
          ))}
        </div>
      )}
      <div className="mt-auto pt-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <span className="font-display text-2xl font-extrabold tabular-nums text-white">{formatPrice(priceOf(p))}</span>
          {deal && <span className="tabular-nums text-white/55 line-through">{formatPrice(p.price)}</span>}
          {deal && (
            <span className="gg-tag gg-tag--award px-2.5 py-1 text-xs normal-case tracking-normal text-navy-deep">
              Save {formatPrice(Math.round(deal.save))}
            </span>
          )}
        </div>
        <a
          href={buyUrl(p)}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className={`mt-3 flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-accent px-5 text-sm font-bold text-white transition-colors hover:bg-accent-hover ${large ? "sm:inline-flex" : ""}`}
        >
          Check price
          <ArrowUpRight className="h-4 w-4" />
        </a>
      </div>
    </>
  );
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { category, ranked, deals } = await load(slug);
  if (!category || !ranked.length) notFound();

  const top = ranked[0];
  const art = gearArt(category.key);

  return (
    <>
      <SiteNav />
      <main className="min-h-[70vh] bg-off">
        <div className="mx-auto max-w-6xl px-4 pb-14 pt-6">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm text-white/60">
            <Link href={`/gear#${category.group}`} className="hover:text-white">
              Gear
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-white/85">{category.label}</span>
          </nav>

          <header className="mt-3 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
                Best {category.label}, ranked
              </h1>
              <p className="mt-3 max-w-2xl text-white/75">
                {ranked.length} options scored on build quality, owner rating, value and review confidence.
                {deals.length > 0 && " A live sale moves a product up the ranking."}{" "}
                <Link href="/methodology" className="font-bold text-accent underline-offset-2 hover:underline">
                  How we score
                </Link>
              </p>
            </div>
            {art && (
              <div className="relative hidden h-36 w-36 shrink-0 sm:block lg:h-44 lg:w-44">
                <span aria-hidden className="gear-halo absolute inset-[6%] rounded-full" />
                <span aria-hidden className="gear-floor absolute bottom-[3%] left-1/2 h-[9%] w-[58%] rounded-[50%]" />
                {/* eslint-disable-next-line @next/next/no-img-element -- our own fixed-size art */}
                <img src={art} alt="" className="gear-art relative h-full w-full object-contain" />
              </div>
            )}
          </header>

          {/* Deals first: prime position, above the ranking. The ranking itself
              stays honest about quality; this is where a live discount gets
              its prominence. */}
          {deals.length > 0 && (
            <div className="mt-8">
              <DealsStrip deals={deals} />
            </div>
          )}

          <h2 className="mt-12 font-display text-2xl font-extrabold tracking-tight text-white">The ranking</h2>

          {/* The winner gets the full width; the rest fill the grid below. */}
          <article className="item-card group mt-4 grid gap-5 rounded-2xl p-2.5 sm:grid-cols-2 sm:items-stretch">
            <ItemPhoto p={top} rank={1} className="h-64 sm:h-96" />
            <div className="flex min-w-0 flex-col px-2 pb-2 sm:py-4 sm:pr-4">
              <ItemFacts p={top} large />
            </div>
          </article>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ranked.slice(1).map((p, i) => (
              <article key={p.id} className="item-card glow-btn group flex min-w-0 flex-col rounded-2xl p-2.5">
                <ItemPhoto p={p} rank={i + 2} className="h-56" />
                <div className="flex flex-1 flex-col px-1.5 pb-1.5 pt-3">
                  <ItemFacts p={p} />
                </div>
              </article>
            ))}
          </div>

          <p className="mt-8 text-sm text-white/60">
            Prices and availability change; we check periodically but verify on
            the retailer&rsquo;s site. Some links earn us a commission at no
            extra cost to you.{" "}
            <Link href="/disclosure" className="underline">
              How we make money
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
