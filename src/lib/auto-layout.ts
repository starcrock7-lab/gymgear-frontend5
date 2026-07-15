/* Auto-layout engine for the floor-plan visualizer. Two halves:

   1. detectWalls() — reads the uploaded schematic on a canvas (client-side
      only; the image never leaves the browser), finds the drawn wall lines
      (Otsu-thresholded ink, dilated one cell), and keeps as usable floor
      only the open region connected to the room's centre. Photos and
      too-dense drawings fall back to "room borders are the walls".

   2. autoPlace() — packs the equipment list into the usable floor the way
      a gym is actually laid out: cardio in a row along the longest wall
      with its fall zone kept clear, racks backed against the opposite
      wall, dumbbells along a third wall with benches facing them, machines
      filling remaining wall space then interior rows with walkway aisles.
      Grid-based greedy packing — deterministic, dependency-free, fast.

   All coordinates are real-world inches (same convention as floor-plan.ts);
   the grid is only an internal acceleration structure. */

import type { Crop, FloorItem, PlacedItem } from "./floor-plan";

export type WallGrid = {
  cols: number;
  rows: number;
  cell: number; // inches per grid cell
  blocked: Uint8Array; // 1 = wall / outside the room, 0 = usable floor
  detected: boolean; // true when walls came from an image (vs borders only)
  rooms: number; // distinct rooms found (1 when undivided / borders-only)
};

export type AutoResult = {
  placed: PlacedItem[];
  unplacedCount: number;
  total: number;
};

/* ── Grid construction ──────────────────────────────────────────────── */

function cellSizeFor(roomWIn: number, roomDIn: number): number {
  // Keep the grid under ~50k cells so every scan stays instant.
  let cell = 3;
  while ((roomWIn / cell) * (roomDIn / cell) > 50000) cell += 1;
  return cell;
}

export function emptyGrid(roomWIn: number, roomDIn: number): WallGrid {
  const cell = cellSizeFor(roomWIn, roomDIn);
  const cols = Math.max(4, Math.floor(roomWIn / cell));
  const rows = Math.max(4, Math.floor(roomDIn / cell));
  return { cols, rows, cell, blocked: new Uint8Array(cols * rows), detected: false, rooms: 1 };
}

/* Otsu's method: threshold that best splits a luminance histogram. */
function otsu(hist: Uint32Array, total: number): number {
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0,
    wB = 0,
    best = 0,
    thr = 127;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > best) {
      best = between;
      thr = t;
    }
  }
  return thr;
}

/* Open cell nearest the grid centre — the flood-fill seed. */
function nearestOpen(blocked: Uint8Array, cols: number, rows: number): number {
  const cx = (cols - 1) / 2,
    cy = (rows - 1) / 2;
  let bestIdx = -1,
    bestD = Infinity;
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      if (blocked[i]) continue;
      const d = (x - cx) * (x - cx) + (y - cy) * (y - cy);
      if (d < bestD) {
        bestD = d;
        bestIdx = i;
      }
    }
  return bestIdx;
}

function floodFill(blocked: Uint8Array, cols: number, rows: number, seed: number): Uint8Array {
  const seen = new Uint8Array(cols * rows);
  const queue = new Int32Array(cols * rows);
  let head = 0,
    tail = 0;
  queue[tail++] = seed;
  seen[seed] = 1;
  const push = (j: number) => {
    if (!seen[j] && !blocked[j]) {
      seen[j] = 1;
      queue[tail++] = j;
    }
  };
  while (head < tail) {
    const i = queue[head++];
    const x = i % cols;
    const y = (i / cols) | 0;
    if (x > 0) push(i - 1);
    if (x < cols - 1) push(i + 1);
    if (y > 0) push(i - cols);
    if (y < rows - 1) push(i + cols);
  }
  return seen;
}

/* ── Wall detection from the uploaded image ─────────────────────────── */

export async function detectWalls(
  imgUrl: string,
  crop: Crop,
  roomWIn: number,
  roomDIn: number,
): Promise<WallGrid> {
  const grid = emptyGrid(roomWIn, roomDIn);
  const img = new Image();
  img.src = imgUrl;
  await img.decode();

  const sx = crop.cx * img.naturalWidth;
  const sy = crop.cy * img.naturalHeight;
  const sw = Math.max(1, crop.cw * img.naturalWidth);
  const sh = Math.max(1, crop.ch * img.naturalHeight);

  const canvas = document.createElement("canvas");
  canvas.width = grid.cols;
  canvas.height = grid.rows;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return grid;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, grid.cols, grid.rows);
  const data = ctx.getImageData(0, 0, grid.cols, grid.rows).data;

  const n = grid.cols * grid.rows;
  const lum = new Float32Array(n);
  const hist = new Uint32Array(256);
  for (let i = 0; i < n; i++) {
    const a = data[i * 4 + 3] / 255;
    // Transparent pixels read as white paper.
    const l =
      (0.2126 * data[i * 4] + 0.7152 * data[i * 4 + 1] + 0.0722 * data[i * 4 + 2]) * a +
      255 * (1 - a);
    lum[i] = l;
    hist[Math.min(255, Math.round(l))]++;
  }

  const thr = otsu(hist, n);
  let dark = 0;
  for (let i = 0; i < n; i++) if (lum[i] < thr) dark++;
  const inkIsDark = dark <= n / 2; // ink = the minority side of the split
  const inkFrac = (inkIsDark ? dark : n - dark) / n;

  /* A schematic is thin ink lines on paper. If "ink" covers a third of the
     frame this is probably a photo — wall detection would be noise, so keep
     the room borders as the only walls. Near-zero ink means a blank image. */
  if (inkFrac > 0.33 || inkFrac < 0.002) return grid;

  const ink = new Uint8Array(n);
  for (let i = 0; i < n; i++) ink[i] = (inkIsDark ? lum[i] < thr : lum[i] >= thr) ? 1 : 0;

  /* Dilate ink one cell: closes pinholes in hand-drawn lines and stops
     equipment hugging a wall line pixel-perfectly. */
  const blocked = new Uint8Array(n);
  const { cols, rows } = grid;
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      if (!ink[y * cols + x]) continue;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx,
            ny = y + dy;
          if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) blocked[ny * cols + nx] = 1;
        }
    }

  /* Usable floor = the open region connected to the room's centre (the crop
     step asks the user to frame their room). Everything else — beyond the
     outer walls, inside drawn fixtures, label text — is off-limits. */
  const seed = nearestOpen(blocked, cols, rows);
  if (seed < 0) return grid;
  const interior = floodFill(blocked, cols, rows, seed);
  let open = 0;
  for (let i = 0; i < n; i++) if (interior[i]) open++;
  // If the "room" we found is a sliver, the drawing was too dense to trust.
  if (open < n * 0.2) return grid;

  /* The flood fill leaks through door openings, so a bathroom or office
     connected by a door would count as usable floor. Read the rooms
     geometrically and keep equipment on the main training floor only. */
  const { mask, rooms } = mainRoom(interior, cols, rows, grid.cell);

  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++) out[i] = mask[i] ? 0 : 1;
  return { ...grid, blocked: out, detected: true, rooms };
}

/* Split the open space into rooms and keep the biggest one — in full.
   Eroding the open space by ~27" severs the link through any standard door
   opening (≤ ~4.5 ft wide), leaving one core blob per room; the largest core
   is the training floor. Every open cell is then handed to its NEAREST core,
   so the main floor comes back whole — L-shapes, wrap-around corridors and
   thin arms included — while side rooms (office, store, toilet) keep their
   own core and stay off-limits. A doorway simply splits at the midline
   between the two rooms it joins. */
function mainRoom(
  interior: Uint8Array,
  cols: number,
  rows: number,
  cell: number,
): { mask: Uint8Array; rooms: number } {
  const n = cols * rows;
  const T = Math.max(2, Math.round(27 / cell));
  const queue = new Int32Array(n);
  let head = 0,
    tail = 0;

  /* BFS steps from the nearest non-open cell (walls & outside). */
  const dist = new Int32Array(n).fill(-1);
  for (let i = 0; i < n; i++)
    if (!interior[i]) {
      dist[i] = 0;
      queue[tail++] = i;
    }
  const step = (j: number, d: number) => {
    if (dist[j] === -1 && interior[j]) {
      dist[j] = d;
      queue[tail++] = j;
    }
  };
  while (head < tail) {
    const i = queue[head++];
    const d = dist[i] + 1;
    const x = i % cols,
      y = (i / cols) | 0;
    if (x > 0) step(i - 1, d);
    if (x < cols - 1) step(i + 1, d);
    if (y > 0) step(i - cols, d);
    if (y < rows - 1) step(i + cols, d);
  }

  /* Label the eroded cores (cells deeper than T from any wall). */
  const label = new Int32Array(n);
  let rooms = 0,
    bestLabel = 0,
    bestSize = 0;
  for (let s = 0; s < n; s++) {
    if (dist[s] <= T || label[s] !== 0) continue;
    rooms++;
    let size = 0;
    head = 0;
    tail = 0;
    queue[tail++] = s;
    label[s] = rooms;
    while (head < tail) {
      const i = queue[head++];
      size++;
      const x = i % cols,
        y = (i / cols) | 0;
      const grow = (j: number) => {
        if (label[j] === 0 && dist[j] > T) {
          label[j] = rooms;
          queue[tail++] = j;
        }
      };
      if (x > 0) grow(i - 1);
      if (x < cols - 1) grow(i + 1);
      if (y > 0) grow(i - cols);
      if (y < rows - 1) grow(i + cols);
    }
    if (size > bestSize) {
      bestSize = size;
      bestLabel = rooms;
    }
  }

  /* No core at all (tiny or odd drawing): keep the whole open region. */
  if (rooms === 0) return { mask: Uint8Array.from(interior), rooms: 1 };

  /* Hand every open cell to its nearest core (multi-source BFS from all
     cores at once). This recovers each room in full instead of a fixed band
     around its core, so the training floor is never truncated at a corridor
     or an L-bend; coreless nooks (a toilet, a closet) fall to whichever
     room's core reaches them first — through their own door. */
  const owner = new Int32Array(n);
  head = 0;
  tail = 0;
  for (let i = 0; i < n; i++)
    if (label[i] !== 0) {
      owner[i] = label[i];
      queue[tail++] = i;
    }
  const claim = (j: number, o: number) => {
    if (owner[j] === 0 && interior[j]) {
      owner[j] = o;
      queue[tail++] = j;
    }
  };
  while (head < tail) {
    const i = queue[head++];
    const o = owner[i];
    const x = i % cols,
      y = (i / cols) | 0;
    if (x > 0) claim(i - 1, o);
    if (x < cols - 1) claim(i + 1, o);
    if (y > 0) claim(i - cols, o);
    if (y < rows - 1) claim(i + cols, o);
  }

  const mask = new Uint8Array(n);
  for (let i = 0; i < n; i++) if (owner[i] === bestLabel) mask[i] = 1;
  return { mask, rooms };
}

/* Tiny data-URL image of the blocked mask, for the "detected walls" overlay. */
export function wallsDataUrl(grid: WallGrid): string | null {
  if (!grid.detected) return null;
  const canvas = document.createElement("canvas");
  canvas.width = grid.cols;
  canvas.height = grid.rows;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const im = ctx.createImageData(grid.cols, grid.rows);
  for (let i = 0; i < grid.blocked.length; i++) {
    if (!grid.blocked[i]) continue;
    im.data[i * 4] = 240; // brand orange, translucent
    im.data[i * 4 + 1] = 83;
    im.data[i * 4 + 2] = 30;
    im.data[i * 4 + 3] = 70;
  }
  ctx.putImageData(im, 0, 0);
  return canvas.toDataURL();
}

/* ── Placement ──────────────────────────────────────────────────────── */

type Unit = { id: string; name: string; category: string; w: number; d: number };
type Side = "N" | "S" | "E" | "W";
type Placement = { x: number; y: number; wC: number; dC: number; rot: boolean; side: Side | null };

/* Spacing between row neighbours (inches) — strategic, not just legal. */
const GAP_IN: Record<string, number> = {
  cardio: 20, // shoulder room between ergs/treadmills
  racks: 36, // bar-to-bar separation
  machines: 24,
  dumbbells: 12,
  benches: 30,
};
/* Keep-clear strip on a piece's open side (inches): fall zones & bar paths. */
const FRONT_IN: Record<string, number> = {
  cardio: 72, // 6 ft treadmill-class fall zone
  racks: 48, // barbell path in front of the rack
  machines: 30,
  dumbbells: 36, // pickup zone in front of the rack
  benches: 24,
};
const DEFAULT_GAP = 24;
const DEFAULT_FRONT = 24;
const AISLE_IN = 36; // walkway between interior rows

const uidOf = () => Math.random().toString(36).slice(2, 9);

export function autoPlace(
  items: FloorItem[],
  roomWIn: number,
  roomDIn: number,
  grid: WallGrid,
): AutoResult {
  const { cols, rows, cell } = grid;
  /* occ: 0 free · 1 wall/outside · 2 equipment · 3 keep-clear zone */
  const occ = Uint8Array.from(grid.blocked);
  const toC = (inches: number) => Math.max(1, Math.round(inches / cell));
  const idx = (x: number, y: number) => y * cols + x;

  /* Interior bounding box (of usable floor) — the walls we anchor rows to. */
  let bx0 = cols,
    by0 = rows,
    bx1 = -1,
    by1 = -1;
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++)
      if (!occ[idx(x, y)]) {
        if (x < bx0) bx0 = x;
        if (x > bx1) bx1 = x;
        if (y < by0) by0 = y;
        if (y > by1) by1 = y;
      }
  const totalUnits = items.reduce((s, i) => s + i.qty, 0);
  if (bx1 < 0) return { placed: [], unplacedCount: totalUnits, total: totalUnits };

  const blockedAt = (x: number, y: number) =>
    x < 0 || x >= cols || y < 0 || y >= rows || occ[idx(x, y)] === 1;

  /* Footprint must be fully free; a PAD ring around it must hold no other
     equipment (walls in the ring are fine — that's what "against the wall"
     means; keep-clear zones may touch). 17" beats the worst-case sum of two
     display halos (8"+8"), so an auto-arranged floor never renders red. */
  const PAD_C = Math.max(1, Math.ceil(17 / cell));
  function canPlace(x: number, y: number, wC: number, dC: number): boolean {
    if (x < 0 || y < 0 || x + wC > cols || y + dC > rows) return false;
    for (let yy = y; yy < y + dC; yy++)
      for (let xx = x; xx < x + wC; xx++) if (occ[idx(xx, yy)] !== 0) return false;
    for (let yy = y - PAD_C; yy < y + dC + PAD_C; yy++)
      for (let xx = x - PAD_C; xx < x + wC + PAD_C; xx++) {
        if (xx >= x && xx < x + wC && yy >= y && yy < y + dC) continue;
        if (xx < 0 || xx >= cols || yy < 0 || yy >= rows) continue;
        if (occ[idx(xx, yy)] === 2) return false;
      }
    return true;
  }

  function fill(x: number, y: number, wC: number, dC: number, val: 2 | 3) {
    for (let yy = Math.max(0, y); yy < Math.min(rows, y + dC); yy++)
      for (let xx = Math.max(0, x); xx < Math.min(cols, x + wC); xx++) {
        const i = idx(xx, yy);
        if (occ[i] === 0) occ[i] = val;
        else if (val === 2 && occ[i] === 3) occ[i] = 2;
      }
  }

  /* Reserve the keep-clear strip on a piece's open side. */
  function reserveFront(p: Placement, category: string) {
    const f = toC(FRONT_IN[category] ?? DEFAULT_FRONT);
    if (p.side === "N" || p.side === null) fill(p.x, p.y + p.dC, p.wC, f, 3);
    else if (p.side === "S") fill(p.x, p.y - f, p.wC, f, 3);
    else if (p.side === "W") fill(p.x + p.wC, p.y, f, p.dC, 3);
    else if (p.side === "E") fill(p.x - f, p.y, f, p.dC, 3);
  }

  /* Orientation: racks/dumbbells/machines run their long side along the
     wall; cardio and benches point their long side into the room. */
  function orient(u: Unit, side: Side | null): { wC: number; dC: number; rot: boolean } {
    const longAlongWall = !(u.category === "cardio" || u.category === "benches");
    const wallHorizontal = side === "N" || side === "S" || side === null;
    const wantWide = wallHorizontal ? longAlongWall : !longAlongWall;
    const isWide = u.w >= u.d;
    const rot = wantWide ? !isWide : isWide;
    const w = rot ? u.d : u.w;
    const d = rot ? u.w : u.d;
    return { wC: toC(w), dC: toC(d), rot };
  }

  /* Is the strip just beyond the piece's wall side actually wall? */
  function anchored(side: Side, x: number, y: number, wC: number, dC: number): boolean {
    let hits = 0,
      len = 0;
    if (side === "N" || side === "S") {
      const yy = side === "N" ? y - 1 : y + dC;
      len = wC;
      for (let xx = x; xx < x + wC; xx++) if (blockedAt(xx, yy)) hits++;
    } else {
      const xx = side === "W" ? x - 1 : x + wC;
      len = dC;
      for (let yy = y; yy < y + dC; yy++) if (blockedAt(xx, yy)) hits++;
    }
    return hits >= Math.max(1, Math.ceil(len * 0.6));
  }

  const placements: (Placement & { u: Unit })[] = [];

  function commit(u: Unit, p: Placement) {
    fill(p.x, p.y, p.wC, p.dC, 2);
    reserveFront(p, u.category);
    placements.push({ ...p, u });
  }

  /* Place a batch of units in rows hugging one wall side. Returns leftovers. */
  function placeAlongSide(units: Unit[], side: Side): Unit[] {
    const left: Unit[] = [];
    let qi = 0;
    const gapOf = (u: Unit) => toC(GAP_IN[u.category] ?? DEFAULT_GAP);

    if (side === "N" || side === "S") {
      const ys =
        side === "N"
          ? Array.from({ length: by1 - by0 + 1 }, (_, k) => by0 + k)
          : Array.from({ length: by1 - by0 + 1 }, (_, k) => by1 - k);
      for (const y of ys) {
        if (qi >= units.length) break;
        let x = bx0;
        while (x <= bx1 && qi < units.length) {
          const u = units[qi];
          const o = orient(u, side);
          const py = side === "N" ? y : y - o.dC + 1;
          if (
            py >= 0 &&
            py + o.dC <= rows &&
            anchored(side, x, py, o.wC, o.dC) &&
            canPlace(x, py, o.wC, o.dC)
          ) {
            commit(u, { x, y: py, wC: o.wC, dC: o.dC, rot: o.rot, side });
            x += o.wC + gapOf(u);
            qi++;
          } else x++;
        }
      }
    } else {
      const xs =
        side === "W"
          ? Array.from({ length: bx1 - bx0 + 1 }, (_, k) => bx0 + k)
          : Array.from({ length: bx1 - bx0 + 1 }, (_, k) => bx1 - k);
      for (const x of xs) {
        if (qi >= units.length) break;
        let y = by0;
        while (y <= by1 && qi < units.length) {
          const u = units[qi];
          const o = orient(u, side);
          const px = side === "W" ? x : x - o.wC + 1;
          if (
            px >= 0 &&
            px + o.wC <= cols &&
            anchored(side, px, y, o.wC, o.dC) &&
            canPlace(px, y, o.wC, o.dC)
          ) {
            commit(u, { x: px, y, wC: o.wC, dC: o.dC, rot: o.rot, side });
            y += o.dC + gapOf(u);
            qi++;
          } else y++;
        }
      }
    }
    for (; qi < units.length; qi++) left.push(units[qi]);
    return left;
  }

  /* Benches face the dumbbell line across its pickup zone. */
  function placeFacing(units: Unit[], refs: (Placement & { u: Unit })[]): Unit[] {
    const left: Unit[] = [];
    for (const u of units) {
      let done = false;
      for (const r of refs) {
        const gap = toC(FRONT_IN.dumbbells);
        const o = orient(u, r.side);
        let x = r.x,
          y = r.y;
        if (r.side === "N" || r.side === null) y = r.y + r.dC + gap;
        else if (r.side === "S") y = r.y - gap - o.dC;
        else if (r.side === "W") x = r.x + r.wC + gap;
        else if (r.side === "E") x = r.x - gap - o.wC;
        /* Slide along the rack line looking for a clear face-off spot. */
        for (let s = 0; s < 6 && !done; s++) {
          const sx = r.side === "N" || r.side === "S" || r.side === null ? x + s * (o.wC + 1) : x;
          const sy = r.side === "E" || r.side === "W" ? y + s * (o.dC + 1) : y;
          if (canPlace(sx, sy, o.wC, o.dC)) {
            commit(u, { x: sx, y: sy, wC: o.wC, dC: o.dC, rot: o.rot, side: r.side });
            done = true;
          }
        }
        if (done) break;
      }
      if (!done) left.push(u);
    }
    return left;
  }

  /* Interior rows (machines overflow): sweep top→bottom, walkway between rows. */
  function placeOpenRows(units: Unit[]): Unit[] {
    const left: Unit[] = [];
    let qi = 0;
    let y = by0;
    while (y <= by1 && qi < units.length) {
      let x = bx0;
      let rowDepth = 0;
      while (x <= bx1 && qi < units.length) {
        const u = units[qi];
        const o = orient(u, null);
        if (canPlace(x, y, o.wC, o.dC)) {
          commit(u, { x, y, wC: o.wC, dC: o.dC, rot: o.rot, side: null });
          rowDepth = Math.max(rowDepth, o.dC);
          x += o.wC + toC(GAP_IN[u.category] ?? DEFAULT_GAP);
          qi++;
        } else x++;
      }
      y += rowDepth > 0 ? rowDepth + toC(AISLE_IN) : 1;
    }
    for (; qi < units.length; qi++) left.push(units[qi]);
    return left;
  }

  /* Last resort: first spot that legally fits, anywhere. */
  function placeAnywhere(u: Unit): boolean {
    for (const rot of [false, true]) {
      const wC = toC(rot ? u.d : u.w);
      const dC = toC(rot ? u.w : u.d);
      for (let y = by0; y <= by1; y++)
        for (let x = bx0; x <= bx1; x++)
          if (canPlace(x, y, wC, dC)) {
            commit(u, { x, y, wC, dC, rot, side: null });
            return true;
          }
    }
    return false;
  }

  /* Expand items → individual units, grouped by category, big first. */
  const byCat = new Map<string, Unit[]>();
  for (const it of items)
    for (let k = 0; k < it.qty; k++) {
      const u: Unit = { id: it.id, name: it.name, category: it.category, w: it.w, d: it.d };
      const arr = byCat.get(it.category) || [];
      arr.push(u);
      byCat.set(it.category, arr);
    }
  for (const arr of byCat.values()) arr.sort((a, b) => b.w * b.d - a.w * a.d);

  /* Rank walls by usable straight run so the biggest rows get the longest
     walls. Measured on the interior bbox edge bands. */
  function runLength(side: Side): number {
    let best = 0,
      run = 0;
    if (side === "N" || side === "S") {
      const y = side === "N" ? by0 : by1;
      for (let x = bx0; x <= bx1; x++) {
        run = occ[idx(x, y)] === 0 ? run + 1 : 0;
        best = Math.max(best, run);
      }
    } else {
      const x = side === "W" ? bx0 : bx1;
      for (let y = by0; y <= by1; y++) {
        run = occ[idx(x, y)] === 0 ? run + 1 : 0;
        best = Math.max(best, run);
      }
    }
    return best;
  }
  const OPP: Record<Side, Side> = { N: "S", S: "N", E: "W", W: "E" };
  const sides = (["S", "N", "W", "E"] as Side[]).sort((a, b) => runLength(b) - runLength(a));

  const cardio = byCat.get("cardio") || [];
  const racks = byCat.get("racks") || [];
  const dumbbells = byCat.get("dumbbells") || [];
  const benches = byCat.get("benches") || [];
  const machines = byCat.get("machines") || [];
  const others = [...byCat.entries()]
    .filter(([c]) => !["cardio", "racks", "dumbbells", "benches", "machines"].includes(c))
    .flatMap(([, arr]) => arr);

  const cardioSide = sides[0];
  const rackSide = OPP[cardioSide];
  const dbSide = sides.find((s) => s !== cardioSide && s !== rackSide) ?? sides[1];
  const machineSide = OPP[dbSide];

  const leftovers: Unit[] = [];
  leftovers.push(...placeAlongSide(cardio, cardioSide));
  leftovers.push(...placeAlongSide(racks, rackSide));
  leftovers.push(...placeAlongSide(dumbbells, dbSide));

  const dbRefs = placements.filter((p) => p.u.category === "dumbbells");
  const benchLeft = dbRefs.length ? placeFacing(benches, dbRefs) : [...benches];
  leftovers.push(...placeAlongSide(benchLeft, machineSide));

  const machLeft = placeAlongSide(machines, machineSide);
  leftovers.push(...placeOpenRows(machLeft));
  leftovers.push(...placeOpenRows(others));

  /* Sweep every leftover through the open-floor scan. */
  let unplacedCount = 0;
  for (const u of leftovers) if (!placeAnywhere(u)) unplacedCount++;

  const placed: PlacedItem[] = placements.map((p) => {
    const w = p.rot ? p.u.d : p.u.w;
    const d = p.rot ? p.u.w : p.u.d;
    return {
      uid: uidOf(),
      id: p.u.id,
      name: p.u.name,
      category: p.u.category,
      w: p.u.w,
      d: p.u.d,
      x: Math.min(Math.max(0, p.x * cell), Math.max(0, roomWIn - w)),
      y: Math.min(Math.max(0, p.y * cell), Math.max(0, roomDIn - d)),
      rot: p.rot,
    };
  });

  return { placed, unplacedCount, total: totalUnits };
}
