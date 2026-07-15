"use client";

/* Floor-plan visualizer (/planner). Reads the equipment list handed off by
   the kit result or the gym plan (sessionStorage), lets the user upload a
   top-down photo/sketch of their space, set real room dimensions, and drag
   scaled equipment rectangles around the map. Safety halos (research-backed
   clearances) light up red when two pieces crowd each other. Everything is
   client-side: the image never leaves the browser. */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Crop as CropIcon, Eye, EyeOff, ImagePlus, Loader2, RotateCw, ScanLine, Sparkles, Trash2, X } from "lucide-react";
import { autoPlace, detectWalls, emptyGrid, wallsDataUrl } from "@/lib/auto-layout";
import {
  type Crop,
  type FloorItem,
  type PlacedItem,
  FULL_CROP,
  cropBackground,
  PLACEABLE_CATS,
  footprintOf,
  clearanceOf,
  LAYOUT_ADVICE,
  loadFloorItems,
  loadLayout,
  saveLayout,
  loadFloorOrigin,
} from "@/lib/floor-plan";
import CropTool from "@/components/planner/CropTool";
import { EquipmentIcon } from "@/components/planner/equipment-icon";

const uidOf = () => Math.random().toString(36).slice(2, 9);

export default function FloorPlanner({
  itemsProp,
  embedded,
  defaultRoomW,
  defaultRoomD,
}: {
  /* When provided (embedded in the gym plan), the equipment list comes from
     the live plan instead of the sessionStorage handoff. */
  itemsProp?: FloorItem[];
  embedded?: boolean;
  /* First-mount room size (feet) — e.g. sized to the gym plan's floor area.
     A layout saved this session still wins. */
  defaultRoomW?: number;
  defaultRoomD?: number;
} = {}) {
  const [loadedItems, setLoadedItems] = useState<FloorItem[]>([]);
  /* Embedded mode gets the list live from the plan; the route version reads
     the sessionStorage handoff loaded on mount. */
  const items = itemsProp ?? loadedItems;
  const [placed, setPlaced] = useState<PlacedItem[]>([]);
  const [roomW, setRoomW] = useState(defaultRoomW ?? 30); // feet
  const [roomD, setRoomD] = useState(defaultRoomD ?? 20); // feet
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>(FULL_CROP);
  const [cropping, setCropping] = useState(false);
  const [halos, setHalos] = useState(true);
  const [dropActive, setDropActive] = useState(false);
  const [dropError, setDropError] = useState("");
  const [origin, setOrigin] = useState<string | null>(null);
  const [containerW, setContainerW] = useState(0);
  const [arranging, setArranging] = useState(false);
  const [arrangeNote, setArrangeNote] = useState("");
  const [wallsUrl, setWallsUrl] = useState<string | null>(null);
  const [showWalls, setShowWalls] = useState(true);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ uid: string; dx: number; dy: number } | null>(null);
  /* The save effect must not run with the first render's empty state — it
     would overwrite the real layout in storage before the load effect's
     setState applies (StrictMode's double mount makes that deterministic).
     The first run(s) in the mount commit are skipped; the post-load rerender
     then writes the loaded data back, so storage always settles correct. */
  const hydrated = useRef(false);

  /* Load handoff + saved layout once, then track container width. */
  useEffect(() => {
    setLoadedItems(loadFloorItems());
    const saved = loadLayout();
    setPlaced(saved.placed);
    if (saved.roomW) setRoomW(saved.roomW);
    if (saved.roomD) setRoomD(saved.roomD);
    setOrigin(loadFloorOrigin());
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setContainerW(el.clientWidth));
    ro.observe(el);
    setContainerW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    saveLayout(placed, roomW, roomD);
  }, [placed, roomW, roomD]);

  /* Paste a schematic straight from the clipboard (Ctrl/Cmd+V). */
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const file = Array.from(e.clipboardData?.items || [])
        .find((it) => it.kind === "file" && it.type.startsWith("image/"))
        ?.getAsFile();
      if (file) {
        e.preventDefault();
        setImageFile(file);
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgUrl]);

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

  /* Load a floor image from any source (file picker or drag-drop). Stays in
     the browser — object URL only, nothing uploaded. */
  function setImageFile(f: File | null | undefined) {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setDropError("That's not an image file — drop a PNG, JPG, or screenshot.");
      return;
    }
    setDropError("");
    if (imgUrl) URL.revokeObjectURL(imgUrl);
    setImgUrl(URL.createObjectURL(f));
    setCrop(FULL_CROP);
    setCropping(true); // go straight to "select your room"
  }
  function clearImage() {
    if (imgUrl) URL.revokeObjectURL(imgUrl);
    setImgUrl(null);
    setCrop(FULL_CROP);
    setCropping(false);
    setWallsUrl(null);
    setArrangeNote("");
  }
  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) =>
    setImageFile(e.target.files?.[0]);

  /* Drag-and-drop an image file onto the map. dragenter/over must
     preventDefault or the browser just opens the file. We ignore drags that
     carry no files (e.g. text) so it never flickers on stray drags. */
  const dragHasFiles = (e: React.DragEvent) =>
    Array.from(e.dataTransfer.types || []).includes("Files");
  function onDragOver(e: React.DragEvent) {
    if (!dragHasFiles(e)) return;
    e.preventDefault();
    if (!dropActive) setDropActive(true);
  }
  function onDragLeave(e: React.DragEvent) {
    /* Only clear when the cursor actually leaves the map, not on child enter. */
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDropActive(false);
  }
  function onDrop(e: React.DragEvent) {
    if (!dragHasFiles(e)) return;
    e.preventDefault();
    setDropActive(false);
    setImageFile(e.dataTransfer.files?.[0]);
  }

  /* Detect walls from the (cropped) schematic and lay the whole list out
     automatically — real spacing, category formations, keep-clear zones. */
  async function autoArrange(c: Crop = crop, url: string | null = imgUrl) {
    if (arranging) return;
    setArranging(true);
    setArrangeNote("");
    try {
      const wIn = roomW * 12,
        dIn = roomD * 12;
      const grid = url
        ? await detectWalls(url, c, wIn, dIn).catch(() => emptyGrid(wIn, dIn))
        : emptyGrid(wIn, dIn);
      setWallsUrl(wallsDataUrl(grid));
      const res = autoPlace(items, wIn, dIn, grid);
      setPlaced(res.placed);
      const fitted = res.total - res.unplacedCount;
      setArrangeNote(
        res.total === 0
          ? "Nothing to place yet — build a kit or gym plan first."
          : `Auto-placed ${fitted} of ${res.total} piece${res.total === 1 ? "" : "s"}` +
              (grid.detected
                ? grid.rooms > 1
                  ? ` · read ${grid.rooms} rooms — gear kept to the main floor`
                  : " · walls read from your plan"
                : "") +
              (res.unplacedCount > 0
                ? ` — ${res.unplacedCount} didn't fit. Try a bigger room, or drag pieces closer.`
                : ". Drag anything to fine-tune."),
      );
    } finally {
      setArranging(false);
    }
  }

  const backHref = origin === "/gym" ? "/gym" : origin === "/quiz" ? "/quiz" : "/start";
  const backLabel = origin === "/gym" ? "Back to your plan" : origin === "/quiz" ? "Back to your kit" : "Back";

  const Root = embedded ? "div" : "main";
  return (
    <Root className={embedded ? undefined : "min-h-screen bg-off"}>
      <div className={embedded ? undefined : "mx-auto max-w-6xl px-5 py-10"}>
        {!embedded ? (
          <>
            <Link
              href={backHref}
              className="inline-flex items-center gap-1.5 text-sm font-bold text-ink-3 transition-colors hover:text-accent"
            >
              <ArrowLeft className="h-4 w-4" /> {backLabel}
            </Link>
            <p className="mt-4 text-xs font-bold uppercase tracking-widest text-accent">
              Floor plan visualizer
            </p>
            <h1 className="mt-1 font-display text-3xl font-extrabold text-ink">
              Place your equipment
            </h1>
          </>
        ) : null}
        <p className={`${embedded ? "" : "mt-2 "}max-w-2xl text-sm text-ink-2`}>
          {embedded
            ? "Drop, paste (Ctrl+V) or upload your floor sketch — the planner reads the walls and lays your gear out automatically, at true scale. Drag any piece to fine-tune; halos turn red when pieces crowd each other."
            : "Drop, paste (Ctrl+V) or upload a top-down sketch of your space, select just the room you're planning, and set its real size — the planner reads the walls and lays everything out for you with real spacing and formations. Drag any piece to fine-tune; it's all drawn at true scale from published footprints. The dashed halos are the safety clearance each piece needs; they turn red when two pieces crowd each other."}
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
            {imgUrl ? "Replace floor image" : "Upload or drop floor image"}
            <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
          </label>
          {imgUrl ? (
            <>
              <button
                onClick={() => setCropping(true)}
                className="flex items-center gap-1.5 rounded-xl border border-line px-3 py-2 text-sm text-ink-2 transition-colors hover:border-accent/60 hover:text-ink"
              >
                <CropIcon className="h-3.5 w-3.5" /> Re-select room
              </button>
              <button
                onClick={clearImage}
                className="flex items-center gap-1.5 text-sm text-ink-3 hover:text-ink"
              >
                <X className="h-3.5 w-3.5" /> Remove image
              </button>
            </>
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
          <button
            onClick={() => void autoArrange()}
            disabled={arranging || items.length === 0}
            className="flex items-center gap-1.5 rounded-xl bg-accent px-3.5 py-2 text-sm font-bold text-white shadow-md shadow-accent/20 transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {arranging ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            Auto-arrange
          </button>
          {wallsUrl ? (
            <button
              onClick={() => setShowWalls(!showWalls)}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm transition-colors ${
                showWalls
                  ? "border-accent/60 text-accent"
                  : "border-line text-ink-2 hover:border-accent/60 hover:text-ink"
              }`}
            >
              <ScanLine className="h-3.5 w-3.5" /> Detected walls
            </button>
          ) : null}
        </div>

        {dropError ? (
          <p className="mt-3 text-sm font-bold text-red-400">{dropError}</p>
        ) : null}
        {arrangeNote ? (
          <p className="mt-3 text-sm font-bold text-accent">{arrangeNote}</p>
        ) : null}

        {/* Crop step — pick the room out of the image, then set its size below */}
        {cropping && imgUrl ? (
          <div className="mt-6">
            <CropTool
              imgUrl={imgUrl}
              onApply={(c) => {
                setCrop(c);
                setCropping(false);
                /* The magic moment: room selected → read the walls and lay
                   the equipment out automatically. */
                void autoArrange(c);
              }}
              onCancel={() => setCropping(false)}
            />
          </div>
        ) : null}

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_290px]">
          <div>
            {/* Layout dashboard — the numbers that matter, at a glance */}
            {items.length > 0 ? (
              <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <MiniStat
                  label="Placed"
                  value={`${placed.length} / ${items.reduce((s, i) => s + i.qty, 0)}`}
                />
                <MiniStat label="Room" value={`${roomW} × ${roomD} ft`} />
                <MiniStat label="Gear footprint" value={`${footprintSqFt} sq ft`} />
                <MiniStat
                  label="Floor used"
                  value={`${Math.round(density * 100)}%`}
                  warn={density > 0.35}
                />
              </div>
            ) : null}
            {/* The map */}
            <div
              ref={boxRef}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              className={`relative w-full touch-none overflow-hidden rounded-2xl border bg-card transition-colors ${
                dropActive ? "border-accent" : "border-line"
              }`}
              style={{
                height: mapH || 400,
                backgroundImage: imgUrl
                  ? undefined
                  : "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
                backgroundSize: imgUrl ? undefined : `${12 * scale}px ${12 * scale}px`,
              }}
            >
              {imgUrl ? (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 opacity-60"
                  style={cropBackground(imgUrl, crop)}
                />
              ) : null}

              {/* Detected-walls mask (orange wash over off-limits floor) */}
              {wallsUrl && showWalls ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={wallsUrl}
                  alt=""
                  aria-hidden
                  className="pointer-events-none absolute inset-0 h-full w-full opacity-60 [image-rendering:pixelated]"
                />
              ) : null}

              {/* Drop-a-file overlay */}
              {dropActive ? (
                <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-accent/15 backdrop-blur-[1px]">
                  <div className="flex items-center gap-2 rounded-xl border border-accent bg-navy/90 px-4 py-2.5 text-sm font-bold text-white">
                    <ImagePlus className="h-4 w-4 text-accent" /> Drop to set your floor image
                  </div>
                </div>
              ) : !imgUrl && placed.length === 0 ? (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center">
                  <p className="text-sm text-ink-3">
                    Drag a photo or sketch of your floor anywhere onto this grid, or
                    add pieces from below.
                  </p>
                </div>
              ) : null}

              {placed.map((p, pi) => {
                const w = (p.rot ? p.d : p.w) * scale;
                const h = (p.rot ? p.w : p.d) * scale;
                const c = clearanceOf(p.category) * scale;
                const bad = colliding.has(p.uid);
                const small = Math.min(w, h) < 46;
                return (
                  <div
                    key={p.uid}
                    onPointerDown={(ev) => onPointerDown(ev, p)}
                    className="gg-pop-in group absolute cursor-grab select-none active:cursor-grabbing"
                    style={{
                      left: p.x * scale,
                      top: p.y * scale,
                      width: w,
                      height: h,
                      animationDelay: `${Math.min(pi * 18, 450)}ms`,
                    }}
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
                      title={p.name}
                      className={`relative flex h-full w-full flex-col items-center justify-center gap-0.5 overflow-hidden rounded-md border px-1 text-center ${
                        bad
                          ? "border-red-500 bg-red-500/30"
                          : "border-accent/70 bg-navy/85 shadow-[0_0_10px_rgba(240,83,30,0.35)]"
                      }`}
                    >
                      <EquipmentIcon
                        id={p.id}
                        category={p.category}
                        className="block h-4 w-4 shrink-0 text-accent [&>svg]:h-full [&>svg]:w-full"
                      />
                      {!small ? (
                        <span className="text-[0.55rem] font-bold leading-tight text-white">
                          {p.name}
                        </span>
                      ) : null}
                    </div>
                    {/* Hover tools — pinned to the piece's top-right corner (on
                        the piece, not floating above it) so there's no hover gap
                        to break the click and nothing gets clipped at the map's
                        top edge. */}
                    <div className="absolute right-0.5 top-0.5 z-10 hidden items-center gap-0.5 rounded-md border border-line bg-navy/95 px-1 py-0.5 shadow-md group-hover:flex">
                      <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => setPlaced((prev) => prev.map((q) => (q.uid === p.uid ? { ...q, rot: !q.rot } : q)))}
                        className="p-0.5 text-white/80 hover:text-accent" aria-label="Rotate"
                      >
                        <RotateCw className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => setPlaced((prev) => prev.filter((q) => q.uid !== p.uid))}
                        className="p-0.5 text-white/80 hover:text-red-400" aria-label="Remove"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-ink-3">
              Footprints are published specs, rounded — measure before you drill.
              {density > 0.35 ? (
                <span className="font-bold text-accent"> That&apos;s dense — aim under 35% floor used so the room can breathe.</span>
              ) : null}
            </p>

            {/* Palette */}
            <div className="mt-5 rounded-2xl border border-line bg-card p-4">
              <h2 className="font-display text-sm font-bold text-ink">Your equipment</h2>
              <p className="mt-0.5 text-xs text-ink-3">Click a piece to drop it on the map. Drag to move; hover a placed piece to rotate or remove it.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {remaining.map((i) => (
                  <button
                    key={i.id}
                    onClick={() => place(i)}
                    disabled={i.left <= 0}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
                      i.left > 0
                        ? "border-line text-ink hover:border-accent/60 hover:text-accent"
                        : "border-line/50 text-ink-3 opacity-50"
                    }`}
                  >
                    <EquipmentIcon
                      id={i.id}
                      category={i.category}
                      className="block h-4 w-4 shrink-0 text-accent [&>svg]:h-full [&>svg]:w-full"
                    />
                    {i.name} <span className="text-ink-3">({Math.max(0, i.left)} of {i.qty} left · {Math.round(i.w / 12 * 10) / 10}×{Math.round(i.d / 12 * 10) / 10} ft)</span>
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
    </Root>
  );
}

function MiniStat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-card px-3 py-2">
      <p className="text-[0.6rem] font-bold uppercase tracking-wider text-ink-3">{label}</p>
      <p className={`mt-0.5 font-display text-sm font-extrabold ${warn ? "text-accent" : "text-ink"}`}>
        {value}
      </p>
    </div>
  );
}
