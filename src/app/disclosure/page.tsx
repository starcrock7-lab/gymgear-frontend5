import type { Metadata } from "next";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Affiliate disclosure — GymGear Compare",
  description:
    "How GymGear Compare makes money: affiliate commissions that never influence our scores or rankings. Full transparency on our independence.",
  alternates: { canonical: "/disclosure" },
};

export default function DisclosurePage() {
  return (
    <>
      <SiteNav />
      <main className="min-h-[70vh] bg-off">
        <section className="bg-navy px-5 py-14 text-center text-white">
          <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            How we make money
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-white/60">
            The honest version — what we earn, and why it never changes a score.
          </p>
        </section>

        <div className="mx-auto max-w-3xl space-y-6 px-5 py-12 text-ink-2">
          <p className="leading-relaxed">
            GymGear Compare is reader-supported. When you click a{" "}
            &ldquo;Check price&rdquo; or &ldquo;Buy&rdquo; link and go on to
            purchase from a retailer, we may earn a small commission at{" "}
            <strong className="text-ink">no extra cost to you</strong>. That
            commission is how the site stays free.
          </p>

          <div>
            <h2 className="font-display text-xl font-extrabold text-ink">
              We participate in affiliate programs
            </h2>
            <p className="mt-2 leading-relaxed">
              As an Amazon Associate we earn from qualifying purchases. We also
              participate in affiliate programs run by equipment brands and
              retailers we feature. We only ever link to products we have
              actually placed in our rankings.
            </p>
          </div>

          <div>
            <h2 className="font-display text-xl font-extrabold text-ink">
              Commissions never affect our scores
            </h2>
            <p className="mt-2 leading-relaxed">
              This is the part that matters. The{" "}
              <strong className="text-ink">GymGear Score</strong> is computed
              from a fixed, public rubric — build quality, owner rating, value,
              and review confidence. No brand can pay to raise a score, change a
              ranking, or buy placement. If a higher-commission product scores
              lower, it ranks lower. The rubric runs on the data, not on who
              pays. You can read exactly how it works on our{" "}
              <a
                href="/methodology"
                className="font-medium text-accent underline-offset-2 hover:underline"
              >
                methodology page
              </a>
              .
            </p>
          </div>

          <div>
            <h2 className="font-display text-xl font-extrabold text-ink">
              Prices change — always check the retailer
            </h2>
            <p className="mt-2 leading-relaxed">
              We refresh prices periodically, but the price on the retailer&rsquo;s
              own page is always the source of truth. Confirm it there before
              you buy.
            </p>
          </div>

          <p className="leading-relaxed">
            Questions about any of this? We&rsquo;d genuinely like to hear them —
            reach us via the{" "}
            <a
              href="/contact"
              className="font-medium text-accent underline-offset-2 hover:underline"
            >
              contact page
            </a>
            .
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
