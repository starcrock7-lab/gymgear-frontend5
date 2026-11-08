/* Gate for the 3D gear (src/lib/equipment-3d.ts). Builds every product with a
   known footprint and fails when a model stops being the size the page says it
   is, or gets too heavy for a phone.
     npm run check:models */
import * as THREE from "three";
import { buildEquipmentModel, heightOf, MODEL_TYPES } from "../src/lib/equipment-3d.ts";
import { equipmentTypeOf } from "../src/components/planner/equipment-icon.tsx";
import { FOOTPRINTS } from "../src/lib/floor-plan.ts";

const MAX_TRIS = 90000;
const MAX_MESHES = 18;
/* A loaded bar is meant to reach past the uprights, and racks carry plates on
   rear horns. Everything else stays inside its footprint. */
const OVERHANG = { powerRack: [12, 12], halfRack: [12, 12], squatStand: [12, 2], wallRack: [12, 10] };
const SLACK = 1.5;

const fails = [];
const seen = new Set();
const heaviest = { tris: 0, name: "" };
function check(name, type, w, d, h, id) {
  seen.add(type);
  const g = buildEquipmentModel(type, "racks", w, d, h, id);
  let tris = 0;
  for (const m of g.children) tris += m.geometry.attributes.position.count / 3;
  if (tris > heaviest.tris) Object.assign(heaviest, { tris, name });
  const box = new THREE.Box3().setFromObject(g);
  const [ox, oz] = OVERHANG[type] ?? [0, 0];
  const fail = (m) => fails.push(`${name} (${type}): ${m}`);
  if (tris > MAX_TRIS) fail(`${Math.round(tris)} triangles, limit ${MAX_TRIS}`);
  if (g.children.length > MAX_MESHES) fail(`${g.children.length} meshes after merging, limit ${MAX_MESHES}`);
  if (tris < 200) fail(`only ${Math.round(tris)} triangles, looks like a placeholder`);
  if (box.min.y < -0.2) fail(`sinks ${(-box.min.y).toFixed(1)} in into the floor`);
  if (box.max.y > h + SLACK) fail(`${box.max.y.toFixed(1)} in tall, declared ${h}`);
  if (box.max.x > w / 2 + ox + SLACK || box.min.x < -w / 2 - ox - SLACK) fail(`x ${box.min.x.toFixed(1)}..${box.max.x.toFixed(1)} past ${w} in wide`);
  if (box.max.z > d / 2 + oz + SLACK || box.min.z < -d / 2 - oz - SLACK) fail(`z ${box.min.z.toFixed(1)}..${box.max.z.toFixed(1)} past ${d} in deep`);
}

for (const [id, { w, d }] of Object.entries(FOOTPRINTS)) {
  const type = equipmentTypeOf(id, "");
  if (type === "box") continue;
  check(id, type, w, d, heightOf(id, type), id);
}
for (const type of MODEL_TYPES) if (!seen.has(type)) check(`default ${type}`, type, 48, 36, heightOf("", type), "");

console.log(`3D models: ${seen.size} types, heaviest ${heaviest.name} at ${Math.round(heaviest.tris)} triangles`);
if (fails.length) {
  console.error(`\nFAIL (${fails.length})`);
  for (const f of fails.slice(0, 50)) console.error(`  ${f}`);
  process.exit(1);
}
console.log("OK");
