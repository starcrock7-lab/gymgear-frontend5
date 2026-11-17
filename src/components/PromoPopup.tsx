"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, X } from "lucide-react";
import EmailSignup from "@/components/EmailSignup";

export type PromoDeals = {
  season: string | null;
  count: number;
  stores: number;
  maxPct: number;
  biggest: { name: string; save: number };
} | null;

const KEY = "gg.promo.v1";
const SNOOZE_MS = 3 * 24 * 3.6e6;
const DELAY_MS = 6000;
/* Focused tools where an interruption costs more than it earns. */
const QUIET = ["/quiz", "/planner", "/gym", "/start", "/maintenance", "/stats"];

function read(): { snoozedAt?: number; subscribed?: boolean } {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}
function write(v: { snoozedAt?: number; subscribed?: boolean }) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...read(), ...v }));
  } catch {
    /* storage blocked: the pop-up may show again, which is fine */
  }
}

/* One pop-up for both jobs: the live sale, and a deal-alert signup. Shows
   once, 6s into a visit; closing it snoozes it for 3 days, signing up hides
   it for good. Renders nothing when there is neither a sale nor a signup. */
export default function PromoPopup({ deals, emailEnabled }: { deals: PromoDeals; emailEnabled: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const path = usePathname();
  const [shown, setShown] = useState(false);
  const onDeals = path.startsWith("/deals");
  const showDeals = !!deals && !onDeals;
  const quiet = QUIET.some((q) => path.startsWith(q));

  useEffect(() => {
    if (shown || quiet || (!showDeals && !emailEnabled)) return;
    const s = read();
    if (s.subscribed || (s.snoozedAt && Date.now() - s.snoozedAt < SNOOZE_MS)) return;
    const t = setTimeout(() => {
      if (document.querySelector("dialog[open]")) return;
      ref.current?.showModal();
      setShown(true);
    }, DELAY_MS);
    return () => clearTimeout(t);
  }, [shown, quiet, showDeals, emailEnabled]);

  const close = () => {
    write({ snoozedAt: Date.now() });
    ref.current?.close();
  };

  if (!showDeals && !emailEnabled) return null;

  return (
    <dialog
      ref={ref}
      onCancel={() => write({ snoozedAt: Date.now() })}
      onClick={(e) => e.target === ref.current && close()}
      aria-labelledby="promo-title"
      className="promo-pop m-auto max-h-[calc(100dvh-1.5rem)] w-[min(92vw,30rem)] overflow-y-auto rounded-3xl bg-transparent p-0 text-white backdrop:bg-navy-deep/80"
    >
      <div className="price-ring">
        <div className="relative overflow-hidden rounded-[calc(1.5rem-2px)] bg-[#0b1730] p-6 sm:p-8">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-24 h-56 bg-[radial-gradient(closest-side,rgba(240,83,30,0.4),transparent)]" />
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>

          {showDeals ? (
            <div className="relative">
              {deals.season && (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-accent px-2.5 py-1 font-display text-sm font-extrabold uppercase tracking-wider">
                  <Flame aria-hidden className="h-4 w-4" />
                  {deals.season}
                </span>
              )}
              <h2 id="promo-title" className="mt-3 font-display text-4xl font-extrabold leading-[1.02] tracking-tight text-balance">
                Save up to <span className="text-accent [text-shadow:0_0_24px_rgba(240,83,30,0.6)]">{deals.maxPct}%</span> on home gym gear
              </h2>
              <p className="mt-3 text-white/80">
                {deals.count} deals from {deals.stores} stores. Biggest saving right now: $
                {Math.round(deals.biggest.save).toLocaleString("en-US")} on the {deals.biggest.name}.
              </p>
              <Link
                href="/deals"
                onClick={close}
                className="glow-btn mt-5 flex min-h-12 items-center justify-center rounded-xl bg-accent px-5 font-display text-lg font-extrabold text-white"
              >
                See the deals
              </Link>
            </div>
          ) : (
            <h2 id="promo-title" className="relative pr-10 font-display text-3xl font-extrabold leading-tight tracking-tight text-balance">
              Get an email when home gym gear goes on sale
            </h2>
          )}

          {emailEnabled && (
            <div className={`relative ${showDeals ? "mt-6 border-t border-white/10 pt-5" : "mt-4"}`}>
              {showDeals && <p className="mb-3 font-bold">Want the next sale in your inbox?</p>}
              <EmailSignup id="promo-email" onDone={() => write({ subscribed: true })} />
            </div>
          )}
        </div>
      </div>
    </dialog>
  );
}
