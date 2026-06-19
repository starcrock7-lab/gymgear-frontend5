"use client";

import Link from "next/link";
import { useEffect } from "react";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

/* Root error boundary — catches runtime errors in any route so visitors get a
   branded "retry / go home" instead of a blank crash. Important for unattended
   ad traffic where a transient backend error shouldn't dead-end a session. */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Logged so Vercel/console captures it for later review.
    console.error(error);
  }, [error]);

  return (
    <>
      <SiteNav />
      <main className="flex min-h-[70vh] flex-col items-center justify-center bg-off px-6 py-20 text-center">
        <p className="font-display text-sm font-bold uppercase tracking-[0.3em] text-accent">
          Hiccup
        </p>
        <h1 className="mt-3 max-w-xl font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          Something went wrong.
        </h1>
        <p className="mt-3 max-w-md text-ink-2">
          That one&rsquo;s on us. Give it another go &mdash; if it keeps
          happening, head back home and try again shortly.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-xl bg-accent px-5 py-2.5 font-display text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-accent-hover"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-xl border border-line bg-white px-5 py-2.5 font-display text-sm font-bold text-ink transition-colors hover:border-accent/40"
          >
            Back home
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
