import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Star, Check, ArrowUpRight, ChevronRight, Trophy } from "lucide-react";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import AddToCartButton from "@/components/AddToCartButton";
import {
  getAllProducts,
  getProductWithPeers,
  NOINDEX_CATEGORIES,
} from "@/lib/catalog";
import { buyUrl, formatPrice, categoryLabel } from "@/lib/kit";

export const revalidate = 3600;
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
      `${p.rating}/5 from ${p.reviewCount.toLocaleString()} owners, ${formatPrice(price)}. ` +
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

/* A short, data-derived read on the score — original analysis, not a spec
   echo. Turns our own rubric output into a sentence (information gain). */
function scoreNarrative(
  facets: { label: string; score: number }[],
  name: string,
  cat: string,
): string {
  if (!facets.length) return "";
  const sorted = [...facets].sort((a, b) => b.score - a.score);
  const top = sorted[0];
  const low = sorted[sorted.length - 1];
  return (
    `In our ${cat} rubric the ${name} is strongest on ${top.label.toLowerCase()} ` +
    `(${top.score}/100) and weakest on ${low.label.toLowerCase()} (${low.score}/100). ` +
    `The overall score weights each of those by what actually matters for ${cat}.`
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
  const catLabel = category?.label ?? categoryLabel(p.category);
  // Defensive: some catalog rows have mis-ordered p() args (specs/verdict
  // swapped), so guard against non-object specs and non-string verdicts.
  const specs =
    p.specs && typeof p.specs === "object" && !Array.isArray(p.specs)
      ? Object.entries(p.specs).filter(([, v]) => typeof v === "string")
      : [];
  const verdict = typeof p.expertVerdict === "string" ? p.expertVerdict : "";
  const verdictSource =
    typeof p.expertSource === "string" ? p.expertSource : "";
  const rank =
    peers.length && typeof p.gymgearScore === "number"
      ? peers.filter((x) => (x.gymgearScore ?? 0) > (p.gymgearScore ?? 0)).length + 1
      : null;

  return (
    <>
      <SiteNav />
      <main className="min-h-[70vh] bg-off">
        {/* Breadcrumb — crawlable path */}
        <nav
          aria-label="Breadcrumb"
          className="mx-auto flex max-w-5xl flex-wrap items-center gap-1 px-5 pt-6 text-xs text-ink-3"
        >
          <Link href="/" className="hover:text-ink">
            Home
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link href={`/category/${p.category}`} className="hover:text-ink">
            {catLabel}
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-ink-2">{p.name}</span>
        </nav>

        <div className="mx-auto max-w-5xl px-5 py-8">
          {/* Header */}
          <div className="grid gap-8 md:grid-cols-2">
            <div className="overflow-hidden rounded-2xl border border-line bg-white">
              {p.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.image}
                  alt={p.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex aspect-square items-center justify-center font-display text-5xl font-bold text-navy/30">
                  {p.brand.charAt(0)}
                </div>
              )}
            </div>

            <div>
              <p className="text-[0.65rem] font-medium uppercase tracking-[0.2em] text-accent">
                {catLabel}
              </p>
              <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
                {p.name}
              </h1>
              <p className="mt-1 text-ink-2">by {p.brand}</p>

              {p.awards?.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {p.awards.map((a) => (
                    <span
                      key={a}
                      className="flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-bold text-accent"
                    >
                      <Trophy className="h-3 w-3" />
                      {a}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="mt-4 flex items-baseline gap-3">
                <span className="font-display text-4xl font-extrabold text-accent">
                  {formatPrice(price)}
                </span>
                {p.salePrice && (
                  <span className="text-lg text-ink-3 line-through">
                    {formatPrice(p.price)}
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-sm text-ink-2">
                <span className="relative inline-flex" aria-hidden>
                  <span className="flex text-line">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <Star key={i} className="h-4 w-4 shrink-0 fill-current" />
                    ))}
                  </span>
                  <span
                    className="absolute inset-y-0 left-0 flex overflow-hidden text-accent"
                    style={{ width: `${(Math.min(p.rating, 5) / 5) * 100}%` }}
                  >
                    {[0, 1, 2, 3, 4].map((i) => (
                      <Star key={i} className="h-4 w-4 shrink-0 fill-current" />
                    ))}
                  </span>
                </span>
                <span className="font-bold text-ink">{p.rating}</span>
                <span className="text-ink-3">
                  from {p.reviewCount.toLocaleString()} owner reviews
                </span>
              </div>

              <a
                href={buyUrl(p)}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent font-body text-base font-bold text-white shadow-lg shadow-accent/30 transition-colors hover:bg-accent-hover"
              >
                Check price at {p.retailer}
                <ArrowUpRight className="h-4 w-4" />
              </a>
              <AddToCartButton
                product={p}
                variant="light"
                className="mt-2 h-12 w-full"
              />
              <p className="mt-2 text-center text-[0.7rem] text-ink-3">
                We may earn a commission, at no extra cost to you.{" "}
                <Link href="/disclosure" className="underline">
                  How we make money
                </Link>
              </p>
            </div>
          </div>

          {/* GymGear Score — proprietary data, the information-gain core */}
          {typeof p.gymgearScore === "number" && (
            <section className="mt-12 rounded-2xl border border-line bg-white p-6">
              <div className="flex flex-wrap items-center gap-5">
                <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-2xl bg-accent text-white shadow-lg shadow-accent/30">
                  <span className="font-display text-3xl font-extrabold leading-none">
                    {p.gymgearScore}
                  </span>
                  <span className="text-[0.55rem] font-bold uppercase tracking-wide opacity-80">
                    / 100
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-xl font-extrabold tracking-tight text-ink">
                    GymGear Score{rank ? ` — #${rank} in ${catLabel}` : ""}
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-ink-2">
                    {scoreNarrative(
                      p.scoreBreakdown ?? [],
                      p.name,
                      catLabel.toLowerCase(),
                    )}{" "}
                    <Link
                      href="/methodology"
                      className="font-medium text-accent underline-offset-2 hover:underline"
                    >
                      How we score
                    </Link>
                    .
                  </p>
                </div>
              </div>

              {p.scoreBreakdown?.length ? (
                <div className="mt-6 space-y-2.5">
                  {p.scoreBreakdown.map((f) => (
                    <div key={f.key} className="flex items-center gap-3 text-sm">
                      <span className="w-32 shrink-0 text-ink-2">{f.label}</span>
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-off">
                        <span
                          className="block h-full rounded-full bg-accent"
                          style={{ width: `${f.score}%` }}
                        />
                      </span>
                      <span className="w-9 shrink-0 text-right font-bold text-ink">
                        {f.score}
                      </span>
                      <span className="w-10 shrink-0 text-right text-xs text-ink-3">
                        {Math.round(f.weight * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>
          )}

          {/* Expert verdict — the "why" */}
          {verdict && (
            <section className="mt-8">
              <h2 className="font-display text-2xl font-extrabold tracking-tight text-ink">
                Our verdict
              </h2>
              <p className="mt-3 text-lg leading-relaxed text-ink-2">{verdict}</p>
              {verdictSource && (
                <p className="mt-2 text-sm text-ink-3">
                  Assessment informed by {verdictSource}.
                </p>
              )}
            </section>
          )}

          {/* Specs */}
          {specs.length > 0 && (
            <section className="mt-10">
              <h2 className="font-display text-2xl font-extrabold tracking-tight text-ink">
                Specs
              </h2>
              <dl className="mt-4 overflow-hidden rounded-2xl border border-line bg-white">
                {specs.map(([k, v], i) => (
                  <div
                    key={k}
                    className={
                      "flex items-center justify-between gap-4 px-5 py-3 text-sm " +
                      (i % 2 ? "bg-off/60" : "")
                    }
                  >
                    <dt className="text-ink-2">{k}</dt>
                    <dd className="text-right font-medium text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {/* How it ranks — internal links + category context (information gain) */}
          {peers.length > 0 && (
            <section className="mt-10">
              <h2 className="font-display text-2xl font-extrabold tracking-tight text-ink">
                How it compares in {catLabel}
              </h2>
              <div className="mt-4 space-y-2">
                {peers.slice(0, 6).map((x) => (
                  <Link
                    key={x.id}
                    href={`/gear/${x.id}`}
                    className="flex items-center justify-between gap-4 rounded-xl border border-line bg-white px-4 py-3 transition-colors hover:border-accent/40"
                  >
                    <span className="flex items-center gap-2 truncate">
                      {typeof x.gymgearScore === "number" && (
                        <span className="shrink-0 rounded-md bg-navy px-1.5 py-0.5 text-xs font-bold text-accent">
                          {x.gymgearScore}
                        </span>
                      )}
                      <span className="truncate font-bold text-ink">
                        {x.name}
                      </span>
                      <span className="hidden shrink-0 text-sm text-ink-3 sm:inline">
                        {x.brand}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5 text-sm">
                      <span className="font-bold text-ink">
                        {formatPrice(priceOf(x))}
                      </span>
                      <ChevronRight className="h-4 w-4 text-ink-3" />
                    </span>
                  </Link>
                ))}
              </div>
              <Link
                href={`/category/${p.category}`}
                className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-accent hover:underline"
              >
                See the full {catLabel} ranking
                <ChevronRight className="h-4 w-4" />
              </Link>
            </section>
          )}

          {/* Buy footer */}
          <div className="mt-12 rounded-2xl border border-line bg-white p-6 text-center">
            <p className="font-display text-lg font-bold text-ink">
              Ready to buy the {p.name}?
            </p>
            <a
              href={buyUrl(p)}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="mx-auto mt-3 flex h-12 w-full max-w-sm items-center justify-center gap-2 rounded-xl bg-accent font-body text-base font-bold text-white shadow-lg shadow-accent/30 transition-colors hover:bg-accent-hover"
            >
              Check price at {p.retailer}
              <ArrowUpRight className="h-4 w-4" />
            </a>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-ink-3">
              <Check className="h-3.5 w-3.5 text-win" />
              Independent score · no brand pays for placement
            </p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
