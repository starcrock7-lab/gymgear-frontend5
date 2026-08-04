/* Auto-arrange gate: a kit must actually land in a real room.
 *
 * The failure this exists to catch is silent — autoPlace never throws, it just
 * quietly drops pieces, and a dropped piece looks exactly like an empty room.
 * Padding every item for the worst-case halo once cost a 12x14 ft garage half
 * its kit, including the storage shelf holding every accessory.
 *
 *   npm run audit:layout
 */
import { autoPlace, emptyGrid } from "../src/lib/auto-layout.ts";
import { clearanceOf, footprintOf } from "../src/lib/floor-plan.ts";

/* A full kit: one piece from every placeable category. */
const KIT = [
  ["rogue-r3", "racks"],
  ["rep-ab3100", "benches"],
  ["concept2-rower", "cardio"],
  ["rep-adj-dbs", "dumbbells"],
  ["rogue-op", "barbells"],
  ["rep-black", "plates"],
  ["rogue-kb", "kettlebells"],
  ["rep-bands", "bands"],
  ["manduka-pro", "yogamats"],
  ["tp-grid", "foamrollers"],
  ["rogue-rope", "jumpropes"],
  ["storage-shelf", "storage"],
];

/* Floor for each room, and the least we accept placing in it. Small rooms
   genuinely cannot hold a 7 ft barbell cradle and an unrolled mat as well as
   a rack, so the bar is "most of the kit", not "all of it". */
const ROOMS = [
  { label: "10x10 ft", w: 120, d: 120, min: 5 },
  { label: "12x14 ft", w: 144, d: 168, min: 9 },
  { label: "14x18 ft", w: 168, d: 216, min: 12 },
  { label: "20x20 ft", w: 240, d: 240, min: 12 },
];

const items = KIT.map(([id, category], i) => {
  const { w, d } = footprintOf(id, category);
  return { uid: `u${i}`, id, name: id, category, qty: 1, w, d };
});

/* Same rule the planner paints red: halo rectangles must not overlap. */
const haloRect = (p) => {
  const w = p.rot ? p.d : p.w;
  const d = p.rot ? p.w : p.d;
  const c = clearanceOf(p.category);
  return { x1: p.x - c, y1: p.y - c, x2: p.x + w + c, y2: p.y + d + c };
};

let failed = 0;
for (const room of ROOMS) {
  const out = autoPlace(items, room.w, room.d, emptyGrid(room.w, room.d));
  const placed = out.placed;

  let overlaps = 0;
  for (let i = 0; i < placed.length; i++)
    for (let j = i + 1; j < placed.length; j++) {
      const a = haloRect(placed[i]);
      const b = haloRect(placed[j]);
      if (a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1) overlaps++;
    }

  const outside = placed.filter(
    (p) =>
      p.x < 0 ||
      p.y < 0 ||
      p.x + (p.rot ? p.d : p.w) > room.w ||
      p.y + (p.rot ? p.w : p.d) > room.d,
  ).length;

  const problems = [];
  if (placed.length < room.min) problems.push(`placed ${placed.length}, need >= ${room.min}`);
  if (overlaps) problems.push(`${overlaps} halo overlap(s) — the floor renders red`);
  if (outside) problems.push(`${outside} piece(s) outside the room`);

  const dropped = items
    .filter((i) => !placed.some((p) => p.id === i.id))
    .map((i) => i.category)
    .join(", ");
  console.log(
    `${problems.length ? "FAIL" : "ok  "}  ${room.label.padEnd(9)} placed ${placed.length}/${out.total}` +
      `${dropped ? `  dropped: ${dropped}` : ""}`,
  );
  for (const p of problems) console.log(`        ${p}`);
  if (problems.length) failed++;
}

if (failed) {
  console.error(`\n${failed} room(s) failed — a kit that does not land is an empty room.`);
  process.exit(1);
}
console.log("\nall rooms ok");
