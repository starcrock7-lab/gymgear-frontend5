import Link from "next/link";
import { ArrowRight, Flame } from "lucide-react";
import { getAllProducts } from "@/lib/catalog";
import { findDeals, saleSeason, storeCount } from "@/lib/deals";
import PromoPopup from "@/components/PromoPopup";

/* Site-wide bar above the nav pointing at /deals, plus the sale/email
   pop-up. Counts come from the same live catalog the deals page reads, so
   neither promises more than the page shows. With no deals (or no catalog)
   the bar disappears and the pop-up falls back to the email signup. */
export default async function DealsBanner() {
  const deals = findDeals(await getAllProducts().catch(() => []));
  const emailEnabled = !!process.env.MAILERLITE_API_KEY;
  const season = saleSeason();
  const maxPct = deals.length ? Math.max(...deals.map((d) => d.pct)) : 0;
  const promo = deals.length
    ? {
        season,
        count: deals.length,
        stores: storeCount(deals),
        maxPct,
        biggest: { name: deals[0].product.name, save: deals[0].save },
      }
    : null;

  return (
    <>
      {promo && (
        <Link
          href="/deals"
          className="deals-bar group relative block overflow-hidden px-4 py-2.5 text-white sm:py-3"
        >
          <span aria-hidden className="deals-bar-sheen pointer-events-none absolute inset-0" />
          <span className="relative mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-center sm:gap-x-4">
            {season && (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-navy-deep px-2.5 py-1 font-display text-sm font-extrabold uppercase tracking-wider">
                <Flame aria-hidden className="deals-bar-flame h-4 w-4 text-accent" />
                {season}
              </span>
            )}
            <span className="font-display text-base font-extrabold leading-tight sm:text-xl">
              Save up to {maxPct}% on {deals.length} home gym {deals.length === 1 ? "deal" : "deals"}
              <ArrowRight aria-hidden className="ml-1 inline h-4 w-4 align-[-2px] sm:hidden" />
            </span>
            <span className="hidden min-h-9 sm:inline-flex items-center gap-1 rounded-full bg-white px-4 text-sm font-extrabold text-accent-deep transition-transform duration-200 group-hover:scale-105">
              Shop deals <ArrowRight aria-hidden className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </span>
          </span>
        </Link>
      )}
      <PromoPopup deals={promo} emailEnabled={emailEnabled} />
    </>
  );
}
