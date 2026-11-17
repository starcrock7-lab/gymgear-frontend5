import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import DealsBrowser from "@/components/DealsBrowser";
import EmailSignup from "@/components/EmailSignup";
import { getAllProducts, getCategories } from "@/lib/catalog";
import { checkedLabel, findDeals, saleSeason, storeCount } from "@/lib/deals";

export const revalidate = 900;

export async function generateMetadata(): Promise<Metadata> {
  const season = saleSeason();
  return {
    title: season ? `${season} home gym deals` : "Home gym deals",
    description:
      "Every discounted home gym product we track, with the sale price, the regular price and how much you save. Prices come straight from the store.",
    alternates: { canonical: "/deals" },
  };
}

export default async function DealsPage() {
  const [products, cats] = await Promise.all([
    getAllProducts().catch(() => []),
    getCategories().catch(() => []),
  ]);
  const deals = findDeals(products);
  const season = saleSeason();
  const stores = storeCount(deals);
  const maxPct = deals.length ? Math.max(...deals.map((d) => d.pct)) : 0;
  const biggest = deals[0];
  const labels = Object.fromEntries(cats.map((c) => [c.key, c.label]));
  /* The most recently checked deal speaks for the page's freshness. */
  const freshest = [...deals].sort((a, b) =>
    (b.product.priceCheckedAt ?? "").localeCompare(a.product.priceCheckedAt ?? ""),
  )[0];

  return (
    <>
      <SiteNav />
      <main className="min-h-[70vh] bg-navy text-white">
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_70%_at_50%_100%,rgba(240,83,30,0.28),transparent)]"
          />
          <div className="relative mx-auto max-w-6xl px-4 pb-10 pt-10 sm:pt-16">
            <h1 className="font-display text-5xl font-extrabold leading-[0.95] tracking-tight text-balance sm:text-7xl">
              {season ?? "Home gym"}{" "}
              <span className="text-accent [text-shadow:0_0_28px_rgba(240,83,30,0.55)]">deals</span>
            </h1>
            {biggest ? (
              <>
                <p className="mt-4 max-w-2xl text-lg text-white/80">
                  {deals.length} home gym {deals.length === 1 ? "deal" : "deals"} from {stores}{" "}
                  {stores === 1 ? "store" : "stores"}, up to {maxPct}% off. Biggest saving right now:{" "}
                  <Link
                    href={`/gear/${biggest.product.id}`}
                    className="font-bold text-white underline decoration-accent underline-offset-4"
                  >
                    ${Math.round(biggest.save).toLocaleString("en-US")} on the {biggest.product.name}
                  </Link>
                  .
                </p>
                <p className="mt-2 text-sm text-white/60">
                  Prices come straight from the store. {checkedLabel(freshest.product) ?? ""}
                </p>
              </>
            ) : (
              <p className="mt-4 max-w-2xl text-lg text-white/80">
                Nothing we track is on sale right now. Check back soon, or{" "}
                <Link href="/quiz" className="font-bold text-white underline decoration-accent underline-offset-4">
                  plan your gym
                </Link>{" "}
                at today&apos;s prices.
              </p>
            )}
          </div>
        </section>

        {biggest && (
          <div className="mx-auto max-w-6xl px-4 pb-16">
            <DealsBrowser deals={deals} labels={labels} />
          </div>
        )}

        {process.env.MAILERLITE_API_KEY && (
          <section className="mx-auto max-w-2xl px-4 pb-20">
            <h2 className="font-display text-2xl font-extrabold tracking-tight">Get the next sale in your inbox</h2>
            <p className="mt-1 mb-4 text-white/70">We email you when home gym gear we track goes on sale.</p>
            <EmailSignup id="deals-email" />
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
