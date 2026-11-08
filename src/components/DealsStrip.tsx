import Link from "next/link";
import { Flame } from "lucide-react";
import { formatPrice } from "@/lib/kit";
import { dealsSavings, endsInLabel, type Deal } from "@/lib/deals";
import ProductPhoto from "@/components/ProductPhoto";

/* Column count that the number of deals fills, so no card sits alone. */
const COLS: Record<number, string> = {
  1: "",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
};

/* Live discounts, given prime position instead of a rigged ranking. Shared by
   the gear index (site-wide) and every category page (that category only), so
   both agree on what a deal looks like and what it claims.

   Renders nothing when there are no deals: an empty "best deals" panel is
   worse than no panel. */
export default function DealsStrip({
  deals,
  title = "On sale right now",
  limit = 4,
  note = true,
}: {
  deals: Deal[];
  title?: string;
  limit?: number;
  note?: boolean;
}) {
  if (!deals.length) return null;
  const shown = deals.slice(0, limit);
  const solo = shown.length === 1;

  return (
    <section aria-label="Discounted right now" className="relative">
      <div aria-hidden className="animate-glow pointer-events-none absolute -inset-y-8 left-1/2 w-[92%] bg-[radial-gradient(closest-side,rgba(240,83,30,0.26),transparent)]" />
      <div className="price-ring">
        <div className="relative rounded-[calc(1.5rem-2px)] bg-[#0b1730] p-4 sm:p-6">
          <h2 className="flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight text-white">
            <Flame className="h-6 w-6 text-accent" />
            {title}
          </h2>
          <div className={`mt-4 grid gap-3 ${COLS[shown.length] ?? "sm:grid-cols-2 lg:grid-cols-3"}`}>
            {shown.map((d) => {
              const ends = endsInLabel(d);
              return (
                <Link
                  key={d.product.id}
                  href={`/gear/${d.product.id}`}
                  /* min-w-0: a grid item defaults to min-width:auto, so a long
                     product name pushes the card past its cell and scrolls the
                     page sideways instead of truncating. */
                  className={`item-card glow-btn group flex min-w-0 flex-col rounded-2xl p-2.5 ${solo ? "sm:flex-row sm:items-center sm:gap-6" : ""}`}
                >
                  <span className={`relative block h-48 shrink-0 overflow-hidden rounded-xl bg-white ${solo ? "sm:h-56 sm:w-1/2" : ""}`}>
                    <span className="block h-full w-full p-3 transition-transform duration-500 group-hover:scale-105">
                      <ProductPhoto src={d.product.image} brand={d.product.brand} />
                    </span>
                    <span className="gg-corner-deal absolute right-0 top-0 h-9 text-sm">{d.pct}% off</span>
                  </span>
                  <span className="block min-w-0 flex-1 px-1.5 pb-1.5 pt-3">
                    <span className="block text-sm text-white/60">{d.product.brand}</span>
                    <span className={`block font-bold leading-snug text-white ${solo ? "text-xl" : "line-clamp-2"}`}>{d.product.name}</span>
                    <span className="mt-2 flex flex-wrap items-baseline gap-x-2">
                      <span className="font-display text-3xl font-extrabold tabular-nums text-white [text-shadow:0_0_22px_rgba(240,83,30,0.55)]">
                        {formatPrice(d.product.salePrice ?? d.product.price)}
                      </span>
                      <span className="text-base tabular-nums text-white/55 line-through">{formatPrice(d.product.price)}</span>
                    </span>
                    <span className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="gg-tag gg-tag--award px-3 py-1.5 text-sm normal-case tracking-normal text-navy-deep">
                        You save {formatPrice(Math.round(d.save))}
                      </span>
                      {ends && <span className="text-sm font-bold text-accent">{ends}</span>}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
          {note && (
            <p className="mt-4 text-sm text-white/60">
              Prices come straight from the retailer and are re-checked daily.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
