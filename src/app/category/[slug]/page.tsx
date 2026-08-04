import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Star, ArrowUpRight, ChevronRight, Trophy } from "lucide-react";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import {
  getCategories,
  getCategoryProducts,
  NOINDEX_CATEGORIES,
} from "@/lib/catalog";
import { buyUrl, formatPrice } from "@/lib/kit";
import { dealsSavings, findDeals, productDeal, rankWithDeals } from "@/lib/deals";

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
  const category = cats.find((c) => c.key === slug) ?? null;
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

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { category, ranked, deals } = await load(slug);
  if (!category || !ranked.length) notFound();

  const top = ranked[0];
  const runnerUp = ranked[1];

  return (
    <>
      <SiteNav />
      <main className="min-h-[70vh] bg-off">
        <nav
          aria-label="Breadcrumb"
          className="mx-auto flex max-w-4xl flex-wrap items-center gap-1 px-5 pt-6 text-xs text-ink-3"
        >
          <Link href="/" className="hover:text-ink">
            Home
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-ink-2">{category.label}</span>
        </nav>

        <div className="mx-auto max-w-4xl px-5 py-8">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            Best {category.label}, ranked
          </h1>

          {/* Lead with the answer (search-intent first) */}
          <p className="mt-4 text-lg leading-relaxed text-ink-2">
            Our top {category.label.toLowerCase()} pick is{" "}
            <Link
              href={`/gear/${top.id}`}
              className="font-bold text-ink underline-offset-2 hover:text-accent hover:underline"
            >
              {top.name}
            </Link>{" "}
            {typeof top.gymgearScore === "number"
              ? `(GymGear Score ${top.gymgearScore}/100)`
              : ""}
            {runnerUp ? (
              <>
                , narrowly ahead of the {runnerUp.name}
                {typeof runnerUp.gymgearScore === "number"
                  ? ` (${runnerUp.gymgearScore})`
                  : ""}
              </>
            ) : null}
            . Below is the full ranking of {ranked.length} options, each scored
            on build quality, owner rating, value, and review confidence —{" "}
            <Link
              href="/methodology"
              className="font-medium text-accent underline-offset-2 hover:underline"
            >
              how we score
            </Link>
            .
            {deals.length > 0 && (
              <>
                {" "}
                {deals.length === 1
                  ? "One of them is discounted right now"
                  : `${deals.length} of them are discounted right now`}
                , and a live deal moves a product up the ranking.
              </>
            )}
          </p>

          {/* Deals first — prime position, above the ranking. The ranking
              itself stays honest about quality; this is where a live discount
              gets its prominence. */}
          {deals.length > 0 && (
            <section
              aria-label="Discounted right now"
              className="mt-8 rounded-2xl border border-accent/30 bg-accent/5 p-4"
            >
              <h2 className="font-display text-sm font-extrabold uppercase tracking-wide text-accent">
                On sale right now
              </h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {deals.slice(0, 4).map((d) => (
                  <Link
                    key={d.product.id}
                    href={`/gear/${d.product.id}`}
                    /* min-w-0: a grid item defaults to min-width:auto, so the
                       long product name would push the card past its cell and
                       scroll the page sideways instead of truncating. */
                    className="flex min-w-0 items-center gap-3 rounded-xl border border-line bg-card p-3 transition-colors hover:border-accent"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-white">
                      {d.product.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={d.product.image}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="font-display text-sm font-bold text-navy/40">
                          {d.product.brand.charAt(0)}
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-body text-sm font-bold text-ink">
                        {d.product.name}
                      </span>
                      <span className="text-xs text-ink-3">
                        {formatPrice(d.product.salePrice ?? d.product.price)}{" "}
                        <span className="line-through">
                          {formatPrice(d.product.price)}
                        </span>
                      </span>
                    </span>
                    <span className="shrink-0 rounded-lg bg-accent px-2 py-1 font-display text-xs font-extrabold text-white">
                      {d.pct}% off
                    </span>
                  </Link>
                ))}
              </div>
              <p className="mt-3 text-xs text-ink-3">
                Saving {formatPrice(dealsSavings(deals))} across{" "}
                {deals.length === 1 ? "this deal" : `these ${deals.length} deals`}.
                Prices come straight from the retailer and are re-checked daily.
              </p>
            </section>
          )}

          {/* The ranking */}
          <div className="mt-8 space-y-3">
            {ranked.map((p, i) => (
              <div
                key={p.id}
                className="flex flex-col gap-4 rounded-2xl border border-line bg-card p-4 sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-off font-display text-sm font-extrabold text-ink-2">
                    {i + 1}
                  </span>
                  <Link
                    href={`/gear/${p.id}`}
                    className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-white"
                  >
                    {p.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.image}
                        alt={p.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="font-display text-lg font-bold text-navy/40">
                        {p.brand.charAt(0)}
                      </span>
                    )}
                  </Link>
                  <div className="min-w-0">
                    <Link
                      href={`/gear/${p.id}`}
                      className="flex items-center gap-1.5 font-display text-base font-bold text-ink hover:text-accent"
                    >
                      <span className="truncate">{p.name}</span>
                    </Link>
                    <p className="text-xs text-ink-3">{p.brand}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-2">
                      <span className="flex items-center gap-0.5">
                        <Star className="h-3 w-3 fill-accent text-accent" />
                        {p.rating}
                      </span>
                      {p.awards?.[0] && (
                        <span className="flex items-center gap-0.5 font-bold text-accent">
                          <Trophy className="h-3 w-3" />
                          {p.awards[0]}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  {typeof p.gymgearScore === "number" && (
                    <div className="text-center">
                      <div className="font-display text-xl font-extrabold text-accent">
                        {p.gymgearScore}
                      </div>
                      <div className="text-[0.55rem] uppercase tracking-wide text-ink-3">
                        Score
                      </div>
                    </div>
                  )}
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {productDeal(p) && (
                        <span className="rounded-md bg-accent/10 px-1.5 py-0.5 font-display text-[0.65rem] font-extrabold uppercase tracking-wide text-accent">
                          {productDeal(p)!.pct}% off
                        </span>
                      )}
                      <div className="font-display text-lg font-bold text-ink">
                        {formatPrice(priceOf(p))}
                      </div>
                    </div>
                    {productDeal(p) && (
                      <div className="text-xs text-ink-3 line-through">
                        {formatPrice(p.price)}
                      </div>
                    )}
                    <div className="mt-1 flex items-center justify-end gap-1.5">
                      <a
                        href={buyUrl(p)}
                        target="_blank"
                        rel="noopener noreferrer sponsored"
                        className="inline-flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-accent-hover"
                      >
                        Check price
                        <ArrowUpRight className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-8 text-xs text-ink-3">
            Prices and availability change; we check periodically but verify on
            the retailer&rsquo;s site. Some links earn us a commission at no
            extra cost to you —{" "}
            <Link href="/disclosure" className="underline">
              how we make money
            </Link>
            .
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
