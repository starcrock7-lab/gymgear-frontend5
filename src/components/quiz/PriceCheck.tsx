"use client";

/* The plan's price next to the typical price of the same gear we list. Every
   figure comes from lib/price-check (catalog arithmetic, re-run after swaps).
   It shows whichever way the comparison comes out, dearer included: rules in
   docs/plans/price-check.md, enforced by npm run check:price. */
import Link from "next/link";
import { Scale } from "lucide-react";
import { formatPrice, type KitProduct } from "@/lib/kit";
import { priceCheck, type ClassStat } from "@/lib/price-check";

const dollars = (n: number) => formatPrice(Math.round(n));

export default function PriceCheck({
  products,
  stats,
}: {
  products: KitProduct[];
  stats: Record<string, ClassStat> | undefined;
}) {
  const pc = stats ? priceCheck(products, stats) : null;
  if (!pc) return null;
  const diff = Math.round(pc.typical - pc.yours);
  const headline =
    diff > 0
      ? `${dollars(diff)} less than the typical price for the same gear`
      : diff < 0
        ? `${dollars(-diff)} more than the typical price for the same gear`
        : "Same as the typical price for this gear";
  const higher = pc.lines.filter(
    (l) => l.yourScore != null && l.typicalScore != null && l.yourScore > l.typicalScore,
  ).length;
  const sub = [
    pc.lines.length === pc.pieces ? "All pieces compared" : `Compared on ${pc.lines.length} of ${pc.pieces} pieces`,
    higher ? `${higher} score${higher === 1 ? "s" : ""} higher than typical` : null,
  ].filter(Boolean).join(" · ");

  return (
    <details className="mx-auto mt-3 w-full max-w-xl rounded-xl border border-white/12 bg-navy-deep/60">
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 px-4 py-2.5 text-sm">
        <Scale className="h-4 w-4 shrink-0 text-accent" />
        <span className="min-w-0 flex-1">
          <span className="block font-bold text-white">{headline}</span>
          <span className="block text-xs text-white/60">{sub}</span>
        </span>
        <span className="shrink-0 font-bold text-white">Details</span>
      </summary>
      <div className="border-t border-white/10 px-4 py-4">
        <ul className="space-y-3">
          {pc.lines.map((l) => (
            <li key={l.id} className="text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate font-bold text-white">{l.name}</span>
                <span className="shrink-0 font-bold text-white">{dollars(l.yours)}</span>
              </div>
              <p className="mt-0.5 text-xs text-white/60">
                Typical {dollars(l.typical)} across {l.count} {l.label} we list ({dollars(l.low)} to {dollars(l.high)})
                {l.yourScore != null && l.typicalScore != null &&
                  ` · Score ${l.yourScore} vs typical ${l.typicalScore}`}
              </p>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-white/10 pt-3 text-sm">
          <span className="text-white/70">Typical for these pieces</span>
          <span className="font-bold text-white">{dollars(pc.typical)}</span>
        </div>
        <div className="mt-1 flex items-baseline justify-between gap-3 text-sm">
          <span className="text-white/70">Your plan, same pieces</span>
          <span className="font-bold text-white">{dollars(pc.yours)}</span>
        </div>
        <p className="mt-3 text-xs text-white/60">
          Typical is the middle price of comparable products on our list, at today&apos;s prices with sales
          included. Pieces with fewer than three comparable products are not compared.{" "}
          <Link href="/methodology#price-check" className="font-bold text-white underline-offset-2 hover:text-accent hover:underline">
            How we compare
          </Link>
        </p>
      </div>
    </details>
  );
}
