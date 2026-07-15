import type { Metadata } from "next";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import FloorPlanner from "@/components/planner/FloorPlanner";

export const metadata: Metadata = {
  title: "Floor Plan Visualizer — Place Your Equipment | GymGear Compare",
  description:
    "Upload a photo or sketch of your gym floor, set the room size, and drag your planned equipment onto the map at true scale — with safety clearances and layout advice built in.",
};

export default function PlannerPage() {
  return (
    <>
      <SiteNav />
      <FloorPlanner />
      <SiteFooter />
    </>
  );
}
