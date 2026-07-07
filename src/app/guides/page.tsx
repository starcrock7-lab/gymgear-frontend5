import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, BookOpen } from "lucide-react";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import { GUIDES } from "@/lib/guides";

export const metadata: Metadata = {
  title: "Buying guides",
  description:
    "Straight-talking home-gym buying guides: the best pick for each category by GymGear Score, plus exactly what to check before you spend.",
  alternates: { canonical: "/guides" },
};

export default function GuidesIndexPage() {
  return (
    <>
      <SiteNav />
      <main className="min-h-[70vh] bg-off">
        <section className="bg-navy px-5 py-14 text-center text-white">
          <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            Buying guides
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-white/60">
            The answer first, then exactly what to check — no padding.
          </p>
        </section>

        <div className="mx-auto max-w-3xl px-5 py-12">
          <div className="space-y-3">
            {GUIDES.map((g) => (
              <Link
                key={g.slug}
                href={`/guides/${g.slug}`}
                className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-card p-5 transition-colors hover:border-accent/40"
              >
                <span className="flex items-center gap-3">
                  <BookOpen className="h-5 w-5 shrink-0 text-accent" />
                  <span className="font-display text-lg font-bold text-ink">
                    {g.h1}
                  </span>
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-ink-3" />
              </Link>
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
