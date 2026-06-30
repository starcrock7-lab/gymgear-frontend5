import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "About GymGear Compare — who's behind it",
  description:
    "Why GymGear Compare exists, who builds it, and how the GymGear Score keeps our rankings independent of who pays.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <SiteNav />
      <main className="min-h-[70vh] bg-off">
        <section className="bg-navy px-5 py-14 text-center text-white">
          <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            Why this exists
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-white/60">
            Buying home-gym gear is confusing and expensive. We built the tool
            we wished we&rsquo;d had.
          </p>
        </section>

        <div className="mx-auto max-w-3xl space-y-6 px-5 py-12 leading-relaxed text-ink-2">
          {/* TODO(Roe): personalise this — your name, your real home-gym story,
              a photo. First-person detail is the single biggest trust signal. */}
          <p>
            I&rsquo;m Roe, and I built GymGear Compare after spending far too
            many evenings with twenty browser tabs open, trying to work out
            whether one power rack was actually better than another or just
            better at marketing. The specs all looked the same. The reviews all
            said &ldquo;great product.&rdquo; Nothing told me what genuinely
            mattered for a small garage and a real budget.
          </p>
          <p>
            So I started scoring gear the way I wished someone would: a single,
            consistent rubric applied to everything, in the open. That became
            the{" "}
            <Link
              href="/methodology"
              className="font-medium text-accent underline-offset-2 hover:underline"
            >
              GymGear Score
            </Link>{" "}
            — every product judged on build quality, owner rating, value for
            money, and how much review evidence backs it up, weighted by what
            actually matters for that category.
          </p>

          <div>
            <h2 className="font-display text-xl font-extrabold text-ink">
              What we are — and what we&rsquo;re not
            </h2>
            <p className="mt-2">
              We&rsquo;re an independent comparison site, not a lab and not a
              brand. Where a verdict is hands-on, we say so; where it&rsquo;s
              drawn from published expert reviews and real owner ratings, we say
              that too. We&rsquo;d rather be honest about how we know something
              than pretend we tested every plate in a warehouse. That
              transparency is the whole point.
            </p>
          </div>

          <div>
            <h2 className="font-display text-xl font-extrabold text-ink">
              How we stay independent
            </h2>
            <p className="mt-2">
              The site is funded by affiliate commissions, and that never
              touches a score. No brand can pay to rank higher or buy placement
              — the rubric runs on the data, not on who pays. The full breakdown
              is on our{" "}
              <Link
                href="/disclosure"
                className="font-medium text-accent underline-offset-2 hover:underline"
              >
                disclosure page
              </Link>
              .
            </p>
          </div>

          <p>
            Got a correction, a product we&rsquo;ve missed, or a disagreement
            with a score? That feedback makes the site better —{" "}
            <Link
              href="/contact"
              className="font-medium text-accent underline-offset-2 hover:underline"
            >
              get in touch
            </Link>
            .
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
