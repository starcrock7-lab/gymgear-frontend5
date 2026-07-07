import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Star, ArrowUpRight, ChevronRight, Award } from "lucide-react";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import { getCategoryProducts } from "@/lib/catalog";
import { GUIDES, getGuide } from "@/lib/guides";
import { buyUrl, formatPrice, type KitProduct } from "@/lib/kit";

export const revalidate = 3600;

export async function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const g = getGuide(slug);
  if (!g) return { title: "Guide not found" };
  return {
    title: g.metaTitle,
    description: g.metaDescription,
    alternates: { canonical: `/guides/${g.slug}` },
  };
}

const priceOf = (p: KitProduct) => p.salePrice ?? p.price;

function pick(ranked: KitProduct[], award: string): KitProduct | undefined {
  return ranked.find((p) => p.awards?.includes(award));
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const g = getGuide(slug);
  if (!g) notFound();

  const products = await getCategoryProducts(g.category).catch(() => []);
  if (!products.length) notFound();
  const ranked = [...products].sort(
    (a, b) => (b.gymgearScore ?? 0) - (a.gymgearScore ?? 0),
  );

  const top = ranked[0];
  const value =
    pick(ranked, "Best Value") ?? ranked.find((p) => p.id !== top.id);
  const budget =
    pick(ranked, "Best Budget") ??
    [...ranked]
      .filter((p) => (p.gymgearScore ?? 0) >= 70)
      .sort((a, b) => priceOf(a) - priceOf(b))[0];

  const picks = [
    { label: "Best overall", p: top },
    { label: "Best value", p: value },
    { label: "Best budget", p: budget },
  ].filter(
    (x, i, arr): x is { label: string; p: KitProduct } =>
      !!x.p && arr.findIndex((y) => y.p?.id === x.p?.id) === i,
  );

  return (
    <>
      <SiteNav />
      <main className="min-h-[70vh] bg-off">
        <nav
          aria-label="Breadcrumb"
          className="mx-auto flex max-w-3xl flex-wrap items-center gap-1 px-5 pt-6 text-xs text-ink-3"
        >
          <Link href="/" className="hover:text-ink">
            Home
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link href="/guides" className="hover:text-ink">
            Guides
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-ink-2">{g.h1}</span>
        </nav>

        <article className="mx-auto max-w-3xl px-5 py-8">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            {g.h1}
          </h1>

          {/* Lead with the answer */}
          <p className="mt-4 text-lg leading-relaxed text-ink-2">
            <strong className="text-ink">Our top pick is the{" "}
              <Link
                href={`/gear/${top.id}`}
                className="text-accent underline-offset-2 hover:underline"
              >
                {top.name}
              </Link>
            </strong>
            {typeof top.gymgearScore === "number"
              ? ` (GymGear Score ${top.gymgearScore}/100).`
              : "."}{" "}
            {g.lead}
          </p>

          {/* Pick cards */}
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {picks.map(({ label, p }) => (
              <div
                key={p.id}
                className="flex flex-col rounded-2xl border border-line bg-card p-4"
              >
                <span className="flex items-center gap-1 text-[0.65rem] font-bold uppercase tracking-wide text-accent">
                  <Award className="h-3 w-3" />
                  {label}
                </span>
                <Link
                  href={`/gear/${p.id}`}
                  className="mt-2 flex h-24 items-center justify-center overflow-hidden rounded-xl border border-line bg-white"
                >
                  {p.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.image}
                      alt={p.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="font-display text-2xl font-bold text-navy/30">
                      {p.brand.charAt(0)}
                    </span>
                  )}
                </Link>
                <Link
                  href={`/gear/${p.id}`}
                  className="mt-2 font-display text-sm font-bold text-ink hover:text-accent"
                >
                  {p.name}
                </Link>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-ink-2">
                  <Star className="h-3 w-3 fill-accent text-accent" />
                  {p.rating}
                  {typeof p.gymgearScore === "number" && (
                    <>
                      <span className="text-ink-3">·</span>
                      <span className="font-bold text-accent">
                        {p.gymgearScore}
                      </span>
                    </>
                  )}
                </div>
                <a
                  href={buyUrl(p)}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="mt-3 flex items-center justify-center gap-1 rounded-lg bg-accent py-2 text-xs font-bold text-white transition-colors hover:bg-accent-hover"
                >
                  {formatPrice(priceOf(p))}
                  <ArrowUpRight className="h-3 w-3" />
                </a>
              </div>
            ))}
          </div>

          {/* How to choose */}
          <h2 className="mt-12 font-display text-2xl font-extrabold tracking-tight text-ink">
            What to look for
          </h2>
          <div className="mt-5 space-y-5">
            {g.criteria.map((c) => (
              <div key={c.h}>
                <h3 className="font-display text-lg font-bold text-ink">
                  {c.h}
                </h3>
                <p className="mt-1 leading-relaxed text-ink-2">{c.body}</p>
              </div>
            ))}
          </div>

          <Link
            href={`/category/${g.category}`}
            className="mt-10 inline-flex items-center gap-1 rounded-xl bg-accent px-5 py-3 text-sm font-bold text-white transition-all duration-300 hover:bg-accent-hover hover:shadow-[0_0_20px_rgba(232,84,42,0.5)]"
          >
            See the full ranking
            <ChevronRight className="h-4 w-4" />
          </Link>

          <p className="mt-6 text-xs text-ink-3">
            Ranked by the{" "}
            <Link href="/methodology" className="underline">
              GymGear Score
            </Link>
            . Some links earn us a commission at no extra cost to you —{" "}
            <Link href="/disclosure" className="underline">
              how we make money
            </Link>
            .
          </p>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
