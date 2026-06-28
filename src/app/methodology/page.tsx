import type { Metadata } from "next";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "How we score — GymGear Compare",
  description:
    "The GymGear Score methodology: one transparent, weighted rubric across build quality, owner rating, value, and review confidence. Data-derived — and honest about it.",
};

const FACETS = [
  {
    name: "Build quality",
    desc: "Materials, tolerances, and durability — drawn from published expert reviews and manufacturer specs.",
  },
  {
    name: "User rating",
    desc: "Aggregate owner rating out of 5, normalized — what people who actually bought it think.",
  },
  {
    name: "Value for money",
    desc: "Quality per dollar, normalized within the category — so a great-value pick isn't punished for being affordable.",
  },
  {
    name: "Review confidence",
    desc: "How many reviews back that rating (log scale) — a 4.9 from 8,000 buyers counts for more than a 4.9 from 12.",
  },
];

const AWARDS: [string, string][] = [
  ["Top Pick", "Highest GymGear Score in the category — the best all-round choice."],
  ["Best Value", "The most quality per dollar, above a quality floor."],
  ["Best Budget", "The cheapest pick we'd still stand behind."],
  ["Best Rated", "Highest owner rating with enough reviews to trust it."],
];

export default function MethodologyPage() {
  return (
    <>
      <SiteNav />
      <main className="min-h-[70vh] bg-off">
        <section className="bg-navy px-5 py-14 text-center text-white">
          <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            How we score
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-white/60">
            The GymGear Score is one transparent, repeatable rubric — no mystery,
            no pay-to-win. Here&rsquo;s exactly how it works.
          </p>
        </section>

        <div className="mx-auto max-w-3xl px-5 py-12">
          <div className="rounded-2xl border border-line bg-white p-5">
            <p className="font-display text-lg font-bold text-ink">
              The honest version, first
            </p>
            <p className="mt-2 leading-relaxed text-ink-2">
              We don&rsquo;t (yet) physically test every product in a lab. The
              GymGear Score is{" "}
              <strong className="text-ink">data- and spec-derived</strong>: it
              combines published expert assessments, real owner ratings, price,
              and review volume into one 0&ndash;100 number, weighted per
              category. Where a verdict is hands-on we say so; where it&rsquo;s
              spec-based we say that too. That transparency is the whole point.
            </p>
          </div>

          <h2 className="mt-10 font-display text-2xl font-extrabold tracking-tight text-ink">
            The four facets
          </h2>
          <div className="mt-5 space-y-3">
            {FACETS.map((f) => (
              <div
                key={f.name}
                className="rounded-xl border border-line bg-white p-4"
              >
                <p className="font-display font-bold text-ink">{f.name}</p>
                <p className="mt-1 text-sm text-ink-2">{f.desc}</p>
              </div>
            ))}
          </div>

          <h2 className="mt-10 font-display text-2xl font-extrabold tracking-tight text-ink">
            Weighted per category
          </h2>
          <p className="mt-3 leading-relaxed text-ink-2">
            The facets aren&rsquo;t weighted equally — what matters depends on
            the product. For a <strong className="text-ink">barbell or rack</strong>,
            build quality leads (you&rsquo;re buying iron meant to last decades).
            For <strong className="text-ink">supplements or shoes</strong>, the
            owner rating leads (effect and fit are personal). Every product page
            shows the exact facet breakdown, so you can see the working.
          </p>

          <h2 className="mt-10 font-display text-2xl font-extrabold tracking-tight text-ink">
            The &ldquo;Best for X&rdquo; awards
          </h2>
          <div className="mt-5 space-y-3">
            {AWARDS.map(([name, desc]) => (
              <div
                key={name}
                className="flex gap-3 rounded-xl border border-line bg-white p-4"
              >
                <span className="self-start shrink-0 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-bold text-accent">
                  {name}
                </span>
                <p className="text-sm text-ink-2">{desc}</p>
              </div>
            ))}
          </div>

          <p className="mt-10 text-sm text-ink-3">
            Affiliate disclosure: some links earn us a commission at no extra
            cost to you. It never changes a score — the rubric runs on the data,
            not on who pays.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
