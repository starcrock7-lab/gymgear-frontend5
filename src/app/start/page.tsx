import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, Dumbbell } from "lucide-react";

export const metadata: Metadata = {
  title: "Start — Home Gym or Professional Gym | GymGear Compare",
  description:
    "Choose your path: build a personal home-gym kit tuned to your goal, space and budget, or plan a full commercial gym — new build or renovation — with a zone-by-zone equipment plan.",
};

const PATHS = [
  {
    href: "/quiz",
    eyebrow: "For your home",
    title: "Home Gym",
    blurb:
      "Answer a few quick questions and get a kit tuned to your goal, experience, space, ceiling and budget — with swaps, a live total, and a floor-plan visualizer.",
    points: ["Personalised in under a minute", "3 builds: value, match, quality", "Real prices, honest picks"],
    Icon: Dumbbell,
    cta: "Build my kit",
  },
  {
    href: "/gym",
    eyebrow: "For your business",
    title: "Professional Gym",
    blurb:
      "New build or renovation — a zone-by-zone commercial equipment plan with quantities, a written build plan, and a floor-plan visualizer sized to your real space.",
    points: ["Commercial-grade gear", "Budget split across zones", "Written build + layout plan"],
    Icon: Building2,
    cta: "Plan my gym",
  },
];

export default function StartPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-off">
      {/* cosmic wash + stars, matching the homepage's dark language */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, rgba(240,83,30,0.12), transparent 70%), radial-gradient(50% 40% at 80% 20%, rgba(13,27,53,0.9), transparent 70%)",
        }}
      />
      <div aria-hidden className="starfield pointer-events-none absolute inset-0 opacity-50" />

      <div className="relative mx-auto max-w-5xl px-5 py-20 sm:py-28">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
            Let&apos;s build something
          </p>
          <h1 className="mx-auto mt-3 max-w-2xl font-display text-4xl font-extrabold leading-tight text-ink sm:text-5xl">
            What are you setting up?
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm text-ink-2 sm:text-base">
            Two paths, same engine — real gear, real prices, a plan you can actually buy.
            Pick the one that fits.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {PATHS.map(({ href, eyebrow, title, blurb, points, Icon, cta }) => (
            <Link
              key={href}
              href={href}
              className="group relative flex flex-col overflow-hidden rounded-3xl border border-line bg-card p-7 transition-all duration-300 hover:border-accent/70 hover:shadow-[0_0_36px_rgba(240,83,30,0.22)]"
            >
              {/* corner glow that ignites on hover */}
              <div
                aria-hidden
                className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-accent/20 opacity-0 blur-3xl transition-opacity duration-300 group-hover:opacity-100"
              />
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-accent/30 bg-accent/10 text-accent transition-colors duration-300 group-hover:bg-accent/20">
                <Icon className="h-7 w-7" />
              </span>

              <p className="mt-6 text-[0.7rem] font-bold uppercase tracking-[0.18em] text-ink-3">
                {eyebrow}
              </p>
              <h2 className="mt-1 font-display text-2xl font-extrabold text-ink">{title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-2">{blurb}</p>

              <ul className="mt-5 space-y-2">
                {points.map((pt) => (
                  <li key={pt} className="flex items-center gap-2 text-sm text-ink-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                    {pt}
                  </li>
                ))}
              </ul>

              <span className="mt-7 inline-flex items-center gap-2 self-start rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-accent/20 transition-all duration-300 group-hover:shadow-[0_0_22px_rgba(240,83,30,0.6)]">
                {cta}
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>

        <p className="mt-10 text-center text-xs text-ink-3">
          Not sure? Start with the home quiz — you can always plan a full facility later.
        </p>
      </div>
    </main>
  );
}
