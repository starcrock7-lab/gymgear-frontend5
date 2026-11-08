import type { Metadata } from "next";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import RoomPlanner from "@/components/planner/RoomPlanner";

export const metadata: Metadata = {
  title: "Plan Your Room",
  description:
    "Set your room size and drag your planned equipment around a true-scale 3D room.",
};

export default function PlannerPage() {
  return (
    <>
      <SiteNav />
      <RoomPlanner />
      <SiteFooter />
    </>
  );
}
