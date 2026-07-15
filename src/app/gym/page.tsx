import type { Metadata } from "next";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import GymPlanner from "@/components/gym/GymPlanner";

export const metadata: Metadata = {
  title: "Gym Owner Planner — Outfit a Commercial Gym | GymGear Compare",
  description:
    "Plan a new gym or renovation: answer a short questionnaire about your space, members and budget and get a zone-by-zone equipment plan with commercial-grade gear, quantities, and a written build plan.",
};

export default function GymPage() {
  return (
    <>
      <SiteNav />
      <GymPlanner />
      <SiteFooter />
    </>
  );
}
