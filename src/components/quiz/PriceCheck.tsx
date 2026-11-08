"use client";

/* The first thing on the results page: the crossed-out price, the plan's price
   and the difference. Every figure is arithmetic on catalog prices, re-run after
   swaps. The bigger of two true savings leads (typical price, or a live sale);
   the other is listed under it and they are never added together. A plan that
   costs more than typical says so. Rules in docs/plans/price-check.md, enforced
   by npm run check:price. */
import { useLayoutEffect, useRef } from "react";
import Link from "next/link";
import { animate, motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { formatPrice, type KitProduct } from "@/lib/kit";
import { dealsSavings, endsInLabel, findDeals } from "@/lib/deals";
import { priceCheck, type ClassStat } from "@/lib/price-check";

const dollars = (n: number) => formatPrice(Math.round(n));
const EASE = [0.16, 1, 0.3, 1] as const;

/* Runs down from the crossed-out price once the line has been drawn. Always
   lands on the exact total; reduced motion shows only that. */
function PriceDrop({ from, to }: { from: number; to: number }) {
  const el = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  useLayoutEffect(() => {
    const node = el.current;
    if (!node || reduce || from <= to) return;
    node.textContent = dollars(from);
    const run = animate(from, to, {
      delay: 0.55,
      duration: 1,
      ease: EASE,
      onUpdate: (v) => { node.textContent = dollars(v); },
      onComplete: () => { node.textContent = formatPrice(to); },
    });
    return () => run.stop();
  }, [from, to, reduce]);
  return (
    <>
      <span className="sr-only">{formatPrice(to)}</span>
      <span aria-hidden ref={el}>{formatPrice(to)}</span>
    </>
  );
}

export default function PriceCheck({
  products,
  stats,
  total,
  budgetTop,
}: {
  products: KitProduct[];
  stats: Record<string, ClassStat> | undefined;
  total: number;
  budgetTop: number | undefined;
}) {
  const reduce = useReducedMotion();
  if (!products.length) return null;
  const pc = stats ? priceCheck(products, stats) : null;
  const diff = pc ? Math.round(pc.typical - pc.yours) : 0;
  const deals = findDeals(products);
  const sale = dealsSavings(deals);
  const ends = deals.length ? endsInLabel(deals[0]) : null;
  const saleLeads = sale > Math.max(diff, 0);
  const was = saleLeads ? total + sale : pc && diff > 0 ? pc.planTypical : null;
  const compared = !pc
    ? null
    : diff > 0
      ? `${dollars(diff)} less than the typical price for the same gear`
      : diff < 0
        ? `${dollars(-diff)} more than the typical price for the same gear`
        : "Same as the typical price for this gear";
  const facts = [
    budgetTop ? `Of your ${formatPrice(budgetTop)} budget` : null,
    saleLeads || was == null ? compared : null,
    !saleLeads && sale > 0
      ? `${deals.length} on sale, ${dollars(sale)} off list price`
      : null,
    sale > 0 ? ends : null,
  ].filter(Boolean);
  const higher = pc
    ? pc.lines.filter((l) => l.yourScore != null && l.typicalScore != null && l.yourScore > l.typicalScore).length
    : 0;
  const scope = pc && [
    pc.lines.length === pc.pieces ? "All pieces compared" : `Compared on ${pc.lines.length} of ${pc.pieces} pieces`,
    higher ? `${higher} score${higher === 1 ? "s" : ""} higher than typical` : null,
  ].filter(Boolean).join(" · ");

  return (
    <section aria-label="Your price" className="relative mx-auto mt-6 w-full max-w-2xl">
      <div
        aria-hidden
        className={
          "animate-glow pointer-events-none absolute -inset-y-10 left-1/2 w-full " +
          (was != null
            ? "bg-[radial-gradient(closest-side,rgba(47,191,98,0.34),transparent)]"
            : "bg-[radial-gradient(closest-side,rgba(240,83,30,0.3),transparent)]")
        }
      />
      <div className={"price-ring " + (was != null ? "price-ring--win" : "")}>
        <div className="starfield relative rounded-[calc(1.5rem-2px)] bg-navy-deep px-4 pb-5 pt-9 text-center sm:px-8 sm:pt-11">
          <div key={`${was}-${total}`}>
            {was != null && (
              <>
                <p className="text-sm text-white/70">
                  {saleLeads ? "List price" : "Typical price for the same gear"}
                </p>
                <p className="mt-1 font-display text-3xl font-bold tabular-nums text-white/65 sm:text-4xl">
                  <span className="relative inline-block px-1.5">
                    <s className="no-underline">{dollars(was)}</s>
                    <motion.span
                      aria-hidden
                      className="absolute inset-x-0 top-1/2 -mt-0.5 h-1 origin-left rounded-full bg-accent shadow-[0_0_12px_rgba(240,83,30,0.9)]"
                      style={{ rotate: -6 }}
                      initial={reduce ? false : { scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ delay: 0.2, duration: 0.4, ease: EASE }}
                    />
                  </span>
                </p>
              </>
            )}
            <p className={"text-sm font-bold " + (was != null ? "mt-5 text-win" : "text-white/70")}>Your plan</p>
            <p
              className={
                "mt-1 whitespace-nowrap font-display text-[clamp(2.75rem,14vw,4.5rem)] font-extrabold leading-none tracking-tight tabular-nums text-white " +
                (was != null
                  ? "[text-shadow:0_0_38px_rgba(47,191,98,0.6)]"
                  : "[text-shadow:0_0_38px_rgba(240,83,30,0.5)]")
              }
            >
              {was != null ? <PriceDrop from={was} to={total} /> : formatPrice(total)}
            </p>
            {was != null && (
              <motion.p
                className="mt-6 flex justify-center"
                initial={reduce ? false : { opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.35, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
              >
                <span className="gg-tag gg-tag--award price-pill relative overflow-hidden whitespace-normal px-5 py-2.5 font-display text-lg normal-case tracking-normal text-navy-deep sm:text-xl">
                  {saleLeads ? `You save ${dollars(sale)}` : `${dollars(diff)} less than typical`}
                </span>
              </motion.p>
            )}
            {facts.length > 0 && (
              <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-white/70">{facts.join(" · ")}</p>
            )}
          </div>

          {pc && (
            <details className="group mt-4 border-t border-white/10 pt-1 text-left">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center gap-1.5 text-center text-sm text-white/70 [&::-webkit-details-marker]:hidden">
                <span>{scope}</span>
                <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180" />
              </summary>
              <div className="pb-3 pt-3">
                <ul className="space-y-4">
                  {pc.lines.map((l) => (
                    <li key={l.id} className="text-sm">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="min-w-0 truncate font-bold text-white">{l.name}</span>
                        <span className="shrink-0 font-bold text-white">{dollars(l.yours)}</span>
                      </div>
                      <p className="mt-0.5 text-xs leading-relaxed text-white/60">
                        Typical {dollars(l.typical)} across {l.count} {l.label} we list ({dollars(l.low)} to {dollars(l.high)})
                        {l.yourScore != null && l.typicalScore != null &&
                          ` · Score ${l.yourScore} vs typical ${l.typicalScore}`}
                      </p>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 space-y-1 border-t border-white/10 pt-3 text-sm">
                  {pc.lines.length < pc.pieces && (
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-white/70">Other pieces, same on both sides</span>
                      <span className="font-bold text-white">{dollars(pc.planYours - pc.yours)}</span>
                    </div>
                  )}
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-white/70">Typical price for the same gear</span>
                    <span className="font-bold text-white">{dollars(pc.planTypical)}</span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-white/70">Your plan</span>
                    <span className="font-bold text-white">{dollars(pc.planYours)}</span>
                  </div>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-white/60">
                  Typical is the middle price of comparable products on our list, at today&apos;s prices with sales
                  included. It is a comparison across products, not a former price of this gear. Pieces with fewer
                  than three comparable products are not compared.{" "}
                  <Link href="/methodology#price-check" className="font-bold text-white underline-offset-2 hover:text-accent hover:underline">
                    How we compare
                  </Link>
                </p>
              </div>
            </details>
          )}
        </div>
      </div>
    </section>
  );
}
