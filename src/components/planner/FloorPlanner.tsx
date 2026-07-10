"use client";

/* Floor-plan visualizer (/planner). Reads the equipment list handed off by
   the kit result or the gym plan (sessionStorage), lets the user upload a
   top-down photo/sketch of their space, set real room dimensions, and drag
   scaled equipment rectangles around the map. Safety halos (research-backed
   clearances) light up red when two pieces crowd each other. Everything is
   client-side: the image never leaves the browser. */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, ImagePlus, RotateCw, Trash2, X } from "lucide-react";
import {
  type FloorItem,
  type PlacedItem,
  PLACEABLE_CATS,
  footprintOf,
  clearanceOf,
  LAYOUT_ADVICE,
  loadFloorItems,
  loadLayout,
  saveLayout,
} from "@/lib/floor-plan";

const uidOf = () => Math.random().toString(36).slice(2, 9);

export default function FloorPlanner() {
  const [items, setItems] = useState<FloorItem[]>([]);
  const [placed, setPlaced] = useState<PlacedItem[]>([]);
  const [roomW, setRoomW] = useState(30); // feet
  const [roomD, setRoomD] = useState(20); // feet
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [halos, setHalos] = useState(true);
  const [containerW, setContainerW] = useState(0);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ uid: string; dx: number; dy: number } | null>(null);

  /* Load handoff + saved layout once, then track container width. */
  useEffect(() => {
    setItems(loadFloorItems());
    setPlaced(loadLayout());
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setContainerW(el.clientWidth));
    ro.observe(el);
    setContainerW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  useEffect(() => saveLayout(placed), [placed]);

  const roomWIn = roomW * 12;
  const roomDIn = roomD * 12;
  const scale = containerW > 0 ? containerW / roomWIn : 1; // px per inch
  const mapH = roomDIn * scale;

  /* How many of each unit are still unplaced. */
  const remaining = useMemo(() => {
    const used = new Map<string, number>();
    for (const p of placed) used.set(p.id, (used.get(p.id) || 0) + 1);
    return items
      .map((i) => ({ ...i, left: i.qty - (used.get(i.id) || 0) }))
      .filter((i) => i.qty > 0);
  }, [items, placed]);

  /* Collision detection: expanded AABBs (footprint + safety halo). */
  const colliding = useMemo(() => {
    const bad = new Set<string>();
    const rect = (p: PlacedItem) => {
      const w = p.rot ? p.d : p.w;
      const d = p.rot ? p.w : p.d;
      const c = clearanceOf(p.category);
      return { x1: p.x - c, y1: p.y - c, x2: p.x + w + c, y2: p.y + d + c };
    };
    for (let i = 0; i < placed.length; i++)
      for (let j = i + 1; j < placed.length; j++) {
        const a = rect(placed[i]), b = rect(placed[j]);
        if (a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1) {
          bad.add(placed[i].uid);
          bad.add(placed[j].uid);
        }
      }
    return bad;
  }, [placed]);

  const footprintSqFt = useMemo(
    () => Math.round(placed.reduce((s, p) => s + (p.w * p.d) / 144, 0)),
    [placed],
  );
  const density = roomW * roomD > 0 ? footprintSqFt / (roomW * roomD) : 0;

  function place(item: FloorItem & { left: number }) {
    if (item.left <= 0) return;
    const { w, d } = { w: item.w, d: item.d };
    setPlaced((prev) => [
      ...prev,
      {
        uid: uidOf(), id: item.id, name: item.name, category: item.category,
        w, d,
        x: Math.max(0, roomWIn / 2 - w / 2 + (prev.length % 5) * 10),
        y: Math.max(0, roomDIn / 2 - d / 2 + (prev.length % 5) * 10),
        rot: false,
      },
    ]);
  }

  function onPointerDown(e: React.PointerEvent, p: PlacedItem) {
    const box = boxRef.current?.getBoundingClientRect();
    if (!box) return;
    drag.current = {
      uid: p.uid,
      dx: (e.clientX - box.left) / scale - p.x,
      dy: (e.clientY - box.top) / scale - p.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    const box = boxRef.current?.getBoundingClientRect();
    if (!d || !box) return;
    setPlaced((prev) =>
      prev.map((p) => {
        if (p.uid !== d.uid) return p;
        const w = p.rot ? p.d : p.w;
        const h = p.rot ? p.w : p.d;
        return {
          ...p,
          x: Math.min(Math.max(0, (e.clientX - box.left) / scale - d.dx), roomWIn - w),
          y: Math.min(Math.max(0, (e.clientY - box.top) / scale - d.dy), roomDIn - h),
        };
      }),
    );
  }
  const onPointerUp = () => { drag.current = null; };

  function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (imgUrl) URL.revokeObjectURL(imgUrl);
    setImgUrl(URL.createObjectURL(f));
  }

  return (
    <main className="min-h-screen bg-off">
      <div className="mx-auto max-w-6xl px-5 py-10">
        <p className="text-xs font-bold uppercase tracking-widest text-accent">
          Floor plan visualizer
        </p>
        <h1 className="mt-1 font-display text-3xl font-extrabold text-ink">
          Place your equipment
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-2">
          Upload a top-down photo or sketch of your space (optional), set the
          room size, then drag each piece onto the map — rectangles are drawn
          at true scale from published footprints. Halos show the safety
          clearance each piece wants; they turn red when two pieces crowd
          each other.
        </p>

        {items.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-line bg-card p-6 text-sm text-ink-2">
            No equipment list found. Build a kit with the{" "}
            <Link href="/quiz" className="font-bold text-accent hover:underline">home quiz</Link>{" "}
            or a facility plan in{" "}
            <Link href="/gym" className="font-bold text-accent hover:underline">For Gyms</Link>,
            then hit &quot;Visualize floor plan&quot; there.
          </div>
        ) : null}

        {/* Controls */}
        <div className="mt-6 flex flex-wrap items-end gap-4">
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-card px-4 py-2.5 text-sm font-bold text-ink transition-colors hover:border-accent/60">
            <ImagePlus className="h-4 w-4 text-accent" />
            {imgUrl ? "Replace floor image" : "Upload floor image"}
            <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
          </label>
          {imgUrl ? (
            <button
              onClick={() => { URL.revokeObjectURL(imgUrl); setImgUrl(null); }}
              className="flex items-center gap-1.5 text-sm text-ink-3 hover:text-ink"
            >
              <X className="h-3.5 w-3.5" /> Remove image
            </button>
          ) : null}
          <label className="text-sm text-ink-2">
            Room width (ft)
            <input
              type="number" min={6} max={200} value={roomW}
              onChange={(e) => setRoomW(Math.max(6, Number(e.target.value) || 6))}
              className="ml-2 w-20 rounded-lg border border-line bg-off px-2 py-1.5 text-ink"
            />
          </label>
          <label className="text-sm text-ink-2">
            Room depth (ft)
            <input
              type="number" min={6} max={200} value={roomD}
              onChange={(e) => setRoomD(Math.max(6, Number(e.target.value) || 6))}
              className="ml-2 w-20 rounded-lg border border-line bg-off px-2 py-1.5 text-ink"
            />
          </label>
          <button
            onClick={() => setHalos(!halos)}
            className="flex items-center gap-1.5 rounded-xl border border-line px-3 py-2 text-sm text-ink-2 transition-colors hover:border-accent/60 hover:text-ink"
          >
            {halos ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            Safety halos
          </button>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_290px]">
          <div>
            {/* The map */}
            <div
              ref={boxRef}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              className="relative w-full touch-none overflow-hidden rounded-2xl border border-line bg-card"
              style={{
                height: mapH || 400,
                backgroundImage: imgUrl
                  ? undefined
                  : "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
                backgroundSize: imgUrl ? undefined : `${12 * scale}px ${12 * scale}px`,
              }}
            >
              {imgUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imgUrl}
                  alt="Your floor plan"
                  className="pointer-events-none absolute inset-0 h-full w-full object-fill opacity-60"
                />
              ) : null}

              {placed.map((p) => {
                const w = (p.rot ? p.d : p.w) * scale;
                const h = (p.rot ? p.w : p.d) * scale;
                const c = clearanceOf(p.category) * scale;
                const bad = colliding.has(p.uid);
                return (
                  <div
                    key={p.uid}
                    onPointerDown={(e) => onPointerDown(e, p)}
                    className="group absolute cursor-grab select-none active:cursor-grabbing"
                    style={{ left: p.x * scale, top: p.y * scale, width: w, height: h }}
                  >
                    {halos ? (
                      <div
                        aria-hidden
                        className={`pointer-events-none absolute rounded-lg border border-dashed ${
                          bad ? "border-red-500/70 bg-red-500/10" : "border-win/40 bg-win/5"
                        }`}
                        style={{ left: -c, top: -c, right: -c, bottom: -c }}
                      />
                    ) : null}
                    <div
                      className={`relative flex h-full w-full items-center justify-center overflow-hidden rounded-md border text-center ${
                        bad
                          ? "border-red-500 bg-red-500/30"
                          : "border-accent/70 bg-navy/85 shadow-[0_0_10px_rgba(240,83,30,0.35)]"
                      }`}
                    >
                      <span className="px-1 text-[0.55rem] font-bold leading-tight text-white">
                        {p.name}
                      </span>
                    </div>
                    {/* Hover tools */}
                    <div className="absolute -top-7 left-1/2 hidden -translate-x-1/2 items-center gap-1 rounded-lg border border-line bg-navy px-1.5 py-1 group-hover:flex">
                      <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => setPlaced((prev) => prev.map((q) => (q.uid === p.uid ? { ...q, rot: !q.rot } : q)))}
                        className="text-white/70 hover:text-accent" aria-label="Rotate"
                      >
                        <RotateCw className="h-3 w-3" />
                      </button>
                      <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => setPlaced((prev) => prev.filter((q) => q.uid !== p.uid))}
                        className="text-white/70 hover:text-red-400" aria-label="Remove"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-ink-3">
              {roomW} × {roomD} ft ({(roomW * roomD).toLocaleString()} sq ft) ·
              equipment footprint ~{footprintSqFt} sq ft ({Math.round(density * 100)}% of floor)
              {density > 0.35 ? (
                <span className="font-bold text-accent"> — that&apos;s dense; aim under 35% so the room can breathe.</span>
              ) : null}
              {" "}Footprints are published specs, rounded — measure before you drill.
            </p>

            {/* Palette */}
            <div className="mt-5 rounded-2xl border border-line bg-card p-4">
              <h2 className="font-display text-sm font-bold text-ink">Your equipment</h2>
              <p className="mt-0.5 text-xs text-ink-3">Click a piece to drop it on the map. Drag to move, hover for rotate/remove.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {remaining.map((i) => (
                  <button
                    key={i.id}
                    onClick={() => place(i)}
                    disabled={i.left <= 0}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
                      i.left > 0
                        ? "border-line text-ink hover:border-accent/60 hover:text-accent"
                        : "border-line/50 text-ink-3 opacity-50"
                    }`}
                  >
                    {i.name} <span className="text-ink-3">({i.left} of {i.qty} left · {Math.round(i.w / 12 * 10) / 10}×{Math.round(i.d / 12 * 10) / 10} ft)</span>
                  </button>
                ))}
                {remaining.length === 0 && items.length > 0 ? (
                  <p className="text-xs text-ink-3">Everything placeable is on the map.</p>
                ) : null}
              </div>
            </div>
          </div>

          {/* Advice */}
          <aside className="space-y-3">
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-accent">
              Layout rules that matter
            </h2>
            {LAYOUT_ADVICE.map((a) => (
              <div key={a.title} className="rounded-xl border border-line bg-card p-3.5">
                <p className="text-xs font-bold text-ink">{a.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-2">{a.body}</p>
              </div>
            ))}
          </aside>
        </div>
      </div>
    </main>
  );
}
