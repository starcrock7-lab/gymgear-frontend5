import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

/* Branded 404 — mirrors the per-page nav/footer wrapper so a bad ad URL or a
   stale link lands somewhere on-brand with a clear way forward. */
export default function NotFound() {
  return (
    <>
      <SiteNav />
      <main className="flex min-h-[70vh] flex-col items-center justify-center bg-off px-6 py-20 text-center">
        <p className="font-body text-sm font-bold uppercase tracking-[0.3em] text-accent">
          404
        </p>
        <h1 className="mt-3 max-w-xl font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          This page took a rest day.
        </h1>
        <p className="mt-3 max-w-md text-ink-2">
          The page you&rsquo;re after doesn&rsquo;t exist or moved. Let&rsquo;s
          get you back to building your gym.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/quiz"
            className="rounded-xl bg-accent px-5 py-2.5 font-body text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-accent-hover"
          >
            Build My Kit →
          </Link>
          <Link
            href="/"
            className="rounded-xl border border-line bg-card px-5 py-2.5 font-body text-sm font-bold text-ink transition-colors hover:border-accent/40"
          >
            Back home
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
