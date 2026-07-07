import type { Metadata } from "next";
import Link from "next/link";
import { Scale, Home, ShieldCheck } from "lucide-react";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Why GymGear Compare exists — our mission",
  description:
    "Getting in shape is hard enough. GymGear Compare exists to make the starting part easier — honest scores, the right home-gym gear for your space and budget, and the accessories that actually help.",
  alternates: { canonical: "/about" },
};

const VALUES = [
  {
    icon: Scale,
    h: "Honest over comprehensive",
    body: "Anyone can list every product. We score what's worth your money on one open rubric, and say plainly where a pick falls short.",
  },
  {
    icon: Home,
    h: "Built for your space and budget",
    body: "Most advice assumes a big garage and an open wallet. We start from the room and the money you actually have.",
  },
  {
    icon: ShieldCheck,
    h: "Independent, always",
    body: "No brand can pay to rank higher. Affiliate commissions keep the site free; they never move a score.",
  },
];

export default function AboutPage() {
  return (
    <>
      <SiteNav />
      <main className="min-h-[70vh] bg-off">
        <section className="bg-navy px-5 py-16 text-center text-white">
          <p className="text-[0.65rem] font-medium uppercase tracking-[0.25em] text-accent">
            Our mission
          </p>
          <h1 className="mx-auto mt-3 max-w-2xl font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            Starting shouldn&rsquo;t be the hard part
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-white/60">
            Training is hard enough. Working out what to buy to begin
            shouldn&rsquo;t be. That gap is the whole reason this exists.
          </p>
        </section>

        <div className="mx-auto max-w-3xl space-y-6 px-5 py-12 leading-relaxed text-ink-2">
          <p>
            Getting in shape is genuinely hard — and I&rsquo;ve lived it. I lost
            the weight, then fell for lifting and trained my way into
            bodybuilding (amateur, not pro, but I take it seriously). The
            training was the hard part it&rsquo;s supposed to be. What
            surprised me was how hard the <em>easy</em> part was: just figuring
            out what to actually buy to get started.
          </p>
          <p>
            Twenty browser tabs, identical-looking spec sheets, reviews that all
            said &ldquo;great product,&rdquo; and marketing dressed up as advice.
            Nothing told me what genuinely mattered for a real budget and a
            small space. If it was that confusing for someone willing to dig,
            it&rsquo;s enough to make a lot of people give up before they start.

          </p>

          <div>
            <h2 className="font-display text-2xl font-extrabold tracking-tight text-ink">
              What GymGear Compare is for
            </h2>
            <p className="mt-3">
              To take that confusion off your plate. We score every piece of gear
              on one transparent rubric — the{" "}
              <Link
                href="/methodology"
                className="font-medium text-accent underline-offset-2 hover:underline"
              >
                GymGear Score
              </Link>{" "}
              — so you can see, in one number with the reasoning shown, what&rsquo;s
              worth buying. We help you{" "}
              <Link
                href="/quiz"
                className="font-medium text-accent underline-offset-2 hover:underline"
              >
                build a home gym
              </Link>{" "}
              that fits your space and your budget, and we point you to the
              accessories that genuinely make the journey easier — not the ones
              with the fattest margin.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {VALUES.map((v) => (
              <div
                key={v.h}
                className="rounded-2xl border border-line bg-card p-5"
              >
                <v.icon className="h-6 w-6 text-accent" />
                <p className="mt-3 font-display font-bold text-ink">{v.h}</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-2">
                  {v.body}
                </p>
              </div>
            ))}
          </div>

          <p>
            The goal is simple: make it a little easier for one more person to
            start training — and to keep going. If the site helps you take that
            first step, it&rsquo;s done its job.
          </p>

          <p className="text-sm text-ink-3">
            Spotted something wrong, or think we&rsquo;ve scored a product
            unfairly? That feedback makes this better —{" "}
            <Link
              href="/contact"
              className="font-medium text-accent underline-offset-2 hover:underline"
            >
              tell us
            </Link>
            .
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
