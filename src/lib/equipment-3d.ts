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
import { FAMILY_COLORS, type EquipmentType } from "@/components/planner/equipment-icon";

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

/* Shape distinguishes the equipment type; family colour distinguishes the
   category at a glance. Same hues as the 2D map + palette (FAMILY_COLORS in
   equipment-icon), so a category reads identically across both views. */
const familyHex = (category: string) =>
  parseInt((FAMILY_COLORS[category] ?? "#8a93a8").slice(1), 16);
const FRAME = 0x252b3a; // dark graphite steel — pops on the light floor
const PAD = 0x2a3247; // upholstery
const STACK = 0x14181f; // weight stacks / belts / plates
const CHROME = 0xb9c2cf; // bars, guide rods, pulleys
const RUBBER = 0x1a1d24; // rollers, feet, belts

type Mats = {
  frame: THREE.Material;
  accent: THREE.Material;
  pad: THREE.Material;
  dark: THREE.Material;
  chrome: THREE.Material;
  rubber: THREE.Material;
};

function makeMats(category: string): Mats {
  const accent = familyHex(category);
  return {
    frame: new THREE.MeshStandardMaterial({ color: FRAME, roughness: 0.5, metalness: 0.45 }),
    accent: new THREE.MeshStandardMaterial({ color: accent, roughness: 0.4, metalness: 0.25 }),
    pad: new THREE.MeshStandardMaterial({ color: PAD, roughness: 0.85 }),
    dark: new THREE.MeshStandardMaterial({ color: STACK, roughness: 0.7, metalness: 0.3 }),
    chrome: new THREE.MeshStandardMaterial({ color: CHROME, roughness: 0.25, metalness: 0.9 }),
    rubber: new THREE.MeshStandardMaterial({ color: RUBBER, roughness: 0.95 }),
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
function cylAt(g: THREE.Group, m: THREE.Material, r: number, len: number, x: number, y: number, z: number, axis: "x" | "y" | "z" = "y", radialSegments = 14) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, radialSegments), m);
  if (axis === "x") mesh.rotation.z = Math.PI / 2;
  if (axis === "z") mesh.rotation.x = Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  g.add(mesh);
  return mesh;
}
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
/* Tube between two points — frame diagonals, cables, moving arms. */
function tube(g: THREE.Group, m: THREE.Material, r: number, a: THREE.Vector3, b: THREE.Vector3, radialSegments = 10) {
  const dir = b.clone().sub(a);
  const len = dir.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, radialSegments), m);
  mesh.position.copy(a).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(V(0, 1, 0), dir.normalize());
  mesh.castShadow = true;
  g.add(mesh);
  return mesh;
}
/* Weight plate: rim + lighter hub, axis x or z. */
function plate(g: THREE.Group, m: Mats, r: number, th: number, x: number, y: number, z: number, axis: "x" | "z" = "x") {
  cylAt(g, m.dark, r, th, x, y, z, axis, 20);
  cylAt(g, m.chrome, r * 0.18, th + 0.4, x, y, z, axis, 10);
}
/* Loaded barbell along x: chrome shaft, sleeves, collars, bumper pairs. */
function loadedBar(g: THREE.Group, m: Mats, halfSpan: number, y: number, z: number) {
  cylAt(g, m.chrome, 0.6, halfSpan * 2, 0, y, z, "x", 10);
  for (const sx of [-1, 1]) {
    cylAt(g, m.chrome, 1, halfSpan * 0.32, sx * halfSpan * 0.86, y, z, "x", 10); // sleeve
    cylAt(g, m.dark, 1.5, 1, sx * (halfSpan * 0.7), y, z, "x", 10); // collar
    plate(g, m, 8.8, 2.4, sx * (halfSpan * 0.78), y, z);
    plate(g, m, 6.6, 1.8, sx * (halfSpan * 0.78 + 2.6), y, z);
  }
}
/* Selectorized weight stack: plate pile, two guide rods, top plate + pin. */
function weightStack(g: THREE.Group, m: Mats, w: number, x: number, z: number, hTop: number) {
  const plates = 10;
  const ph = hTop / plates;
  for (let i = 0; i < plates; i++)
    boxAt(g, i % 2 ? m.dark : m.rubber, w, ph * 0.82, w * 0.55, x, ph * (i + 0.5), z);
  for (const s of [-1, 1]) cylAt(g, m.chrome, 0.45, hTop + 8, x + s * w * 0.32, (hTop + 8) / 2, z, "y", 8);
  boxAt(g, m.frame, w * 1.1, 1.6, w * 0.6, x, hTop + 1.4, z);
  cylAt(g, m.chrome, 0.5, w * 0.7, x, hTop * 0.35, z + w * 0.32, "z", 8); // selector pin
}
/* Pulley disc with a visible axle, facing z. */
function pulley(g: THREE.Group, m: Mats, r: number, x: number, y: number, z: number) {
  cylAt(g, m.dark, r, 1.2, x, y, z, "z", 16);
  cylAt(g, m.chrome, r * 0.3, 2, x, y, z, "z", 8);
}
/* Fan wheel in a round cage, facing x (air bike / rower / ski erg). */
function fanWheel(g: THREE.Group, m: Mats, r: number, x: number, y: number, z: number) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.06, 8, 28), m.accent);
  ring.position.set(x, y, z);
  ring.rotation.y = Math.PI / 2;
  ring.castShadow = true;
  g.add(ring);
  cylAt(g, m.chrome, r * 0.12, 2.4, x, y, z, "x", 10); // hub
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const blade = boxAt(g, m.dark, 1.1, r * 0.82, r * 0.3, x, y, z);
    blade.rotation.x = a;
    blade.position.set(x, y + Math.cos(a) * r * 0.45, z + Math.sin(a) * r * 0.45);
  }
}

/* ── Builders ───────────────────────────────────────────────────────── */
type Builder = (g: THREE.Group, w: number, d: number, h: number, m: Mats) => void;

const BUILDERS: Record<string, Builder> = {
  powerRack(g, w, d, h, m) {
    const p = 3.4; // 3x3 uprights, slightly beefed for room scale
    const px = w / 2 - p / 2;
    const pz = d / 2 - p / 2;
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        boxAt(g, m.accent, p, h, p, sx * px, h / 2, sz * pz); // uprights
        boxAt(g, m.frame, p + 3, 1, p + 3, sx * px, 0.5, sz * pz); // foot plates
        /* hole rows — one dark inset strip per outer face sells the 3x3 look */
        boxAt(g, m.dark, 0.9, h * 0.92, 0.4, sx * px, h * 0.48, sz * (pz + p / 2 - 0.1));
      }
    for (const sz of [-1, 1]) boxAt(g, m.frame, w - p, p, p, 0, h - p / 2, sz * pz); // top frame
    for (const sx of [-1, 1]) boxAt(g, m.frame, p, p, d - p, sx * px, h - p / 2, 0);
    cylAt(g, m.chrome, 1, w - p * 2, 0, h - 7, -pz, "x"); // pull-up bar
    /* J-cups + chrome safety pins inside the cage */
    const jY = h * 0.55;
    for (const sx of [-1, 1]) {
      boxAt(g, m.dark, 3, 3.4, 4.6, sx * (px - p), jY - 1, pz + 0.6);
      cylAt(g, m.chrome, 0.8, d - p * 2, sx * (px - p), h * 0.38, 0, "z", 8); // safeties
    }
    /* rear plate-storage horns, loaded */
    for (const sx of [-1, 1])
      for (const [i, hy] of [h * 0.22, h * 0.42].entries()) {
        cylAt(g, m.chrome, 0.7, 7, sx * (px - p * 0.2), hy, -pz - 3, "z", 8);
        plate(g, m, i ? 7.5 : 8.8, 2.2, sx * (px - p * 0.2), hy, -pz - 4.5, "z");
      }
    loadedBar(g, m, w / 2 + 7, jY, pz + 1.6); // racked, loaded bar up front
  },
  halfRack(g, w, d, h, m) {
    const p = 3.4;
    const px = w / 2 - p / 2;
    for (const sx of [-1, 1]) {
      boxAt(g, m.accent, p, h, p, sx * px, h / 2, -(d / 2 - p / 2)); // tall rear
      boxAt(g, m.accent, p, h * 0.55, p, sx * px, h * 0.275, d / 2 - p / 2); // short front
      boxAt(g, m.frame, p, 2, d, sx * px, 1.1, 0); // base rails
      boxAt(g, m.dark, 3, 3.2, 4.4, sx * px, h * 0.52 - 1, d / 2 + 0.4); // J-cups
      tube(g, m.frame, 1, V(sx * px, h * 0.55, -(d / 2 - p)), V(sx * px, h * 0.55, d / 2 - p)); // spotter arms
      /* rear storage horn with a plate */
      cylAt(g, m.chrome, 0.7, 7, sx * px, h * 0.3, -(d / 2) - 3, "z", 8);
      plate(g, m, 8.5, 2.2, sx * px, h * 0.3, -(d / 2) - 4.5, "z");
    }
    boxAt(g, m.frame, w - p, p, p, 0, h - p / 2, -(d / 2 - p / 2)); // top crossmember
    cylAt(g, m.chrome, 1, w - p * 2, 0, h - 6, -(d / 2 - p / 2), "x"); // pull-up bar
    loadedBar(g, m, w / 2 + 7, h * 0.52, d / 2 - p / 2);
  },
  squatStand(g, w, d, h, m) {
    const p = 3;
    for (const sx of [-1, 1]) {
      const x = sx * (w / 2 - 6);
      boxAt(g, m.accent, p, h, p, x, h / 2, 0); // uprights
      boxAt(g, m.frame, 12, 1.8, d * 0.85, x, 1, 0); // feet
      boxAt(g, m.dark, 0.8, h * 0.9, 0.4, x, h * 0.47, p / 2 + 0.1); // hole row
      boxAt(g, m.dark, 3, 3.2, 4.4, x, h * 0.72 - 1, 2.8); // J-cups
    }
    boxAt(g, m.frame, w - 12, 2.4, p, 0, 5, 0); // base crossmember
    loadedBar(g, m, w / 2 + 8, h * 0.72, 2.8);
  },
  wallRack(g, w, d, h, m) {
    /* two wall stringers instead of a solid slab */
    for (const sx of [-1, 1]) boxAt(g, m.frame, 4, h, 2.2, sx * (w / 2 - 4), h / 2, -(d / 2 - 1.1));
    boxAt(g, m.frame, w, 3, 2.2, 0, h - 2, -(d / 2 - 1.1));
    for (const sx of [-1, 1]) {
      const x = sx * (w / 2 - 4);
      boxAt(g, m.accent, 3, h * 0.9, 3, x, h * 0.45, d / 2 - 2); // swung-out uprights
      tube(g, m.frame, 1.2, V(x, h - 5, -(d / 2 - 2)), V(x, h - 8, d / 2 - 2)); // fold arms
      cylAt(g, m.chrome, 0.9, 3.4, x, h - 6.5, -(d / 2 - 2), "x", 8); // hinge pins
      boxAt(g, m.dark, 2.8, 3, 4.2, x, h * 0.6 - 1, d / 2 - 0.4); // J-cups
      boxAt(g, m.dark, 0.8, h * 0.8, 0.4, x, h * 0.42, d / 2 - 2 + 1.6); // hole rows
    }
    loadedBar(g, m, w / 2 + 6, h * 0.6, d / 2 - 1);
  },
  functionalTrainer(g, w, d, h, m) {
    const tw = Math.min(14, w / 4);
    const tx = w / 2 - tw / 2;
    for (const sx of [-1, 1]) {
      /* open tower frame + real selectorized stack inside */
      boxAt(g, m.frame, tw, h, 3, sx * tx, h / 2, -d * 0.28);
      boxAt(g, m.frame, tw, h, 3, sx * tx, h / 2, d * 0.28);
      boxAt(g, m.frame, tw, 3, d * 0.56, sx * tx, h - 1.5, 0);
      boxAt(g, m.frame, tw + 4, 2, d * 0.7, sx * tx, 1, 0); // feet
      weightStack(g, m, tw * 0.62, sx * tx, 0, h * 0.5);
      /* pulleys top + adjustable low, cable to a floor handle */
      pulley(g, m, 2.2, sx * (tx - tw * 0.1), h - 5, d * 0.3);
      pulley(g, m, 2.2, sx * (tx - tw * 0.1), h * 0.2, d * 0.3);
      tube(g, m.chrome, 0.25, V(sx * (tx - tw * 0.1), h - 5, d * 0.31), V(sx * (tx - tw * 0.35), 8, d * 0.42), 6); // cable
      cylAt(g, m.rubber, 1.1, 6, sx * (tx - tw * 0.35), 7, d * 0.44, "x", 8); // handle
    }
    boxAt(g, m.accent, w - tw * 2 + 2, 3.4, 3.4, 0, h - 3, 0); // crossbeam
    cylAt(g, m.chrome, 0.9, w - tw * 2 - 6, 0, h - 8, 2, "x", 8); // pull-up bar
  },
  allInOne(g, w, d, h, m) {
    const tw = Math.min(13, w / 5);
    const tx = w / 2 - tw / 2;
    for (const sx of [-1, 1]) {
      boxAt(g, m.frame, tw, h, 3.4, sx * tx, h / 2, -(d / 2 - 3)); // rear posts
      boxAt(g, m.accent, tw, h, 3.4, sx * tx, h / 2, d / 2 - 3); // front posts
      tube(g, m.frame, 1.2, V(sx * tx, h - 2, -(d / 2 - 3)), V(sx * tx, h - 2, d / 2 - 3)); // top rails
      weightStack(g, m, tw * 0.6, sx * tx, -(d / 2 - 8), h * 0.5); // twin stacks
      boxAt(g, m.dark, 2.6, 3, 4, sx * (tx - tw * 0.4), h * 0.5 - 1, d / 2 - 1); // J-cups
    }
    boxAt(g, m.frame, w - tw, 3, 3, 0, h - 1.5, -(d / 2 - 3));
    cylAt(g, m.chrome, 0.9, w - tw * 2, 0, h - 6, d / 2 - 3, "x", 8); // pull-up bar
    /* smith bar on angled chrome runners */
    for (const sx of [-1, 1]) tube(g, m.chrome, 0.6, V(sx * (tx - tw * 0.3), 8, d * 0.05), V(sx * (tx - tw * 0.3), h - 6, d * 0.18), 8);
    cylAt(g, m.chrome, 1, w - tw * 2.4, 0, h * 0.52, d * 0.12, "x", 10);
    for (const sx of [-1, 1]) plate(g, m, 6.5, 2, sx * (tx - tw * 0.55), h * 0.52, d * 0.12);
    pulley(g, m, 2, 0, h * 0.2, d / 2 - 2); // low row
    tube(g, m.chrome, 0.25, V(0, h * 0.2, d / 2 - 1.8), V(0, 7, d / 2 + 2), 6);
    cylAt(g, m.rubber, 1, 7, 0, 6.5, d / 2 + 2.4, "x", 8);
  },
  cableTower(g, w, d, h, m) {
    for (const sz of [-1, 1]) boxAt(g, m.frame, w * 0.5, h, 2.6, 0, h / 2, sz * d * 0.24);
    boxAt(g, m.frame, w * 0.5, 3, d * 0.48 + 2.6, 0, h - 1.5, 0);
    boxAt(g, m.frame, w * 0.9, 2, d * 0.8, 0, 1, 0); // base
    weightStack(g, m, w * 0.3, 0, 0, h * 0.55);
    /* adjustable trolley + pulley + cable + handle */
    boxAt(g, m.accent, 3, 8, 2, 0, h * 0.6, d * 0.26);
    pulley(g, m, 2.2, 0, h * 0.6, d * 0.32);
    tube(g, m.chrome, 0.25, V(0, h * 0.6, d * 0.33), V(0, h * 0.34, d * 0.4), 6);
    cylAt(g, m.rubber, 1, 6, 0, h * 0.33, d * 0.42, "x", 8);
    pulley(g, m, 2.4, 0, h - 4, d * 0.24); // top return pulley
  },
  homeGym(g, w, d, h, m) {
    /* rear stack tower */
    for (const sx of [-1, 1]) boxAt(g, m.frame, 2.6, h, 3, sx * w * 0.14, h / 2, -(d / 2 - 4));
    boxAt(g, m.frame, w * 0.3, 3, 3, 0, h - 1.5, -(d / 2 - 4));
    weightStack(g, m, w * 0.2, 0, -(d / 2 - 6), h * 0.52);
    pulley(g, m, 2.2, 0, h - 5, -(d / 2 - 7));
    /* seat, back pad, press arms, leg developer */
    boxAt(g, m.frame, 3, 16, 3, 0, 8, d * 0.18); // seat post
    boxAt(g, m.pad, w * 0.26, 3, d * 0.3, 0, 17, d * 0.2); // seat
    boxAt(g, m.pad, w * 0.26, d * 0.32, 3, 0, 17 + d * 0.17, d * 0.34); // back pad
    for (const sx of [-1, 1]) {
      tube(g, m.accent, 1.1, V(sx * w * 0.16, h * 0.62, -d * 0.1), V(sx * w * 0.3, h * 0.52, d * 0.28)); // press arms
      cylAt(g, m.rubber, 1.6, 5, sx * w * 0.3, h * 0.52, d * 0.3, "x", 8); // grips
    }
    tube(g, m.frame, 1.1, V(0, 12, d * 0.3), V(0, 8, d / 2 - 2)); // leg developer arm
    for (const sy of [-1, 1]) cylAt(g, m.rubber, 2.2, w * 0.24, 0, 8 + sy * 3.4, d / 2 - 2, "x", 10); // rollers
  },
  wallUnit(g, w, d, h, m) {
    boxAt(g, m.dark, w * 0.52, h, 2.6, 0, h / 2, -(d / 2 - 1.3)); // trainer panel
    boxAt(g, m.accent, w * 0.44, h * 0.32, 0.6, 0, h * 0.62, -(d / 2 - 2.7)); // screen
    for (const sx of [-1, 1]) {
      /* articulated arm: shoulder joint → elbow → handle */
      const shoulder = V(sx * w * 0.26, h * 0.55, -(d / 2 - 2));
      const elbow = V(sx * w * 0.34, h * 0.4, d * 0.05);
      const hand = V(sx * w * 0.3, h * 0.28, d * 0.32);
      cylAt(g, m.chrome, 1.4, 2.4, shoulder.x, shoulder.y, shoulder.z, "x", 10);
      tube(g, m.dark, 1.1, shoulder, elbow);
      cylAt(g, m.chrome, 1.2, 2.2, elbow.x, elbow.y, elbow.z, "x", 10);
      tube(g, m.dark, 1, elbow, hand);
      cylAt(g, m.rubber, 1, 5, hand.x, hand.y, hand.z, "x", 8); // handles
    }
  },
  plateRow(g, w, d, h, m) {
    boxAt(g, m.frame, w * 0.5, 2.4, d * 0.85, 0, 1.6, 0); // base
    tube(g, m.frame, 1.6, V(0, 2, d * 0.28), V(0, 15, d * 0.24)); // seat post
    boxAt(g, m.pad, 11, 2.8, 11, 0, 16.5, d * 0.24); // seat
    tube(g, m.frame, 1.8, V(0, 2, -d * 0.05), V(0, h * 0.72, -d * 0.12)); // chest-pad mast
    boxAt(g, m.pad, 12, h * 0.34, 2.8, 0, h * 0.68, -d * 0.07); // chest pad
    for (const sx of [-1, 1]) {
      /* plate horn arms swinging from a low pivot, loaded, with handles */
      const pivot = V(sx * 4, 4, -d * 0.3);
      const horn = V(sx * (w / 2 - 5), h * 0.46, -d * 0.18);
      tube(g, m.accent, 1.3, pivot, horn);
      cylAt(g, m.chrome, 0.7, 6, horn.x, horn.y, horn.z, "x", 8);
      plate(g, m, 7.5, 2.2, horn.x + sx * 1.6, horn.y, horn.z);
      plate(g, m, 7.5, 2.2, horn.x + sx * 4, horn.y, horn.z);
      tube(g, m.rubber, 0.9, V(horn.x - sx * 3, horn.y + 2, horn.z + 3), V(horn.x - sx * 6, horn.y + 5, horn.z + 6), 8); // grips
    }
  },
  legPress(g, w, d, h, m) {
    /* 45° sled machine: twin rails, loaded sled with foot plate, low seat */
    boxAt(g, m.frame, w * 0.8, 3, d * 0.3, 0, 1.6, d * 0.28); // seat base
    for (const sx of [-1, 1]) {
      tube(g, m.frame, 1.7, V(sx * w * 0.24, 3, d * 0.34), V(sx * w * 0.24, h * 0.9, -d * 0.34)); // rails
      tube(g, m.frame, 1.4, V(sx * w * 0.3, 1, -d * 0.1), V(sx * w * 0.24, h * 0.55, -d * 0.2)); // rear struts
    }
    const sled = boxAt(g, m.accent, w * 0.52, d * 0.42, 3, 0, h * 0.66, -d * 0.2);
    sled.rotation.x = -Math.PI / 4.5; // foot plate
    for (const sx of [-1, 1]) {
      cylAt(g, m.chrome, 0.8, 8, sx * w * 0.3, h * 0.6, -d * 0.24, "x", 8); // load horns
      plate(g, m, 8, 2.4, sx * (w * 0.3 + 3), h * 0.6, -d * 0.24);
      tube(g, m.chrome, 0.8, V(sx * w * 0.28, 12, d * 0.3), V(sx * w * 0.28, 16, d * 0.42), 8); // hold handles
    }
    boxAt(g, m.pad, w * 0.36, 3, d * 0.26, 0, 11, d * 0.3); // seat
    const back = boxAt(g, m.pad, w * 0.36, d * 0.3, 3, 0, 11 + d * 0.12, d * 0.42);
    back.rotation.x = 0.5; // reclined back rest
  },
  ghd(g, w, d, h, m) {
    boxAt(g, m.frame, 3.4, 2.6, d * 0.8, 0, 4.5, 0); // spine
    for (const sz of [-1, 1]) {
      boxAt(g, m.frame, w * 0.56, 2, 3, 0, 1, sz * (d / 2 - 4)); // feet
      tube(g, m.frame, 1.2, V(0, 4.5, sz * d * 0.24), V(0, sz > 0 ? h - 6 : h * 0.5, sz * (d / 2 - 9))); // risers
    }
    /* twin round hip pads, slightly split like the real thing */
    for (const sx of [-1, 1]) cylAt(g, m.pad, 4.6, w * 0.13, sx * w * 0.08, h - 4.6, d * 0.2, "x", 16);
    /* foot plate + two roller pairs bracketing it */
    boxAt(g, m.dark, w * 0.34, 1.4, 7, 0, h * 0.52, -(d / 2 - 6));
    for (const sy of [-1, 1])
      for (const sx of [-1, 1])
        cylAt(g, m.rubber, 1.9, 4, sx * 5.5, h * 0.52 + sy * 3.4, -(d / 2 - 6), "x", 10);
  },
  treadmill(g, w, d, h, m) {
    /* footprint long axis = w (deck length, console at +x end) */
    boxAt(g, m.frame, w * 0.92, 4, d * 0.9, -w * 0.02, 3, 0); // deck body
    boxAt(g, m.rubber, w * 0.78, 1.4, d * 0.66, -w * 0.06, 5.6, 0); // belt
    for (const sz of [-1, 1]) boxAt(g, m.frame, w * 0.86, 1.2, d * 0.1, -w * 0.04, 6, sz * d * 0.38); // side steps
    cylAt(g, m.rubber, 2.2, d * 0.8, -(w / 2 - 4), 3.4, 0, "z", 12); // rear roller
    boxAt(g, m.dark, w * 0.2, 7, d * 0.9, w / 2 - w * 0.12, 6.5, 0); // motor hood
    for (const sz of [-1, 1]) {
      tube(g, m.accent, 1.6, V(w / 2 - 8, 8, sz * (d / 2 - 3)), V(w / 2 - 2, h - 10, sz * (d / 2 - 4))); // masts
      tube(g, m.frame, 1.1, V(w / 2 - 3, h - 12, sz * (d / 2 - 4)), V(w * 0.16, h * 0.62, sz * (d / 2 - 5))); // rails
    }
    const con = boxAt(g, m.dark, 3, d * 0.5, d * 0.74, w / 2 - 1, h - 8, 0);
    con.rotation.z = 0.5; // console body
    const scr = boxAt(g, m.accent, 0.8, d * 0.3, d * 0.44, w / 2 - 2.6, h - 7, 0);
    scr.rotation.z = 0.5; // screen
  },
  rower(g, w, d, h, m) {
    /* Concept2-style: fan cage front, monorail back to a sliding seat */
    const fx = -(w / 2 - 9);
    fanWheel(g, m, d * 0.44, fx, d * 0.44 + 3, 0);
    cylAt(g, m.dark, d * 0.46, 3.4, fx - 2.4, d * 0.44 + 3, 0, "x", 22); // fan housing side
    tube(g, m.frame, 1.7, V(fx + 3, 11.5, 0), V(w / 2 - 2, 9.5, 0)); // monorail
    for (const [x, spread] of [[fx + 8, 0.42], [w / 2 - 6, 0.34]] as const)
      for (const sz of [-1, 1]) tube(g, m.frame, 1.2, V(x, 10.5, 0), V(x + 3, 1, sz * d * spread)); // legs
    boxAt(g, m.pad, 7.5, 2.4, 8.5, w * 0.1, 13, 0); // sliding seat
    for (const sz of [-1, 1]) {
      const fr = boxAt(g, m.dark, 3.4, 9, 6.5, fx + 8.5, 9, sz * d * 0.3);
      fr.rotation.z = -0.5; // footrests
    }
    cylAt(g, m.rubber, 1, d * 0.5, fx + 13, 15.5, 0, "z", 8); // handle at rest
    tube(g, m.chrome, 0.3, V(fx + 2, d * 0.44 + 3, 0), V(fx + 12.4, 15.5, 0), 6); // chain
    tube(g, m.dark, 1, V(fx, d * 0.88 + 4, 0), V(fx + 6, h - 3, 0)); // monitor arm
    boxAt(g, m.accent, 4.4, 3.2, 1, fx + 6.6, h - 2, 0); // monitor
  },
  skiErg(g, w, d, h, m) {
    boxAt(g, m.frame, w * 0.72, 1.6, d, 0, 0.9, 0); // floor plate
    for (const sx of [-1, 1]) tube(g, m.frame, 1.4, V(sx * w * 0.3, 1, d * 0.3), V(sx * w * 0.14, h * 0.72, -(d / 2 - 4))); // mast legs
    boxAt(g, m.accent, w * 0.5, h * 0.42, 3.4, 0, h * 0.72, -(d / 2 - 3)); // drive tower
    fanWheel(g, m, w * 0.24, 0, h * 0.84, -(d / 2 - 3) + 0.2);
    boxAt(g, m.dark, 4.6, 3.6, 1.2, 0, h * 0.6, -(d / 2 - 1)); // monitor
    for (const sx of [-1, 1]) {
      tube(g, m.chrome, 0.25, V(sx * w * 0.12, h * 0.94, -(d / 2 - 3)), V(sx * w * 0.2, h * 0.5, d * 0.1), 6); // drive cords
      cylAt(g, m.rubber, 0.9, 4.4, sx * w * 0.2, h * 0.48, d * 0.12, "y", 8); // handles
    }
  },
  airBike(g, w, d, h, m) {
    /* footprint long axis = w, fan at -x */
    const fx = -(w / 2 - h * 0.3);
    const fr = h * 0.3;
    fanWheel(g, m, fr, fx, fr + 6, 0);
    for (const s of [-1, 1]) tube(g, m.frame, 0.5, V(fx, fr * 2 + 5, s * 1.6), V(fx, 7, s * 1.6), 6); // fan guard struts
    for (const x of [fx + 2, w * 0.3]) {
      boxAt(g, m.frame, 3, 2.2, d * 0.9, x, 1.2, 0); // stabilizer bars
      tube(g, m.frame, 1.2, V(x, 6, 0), V(x, 2, 0), 8); // riser into the spine
    }
    tube(g, m.accent, 1.8, V(fx + 2, 6, 0), V(w * 0.3, 6, 0)); // base spine
    tube(g, m.accent, 1.6, V(w * 0.12, 6, 0), V(w * 0.26, h * 0.6, 0)); // seat tube
    boxAt(g, m.pad, 8.5, 2.4, 7.5, w * 0.26, h * 0.62, 0); // saddle
    tube(g, m.accent, 1.6, V(fx + 6, 6, 0), V(fx + 9, h * 0.62, 0)); // steer tube
    for (const s of [-1, 1]) {
      tube(g, m.chrome, 0.9, V(fx + 9, h * 0.6, s * 2), V(fx + 12, h * 0.86, s * d * 0.3)); // moving arms
      cylAt(g, m.rubber, 1.1, 5.5, fx + 12.5, h * 0.87, s * d * 0.3, "x", 8); // grips
      cylAt(g, m.rubber, 1, 3.4, fx + w * 0.36, 7, s * d * 0.26, "x", 8); // pedals
    }
    boxAt(g, m.dark, 4.2, 3.4, 1.2, fx + 10, h * 0.74, 0); // console
  },
  spinBike(g, w, d, h, m) {
    /* one connected frame: flywheel front, saddle back, bullhorns on a stem */
    const fwx = -w * 0.2;
    const sx = w * 0.26; // saddle x
    const bx = -w * 0.3; // bar-stem x
    plate(g, m, h * 0.22, 3, fwx, h * 0.24, 0); // heavy front flywheel
    boxAt(g, m.frame, w * 0.62, 2.6, 3, -w * 0.02, 3, 0); // base rail
    for (const s of [-1, 1]) boxAt(g, m.frame, 3, 2.2, d * 0.95, s * w * 0.28, 1.2, 0); // stabilizers
    tube(g, m.accent, 1.7, V(fwx, 4, 0), V(sx, h * 0.58, 0)); // main diagonal tube
    tube(g, m.accent, 1.7, V(fwx + 4, h * 0.34, 0), V(bx + 3, h * 0.66, 0)); // head tube
    tube(g, m.accent, 1.5, V(sx - 3, h * 0.3, 0), V(sx, h * 0.58, 0)); // seat tube
    boxAt(g, m.pad, 7.5, 2.2, 6, sx, h * 0.6, 0); // saddle
    /* bullhorns: one crossbar + two forward horns, attached to the stem */
    const by = h * 0.7;
    cylAt(g, m.rubber, 0.9, d * 0.62, bx + 2, by, 0, "z", 8);
    for (const s of [-1, 1]) tube(g, m.rubber, 0.9, V(bx + 2, by, s * d * 0.31), V(bx - 3, by + 3, s * d * 0.2), 8);
    boxAt(g, m.dark, 4, 2.8, 0.9, bx + 2, by + 4.4, 0); // console
    /* crank + pedals, tucked under the frame mid-line */
    cylAt(g, m.chrome, 0.8, 5, w * 0.02, h * 0.2, 0, "z", 8);
    for (const s of [-1, 1]) boxAt(g, m.rubber, 3.6, 1.2, 2.2, w * 0.02, h * 0.2 + s * 2, s * d * 0.32);
  },
  elliptical(g, w, d, h, m) {
    boxAt(g, m.frame, w * 0.9, 3.4, d * 0.5, 0, 2, 0); // base rail
    /* rear drive: big wheel housing */
    cylAt(g, m.dark, h * 0.16, d * 0.4, -w * 0.32, h * 0.18, 0, "z", 18);
    cylAt(g, m.accent, h * 0.165, 2, -w * 0.32, h * 0.18, 0, "z", 18);
    tube(g, m.accent, 1.7, V(-w * 0.1, 3, 0), V(w * 0.34, h * 0.5, 0)); // front mast
    for (const s of [-1, 1]) {
      const ped = boxAt(g, m.rubber, w * 0.26, 1.8, 6.5, -s * w * 0.04, 8 + s * 2, s * d * 0.26);
      ped.rotation.z = s * 0.06; // pedals mid-stride
      tube(g, m.frame, 1, V(-w * 0.3, h * 0.18, s * d * 0.26), V(-s * w * 0.04 - w * 0.12, 8 + s * 2, s * d * 0.26)); // pedal arms
      tube(g, m.frame, 1, V(-s * w * 0.04 + w * 0.1, 9 + s * 2, s * d * 0.26), V(w * 0.3, h * 0.62 + s * 4, s * d * 0.26)); // moving handles
      cylAt(g, m.rubber, 1.1, 6, w * 0.3, h * 0.64 + s * 4, s * d * 0.26, "y", 8);
    }
    boxAt(g, m.dark, 5.5, h * 0.14, 3.4, w * 0.35, h * 0.56, 0); // console block
    boxAt(g, m.accent, 1, h * 0.1, 4.4, w * 0.37, h * 0.6, 0); // screen
    for (const s of [-1, 1]) tube(g, m.chrome, 0.8, V(w * 0.34, h * 0.5, 0), V(w * 0.3, h * 0.42, s * d * 0.2), 8); // fixed bars
  },
  bench(g, w, d, h, m) {
    /* footprint long axis = w; head pad slightly raised like an FID bench */
    boxAt(g, m.pad, w * 0.62, 4, d * 0.6, -w * 0.08, h - 2, 0); // main pad
    const head = boxAt(g, m.pad, w * 0.3, 4, d * 0.6, w * 0.26, h - 1, 0);
    head.rotation.z = 0.12; // incline hint
    boxAt(g, m.frame, w * 0.7, 2.6, 3, 0, h * 0.45, 0); // spine
    tube(g, m.frame, 1.6, V(-w * 0.3, h * 0.45, 0), V(-w * 0.42, 1.5, 0)); // rear leg
    tube(g, m.frame, 1.6, V(w * 0.22, h * 0.45, 0), V(w * 0.34, 1.5, 0)); // front leg
    for (const sx of [-1, 1]) boxAt(g, m.frame, 2.4, 1.8, d * 0.9, sx === 1 ? w * 0.34 : -w * 0.42, 0.9, 0); // feet
    for (const sz of [-1, 1]) cylAt(g, m.rubber, 1.5, 2, -w * 0.42, 2.4, sz * (d * 0.32), "z", 8); // transport wheels
  },
  dumbbellRack(g, w, d, h, m) {
    /* A-frame: two angled tiers, saddles, and sized hex dumbbells */
    for (const sx of [-1, 1]) {
      tube(g, m.frame, 1.8, V(sx * (w / 2 - 2), 1, d * 0.4), V(sx * (w / 2 - 2), h, -d * 0.32)); // side rails
      boxAt(g, m.frame, 4.4, 2, d * 0.95, sx * (w / 2 - 2), 1, 0); // feet
    }
    const tiers: [number, number][] = [
      [h * 0.42, d * 0.16],
      [h * 0.8, -d * 0.14],
    ];
    for (const [ti, [y, z]] of tiers.entries()) {
      boxAt(g, m.frame, w - 5, 2.4, d * 0.42, 0, y, z); // shelf
      const n = Math.max(3, Math.floor(w / 15));
      for (let k = 0; k < n; k++) {
        const x = -w / 2 + 6 + (k + 0.5) * ((w - 12) / n);
        const r = 2.2 + ((k + ti) % n) * 0.28; // mixed weights across the row
        cylAt(g, m.dark, r, 3.6, x, y + r + 1.2, z - 3.4, "z", 6); // hex head
        cylAt(g, m.dark, r, 3.6, x, y + r + 1.2, z + 3.4, "z", 6); // hex head
        cylAt(g, m.chrome, 0.8, 4.4, x, y + r + 1.2, z, "z", 8); // knurled handle
      }
    }
  },
  box(g, w, d, h, m) {
    boxAt(g, m.accent, w, h, d, 0, h / 2, 0);
    boxAt(g, m.dark, w * 0.4, h * 0.12, 1, 0, h * 0.55, d / 2 - 0.4); // handle slot
    boxAt(g, m.dark, w * 0.4, h * 0.12, 1, 0, h * 0.55, -(d / 2 - 0.4));
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
