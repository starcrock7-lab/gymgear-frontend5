import type { Metadata } from "next";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import GearBrowser from "@/components/gear/GearBrowser";
import { getAllProducts, getCategories } from "@/lib/catalog";
import { findDeals } from "@/lib/deals";

export const revalidate = 900;

export const metadata: Metadata = {
  title: "Find your gear",
  description:
    "Search or browse racks, benches, dumbbells, barbells, cardio and more, each ranked by the GymGear Score.",
  alternates: { canonical: "/gear" },
};

export default async function GearIndexPage() {
  const cats = await getCategories().catch(() => []);
  const deals = findDeals(await getAllProducts().catch(() => []));

  return (
    <>
      <SiteNav />
      <main className="min-h-[70vh] bg-off">
        <GearBrowser cats={cats} deals={deals.slice(0, 6)} dealCount={deals.length} />
      </main>
      <SiteFooter />
    </>
  );
}
