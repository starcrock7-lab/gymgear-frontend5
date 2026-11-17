import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getAllProducts } from "@/lib/catalog";
import { findDeals, saleSeason } from "@/lib/deals";

/* Site-wide bar above the nav pointing at /deals. Counts come from the same
   live catalog the deals page reads, so the bar never promises more than the
   page shows. Renders nothing when there are no deals or the catalog is
   unreachable. */
export default async function DealsBanner() {
  const deals = findDeals(await getAllProducts().catch(() => []));
  if (!deals.length) return null;
  const season = saleSeason();
  const maxPct = Math.max(...deals.map((d) => d.pct));
  const count = `${deals.length} home gym ${deals.length === 1 ? "deal" : "deals"}`;

  return (
    <Link
      href="/deals"
      className="group relative block bg-accent px-4 py-2 text-center text-sm font-bold text-white sm:text-base"
    >
      <span className="inline-flex flex-wrap items-center justify-center gap-x-2">
        {season && <span className="font-display font-extrabold uppercase tracking-wide">{season}</span>}
        <span>
          {count}, up to {maxPct}% off
        </span>
        <span className="inline-flex items-center gap-1 underline decoration-white/50 underline-offset-4 group-hover:decoration-white">
          See the deals <ArrowRight aria-hidden className="h-4 w-4" />
        </span>
      </span>
    </Link>
  );
}
