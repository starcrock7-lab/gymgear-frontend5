/* 3D model library for the sims-style planner view. One builder per real
   equipment TYPE (same resolver as the 2D icons, so map glyph and 3D model
   always agree). Every model is composed from a handful of primitives —
   deliberately simple, but each type reads instantly different — and is
   built to the piece's REAL footprint (w × d inches from floor-plan.ts) and
   REAL height (published specs below, inches). Y is up; a model stands on
   y=0 centred on the origin, spanning x∈[-w/2,w/2], z∈[-d/2,d/2].

   Only imported from Planner3D (dynamic import), so three.js never loads
   until the user opens the 3D view. */

import * as THREE from "three";
import type { EquipmentType } from "@/components/planner/equipment-icon";

/* Real height per equipment type (inches, published specs, rounded). */
export const TYPE_HEIGHT: Record<string, number> = {
  powerRack: 90,
  halfRack: 92,
  squatStand: 72,
  wallRack: 90,
  functionalTrainer: 84,
  allInOne: 90,
  cableTower: 84,
  homeGym: 83,
  wallUnit: 51,
  plateRow: 44,
  legPress: 56,
  ghd: 41,
  treadmill: 62,
  rower: 36,
  skiErg: 86,
  airBike: 53,
  spinBike: 51,
  elliptical: 68,
  bench: 18,
  dumbbellRack: 32,
  box: 36,
};

/* Per-product overrides where the published height differs from the type. */
export const HEIGHT_OVERRIDES: Record<string, number> = {
  "rep-pr4000": 93,
  "rep-pr5000": 93,
  "rep-hr100": 93,
  "titan-x3": 91,
  "rogue-sml2": 92,
  "rogue-squat": 92,
  "titan-t2": 83,
  "bells-squat": 70,
  "force-usa-g20": 91,
  "force-usa-g6": 87,
  "force-usa-g3": 87,
  "rep-arcadia": 80,
  "bells-ft": 82,
  "titan-ft": 83,
  "bodysolid-exm2500": 83,
  "bowflex-x2se": 82,
  "marcy-mwm990": 68,
  "tonal-2": 51,
  "hs-iso-row": 44,
  "hs-leg-press": 56,
  "bodysolid-slp500": 55,
  "rogue-ghd": 41,
  "nordictrack-1750": 65,
  "assault-runner": 64,
  "lifefitness-t3": 62,
  "lf-club-treadmill": 62,
  "concept2-rower": 36,
  "sunny-rower": 32,
  "waterrower-oak": 21,
  "hydrow-wave": 43,
  "concept2-ski": 86,
  "assault-bike": 50,
  "rogue-echo-bike": 53,
  "peloton-bike": 59,
  "schwinn-ic4": 51,
  "concept2-bikeerg": 49,
  "lf-club-elliptical": 73,
};

export function heightOf(id: string, type: EquipmentType): number {
  return HEIGHT_OVERRIDES[id] ?? TYPE_HEIGHT[type] ?? TYPE_HEIGHT.box;
}

/* One accent colour per category family — shape distinguishes the type,
   colour distinguishes the family at a glance. */
export const FAMILY_COLOR: Record<string, number> = {
  racks: 0xe8542a, // brand orange
  machines: 0xa78bfa, // violet
  cardio: 0x38bdf8, // sky
  benches: 0xf43f5e, // rose
  dumbbells: 0x2fbf62, // green
};
const FRAME = 0x252b3a; // dark graphite steel — pops on the light floor
const PAD = 0x2a3247; // upholstery
const STACK = 0x14181f; // weight stacks / belts / plates

type Mats = { frame: THREE.Material; accent: THREE.Material; pad: THREE.Material; dark: THREE.Material };

function makeMats(category: string): Mats {
  const accent = FAMILY_COLOR[category] ?? 0x8a93a8;
  return {
    frame: new THREE.MeshStandardMaterial({ color: FRAME, roughness: 0.5, metalness: 0.45 }),
    accent: new THREE.MeshStandardMaterial({ color: accent, roughness: 0.4, metalness: 0.25 }),
    pad: new THREE.MeshStandardMaterial({ color: PAD, roughness: 0.85 }),
    dark: new THREE.MeshStandardMaterial({ color: STACK, roughness: 0.7, metalness: 0.3 }),
  };
}

/* Primitive helpers — all take centre coords. */
function boxAt(g: THREE.Group, m: THREE.Material, w: number, h: number, d: number, x: number, y: number, z: number, ry = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z);
  if (ry) mesh.rotation.y = ry;
  mesh.castShadow = true;
  g.add(mesh);
  return mesh;
}
function cylAt(g: THREE.Group, m: THREE.Material, r: number, len: number, x: number, y: number, z: number, axis: "x" | "y" | "z" = "y") {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 18), m);
  if (axis === "x") mesh.rotation.z = Math.PI / 2;
  if (axis === "z") mesh.rotation.x = Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  g.add(mesh);
  return mesh;
}
/* Bumper-plate pair on a bar that runs along x at height y. */
function platesOn(g: THREE.Group, m: Mats, halfSpan: number, y: number, z: number) {
  for (const sx of [-1, 1]) {
    cylAt(g, m.dark, 8.8, 2.6, sx * halfSpan, y, z, "x");
    cylAt(g, m.dark, 6.5, 2, sx * (halfSpan - 2.6), y, z, "x");
  }
}

/* ── Builders ───────────────────────────────────────────────────────── */
type Builder = (g: THREE.Group, w: number, d: number, h: number, m: Mats) => void;

const BUILDERS: Record<string, Builder> = {
  powerRack(g, w, d, h, m) {
    const p = 4; // chunky posts read better at room scale
    for (const sx of [-1, 1])
      for (const sz of [-1, 1])
        boxAt(g, m.accent, p, h, p, sx * (w / 2 - p / 2), h / 2, sz * (d / 2 - p / 2));
    for (const sz of [-1, 1]) {
      boxAt(g, m.frame, w - p, p, p, 0, h - p / 2, sz * (d / 2 - p / 2)); // top frame
      boxAt(g, m.frame, w - p, 2.4, p, 0, 4, sz * (d / 2 - p / 2)); // low crossmembers
    }
    for (const sx of [-1, 1]) boxAt(g, m.frame, p, p, d - p, sx * (w / 2 - p / 2), h - p / 2, 0);
    cylAt(g, m.frame, 1, w - p * 2, 0, h - 8, -(d / 2 - p / 2), "x"); // pull-up bar
    const barY = h * 0.55;
    cylAt(g, m.dark, 1.4, w + 14, 0, barY, d / 2 - p / 2 + 1, "x"); // racked bar
    platesOn(g, m, w / 2 + 4, barY, d / 2 - p / 2 + 1);
  },
  halfRack(g, w, d, h, m) {
    const p = 4;
    for (const sx of [-1, 1]) {
      boxAt(g, m.accent, p, h, p, sx * (w / 2 - p / 2), h / 2, -(d / 2 - p / 2)); // tall rear
      boxAt(g, m.accent, p, h * 0.55, p, sx * (w / 2 - p / 2), h * 0.275, d / 2 - p / 2); // short front
      boxAt(g, m.frame, p, 2, d, sx * (w / 2 - p / 2), 1.2, 0); // base rails
    }
    boxAt(g, m.frame, w - p, p, p, 0, h - p / 2, -(d / 2 - p / 2));
    const barY = h * 0.52;
    cylAt(g, m.dark, 1.4, w + 14, 0, barY, 0, "x");
    platesOn(g, m, w / 2 + 4, barY, 0);
  },
  squatStand(g, w, d, h, m) {
    const p = 3.4;
    for (const sx of [-1, 1]) {
      const x = sx * (w / 2 - 6);
      boxAt(g, m.accent, p, h, p, x, h / 2, 0);
      boxAt(g, m.frame, 12, 2, d * 0.8, x, 1.1, 0); // foot
      boxAt(g, m.frame, 4, 2.4, 5, x, h * 0.72, 2.4); // J-cup
    }
    const barY = h * 0.72;
    cylAt(g, m.dark, 1.4, w + 16, 0, barY, 2.4, "x");
    platesOn(g, m, w / 2 + 5, barY, 2.4);
  },
  wallRack(g, w, d, h, m) {
    boxAt(g, m.frame, w, h, 2.4, 0, h / 2, -(d / 2 - 1.2)); // wall plate
    for (const sx of [-1, 1]) {
      boxAt(g, m.accent, 3.4, h * 0.9, 3.4, sx * (w / 2 - 4), h * 0.45, d / 2 - 2); // swung-out posts
      boxAt(g, m.frame, 2.6, 2.6, d - 4, sx * (w / 2 - 4), h - 4, 0); // fold arms
    }
    const barY = h * 0.6;
    cylAt(g, m.dark, 1.4, w + 12, 0, barY, d / 2 - 2, "x");
    platesOn(g, m, w / 2 + 3, barY, d / 2 - 2);
  },
  functionalTrainer(g, w, d, h, m) {
    const tw = Math.min(14, w / 4);
    for (const sx of [-1, 1]) {
      boxAt(g, m.frame, tw, h, d * 0.8, sx * (w / 2 - tw / 2), h / 2, 0); // towers
      boxAt(g, m.dark, tw * 0.55, h * 0.5, d * 0.4, sx * (w / 2 - tw / 2), h * 0.35, d * 0.12); // stacks
    }
    boxAt(g, m.accent, w - tw * 2, 4, 4, 0, h - 3, 0); // crossbeam
  },
  allInOne(g, w, d, h, m) {
    const tw = Math.min(13, w / 5);
    for (const sx of [-1, 1]) {
      boxAt(g, m.frame, tw, h, 4, sx * (w / 2 - tw / 2), h / 2, -(d / 2 - 3));
      boxAt(g, m.frame, tw, h, 4, sx * (w / 2 - tw / 2), h / 2, d / 2 - 3);
      boxAt(g, m.dark, tw * 0.6, h * 0.5, 5, sx * (w / 2 - tw / 2), h * 0.35, -(d / 2 - 6)); // stacks
    }
    boxAt(g, m.accent, w, 4, 4, 0, h - 3, -(d / 2 - 3));
    boxAt(g, m.accent, w, 4, 4, 0, h - 3, d / 2 - 3);
    cylAt(g, m.dark, 1.2, w - tw, 0, h * 0.5, d * 0.15, "x"); // smith bar
  },
  cableTower(g, w, d, h, m) {
    boxAt(g, m.frame, w * 0.6, h, d * 0.6, 0, h / 2, 0);
    boxAt(g, m.dark, w * 0.32, h * 0.55, d * 0.32, 0, h * 0.35, d * 0.16); // stack
    boxAt(g, m.accent, w * 0.7, 3, 3, 0, h - 2, 0); // top pulley beam
  },
  homeGym(g, w, d, h, m) {
    boxAt(g, m.frame, w * 0.5, h, d * 0.34, 0, h / 2, -(d / 2 - d * 0.17)); // rear tower
    boxAt(g, m.dark, w * 0.28, h * 0.55, d * 0.2, 0, h * 0.35, -(d / 2 - d * 0.2));
    boxAt(g, m.pad, w * 0.3, 3, d * 0.34, 0, 17, d * 0.2); // seat
    boxAt(g, m.pad, w * 0.3, d * 0.3, 3, 0, 17 + d * 0.16, d * 0.36); // back pad
    for (const sx of [-1, 1]) boxAt(g, m.accent, 2, 2, d * 0.5, sx * w * 0.28, h * 0.55, 0); // press arms
  },
  wallUnit(g, w, d, h, m) {
    boxAt(g, m.dark, w * 0.6, h, 3, 0, h / 2, -(d / 2 - 1.5)); // panel on wall
    for (const sx of [-1, 1]) boxAt(g, m.accent, 2, 2, d - 4, sx * (w * 0.3), h * 0.6, 0); // arms out
  },
  plateRow(g, w, d, h, m) {
    boxAt(g, m.frame, w * 0.7, 3, d * 0.8, 0, 4, 0); // base
    boxAt(g, m.pad, 12, 3, 12, 0, 16, d * 0.22); // seat
    boxAt(g, m.pad, 12, h * 0.45, 3, 0, h * 0.55, -d * 0.05); // chest pad
    for (const sx of [-1, 1]) cylAt(g, m.dark, 8, 2, sx * (w / 2 - 4), h * 0.5, -d * 0.15, "x"); // plates
  },
  legPress(g, w, d, h, m) {
    boxAt(g, m.frame, w * 0.85, 4, d * 0.9, 0, 3, 0); // base rails
    const sled = boxAt(g, m.accent, w * 0.6, 3, d * 0.5, 0, h * 0.62, -d * 0.14); // 45° plate sled
    sled.rotation.x = -Math.PI / 4.2;
    boxAt(g, m.pad, w * 0.42, 3, d * 0.3, 0, 14, d * 0.26); // seat low
    boxAt(g, m.pad, w * 0.42, d * 0.24, 3, 0, 14 + d * 0.1, d * 0.4); // back rest
    for (const sx of [-1, 1]) cylAt(g, m.dark, 7, 2, sx * (w * 0.32), h * 0.66, -d * 0.2, "x"); // plates
  },
  ghd(g, w, d, h, m) {
    boxAt(g, m.frame, 4, 3, d * 0.85, 0, 6, 0); // spine
    for (const sz of [-1, 1]) boxAt(g, m.frame, w * 0.6, 1.6, 3, 0, 1, sz * (d / 2 - 4)); // feet
    cylAt(g, m.pad, 7, w * 0.42, 0, h - 6, d * 0.18, "x"); // hip pad
    for (const sx of [-1, 1]) cylAt(g, m.dark, 3, 4, sx * 7, h * 0.55, -(d / 2 - 7), "x"); // foot rollers
  },
  treadmill(g, w, d, h, m) {
    /* footprint long axis = w (deck length) */
    boxAt(g, m.frame, w, 7, d, 0, 3.5, 0); // deck body
    boxAt(g, m.dark, w * 0.82, 1.5, d * 0.72, -w * 0.05, 7.6, 0); // belt
    for (const sz of [-1, 1]) boxAt(g, m.accent, 3, h * 0.85, 3, w / 2 - 6, h * 0.425, sz * (d / 2 - 3)); // masts
    boxAt(g, m.dark, 6, h * 0.28, d, w / 2 - 5, h * 0.8, 0); // console
  },
  rower(g, w, d, h, m) {
    boxAt(g, m.frame, w * 0.9, 3, 5, 0, 12, 0); // rail
    for (const sx of [-1, 1]) boxAt(g, m.frame, 2.5, 12, d * 0.7, sx * (w * 0.32), 6, 0); // legs
    cylAt(g, m.accent, d * 0.42, 9, -(w / 2 - 10), d * 0.42 + 4, 0, "x"); // flywheel
    boxAt(g, m.pad, 8, 2.5, 9, w * 0.14, 14.5, 0); // seat
    boxAt(g, m.dark, 5, 4, 5, -(w / 2 - 10), h - 3, 0); // monitor
  },
  skiErg(g, w, d, h, m) {
    boxAt(g, m.accent, w * 0.55, h, 5, 0, h / 2, -(d / 2 - 3)); // tower
    boxAt(g, m.frame, w * 0.8, 1.6, d, 0, 0.9, 0); // floor plate
    boxAt(g, m.dark, 5, 5, 4, 0, h - 10, -(d / 2 - 5)); // monitor
  },
  airBike(g, w, d, h, m) {
    /* footprint long axis = w */
    boxAt(g, m.frame, w * 0.8, 3, 3, 0, 5, 0); // spine
    cylAt(g, m.accent, h * 0.3, 4, -(w / 2 - h * 0.3), h * 0.34, 0, "z"); // fan
    boxAt(g, m.frame, 2.5, h * 0.55, 2.5, w * 0.22, h * 0.3, 0); // seat post
    boxAt(g, m.pad, 9, 2.5, 8, w * 0.22, h * 0.58, 0); // seat
    boxAt(g, m.frame, 2.5, h * 0.6, 2.5, -w * 0.1, h * 0.34, 0); // handle post
    cylAt(g, m.dark, 1, d * 0.9, -w * 0.1, h * 0.66, 0, "z"); // handles
  },
  spinBike(g, w, d, h, m) {
    boxAt(g, m.frame, w * 0.8, 3, 3, 0, 4.5, 0);
    cylAt(g, m.accent, h * 0.2, 3, -(w * 0.24), h * 0.22, 0, "z"); // flywheel
    boxAt(g, m.frame, 2.2, h * 0.6, 2.2, w * 0.24, h * 0.32, 0);
    boxAt(g, m.pad, 8, 2.2, 7, w * 0.24, h * 0.63, 0); // saddle
    boxAt(g, m.frame, 2.2, h * 0.68, 2.2, -w * 0.18, h * 0.36, 0);
    boxAt(g, m.dark, 6, 4, 2, -w * 0.18, h * 0.73, 0); // bars/console
  },
  elliptical(g, w, d, h, m) {
    boxAt(g, m.frame, w, 5, d * 0.7, 0, 2.5, 0); // base
    boxAt(g, m.dark, w * 0.3, h * 0.3, d * 0.8, -(w * 0.3), h * 0.16, 0); // drive housing
    for (const sz of [-1, 1]) boxAt(g, m.accent, 2.2, h * 0.75, 2.2, w * 0.26, h * 0.375, sz * (d * 0.24)); // arms
    boxAt(g, m.dark, 7, h * 0.2, 3, w * 0.26, h * 0.82, 0); // console
    for (const sz of [-1, 1]) boxAt(g, m.pad, w * 0.3, 1.6, 6, 0, 9, sz * (d * 0.16)); // pedals
  },
  bench(g, w, d, h, m) {
    /* footprint long axis = w */
    boxAt(g, m.pad, w * 0.9, 4.6, d * 0.66, 0, h - 2.3, 0); // pad
    for (const sx of [-1, 1]) boxAt(g, m.frame, 3.6, h - 4.6, 3.6, sx * (w * 0.34), (h - 4.6) / 2, 0);
    for (const sx of [-1, 1]) boxAt(g, m.frame, 7, 2, d * 0.85, sx * (w * 0.34), 1.1, 0); // feet
  },
  dumbbellRack(g, w, d, h, m) {
    for (const sx of [-1, 1]) boxAt(g, m.frame, 3.6, h, d * 0.9, sx * (w / 2 - 2), h / 2, 0); // sides
    for (const [i, y] of [h * 0.45, h * 0.85].entries()) {
      boxAt(g, m.frame, w - 6, 2.6, d * 0.7, 0, y, i === 0 ? d * 0.06 : -d * 0.06); // shelves
      const n = Math.max(3, Math.floor(w / 14));
      for (let k = 0; k < n; k++) {
        const x = -w / 2 + 6 + (k + 0.5) * ((w - 12) / n);
        cylAt(g, m.accent, 3.1, 11, x, y + 4.4, i === 0 ? d * 0.06 : -d * 0.06, "z"); // dumbbells
      }
    }
  },
  box(g, w, d, h, m) {
    boxAt(g, m.accent, w, h, d, 0, h / 2, 0);
  },
};

/* Build one piece at real size. `category` picks the family colour. */
export function buildEquipmentModel(
  type: EquipmentType,
  category: string,
  w: number,
  d: number,
  h: number,
): THREE.Group {
  const g = new THREE.Group();
  const m = makeMats(category);
  (BUILDERS[type] ?? BUILDERS.box)(g, w, d, h, m);
  return g;
}
