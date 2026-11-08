"use client";

/* The plan's room in 3D, with an Edit button that opens the same room in a
   popup over the page: drag a piece to move it, tap it to turn or take it out,
   change the room's size or look. Pieces stop at walls and at each other, so
   there is no "bad" layout to warn about. */

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Minus, Pencil, Plus, RotateCw, Sparkles, Square, Trash2, X, Box } from "lucide-react";
import { arrangeRoom, footprintRect, freeSpot } from "@/lib/auto-layout";
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
}: {
  items: FloorItem[];
  /* Where the quiz says this room is. Left out on /planner, which reopens the
     saved room. */
  start?: RoomStart;
}) {
  const [room, setRoom] = useState<RoomStart>(start ?? { w: 12, d: 12, setting: "garage" });
  const [placed, setPlaced] = useState<PlacedItem[]>([]);
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [top, setTop] = useState(false);
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState(false);
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

  /* While the popup is up the page behind it stays put; Escape closes it. */
  useEffect(() => {
    if (!editing) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [editing]);

  const waiting = useMemo(() => missingFrom(items, placed), [items, placed]);
  const chosen = placed.find((p) => p.uid === selected) ?? null;
  const W = room.w * 12;
  const D = room.d * 12;

  function close() {
    setEditing(false);
    setSelected(null);
    setTop(false);
    setNote("");
  }
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

  const fits = `Everything fits in this ${room.w} \u00d7 ${room.d} ft ${lookName}. Sizes are approximate.`;
  const left = `${waiting.length} ${waiting.length === 1 ? "piece doesn't" : "pieces don't"} fit`;

  return (
    <div>
      <div className="relative">
        {/* One 3D scene at a time, which phones need: this one steps aside for
            the popup's. */}
        {editing ? (
          <div className="h-[420px] rounded-2xl border border-line bg-navy sm:h-[520px]" />
        ) : (
          <Planner3D placed={placed} roomW={room.w} roomD={room.d} grid={null} walls={false} setting={room.setting} />
        )}
        {/* glow-btn sets its own position, so the wrapper does the placing. */}
        <div className="absolute right-3 top-3 z-20">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="glow-btn flex min-h-11 items-center gap-1.5 rounded-xl bg-accent px-4 text-sm font-bold text-white shadow-[0_6px_22px_rgba(240,83,30,0.4)] hover:bg-accent-hover"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </button>
        </div>
      </div>
      <p className="mt-3 text-sm text-white/70">{waiting.length ? `${left} in this room. Tap Edit to rearrange it.` : fits}</p>

      {createPortal(
        <AnimatePresence>
          {editing && (
            <motion.div
              className="fixed inset-0 z-[120] flex justify-center sm:p-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <button type="button" aria-label="Close" tabIndex={-1} onClick={close} className="absolute inset-0 cursor-default bg-navy-deep/85 backdrop-blur-sm" />
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-label="Edit your room"
                initial={{ y: 24, scale: 0.98 }}
                animate={{ y: 0, scale: 1 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className="relative flex h-[100dvh] w-full max-w-5xl flex-col gap-3 border-white/12 bg-navy p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:h-full sm:rounded-2xl sm:border"
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-display text-xl font-extrabold tracking-tight text-white">Edit your room</h2>
                  <button type="button" autoFocus onClick={close} className="min-h-11 rounded-xl bg-accent px-5 text-sm font-bold text-white hover:bg-accent-hover">
                    Done
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                  <div className="grid w-full grid-cols-4 gap-1 rounded-xl border border-white/12 bg-white/5 p-1 sm:w-auto">
                    {LOOKS.map((l) => (
                      <button
                        key={l.id}
                        type="button"
                        aria-pressed={room.setting === l.id}
                        onClick={() => setRoom({ ...room, setting: l.id })}
                        className={
                          "min-h-10 rounded-lg px-1 text-[13px] font-bold transition-colors sm:px-3 " +
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

                <div className="min-h-0 flex-1">
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
                    heightClass="h-full"
                  />
                </div>

                {/* One row under the room, so nothing ever covers the gear. */}
                <div className="flex min-h-11 flex-wrap items-center gap-2">
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
                      <button type="button" onClick={() => setSelected(null)} aria-label="Stop editing this piece" className="flex h-11 w-11 items-center justify-center rounded-xl text-white/70 hover:text-white">
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

                <p role="status" className="text-sm text-white/70">
                  {note || (waiting.length ? `${left} right now. Tap one to add it.` : "Drag a piece to move it. Tap it to turn it.")}
                </p>

                {waiting.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto">
                    {waiting.map((i, k) => (
                      <button key={`${i.id}-${k}`} type="button" onClick={() => add(i)} className={ghost + " shrink-0"}>
                        <Plus className="h-4 w-4 text-accent" />
                        <span className="max-w-52 truncate">{i.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}

function centred(p: PlacedItem, room: RoomStart): PlacedItem {
  return { ...p, x: (room.w * 12 - p.w) / 2, y: (room.d * 12 - p.d) / 2 };
}

function Stepper({ label, value, onStep }: { label: string; value: number; onStep: (by: number) => void }) {
  const btn = "flex h-10 w-9 items-center justify-center rounded-lg text-white/75 hover:text-white disabled:opacity-30";
  return (
    <div className="flex flex-1 items-center justify-between gap-2 sm:flex-none">
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
