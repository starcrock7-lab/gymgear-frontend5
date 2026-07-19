"use client";

/* Floor-plan visualizer (/planner). Reads the equipment list handed off by
   the kit result or the gym plan (sessionStorage), lets the user upload a
   top-down photo/sketch of their space, set real room dimensions, and drag
   scaled equipment rectangles around the map. Safety halos (research-backed
   clearances) light up red when two pieces crowd each other. Everything is
   client-side: the image never leaves the browser. */

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowLeft, Ban, Box, Crop as CropIcon, Eye, EyeOff, ImagePlus, Loader2, Map as MapIcon, RotateCw, ScanLine, Sparkles, Trash2, X } from "lucide-react";
import { applyZones, autoPlace, detectWalls, emptyGrid, wallsDataUrl, type WallGrid } from "@/lib/auto-layout";

/* three.js only loads when the user opens the 3D view. */
const Planner3D = dynamic(() => import("@/components/planner/Planner3D"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] w-full items-center justify-center rounded-2xl border border-line bg-navy sm:h-[520px]">
      <Loader2 className="h-8 w-8 animate-spin text-accent" />
    </div>
  ),
});
import {
  type Crop,
  type FloorItem,
  type PlacedItem,
  type Zone,
  FULL_CROP,
  cropBackground,
  PLACEABLE_CATS,
  footprintOf,
  clearanceOf,
  loadFloorItems,
  loadFloorRoom,
  loadLayout,
  saveLayout,
  loadFloorOrigin,
} from "@/lib/floor-plan";
import CropTool from "@/components/planner/CropTool";
import EquipCard from "@/components/planner/EquipCard";
import { EquipmentIcon, familyColor } from "@/components/planner/equipment-icon";

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
  const [wallGrid, setWallGrid] = useState<WallGrid | null>(null);
  const [view3d, setView3d] = useState(false);
  /* Clicked piece — opens the product info card (2D and 3D). */
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  /* User-drawn off-limits areas (inches) + the "mark areas" draw mode. */
  const [zones, setZones] = useState<Zone[]>([]);
  const [zoneMode, setZoneMode] = useState(false);
  const [zoneRect, setZoneRect] = useState<{ x: number; y: number; w: number; d: number } | null>(null);
  const zoneStart = useRef<{ x: number; y: number } | null>(null);
  const zoneDraft = useRef<{ x: number; y: number; w: number; d: number } | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  /* sx/sy/moved distinguish a click (open card) from a drag (move piece). */
  const drag = useRef<{ uid: string; dx: number; dy: number; sx: number; sy: number; moved: boolean } | null>(null);
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
    setZones(saved.zones ?? []);
    /* Room size: a saved layout's own dims win; otherwise the size handed
       off with the items (the gym plan sizes it to the facility area). */
    const hint = itemsProp ? null : loadFloorRoom();
    if (saved.roomW) setRoomW(saved.roomW);
    else if (hint) setRoomW(hint.w);
    if (saved.roomD) setRoomD(saved.roomD);
    else if (hint) setRoomD(hint.d);
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
    saveLayout(placed, roomW, roomD, zones);
  }, [placed, roomW, roomD, zones]);

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
    /* A piece sitting in a user-marked off-limits area is flagged too. */
    for (const p of placed) {
      const w = p.rot ? p.d : p.w, d = p.rot ? p.w : p.d;
      for (const z of zones)
        if (p.x < z.x + z.w && p.x + w > z.x && p.y < z.y + z.d && p.y + d > z.y) {
          bad.add(p.uid);
          break;
        }
    }
    return bad;
  }, [placed, zones]);

  const footprintSqFt = useMemo(
    () => Math.round(placed.reduce((s, p) => s + (p.w * p.d) / 144, 0)),
    [placed],
  );
  const density = roomW * roomD > 0 ? footprintSqFt / (roomW * roomD) : 0;
  const selectedItem = placed.find((p) => p.uid === selectedUid) ?? null;

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
    if (zoneMode) return; // drawing an off-limits area, not dragging pieces
    const box = boxRef.current?.getBoundingClientRect();
    if (!box) return;
    drag.current = {
      uid: p.uid,
      dx: (e.clientX - box.left) / scale - p.x,
      dy: (e.clientY - box.top) / scale - p.y,
      sx: e.clientX,
      sy: e.clientY,
      moved: false,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  /* Start drawing an off-limits rectangle on the map background. */
  function onMapPointerDown(e: React.PointerEvent) {
    if (!zoneMode) {
      /* Background press (not on a piece) closes the product card. */
      if (!(e.target as HTMLElement).closest?.(".gg-pop-in")) setSelectedUid(null);
      return;
    }
    const box = boxRef.current?.getBoundingClientRect();
    if (!box) return;
    const x = (e.clientX - box.left) / scale;
    const y = (e.clientY - box.top) / scale;
    zoneStart.current = { x, y };
    zoneDraft.current = { x, y, w: 0, d: 0 };
    setZoneRect({ x, y, w: 0, d: 0 });
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* pointer already released */ }
  }
  function onPointerMove(e: React.PointerEvent) {
    const box = boxRef.current?.getBoundingClientRect();
    if (!box) return;
    if (zoneStart.current) {
      const x = Math.min(Math.max(0, (e.clientX - box.left) / scale), roomWIn);
      const y = Math.min(Math.max(0, (e.clientY - box.top) / scale), roomDIn);
      const s = zoneStart.current;
      const r = { x: Math.min(s.x, x), y: Math.min(s.y, y), w: Math.abs(x - s.x), d: Math.abs(y - s.y) };
      zoneDraft.current = r;
      setZoneRect(r);
      return;
    }
    const d = drag.current;
    if (!d) return;
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 6) return;
    d.moved = true;
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
  function onPointerUp() {
    if (zoneStart.current) {
      const r = zoneDraft.current;
      if (r && r.w * scale > 10 && r.d * scale > 10)
        setZones((z) => [...z, { id: uidOf(), ...r }]);
      zoneStart.current = null;
      zoneDraft.current = null;
      setZoneRect(null);
      return;
    }
    /* A press that never moved is a click — open the product card. */
    if (drag.current && !drag.current.moved) setSelectedUid(drag.current.uid);
    drag.current = null;
  }

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
    setWallGrid(null);
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
      const detected = url
        ? await detectWalls(url, c, wIn, dIn).catch(() => emptyGrid(wIn, dIn))
        : emptyGrid(wIn, dIn);
      /* Fold the user's off-limits areas into the grid so both the placement
         and the 3D walls avoid them; the 2D overlay shows detected walls only
         (the zones have their own on-map rectangles). */
      const grid = applyZones(detected, zones);
      setWallsUrl(wallsDataUrl(detected));
      setWallGrid(grid);
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
            <h1 className="mt-4 font-display text-3xl font-extrabold text-ink">
              Place your equipment
            </h1>
          </>
        ) : null}
        <p className={`${embedded ? "" : "mt-2 "}max-w-2xl text-sm text-ink-2`}>
          Drop, paste (Ctrl+V) or upload your floor plan, set the room size, and Auto-arrange —
          everything is true scale. Drag to fine-tune; red means too crowded.
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
          <button
            onClick={() => setView3d(!view3d)}
            disabled={view3d ? false : placed.length === 0}
            className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              view3d
                ? "border-accent bg-accent/10 text-accent"
                : "border-line text-ink-2 hover:border-accent/60 hover:text-ink"
            }`}
            title={placed.length === 0 && !view3d ? "Place something first" : undefined}
          >
            {view3d ? <MapIcon className="h-3.5 w-3.5" /> : <Box className="h-3.5 w-3.5" />}
            {view3d ? "2D plan" : "3D view"}
          </button>
          <button
            onClick={() => setHalos(!halos)}
            className="flex items-center gap-1.5 rounded-xl border border-line px-3 py-2 text-sm text-ink-2 transition-colors hover:border-accent/60 hover:text-ink"
          >
            {halos ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            Safety halos
          </button>
          <button
            onClick={() => setZoneMode((v) => !v)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm transition-colors ${
              zoneMode
                ? "border-accent bg-accent/10 text-accent"
                : "border-line text-ink-2 hover:border-accent/60 hover:text-ink"
            }`}
            title="Drag on the map to box off a door, wall, or any area equipment should avoid"
          >
            <Ban className="h-3.5 w-3.5" /> {zoneMode ? "Marking off-limits…" : "Mark off-limits"}
          </button>
          {zones.length > 0 ? (
            <button
              onClick={() => setZones([])}
              className="flex items-center gap-1.5 text-sm text-ink-3 transition-colors hover:text-ink"
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear areas ({zones.length})
            </button>
          ) : null}
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
        {zoneMode ? (
          <p className="mt-3 text-sm font-bold text-accent">
            Drag on the map to box off doors or areas to keep clear — Auto-arrange avoids them.
          </p>
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

        <div className="mt-6">
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
            {/* Sims-style 3D view — swaps in for the 2D map. The map stays
                mounted (hidden) so its resize observer and drop/paste
                handlers survive the round trip. One relative wrapper holds
                both views so the product card overlays whichever is active. */}
            <div className="relative">
            {view3d ? (
              <Planner3D
                placed={placed}
                roomW={roomW}
                roomD={roomD}
                grid={wallGrid}
                selectedUid={selectedUid}
                onSelect={setSelectedUid}
                cardSlot={
                  selectedItem ? (
                    <EquipCard item={selectedItem} onClose={() => setSelectedUid(null)} floating />
                  ) : null
                }
              />
            ) : null}

            {/* The map */}
            <div
              ref={boxRef}
              onPointerDown={onMapPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              className={`relative w-full touch-none overflow-hidden rounded-2xl border bg-card transition-colors ${
                dropActive ? "border-accent" : "border-line"
              } ${zoneMode ? "cursor-crosshair" : ""} ${view3d ? "hidden" : ""}`}
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

              {/* User-marked off-limits areas — doors, walls, side rooms. The
                  fill is pointer-events-none so pieces stay draggable and a new
                  area can be drawn straight over an existing one; only the
                  delete handle catches clicks. */}
              {zones.map((z) => (
                <div
                  key={z.id}
                  className="pointer-events-none absolute rounded-md border-2 border-dashed border-accent/70"
                  style={{
                    left: z.x * scale,
                    top: z.y * scale,
                    width: z.w * scale,
                    height: z.d * scale,
                    backgroundImage:
                      "repeating-linear-gradient(45deg, rgba(240,83,30,0.20) 0 6px, transparent 6px 13px)",
                  }}
                >
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => setZones((v) => v.filter((q) => q.id !== z.id))}
                    className="pointer-events-auto absolute right-0.5 top-0.5 z-10 rounded-full border border-line bg-navy/95 p-0.5 text-white/80 shadow-md transition-colors hover:text-red-400"
                    aria-label="Remove off-limits area"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {zoneRect ? (
                <div
                  className="pointer-events-none absolute rounded-md border-2 border-dashed border-accent bg-accent/15"
                  style={{
                    left: zoneRect.x * scale,
                    top: zoneRect.y * scale,
                    width: zoneRect.w * scale,
                    height: zoneRect.d * scale,
                  }}
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
                const fc = familyColor(p.category); // same hue as the 3D model
                const isSel = selectedUid === p.uid;
                return (
                  <div
                    key={p.uid}
                    onPointerDown={(ev) => onPointerDown(ev, p)}
                    className={`gg-pop-in group absolute select-none ${
                      zoneMode ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing"
                    }`}
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
                      className={`relative flex h-full w-full flex-col items-center justify-center gap-0.5 overflow-hidden rounded-md border px-1 text-center transition-shadow duration-150 ${
                        bad ? "border-red-500 bg-red-500/30" : "bg-navy/85"
                      } ${!bad ? "group-hover:shadow-[0_0_18px_var(--fc),0_0_36px_var(--fc-soft)]" : ""}`}
                      style={
                        bad
                          ? { color: "#fca5a5" }
                          : ({
                              "--fc": `${fc}cc`,
                              "--fc-soft": `${fc}55`,
                              /* selected = brand orange, like the home cards */
                              borderColor: isSel ? "#f0531e" : `${fc}c0`,
                              boxShadow: isSel
                                ? "0 0 20px #f0531edd, 0 0 44px #f0531e66"
                                : `0 0 10px ${fc}59`,
                              color: fc,
                            } as CSSProperties)
                      }
                    >
                      <EquipmentIcon
                        id={p.id}
                        category={p.category}
                        className="block h-4 w-4 shrink-0 [&>svg]:h-full [&>svg]:w-full"
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

            {/* Product info card — top-right of the 2D map (the 3D view
                anchors its own floating card beside the piece) */}
            {selectedItem && !view3d ? (
              <EquipCard item={selectedItem} onClose={() => setSelectedUid(null)} />
            ) : null}
            </div>
            {density > 0.35 ? (
              <p className="mt-2 text-xs font-bold text-accent">
                Dense — aim under 35% floor used so the room can breathe.
              </p>
            ) : null}

            {/* Palette */}
            <div className="mt-5 rounded-2xl border border-line bg-card p-4">
              <h2 className="font-display text-sm font-bold text-ink">Your equipment</h2>
              <p className="mt-0.5 text-xs text-ink-3">Click to drop on the map · hover a placed piece to rotate or remove.</p>
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
                      className="block h-4 w-4 shrink-0 [&>svg]:h-full [&>svg]:w-full"
                      style={{ color: familyColor(i.category) }}
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
