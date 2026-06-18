import type { Metadata } from "next";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import CompareTool from "@/components/compare/CompareTool";

export const metadata: Metadata = {
  title: "Compare Gym Gear — GymGear Compare",
  description:
    "Pick any products in a category and see a side-by-side spec breakdown, prices, ratings, and which is the best value.",
};

export default function ComparePage() {
  return (
    <>
      <SiteNav />
      <main className="min-h-[70vh] bg-off">
        <section className="bg-navy px-5 py-14 text-center text-white">
          <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            Compare gym gear
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-white/60">
            Pick a category, choose 2–4 products, and see them side by side —
            specs, prices, and the best value.
          </p>
        </section>

        <div className="mx-auto max-w-6xl px-5 py-12 pb-28">
          <CompareTool />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
