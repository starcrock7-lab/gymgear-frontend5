/* Floor-plan visualizer domain: approximate equipment footprints (inches),
   per-category safety clearances (research-backed), and the sessionStorage
   handoff that lets the kit result / gym plan send its equipment list to
   /planner. Footprints are published product dimensions rounded to the inch —
   good enough for layout planning, not for millimetre CAD. */

export type FloorItem = {
  id: string;
  name: string;
  brand: string;
  category: string;
  qty: number;
  w: number; // footprint width, inches
  d: number; // footprint depth, inches
};

export type PlacedItem = {
  uid: string;
  id: string;
  name: string;
  category: string;
  w: number;
  d: number;
  x: number; // inches from room's left edge
  y: number; // inches from room's top edge
  rot: boolean; // rotated 90° (w/d swapped at render time)
};

/* A user-drawn off-limits rectangle (inches from the room's top-left): a
   door, a wall, a side room, a walkway — any area equipment must avoid.
   Auto-arrange treats these as blocked floor and a piece dragged into one is
   flagged, so the user picks exactly which floor is usable. */
export type Zone = { id: string; x: number; y: number; w: number; d: number };

/* A crop rectangle over the uploaded floor image, as fractions (0–1) of the
   image — so it survives the image being displayed at any size. Lets the user
   pick the one room out of a larger plan and scale just that section. */
export type Crop = { cx: number; cy: number; cw: number; ch: number };
export const FULL_CROP: Crop = { cx: 0, cy: 0, cw: 1, ch: 1 };

/* CSS background-size / background-position that show only `crop` filling a
   container (standard percentage-positioning math; guards the cw/ch=1 case). */
export function cropBackground(url: string, c: Crop) {
  const posX = c.cw < 1 ? (c.cx / (1 - c.cw)) * 100 : 0;
  const posY = c.ch < 1 ? (c.cy / (1 - c.ch)) * 100 : 0;
  return {
    backgroundImage: `url(${url})`,
    backgroundSize: `${100 / c.cw}% ${100 / c.ch}%`,
    backgroundPosition: `${posX}% ${posY}%`,
    backgroundRepeat: "no-repeat" as const,
  };
}

/* Known footprints (W × D inches). Anything not listed falls back to its
   category default below. */
export const FOOTPRINTS: Record<string, { w: number; d: number }> = {
  // racks & stands
  "rogue-rm6": { w: 76, d: 53 },
  "rogue-r3": { w: 48, d: 53 },
  "rogue-rml390f": { w: 49, d: 53 },
  "rep-pr5000": { w: 48, d: 48 },
  "rep-pr4000": { w: 48, d: 41 },
  "titan-x3": { w: 48, d: 48 },
  "rep-hr100": { w: 42, d: 48 },
  "bells-squat": { w: 48, d: 48 },
  "rogue-squat": { w: 48, d: 48 },
  "titan-t2": { w: 44, d: 48 },
  "rogue-sml2": { w: 49, d: 48 },
  "prx-profile-pro": { w: 47, d: 50 },
  // machines & functional
  "rep-arcadia": { w: 55, d: 36 },
  "force-usa-g3": { w: 78, d: 61 },
  "force-usa-g6": { w: 72, d: 64 },
  "force-usa-g20": { w: 80, d: 65 },
  "bells-ft": { w: 48, d: 36 },
  "bells-cable-tower": { w: 30, d: 30 },
  "titan-ft": { w: 61, d: 53 },
  "lifefitness-g7": { w: 60, d: 54 },
  "bodysolid-exm2500": { w: 83, d: 51 },
  "bowflex-x2se": { w: 53, d: 49 },
  "marcy-mwm990": { w: 68, d: 42 },
  "tonal-2": { w: 24, d: 12 },
  "hs-iso-row": { w: 60, d: 48 },
  "hs-leg-press": { w: 95, d: 65 },
  "bodysolid-slp500": { w: 89, d: 68 },
  "rogue-ghd": { w: 70, d: 40 },
  // cardio
  "concept2-rower": { w: 96, d: 24 },
  "assault-bike": { w: 51, d: 24 },
  "concept2-ski": { w: 50, d: 32 },
  "rogue-echo-bike": { w: 59, d: 30 },
  "nordictrack-1750": { w: 80, d: 38 },
  "peloton-bike": { w: 59, d: 24 },
  "assault-runner": { w: 70, d: 33 },
  "hydrow-wave": { w: 80, d: 25 },
  "concept2-bikeerg": { w: 48, d: 24 },
  "schwinn-ic4": { w: 48, d: 22 },
  "sunny-rower": { w: 78, d: 20 },
  "lifefitness-t3": { w: 79, d: 37 },
  "lf-club-treadmill": { w: 80, d: 39 },
  "lf-club-elliptical": { w: 84, d: 32 },
  "waterrower-oak": { w: 84, d: 22 },
};

/* Everything that physically sits on the gym floor gets placed on the map.
   The big five are the training stations; the rest is the free-weight and
   mobility gear that makes a real room look like a real room instead of
   three machines in an empty box. */
export const PLACEABLE_CATS = new Set([
  "racks", "machines", "cardio", "benches", "dumbbells",
  "barbells", "plates", "kettlebells", "bands",
  "yogamats", "foamrollers", "jumpropes", "flooring",
]);

/* Small accessories nobody leaves on the floor — they get staged on a single
   storage shelf instead of littering the room one product at a time. */
export const SHELF_CATS = new Set([
  "chalk", "belts", "sleeves", "straps", "wraps", "gymbags",
  "protein", "creatine", "preworkout", "recovery", "vitamins",
]);

/* Synthetic piece standing in for the whole accessory pile. */
export const STORAGE_ID = "kit-storage";
export const STORAGE_CAT = "storage";

export const CATEGORY_DEFAULT: Record<string, { w: number; d: number }> = {
  racks: { w: 48, d: 48 },
  machines: { w: 60, d: 48 },
  cardio: { w: 72, d: 30 },
  benches: { w: 50, d: 26 },
  dumbbells: { w: 60, d: 24 }, // a set on a rack/stand
  barbells: { w: 86, d: 12 }, // 7 ft bar in a floor cradle
  plates: { w: 26, d: 26 }, // loaded plate tree
  kettlebells: { w: 40, d: 14 }, // a graduated row on the floor
  bands: { w: 24, d: 16 }, // band stand
  yogamats: { w: 68, d: 24 }, // rolled out
  foamrollers: { w: 36, d: 8 },
  jumpropes: { w: 14, d: 14 }, // coiled
  flooring: { w: 96, d: 48 }, // a tiled platform area
  [STORAGE_CAT]: { w: 48, d: 18 }, // shelving unit
};

/* Safety halo per category (inches on every side). Kept intentionally small
   so pieces can sit close together while planning — it's a nudge, not the
   full regulation buffer. The advice panel carries the real numbers (36"
   walkways, 6 ft treadmill fall zones, 3–4 ft rack fronts). */
export const CLEARANCE_IN: Record<string, number> = {
  cardio: 8,
  racks: 8,
  machines: 6,
  benches: 5,
  dumbbells: 5,
  barbells: 6, // room to load a plate on either end
  plates: 4,
  kettlebells: 4,
  bands: 3,
  yogamats: 3,
  foamrollers: 2,
  jumpropes: 2,
  flooring: 0, // a surface, not an obstacle
  [STORAGE_CAT]: 3,
};
export const DEFAULT_CLEARANCE = 4;

export const footprintOf = (id: string, category: string) =>
  FOOTPRINTS[id] || CATEGORY_DEFAULT[category] || { w: 48, d: 36 };

export const clearanceOf = (category: string) =>
  CLEARANCE_IN[category] ?? DEFAULT_CLEARANCE;

/* One product list → the pieces that belong in the room. Floor gear maps
   1:1; every shelf accessory in the kit collapses into a single storage unit
   so the room shows the whole kit without a protein tub on the floor. Used by
   the kit result, the gym plan and the planner so all three agree. */
type PlaceableSource = {
  id: string;
  name: string;
  brand?: string;
  category: string;
  qty?: number;
};

export function toFloorItems(products: PlaceableSource[]): FloorItem[] {
  const out: FloorItem[] = [];
  for (const p of products) {
    if (!PLACEABLE_CATS.has(p.category) || (p.qty ?? 1) < 1) continue;
    const { w, d } = footprintOf(p.id, p.category);
    out.push({
      id: p.id,
      name: p.name,
      brand: p.brand ?? "",
      category: p.category,
      qty: p.qty ?? 1,
      w,
      d,
    });
  }
  const shelved = products.filter(
    (p) => SHELF_CATS.has(p.category) && (p.qty ?? 1) >= 1,
  );
  if (shelved.length) {
    const { w, d } = CATEGORY_DEFAULT[STORAGE_CAT];
    out.push({
      id: STORAGE_ID,
      name: "Storage & accessories",
      brand: `${shelved.length} item${shelved.length > 1 ? "s" : ""}`,
      category: STORAGE_CAT,
      qty: 1,
      w,
      d,
    });
  }
  return out;
}

/* Research-backed layout advice rendered next to the map. */
export const LAYOUT_ADVICE: { title: string; body: string }[] = [
  { title: "Walkways", body: "Keep every main walkway at least 3 ft wide (36\") — it's the accessibility and safety standard, and it's what stops plates being carried through someone's set." },
  { title: "Treadmill fall zone", body: "Leave 6 ft of clear floor BEHIND any treadmill-class machine and ~20\" on each side. It's the most common gym-liability miss." },
  { title: "Rack fronts", body: "Racks need 3–4 ft of clear floor in front for the barbell path, and bars on adjacent racks should stay 3 ft apart. Put rack backs against a wall." },
  { title: "Benches & dumbbells", body: "Keep 3 ft between the dumbbell rack and the bench line, so people aren't lifting where others pick up weights." },
  { title: "Dwell zones", body: "A machine's footprint isn't its real size — add 20–30% for the person using it. If the map feels tight, it will feel tighter in person." },
  { title: "Density", body: "Plan roughly 25–35 sq ft of training floor per person at peak. Less than that and the room fights itself." },
  { title: "Worth adding", body: "Mirrors along the strength wall, fans or airflow at the cardio row, a chalk station away from walkways, wipe-down stations every ~1,000 sq ft, and storage for every loose item you buy — clutter is the fastest way to lose usable floor." },
];

/* --- Handoff (sessionStorage) ------------------------------------------ */

const ITEMS_KEY = "gymgear.floor.v1";
const LAYOUT_KEY = "gymgear.floor.layout.v1";

export function saveFloorItems(items: FloorItem[], room?: { w: number; d: number }): void {
  try {
    sessionStorage.setItem(ITEMS_KEY, JSON.stringify({ items, room, savedAt: Date.now() }));
  } catch { /* private mode — planner will just start empty */ }
}

/* Suggested room size handed off with the items (the gym plan sizes it to
   the facility area). Only a hint — a saved layout's own dims still win. */
export function loadFloorRoom(): { w: number; d: number } | null {
  try {
    const raw = sessionStorage.getItem(ITEMS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { room?: { w: number; d: number } };
    return parsed.room && typeof parsed.room.w === "number" ? parsed.room : null;
  } catch {
    return null;
  }
}

export function loadFloorItems(): FloorItem[] {
  try {
    const raw = sessionStorage.getItem(ITEMS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { items?: FloorItem[] };
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

export type SavedLayout = { placed: PlacedItem[]; roomW?: number; roomD?: number; zones?: Zone[] };

export function saveLayout(placed: PlacedItem[], roomW?: number, roomD?: number, zones?: Zone[]): void {
  try {
    sessionStorage.setItem(
      LAYOUT_KEY,
      JSON.stringify({ placed, roomW, roomD, zones, savedAt: Date.now() }),
    );
  } catch { /* ignore */ }
}

export function loadLayout(): SavedLayout {
  try {
    const raw = sessionStorage.getItem(LAYOUT_KEY);
    if (!raw) return { placed: [], zones: [] };
    const parsed = JSON.parse(raw) as { placed?: PlacedItem[]; roomW?: number; roomD?: number; zones?: Zone[] };
    return {
      placed: Array.isArray(parsed.placed) ? parsed.placed : [],
      roomW: typeof parsed.roomW === "number" ? parsed.roomW : undefined,
      roomD: typeof parsed.roomD === "number" ? parsed.roomD : undefined,
      zones: Array.isArray(parsed.zones) ? parsed.zones : [],
    };
  } catch {
    return { placed: [], zones: [] };
  }
}

/* Where the visualizer was opened from, so /planner can offer a real "back"
   to the plan/kit the equipment came from. */
const ORIGIN_KEY = "gymgear.floor.origin.v1";

export function saveFloorOrigin(path: string): void {
  try {
    sessionStorage.setItem(ORIGIN_KEY, path);
  } catch {
    /* ignore */
  }
}

export function loadFloorOrigin(): string | null {
  try {
    return sessionStorage.getItem(ORIGIN_KEY);
  } catch {
    return null;
  }
}
