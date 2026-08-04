import Link from "next/link";
import { formatPrice } from "@/lib/kit";
import { dealsSavings, type Deal } from "@/lib/deals";

/* Live discounts, given prime position instead of a rigged ranking. Shared by
   the gear index (site-wide) and every category page (that category only), so
   both agree on what a deal looks like and what it claims.

   Renders nothing when there are no deals — an empty "best deals" panel is
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

  return (
    <section
      aria-label="Discounted right now"
      className="rounded-2xl border border-accent/30 bg-accent/5 p-4"
    >
      <h2 className="font-display text-sm font-extrabold uppercase tracking-wide text-accent">
        {title}
      </h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {shown.map((d) => (
          <Link
            key={d.product.id}
            href={`/gear/${d.product.id}`}
            /* min-w-0: a grid item defaults to min-width:auto, so a long
               product name pushes the card past its cell and scrolls the page
               sideways instead of truncating. */
            className="flex min-w-0 items-center gap-3 rounded-xl border border-line bg-card p-3 transition-colors hover:border-accent"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-white">
              {d.product.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={d.product.image}
                  alt=""
                  loading="lazy"
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
      {note && (
        <p className="mt-3 text-xs text-ink-3">
          Saving {formatPrice(dealsSavings(shown))} across{" "}
          {shown.length === 1 ? "this deal" : `these ${shown.length} deals`}.
          Prices come straight from the retailer and are re-checked daily.
        </p>
      )}
    </section>
  );
}
