"use client";

/* The room you can rearrange: drag a piece to move it, tap it to turn or take
   it out. Pieces stop at walls and at each other, so there is no "bad" layout
   to warn about. Used on the results page and, with room controls, on /planner;
   both share one saved layout. */

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, Minus, Plus, RotateCw, Sparkles, Square, Trash2, X, Box } from "lucide-react";
import { arrangeRoom, footprintRect, freeSpot, WALL_GAP } from "@/lib/auto-layout";
import { loadRoom, saveRoom, type FloorItem, type PlacedItem } from "@/lib/floor-plan";

/* three.js only loads with the scene. */
const Planner3D = dynamic(() => import("@/components/planner/Planner3D"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] w-full items-center justify-center rounded-2xl border border-line bg-navy sm:h-[520px]">
      <Loader2 className="h-8 w-8 animate-spin text-accent" />
    </div>
  ),
});

export type RoomStart = { w: number; d: number; setting: string };

const LOOKS = [
  { id: "apartment-corner", label: "Apartment" },
  { id: "small-room", label: "Small room" },
  { id: "garage", label: "Garage" },
  { id: "outdoor", label: "Outdoor" },
];
const MIN_FT = 6;
const MAX_FT = 40;

const uid = () => Math.random().toString(36).slice(2, 9);
const signature = (items: FloorItem[]) => items.map((i) => `${i.id}x${i.qty}`).sort().join();
const toPlaced = (i: FloorItem): PlacedItem => ({
  uid: uid(), id: i.id, name: i.name, category: i.category, w: i.w, d: i.d, x: 0, y: 0, rot: false,
});

/* Pieces in the list with no place on the floor yet. */
function missingFrom(items: FloorItem[], placed: PlacedItem[]): FloorItem[] {
  const used = new Map<string, number>();
  for (const p of placed) used.set(p.id, (used.get(p.id) ?? 0) + 1);
  const out: FloorItem[] = [];
  for (const i of items)
    for (let k = used.get(i.id) ?? 0; k < i.qty; k++) out.push(i);
  return out;
}

/* Everyone stays where they can in the new room; what no longer fits comes off
   the floor. */
function reflow(placed: PlacedItem[], w: number, d: number): PlacedItem[] {
  const out: PlacedItem[] = [];
  for (const p of placed) {
    const spot = freeSpot(p, out, w * 12, d * 12);
    if (spot) out.push(spot);
  }
  return out;
}

export default function RoomEditor({
  items,
  start,
  controls = false,
  tall = false,
}: {
  items: FloorItem[];
  /* Where the quiz says this room is. Left out on /planner, which reopens the
     saved room. */
  start?: RoomStart;
  controls?: boolean;
  tall?: boolean;
}) {
  const [room, setRoom] = useState<RoomStart>(start ?? { w: 12, d: 12, setting: "garage" });
  const [placed, setPlaced] = useState<PlacedItem[]>([]);
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [top, setTop] = useState(false);
  const [note, setNote] = useState("");
  const sig = signature(items);
  const seenSig = useRef<string | null>(null);

  /* First open: the saved layout if it is for this gear and this quiz answer,
     otherwise a fresh arrangement. Later gear changes (a swap, another plan)
     keep every piece that is still there. */
  useEffect(() => {
    if (seenSig.current === sig) return;
    const first = seenSig.current === null;
    seenSig.current = sig;
    /* eslint-disable react-hooks/set-state-in-effect */
    setSelected(null);
    if (first) {
      const saved = loadRoom();
      if (saved && saved.sig === sig && (!start || saved.from === start.setting)) {
        setRoom({ w: saved.roomW, d: saved.roomD, setting: saved.setting });
        setPlaced(saved.placed);
      } else {
        const r = start ?? (saved ? { w: saved.roomW, d: saved.roomD, setting: saved.setting } : room);
        setRoom(r);
        setPlaced(arrangeRoom(items, r.w, r.d).placed);
      }
      setReady(true);
      return;
    }
    setPlaced((prev) => {
      const budget = new Map(items.map((i) => [i.id, i.qty]));
      const kept: PlacedItem[] = [];
      for (const p of prev) {
        const left = budget.get(p.id) ?? 0;
        if (left > 0) { kept.push(p); budget.set(p.id, left - 1); }
      }
      if (kept.length * 2 < items.reduce((s, i) => s + i.qty, 0)) return arrangeRoom(items, room.w, room.d).placed;
      const next = [...kept];
      for (const i of missingFrom(items, kept)) {
        const spot = freeSpot(centred(toPlaced(i), room), next, room.w * 12, room.d * 12);
        if (spot) next.push(spot);
      }
      return next;
    });
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  useEffect(() => {
    if (ready) saveRoom({ sig, from: start?.setting ?? null, placed, roomW: room.w, roomD: room.d, setting: room.setting });
  }, [ready, sig, start?.setting, placed, room]);

  const waiting = useMemo(() => missingFrom(items, placed), [items, placed]);
  const chosen = placed.find((p) => p.uid === selected) ?? null;
  const W = room.w * 12;
  const D = room.d * 12;

  function move(id: string, x: number, y: number) {
    setPlaced((prev) => prev.map((p) => (p.uid === id ? { ...p, x, y } : p)));
  }
  function rotate(p: PlacedItem) {
    /* Turn about the piece's middle, then take the nearest spot that fits. */
    const { w, d } = footprintRect(p);
    const turned = { ...p, rot: !p.rot, x: p.x + (w - d) / 2, y: p.y + (d - w) / 2 };
    const spot = freeSpot(turned, placed.filter((q) => q.uid !== p.uid), W, D);
    if (spot) {
      setNote("");
      setPlaced((prev) => prev.map((q) => (q.uid === p.uid ? spot : q)));
    } else setNote("There isn't room to turn it. Move something first.");
  }
  function remove(p: PlacedItem) {
    setNote("");
    setSelected(null);
    setPlaced((prev) => prev.filter((q) => q.uid !== p.uid));
  }
  function add(i: FloorItem) {
    const spot = freeSpot(centred(toPlaced(i), room), placed, W, D);
    if (spot) {
      setNote("");
      setPlaced((prev) => [...prev, spot]);
      setSelected(spot.uid);
    } else setNote(`There's no floor left for ${i.name}. Move or take out another piece.`);
  }
  function arrange() {
    setNote("");
    setSelected(null);
    setPlaced(arrangeRoom(items, room.w, room.d).placed);
  }
  function resize(axis: "w" | "d", by: number) {
    const size = Math.min(MAX_FT, Math.max(MIN_FT, room[axis] + by));
    const next = { ...room, [axis]: size };
    setNote("");
    setSelected(null);
    setRoom(next);
    setPlaced((prev) => reflow(prev, next.w, next.d));
  }

  const lookName = (LOOKS.find((l) => l.id === room.setting)?.label ?? "room").toLowerCase();
  const ghost =
    "flex min-h-11 items-center gap-1.5 rounded-xl border border-white/12 px-3.5 text-sm font-bold text-white/75 transition-colors hover:border-accent/60 hover:text-white";

  if (!ready) return <div className="h-[420px] rounded-2xl border border-line bg-navy sm:h-[520px]" />;

  return (
    <div>
      {controls && (
        <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex flex-wrap gap-1 rounded-2xl border border-white/12 bg-white/5 p-1">
            {LOOKS.map((l) => (
              <button
                key={l.id}
                type="button"
                aria-pressed={room.setting === l.id}
                onClick={() => setRoom({ ...room, setting: l.id })}
                className={
                  "min-h-10 rounded-xl px-3 text-sm font-bold transition-colors " +
                  (room.setting === l.id ? "bg-accent text-white" : "text-white/65 hover:text-white")
                }
              >
                {l.label}
              </button>
            ))}
          </div>
          <Stepper label="Width" value={room.w} onStep={(by) => resize("w", by)} />
          <Stepper label="Length" value={room.d} onStep={(by) => resize("d", by)} />
        </div>
      )}

      <div className="relative">
        <Planner3D
          placed={placed}
          roomW={room.w}
          roomD={room.d}
          grid={null}
          walls={false}
          setting={room.setting}
          editable
          top={top}
          selectedUid={selected}
          onSelect={setSelected}
          onMove={move}
          heightClass={tall ? "h-[62vh] min-h-[420px]" : undefined}
        />
      </div>

      {/* One row under the room, so nothing ever covers the gear. */}
      <div className="mt-3 flex min-h-11 flex-wrap items-center gap-2">
        {chosen ? (
          <>
            <p className="min-w-0 max-w-full truncate pr-2 text-sm font-bold text-white">{chosen.name}</p>
            <button type="button" onClick={() => rotate(chosen)} className="flex min-h-11 items-center gap-1.5 rounded-xl bg-accent px-4 text-sm font-bold text-white hover:bg-accent-hover">
              <RotateCw className="h-4 w-4" />
              Turn
            </button>
            <button type="button" onClick={() => remove(chosen)} className={ghost}>
              <Trash2 className="h-4 w-4" />
              Take out
            </button>
            <button type="button" onClick={() => setSelected(null)} aria-label="Done" className="flex h-11 w-11 items-center justify-center rounded-xl text-white/70 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => setTop(!top)} className={ghost}>
              {top ? <Box className="h-4 w-4" /> : <Square className="h-4 w-4" />}
              {top ? "3D view" : "Top view"}
            </button>
            <button type="button" onClick={arrange} className={ghost}>
              <Sparkles className="h-4 w-4" />
              Arrange for me
            </button>
          </>
        )}
      </div>

      <p role="status" className="mt-3 text-sm text-white/70">
        {note ||
          (waiting.length
            ? `${waiting.length} ${waiting.length === 1 ? "piece isn't" : "pieces aren't"} in the room. Tap one below to add it.`
            : `Everything is in this ${room.w} × ${room.d} ft ${lookName}, at least ${WALL_GAP} in off the walls. Sizes are approximate.`)}
      </p>

      {waiting.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {waiting.map((i, k) => (
            <button key={`${i.id}-${k}`} type="button" onClick={() => add(i)} className={ghost}>
              <Plus className="h-4 w-4 text-accent" />
              <span className="max-w-52 truncate">{i.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function centred(p: PlacedItem, room: RoomStart): PlacedItem {
  return { ...p, x: (room.w * 12 - p.w) / 2, y: (room.d * 12 - p.d) / 2 };
}

function Stepper({ label, value, onStep }: { label: string; value: number; onStep: (by: number) => void }) {
  const btn = "flex h-10 w-10 items-center justify-center rounded-lg text-white/75 hover:text-white disabled:opacity-30";
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-white/70">{label}</span>
      <div className="flex items-center rounded-xl border border-white/12 bg-white/5">
        <button type="button" aria-label={`Shorter ${label.toLowerCase()}`} disabled={value <= MIN_FT} onClick={() => onStep(-1)} className={btn}>
          <Minus className="h-4 w-4" />
        </button>
        <span className="w-12 text-center text-sm font-bold tabular-nums text-white">{value} ft</span>
        <button type="button" aria-label={`Longer ${label.toLowerCase()}`} disabled={value >= MAX_FT} onClick={() => onStep(1)} className={btn}>
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
