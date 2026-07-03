import type { Metadata } from "next";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import GearFinder from "@/components/extras/GearFinder";

export const metadata: Metadata = {
  title: "Gear, Recovery & Supplements",
  description:
    "Round out your home gym — browse the best lifting gear, recovery accessories, supplements, and apparel, each with honest ratings and prices.",
  robots: { index: false, follow: true },
};

export default function ExtrasPage() {
  return (
    <>
      <SiteNav />
      <main className="min-h-[70vh] bg-off">
        <section className="bg-navy px-5 py-14 text-center text-white">
          <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            Round out your gym
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-white/60">
            Lifting gear, recovery, supplements, and apparel — the extras that
            complete a setup. Browse the best of each, buy direct.
          </p>
        </section>

        <div className="mx-auto max-w-6xl px-5 py-12 pb-28">
          <GearFinder />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
