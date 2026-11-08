"use client";

/* /planner: the same room as the results page, with its size and look open to
   change. The equipment list is handed over in sessionStorage. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import RoomEditor from "@/components/planner/RoomEditor";
import { loadFloorItems, loadFloorOrigin, loadFloorRoom, type FloorItem } from "@/lib/floor-plan";

export default function RoomPlanner() {
  const [items, setItems] = useState<FloorItem[] | null>(null);
  const [origin, setOrigin] = useState<string | null>(null);
  /* The gym plan hands over its floor size; a home kit reopens its saved room. */
  const [hint, setHint] = useState<{ w: number; d: number } | null>(null);
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setItems(loadFloorItems());
    setOrigin(loadFloorOrigin());
    setHint(loadFloorRoom());
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);
  const back = origin === "/gym" ? { href: "/gym", label: "Back to your plan" } : { href: "/quiz", label: "Back to your kit" };

  return (
    <main className="min-h-screen bg-off">
      <div className="mx-auto max-w-5xl px-5 py-10">
        <Link href={back.href} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-white/60 transition-colors hover:text-accent">
          <ArrowLeft className="h-4 w-4" />
          {back.label}
        </Link>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-white">Your room</h1>
        <p className="mt-2 text-white/70">Tap Edit to move your gear or change the room.</p>
        <div className="mt-6">
          {items === null ? null : items.length ? (
            <RoomEditor items={items} start={hint ? { ...hint, setting: "studio" } : undefined} />
          ) : (
            <p className="rounded-2xl border border-white/12 p-6 text-white/70">
              Build a plan first and your gear will be here.{" "}
              <Link href="/quiz" className="font-bold text-accent hover:underline">
                Start the quiz
              </Link>
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
