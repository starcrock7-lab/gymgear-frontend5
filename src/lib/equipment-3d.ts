/* 3D model library for the sims-style planner view. One builder per real
   equipment TYPE (same resolver as the 2D icons, so map glyph and 3D model
   always agree). Every model is composed from code-built parts (no
   downloads): punched uprights, turned plates, knurled bars, upholstered pads,
   then merged to a few meshes for phones. Each is
   built to the piece's REAL footprint (w × d inches from floor-plan.ts) and
   REAL height (published specs below, inches). Y is up; a model stands on
   y=0 centred on the origin, spanning x∈[-w/2,w/2], z∈[-d/2,d/2].

   Only imported from Planner3D (dynamic import), so three.js never loads
   until the user opens the 3D view. */

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
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
  /* Free weights, mobility gear and storage. */
  barbell: 10, // bar resting in a floor cradle
  plates: 30, // loaded plate tree
  kettlebell: 15, // tallest bell in the row
  band: 40, // band stand
  yogaMat: 6, // rolled end
  foamRoller: 6,
  jumpRope: 3,
  flooring: 1, // tile surface
  storageShelf: 60,
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

/* Shape distinguishes the equipment type. Frames are the black powder coat real
   gear ships in; the family colour (FAMILY_COLORS, same as the 2D map) is kept
   for what is coloured on real gear: J-cup liners, knobs, trim, mats, bands. */
const familyHex = (category: string) =>
  parseInt((FAMILY_COLORS[category] ?? "#8a93a8").slice(1), 16);

/* Surface detail is drawn once to small canvases and shared. In inches: the
   bake step below re-projects UVs to real size so nothing stretches on a long
   upright. Returns null under node, where check:models builds the geometry. */
const TEX = new Map<string, THREE.CanvasTexture>();
function surface(key: string, px: number, tile: number, draw: (x: CanvasRenderingContext2D, s: number) => void) {
  if (typeof document === "undefined") return null;
  const hit = TEX.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = c.height = px;
  const x = c.getContext("2d");
  if (!x) return null;
  draw(x, px);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / tile, 1 / tile);
  t.anisotropy = 8;
  TEX.set(key, t);
  return t;
}
function noise(x: CanvasRenderingContext2D, s: number, base: number, spread: number) {
  const img = x.createImageData(s, s);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = base + (Math.random() - 0.5) * spread;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  x.putImageData(img, 0, 0);
}
const powderTex = () => surface("powder", 256, 5, (x, s) => noise(x, s, 128, 70));
const rubberTex = () =>
  surface("rubber", 256, 7, (x, s) => {
    noise(x, s, 120, 90);
    for (let i = 0; i < 500; i++) {
      x.fillStyle = `rgba(255,255,255,${Math.random() * 0.25})`;
      x.fillRect(Math.random() * s, Math.random() * s, 2, 2);
    }
  });
const grainTex = () =>
  surface("grain", 256, 3.5, (x, s) => {
    x.fillStyle = "#808080";
    x.fillRect(0, 0, s, s);
    for (let i = 0; i < 2600; i++) {
      x.strokeStyle = `rgba(30,30,30,${0.15 + Math.random() * 0.4})`;
      x.lineWidth = 1;
      x.beginPath();
      x.arc(Math.random() * s, Math.random() * s, 2 + Math.random() * 5, Math.random() * 6, Math.random() * 6);
      x.stroke();
    }
  });
const knurlTex = () =>
  surface("knurl", 64, 0.34, (x, s) => {
    x.fillStyle = "#b0b0b0";
    x.fillRect(0, 0, s, s);
    x.strokeStyle = "#202020";
    x.lineWidth = 5;
    x.beginPath();
    x.moveTo(0, 0); x.lineTo(s, s); x.moveTo(s, 0); x.lineTo(0, s);
    x.stroke();
  });

/* "45 LB" around a plate face, in the weight's competition colour. */
function plateLabelTex(lb: number, hex: string) {
  return surface(`plate-${lb}`, 512, 1, (x, s) => {
    const c = s / 2;
    x.clearRect(0, 0, s, s);
    x.strokeStyle = hex;
    x.lineWidth = 12;
    x.beginPath(); x.arc(c, c, c * 0.92, 0, Math.PI * 2); x.stroke();
    x.fillStyle = "#f2f4f7";
    x.font = "800 62px Arial, sans-serif";
    x.textAlign = "center";
    x.textBaseline = "middle";
    for (const turn of [0, Math.PI]) {
      const text = `${lb} LB`;
      const step = 0.2;
      [...text].forEach((ch, i) => {
        const a = turn + (i - (text.length - 1) / 2) * step;
        x.save();
        x.translate(c + Math.sin(a) * c * 0.72, c - Math.cos(a) * c * 0.72);
        x.rotate(a);
        x.fillText(ch, 0, 0);
        x.restore();
      });
    }
  });
}
function screenTex() {
  return surface("screen", 256, 1, (x, s) => {
    const g = x.createLinearGradient(0, 0, 0, s);
    g.addColorStop(0, "#0b1a33");
    g.addColorStop(1, "#06101f");
    x.fillStyle = g;
    x.fillRect(0, 0, s, s);
    x.fillStyle = "#e9f3ff";
    x.font = "700 64px Arial, sans-serif";
    x.textAlign = "center";
    x.fillText("12:48", s / 2, s * 0.42);
    x.fillStyle = "#7fb6ff";
    x.font = "600 26px Arial, sans-serif";
    x.fillText("2,450 m", s * 0.3, s * 0.68);
    x.fillText("148 W", s * 0.72, s * 0.68);
    x.strokeStyle = "#f0531e";
    x.lineWidth = 8;
    x.beginPath(); x.moveTo(s * 0.12, s * 0.85); x.lineTo(s * 0.66, s * 0.85); x.stroke();
  });
}
function spiralTex() {
  return surface("spiral", 128, 1, (x, s) => {
    x.fillStyle = "#ffffff";
    x.fillRect(0, 0, s, s);
    x.strokeStyle = "rgba(0,0,0,0.55)";
    x.lineWidth = 2.5;
    x.beginPath();
    for (let a = 0; a < Math.PI * 14; a += 0.08) {
      const r = (s * 0.1) + (a / (Math.PI * 14)) * s * 0.4;
      const px = s / 2 + Math.cos(a) * r, py = s / 2 + Math.sin(a) * r;
      if (a === 0) x.moveTo(px, py); else x.lineTo(px, py);
    }
    x.stroke();
  });
}

type Mats = {
  frame: THREE.Material;
  accent: THREE.Material;
  pad: THREE.Material;
  seam: THREE.Material;
  dark: THREE.Material;
  plastic: THREE.Material;
  chrome: THREE.Material;
  steel: THREE.Material;
  knurl: THREE.Material;
  rubber: THREE.Material;
  hole: THREE.Material;
  screen: THREE.Material;
  spiral: THREE.Material;
  tint: (hex: number) => THREE.Material;
  plateLabel: (lb: number, hex: string) => THREE.Material;
};

/* One set per piece, because the planner re-tints a piece's materials on hover
   and selection. Surfaces only mean something against the scene's environment
   map: powder coat is matte, bar chrome a true mirror, vinyl has a soft sheen. */
function makeMats(category: string): Mats {
  const std = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(o);
  const powder = powderTex();
  const rubber = rubberTex();
  const tints = new Map<number, THREE.Material>();
  const labels = new Map<number, THREE.Material>();
  return {
    frame: std({ color: 0x1b1e25, roughness: 0.52, metalness: 0.55, bumpMap: powder, bumpScale: 0.5 }),
    accent: std({ color: familyHex(category), roughness: 0.42, metalness: 0.12, bumpMap: powder, bumpScale: 0.25 }),
    pad: new THREE.MeshPhysicalMaterial({
      color: 0x1c1e24,
      roughness: 0.6,
      clearcoat: 0.28,
      clearcoatRoughness: 0.5,
      bumpMap: grainTex(),
      bumpScale: 1.1,
    }),
    seam: std({ color: 0x08090c, roughness: 0.9 }),
    dark: std({ color: 0x24272e, roughness: 0.58, metalness: 0.45, bumpMap: powder, bumpScale: 0.6 }),
    plastic: std({ color: 0x2a2d34, roughness: 0.5, metalness: 0 }),
    chrome: std({ color: 0xc6ccd6, roughness: 0.14, metalness: 1, envMapIntensity: 1.3 }),
    steel: std({ color: 0x9aa1ac, roughness: 0.36, metalness: 1 }),
    knurl: std({ color: 0x7f868f, roughness: 0.48, metalness: 1, bumpMap: knurlTex(), bumpScale: 1.4 }),
    rubber: std({ color: 0x17191d, roughness: 0.9, metalness: 0.02, map: rubber, bumpMap: rubber, bumpScale: 0.8 }),
    hole: std({ color: 0x030405, roughness: 1, metalness: 0 }),
    screen: Object.assign(std({ color: 0x000000, emissive: 0xffffff, emissiveIntensity: 0.9, emissiveMap: screenTex(), roughness: 0.25 }), {
      userData: { keepUV: true, keepEmissive: true, noShadow: true },
    }),
    spiral: Object.assign(std({ color: familyHex(category), roughness: 0.8, map: spiralTex() }), {
      userData: { keepUV: true, noShadow: true },
    }),
    tint(hex) {
      if (!tints.has(hex)) tints.set(hex, std({ color: hex, roughness: 0.62, metalness: 0.02 }));
      return tints.get(hex)!;
    },
    plateLabel(lb, hex) {
      if (!labels.has(lb))
        labels.set(lb, Object.assign(
          std({ color: 0xffffff, map: plateLabelTex(lb, hex), transparent: true, depthWrite: false, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -2 }),
          { userData: { keepUV: true, noShadow: true } },
        ));
      return labels.get(lb)!;
    },
  };
}

/* Primitive helpers — all take centre coords. */
function put(g: THREE.Group, geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number) {
  const mesh = new THREE.Mesh(geo, m);
  mesh.position.set(x, y, z);
  g.add(mesh);
  return mesh;
}
/* Softened edges catch a highlight, which is most of what separates machined
   steel from a CAD block. */
function boxAt(g: THREE.Group, m: THREE.Material, w: number, h: number, d: number, x: number, y: number, z: number, ry = 0) {
  const r = Math.min(0.32, Math.min(w, h, d) * 0.24);
  const mesh = put(g, new RoundedBoxGeometry(w, h, d, 1, r), m, x, y, z);
  if (ry) mesh.rotation.y = ry;
  return mesh;
}
function axisTurn(mesh: THREE.Mesh, axis: "x" | "y" | "z") {
  if (axis === "x") mesh.rotation.z = Math.PI / 2;
  if (axis === "z") mesh.rotation.x = Math.PI / 2;
}
/* Turned part from [radius, along-axis] points. Hub-to-rim profiles only. */
function latheAt(g: THREE.Group, m: THREE.Material, pts: [number, number][], x: number, y: number, z: number, axis: "x" | "y" | "z" = "y", seg = 40) {
  const mesh = put(g, new THREE.LatheGeometry(pts.map(([r, a]) => new THREE.Vector2(r, a)), seg), m, x, y, z);
  axisTurn(mesh, axis);
  return mesh;
}
/* Cylinder with a small chamfer at each end, so rims catch light. */
function cylAt(g: THREE.Group, m: THREE.Material, r: number, len: number, x: number, y: number, z: number, axis: "x" | "y" | "z" = "y", seg = 28) {
  if (r < 0.7 || seg < 12) {
    const mesh = put(g, new THREE.CylinderGeometry(r, r, len, seg), m, x, y, z);
    axisTurn(mesh, axis);
    return mesh;
  }
  const c = Math.min(r * 0.12, len * 0.2);
  const a = len / 2;
  return latheAt(g, m, [[0, -a], [r - c * 2, -a], [r - c, -a], [r, -a + c], [r, a - c], [r - c, a], [r - c * 2, a], [0, a]], x, y, z, axis, seg);
}
function ellipsoid(g: THREE.Group, m: THREE.Material, rx: number, ry: number, rz: number, x: number, y: number, z: number) {
  const mesh = put(g, new THREE.SphereGeometry(1, 28, 18), m, x, y, z);
  mesh.scale.set(rx, ry, rz);
  return mesh;
}
function torusAt(g: THREE.Group, m: THREE.Material, r: number, tube_: number, x: number, y: number, z: number, flat = true) {
  const mesh = put(g, new THREE.TorusGeometry(r, tube_, 12, 42), m, x, y, z);
  if (flat) mesh.rotation.x = Math.PI / 2;
  return mesh;
}
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
function tube(g: THREE.Group, m: THREE.Material, r: number, a: THREE.Vector3, b: THREE.Vector3, seg = 16) {
  const dir = b.clone().sub(a);
  const mesh = put(g, new THREE.CylinderGeometry(r, r, dir.length(), seg), m, 0, 0, 0);
  mesh.position.copy(a).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(V(0, 1, 0), dir.normalize());
  return mesh;
}
/* Bent tube through points: handlebars, mandrel-bent frames, closed band loops. */
function bent(g: THREE.Group, m: THREE.Material, r: number, pts: THREE.Vector3[], closed = false, radial = 12) {
  const curve = new THREE.CatmullRomCurve3(pts, closed);
  return put(g, new THREE.TubeGeometry(curve, Math.max(24, pts.length * 10), r, radial, closed), m, 0, 0, 0);
}
function bolt(g: THREE.Group, m: Mats, x: number, y: number, z: number, axis: "x" | "y" | "z" = "z") {
  cylAt(g, m.steel, 0.42, 0.34, x, y, z, axis, 6);
}
/* Row of punched holes, drawn on one face. Face normal is +z or +x (sign s). */
function holeRow(g: THREE.Group, m: Mats, x: number, z: number, face: "x" | "z", s: number, y0: number, y1: number, step = 2) {
  for (let y = y0; y <= y1; y += step) {
    const mesh = put(g, new THREE.CircleGeometry(0.34, 12), m.hole, x, y, z);
    if (face === "x") mesh.rotation.y = (s * Math.PI) / 2;
    else if (s < 0) mesh.rotation.y = Math.PI;
  }
}
/* 3x3 upright with punched hole rows on its two exposed faces and a bolted foot. */
function upright(g: THREE.Group, m: Mats, x: number, z: number, h: number, p = 3, foot = true) {
  boxAt(g, m.frame, p, h, p, x, h / 2, z);
  const sx = Math.sign(x) || 1, sz = Math.sign(z) || 1;
  holeRow(g, m, x, z + sz * (p / 2 + 0.02), "z", sz, 6, h - 6);
  holeRow(g, m, x + sx * (p / 2 + 0.02), z, "x", sx, 6, h - 6);
  if (foot) {
    boxAt(g, m.frame, p + 2.6, 0.6, p + 2.6, x, 0.3, z);
    for (const a of [-1, 1]) for (const b of [-1, 1]) bolt(g, m, x + a * (p / 2 + 0.7), 0.72, z + b * (p / 2 + 0.7), "y");
  }
}
/* J-cup bolted to an upright's front face, with the bar seat at (barY, zFace+2). */
function jCup(g: THREE.Group, m: Mats, x: number, barY: number, zFace: number) {
  boxAt(g, m.steel, 2.8, 8, 0.45, x, barY - 2, zFace + 0.25);
  boxAt(g, m.frame, 2.8, 0.5, 4.2, x, barY - 1.02, zFace + 2.2);
  boxAt(g, m.frame, 2.8, 2.2, 0.5, x, barY + 0.05, zFace + 4.2);
  boxAt(g, m.accent, 2.4, 0.22, 3.6, x, barY - 0.68, zFace + 2.2); // plastic liner
  boxAt(g, m.accent, 2.4, 1.6, 0.2, x, barY + 0.1, zFace + 3.86);
  cylAt(g, m.accent, 0.42, 0.9, x, barY - 3.2, zFace + 0.7, "z", 12); // pull pin
}
/* Rubber bumper with a recessed face, steel insert and a printed weight. */
function plate(g: THREE.Group, m: Mats, r: number, th: number, x: number, y: number, z: number, axis: "x" | "z" = "x") {
  const t = th / 2;
  latheAt(g, m.rubber, [
    [r * 0.23, -t * 0.72], [r * 0.68, -t * 0.72], [r * 0.73, -t * 0.94], [r * 0.95, -t], [r, -t * 0.82],
    [r, t * 0.82], [r * 0.95, t], [r * 0.73, t * 0.94], [r * 0.68, t * 0.72], [r * 0.23, t * 0.72],
  ], x, y, z, axis, 44);
  latheAt(g, m.steel, [[1.02, -t * 0.86], [r * 0.2, -t * 0.86], [r * 0.24, -t * 0.72], [r * 0.24, t * 0.72], [r * 0.2, t * 0.86], [1.02, t * 0.86]], x, y, z, axis, 32);
  const [lb, hex] = r >= 8.2 ? [45, "#3b82f6"] : r >= 7 ? [25, "#22c55e"] : [10, "#e5e7eb"];
  const mat = m.plateLabel(lb as number, hex as string);
  for (const s of [-1, 1]) {
    const geo = new THREE.CircleGeometry(r * 0.92, 40);
    const off = t * 0.98 + 0.03;
    const mesh = put(g, geo, mat, x + (axis === "x" ? s * off : 0), y, z + (axis === "z" ? s * off : 0));
    if (axis === "x") mesh.rotation.y = (s * Math.PI) / 2;
    else if (s < 0) mesh.rotation.y = Math.PI;
  }
}
/* Olympic bar along x, ending at ±end: knurled grips, smooth centre, rotating
   sleeves with grooves, a collar on each side and a bumper pair loaded. */
function loadedBar(g: THREE.Group, m: Mats, end: number, y: number, z: number, load = true) {
  const inner = end - 9;
  cylAt(g, m.chrome, 0.56, inner * 2, 0, y, z, "x", 22);
  for (const sx of [-1, 1]) {
    cylAt(g, m.knurl, 0.585, inner * 0.46, sx * inner * 0.56, y, z, "x", 22);
    cylAt(g, m.steel, 1.18, 0.8, sx * (inner + 0.1), y, z, "x", 28); // bearing collar
    cylAt(g, m.chrome, 0.98, 8.6, sx * (inner + 4.6), y, z, "x", 28); // sleeve
    for (const k of [2.6, 6.6]) cylAt(g, m.steel, 1.0, 0.1, sx * (inner + k), y, z, "x", 28); // sleeve grooves
    cylAt(g, m.steel, 0.86, 0.24, sx * (end + 0.02), y, z, "x", 24); // end cap
    if (load) {
      plate(g, m, 8.86, 2.6, sx * (inner + 2.1), y, z);
      plate(g, m, 7.6, 1.8, sx * (inner + 4.4), y, z);
      cylAt(g, m.accent, 1.5, 1, sx * (inner + 5.8), y, z, "x", 22); // spring collar
    }
  }
  cylAt(g, m.knurl, 0.585, 6, 0, y, z, "x", 22); // centre knurl
}
/* Selectorized stack: individual plates on two guide rods, top plate, pin. */
function weightStack(g: THREE.Group, m: Mats, w: number, x: number, z: number, hTop: number) {
  const n = Math.max(10, Math.round(hTop / 2.2));
  const ph = hTop / n;
  const d = w * 0.62;
  for (let i = 0; i < n; i++) {
    boxAt(g, m.dark, w, ph * 0.86, d, x, 1.4 + ph * (i + 0.5), z);
    boxAt(g, m.seam, w * 0.2, ph * 0.3, 0.1, x, 1.4 + ph * (i + 0.5), z + d / 2 + 0.02); // pin slot
  }
  for (const s of [-1, 1]) cylAt(g, m.chrome, 0.42, hTop + 12, x + s * w * 0.36, (hTop + 12) / 2, z, "y", 14);
  boxAt(g, m.frame, w * 1.06, 1.5, d * 1.05, x, hTop + 2.4, z);
  cylAt(g, m.steel, 0.5, hTop * 0.35, x, hTop + 3.2 + hTop * 0.12, z, "y", 12);
  const pinY = 1.4 + ph * (Math.round(n * 0.45) + 0.5);
  cylAt(g, m.steel, 0.28, d * 0.7, x, pinY, z + d * 0.72, "z", 10);
  ellipsoid(g, m.accent, 0.72, 0.72, 0.72, x, pinY, z + d * 1.08);
}
/* Grooved pulley wheel between two steel cheek plates, facing z. */
function pulley(g: THREE.Group, m: Mats, r: number, x: number, y: number, z: number) {
  latheAt(g, m.plastic, [[0.2, -0.6], [r, -0.6], [r, -0.42], [r * 0.82, -0.14], [r * 0.82, 0.14], [r, 0.42], [r, 0.6], [0.2, 0.6]], x, y, z, "z", 28);
  for (const s of [-1, 1]) {
    boxAt(g, m.frame, r * 1.5, r * 2.5, 0.2, x, y + r * 0.2, z + s * 0.78);
    bolt(g, m, x, y, z + s * 0.92);
  }
}
function cable(g: THREE.Group, m: Mats, a: THREE.Vector3, b: THREE.Vector3) {
  tube(g, m.seam, 0.13, a, b, 6);
}
/* Stirrup handle hanging from a cable end. */
function handle(g: THREE.Group, m: Mats, x: number, y: number, z: number) {
  bent(g, m.steel, 0.28, [V(x - 2.6, y, z), V(x - 2.2, y + 2.6, z), V(x, y + 3.8, z), V(x + 2.2, y + 2.6, z), V(x + 2.6, y, z)]);
  cylAt(g, m.rubber, 0.72, 5, x, y, z, "x", 18);
}
/* Fan wheel in a slotted cage, axis x or z. */
function fanWheel(g: THREE.Group, m: Mats, r: number, x: number, y: number, z: number, axis: "x" | "z" = "x") {
  const onX = axis === "x";
  for (const s of [-1, 1]) {
    const ring = torusAt(g, m.frame, r, r * 0.05, x + (onX ? s * r * 0.16 : 0), y, z + (onX ? 0 : s * r * 0.16), false);
    if (onX) ring.rotation.y = Math.PI / 2;
  }
  const bars = 36;
  const rim = (rad: number, a: number): [number, number, number] =>
    onX ? [x, y + Math.cos(a) * rad, z + Math.sin(a) * rad] : [x + Math.sin(a) * rad, y + Math.cos(a) * rad, z];
  for (let i = 0; i < bars; i++) {
    const a = (i / bars) * Math.PI * 2;
    boxAt(g, m.frame, onX ? r * 0.32 : 0.22, 0.22, onX ? 0.22 : r * 0.32, ...rim(r, a));
  }
  cylAt(g, m.steel, r * 0.14, r * 0.4, x, y, z, axis, 22);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const blade = boxAt(g, m.plastic, onX ? r * 0.24 : 0.24, r * 0.74, onX ? 0.24 : r * 0.24, ...rim(r * 0.54, a));
    if (onX) blade.rotation.x = a;
    else blade.rotation.z = -a;
  }
}
/* Upholstered pad on a plywood base, with piping along the lower edge. */
function padAt(g: THREE.Group, m: Mats, w: number, t: number, d: number, x: number, y: number, z: number, rz = 0, rx = 0) {
  const parts: THREE.Mesh[] = [];
  parts.push(put(g, new RoundedBoxGeometry(w, t, d, 3, Math.min(t * 0.46, d * 0.3)), m.pad, x, y, z));
  parts.push(boxAt(g, m.seam, w * 0.985, 0.14, d * 0.97, x, y - t * 0.42, z));
  parts.push(boxAt(g, m.dark, w * 0.93, 0.45, d * 0.88, x, y - t * 0.5 - 0.15, z));
  for (const p of parts) {
    if (rz || rx) {
      const off = p.position.clone().sub(V(x, y, z)).applyEuler(new THREE.Euler(rx, 0, rz));
      p.position.set(x, y, z).add(off);
      p.rotation.set(rx, 0, rz);
    }
  }
}
function saddle(g: THREE.Group, m: Mats, x: number, y: number, z: number, nose: 1 | -1 = -1) {
  ellipsoid(g, m.pad, 3.2, 1.3, 3.5, x - nose * 1.2, y, z);
  ellipsoid(g, m.pad, 3.6, 1.05, 1.3, x + nose * 2, y - 0.1, z);
  cylAt(g, m.steel, 0.7, 2.6, x, y - 2, z, "y", 16);
}
function pedal(g: THREE.Group, m: Mats, x: number, y: number, z: number, s: number) {
  boxAt(g, m.plastic, 3.8, 0.8, 3.4, x, y, z + s * 2);
  boxAt(g, m.seam, 3, 0.2, 0.4, x, y + 0.48, z + s * 2);
  cylAt(g, m.steel, 0.3, 1.2, x, y, z + s * 0.2, "z", 10);
}
/* Glowing display on a housing. `ry`/`rx` tilt both together. */
function consoleAt(g: THREE.Group, m: Mats, w: number, h: number, x: number, y: number, z: number, ry = 0, rx = 0) {
  const body = boxAt(g, m.plastic, w, h, 1.1, x, y, z);
  body.rotation.set(rx, ry, 0, "YXZ");
  const n = V(0, 0, 0.59).applyEuler(new THREE.Euler(rx, ry, 0, "YXZ"));
  const scr = put(g, new THREE.PlaneGeometry(w * 0.86, h * 0.82), m.screen, x + n.x, y + n.y, z + n.z);
  scr.rotation.set(rx, ry, 0, "YXZ");
}

/* ── Builders ───────────────────────────────────────────────────────── */
type Builder = (g: THREE.Group, w: number, d: number, h: number, m: Mats, adjustable: boolean) => void;

const BUILDERS: Record<string, Builder> = {
  powerRack(g, w, d, h, m) {
    const p = 3;
    const px = w / 2 - p / 2 - 1.3;
    const rz = -(d / 2 - p / 2 - 1.3);
    const fz = d / 2 - p / 2 - 5; // set back so the J-cups stay inside the footprint
    const span = fz - rz;
    for (const sx of [-1, 1]) for (const z of [rz, fz]) upright(g, m, sx * px, z, h, p);
    for (const z of [rz, fz]) {
      boxAt(g, m.frame, 2 * px - p, p, p, 0, h - p / 2, z);
      for (const sx of [-1, 1]) for (const k of [-0.7, 0.7]) bolt(g, m, sx * (px - p), h - p / 2 + k, z + p / 2 + 0.05);
    }
    for (const sx of [-1, 1]) {
      boxAt(g, m.frame, p, p, span - p, sx * px, h - p / 2, (rz + fz) / 2);
      boxAt(g, m.frame, p, 2, span - p, sx * px, 1.6, (rz + fz) / 2); // floor rail
    }
    boxAt(g, m.frame, 2 * px - p, 2, p, 0, 1.6, rz);
    cylAt(g, m.knurl, 0.64, 2 * px - p, 0, h - p - 3.4, fz, "x", 22); // pull-up bar
    for (const sx of [-1, 1]) boxAt(g, m.steel, 0.4, 3.6, 2.4, sx * (px - p / 2 - 0.2), h - p - 2.2, fz);
    const jY = h * 0.56;
    for (const sx of [-1, 1]) {
      jCup(g, m, sx * px, jY, fz + p / 2);
      boxAt(g, m.steel, 2.5, 2, span + p, sx * (px - p / 2 - 1.6), jY - 15, (rz + fz) / 2); // spotter arm
      boxAt(g, m.accent, 2.1, 0.25, span, sx * (px - p / 2 - 1.6), jY - 13.9, (rz + fz) / 2);
    }
  },
  halfRack(g, w, d, h, m) {
    const p = 3;
    const px = w / 2 - p / 2 - 1.3;
    const rz = -(d / 2 - p / 2 - 1.3);
    const fz = d / 2 - p / 2 - 5;
    const shortH = h * 0.56;
    for (const sx of [-1, 1]) {
      upright(g, m, sx * px, rz, h, p);
      upright(g, m, sx * px, fz, shortH, p);
      boxAt(g, m.frame, p, 2, fz - rz, sx * px, 1.6, (rz + fz) / 2);
      tube(g, m.frame, 1, V(sx * px, h * 0.72, rz + 1), V(sx * px, shortH - 1, fz - 1));
      jCup(g, m, sx * px, shortH - 6, fz + p / 2);
    }
    boxAt(g, m.frame, 2 * px - p, p, p, 0, h - p / 2, rz);
    boxAt(g, m.frame, 2 * px - p, 2, p, 0, 1.6, rz);
    cylAt(g, m.knurl, 0.64, 2 * px - p, 0, h - p - 3, rz + p, "x", 22);
  },
  squatStand(g, w, d, h, m) {
    const p = 3;
    const x = w / 2 - 6;
    const cupY = h * 0.72;
    for (const sx of [-1, 1]) {
      upright(g, m, sx * x, 0, h, p, false);
      boxAt(g, m.frame, p + 1, 2, d * 0.86, sx * x, 1.2, 0);
      for (const sz of [-1, 1]) boxAt(g, m.rubber, p + 1.2, 0.5, 3, sx * x, 0.25, sz * d * 0.4);
      tube(g, m.frame, 0.9, V(sx * x, 1.8, d * 0.34), V(sx * x, 16, p / 2));
      tube(g, m.frame, 0.9, V(sx * x, 1.8, -d * 0.34), V(sx * x, 16, -p / 2));
      jCup(g, m, sx * x, cupY, p / 2);
    }
    boxAt(g, m.frame, 2 * x, p, p, 0, 5, 0);
  },
  wallRack(g, w, d, h, m) {
    const zBack = -(d / 2 - 1.1);
    const zPost = d / 2 - 6.5;
    const x = w / 2 - 4;
    for (const sx of [-1, 1]) {
      boxAt(g, m.steel, 4, h, 1, sx * x, h / 2, zBack - 0.4);
      for (let y = 8; y < h; y += 26) bolt(g, m, sx * x, y, zBack + 0.15);
      upright(g, m, sx * x, zPost, h * 0.92, 3, false);
      tube(g, m.frame, 1, V(sx * x, h - 6, zBack), V(sx * x, h * 0.86, zPost));
      tube(g, m.frame, 1, V(sx * x, 8, zBack), V(sx * x, 6, zPost));
      cylAt(g, m.steel, 0.9, 4, sx * x, h - 6, zBack + 1, "x", 16);
      jCup(g, m, sx * x, h * 0.58, zPost + 1.5);
    }
    boxAt(g, m.frame, w, 3, 1.4, 0, h - 2, zBack);
    cylAt(g, m.knurl, 0.64, 2 * x - 3, 0, h - 7, zPost, "x", 22);
  },
  functionalTrainer(g, w, d, h, m) {
    const tw = Math.min(14, w / 4);
    const tx = w / 2 - tw / 2;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) boxAt(g, m.frame, 3, h, 2.4, sx * tx + sz * (tw / 2 - 1.5), h / 2, -d * 0.24);
      for (const sz of [-1, 1]) boxAt(g, m.frame, tw, 2.6, 2.4, sx * tx, sz > 0 ? h - 1.3 : 1.3, -d * 0.24);
      boxAt(g, m.frame, tw, 1.6, d * 0.9, sx * tx, 0.8, 0);
      weightStack(g, m, tw * 0.56, sx * tx, -d * 0.24, h * 0.5);
      const carrX = sx * (tx - tw * 0.5 - 1.4);
      boxAt(g, m.frame, 3, h - 4, 3, carrX, h / 2, d * 0.16); // adjuster column
      holeRow(g, m, carrX, d * 0.16 + 1.52, "z", 1, 10, h - 12, 4);
      boxAt(g, m.accent, 4, 8, 4, carrX, h * 0.56, d * 0.16); // carriage
      cylAt(g, m.accent, 0.7, 2, carrX, h * 0.56, d * 0.16 + 2.8, "z", 14);
      pulley(g, m, 2.1, carrX, h * 0.56 - 6, d * 0.16 + 3.2);
      cable(g, m, V(carrX, h * 0.56 - 8, d * 0.16 + 3.2), V(carrX, 22, d * 0.16 + 4.4));
      handle(g, m, carrX, 18, d * 0.16 + 4.4);
      cable(g, m, V(sx * tx, h - 3, -d * 0.24), V(carrX, h - 3, d * 0.16));
      tube(g, m.frame, 1.2, V(sx * tx, h - 2.5, -d * 0.24 + 1), V(carrX, h - 2.5, d * 0.16));
    }
    boxAt(g, m.frame, 2 * tx - 3, 3, 3, 0, h - 1.6, -d * 0.24);
    bent(g, m.knurl, 0.62, [V(-(tx - tw / 2 - 2), h - 6, d * 0.1), V(-(tx - tw) * 0.6, h - 8.4, d * 0.16), V((tx - tw) * 0.6, h - 8.4, d * 0.16), V(tx - tw / 2 - 2, h - 6, d * 0.1)]);
  },
  allInOne(g, w, d, h, m) {
    const p = 3;
    const px = w / 2 - p / 2 - 1;
    const rz = -(d / 2 - 3);
    const fz = d / 2 - 6.5;
    for (const sx of [-1, 1]) {
      upright(g, m, sx * px, rz, h, p);
      upright(g, m, sx * px, fz, h, p);
      boxAt(g, m.frame, p, p, fz - rz - p, sx * px, h - p / 2, 0);
      boxAt(g, m.frame, p, 2, fz - rz - p, sx * px, 1.6, 0);
      weightStack(g, m, 9, sx * (px - 8), rz + 6, h * 0.5);
      for (const s of [-1, 1]) boxAt(g, m.frame, 2, h * 0.72, 2, sx * (px - 8) + s * 5.6, h * 0.36, rz + 2.4);
      tube(g, m.chrome, 0.62, V(sx * (px - 5), 3, 2), V(sx * (px - 5), h - 4, 8)); // smith runners
      boxAt(g, m.steel, 3.4, 5, 3, sx * (px - 5), h * 0.52, 5);
      pulley(g, m, 2, sx * (px - 3), h * 0.22, fz + p / 2 + 1);
      cable(g, m, V(sx * (px - 3), h * 0.22 - 2, fz + p / 2 + 1), V(sx * (px - 3), 14, fz + p / 2 + 1.8));
      handle(g, m, sx * (px - 3), 10, fz + p / 2 + 1.8);
      jCup(g, m, sx * px, h * 0.72, fz + p / 2);
      boxAt(g, m.frame, 2 * px - p, p, p, 0, h - p / 2, sx > 0 ? fz : rz);
    }
    cylAt(g, m.chrome, 0.8, 2 * px - 7, 0, h * 0.52, 5, "x", 22); // smith bar
    for (const sx of [-1, 1]) plate(g, m, 7.6, 1.8, sx * (px - 11), h * 0.52, 5);
    cylAt(g, m.knurl, 0.64, 2 * px - p, 0, h - p - 3.2, fz, "x", 22);
    boxAt(g, m.frame, 2 * px - p, 2, p, 0, 1.6, rz);
    pulley(g, m, 2, 0, 8, fz);
  },
  cableTower(g, w, d, h, m) {
    const fw = w * 0.5;
    for (const sz of [-1, 1]) for (const sx of [-1, 1]) boxAt(g, m.frame, 2.6, h, 2.2, sx * (fw / 2 - 1.3), h / 2, sz * d * 0.2);
    boxAt(g, m.frame, fw, 3, d * 0.4 + 2.2, 0, h - 1.5, 0);
    boxAt(g, m.frame, w * 0.9, 1.8, d * 0.86, 0, 0.9, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) boxAt(g, m.rubber, 3, 0.5, 3, sx * w * 0.38, 0.25, sz * d * 0.36);
    weightStack(g, m, fw * 0.6, 0, -d * 0.02, h * 0.55);
    boxAt(g, m.frame, 3.2, h - 4, 3, 0, h / 2, d * 0.3);
    holeRow(g, m, 0, d * 0.3 + 1.52, "z", 1, 8, h - 10, 3);
    boxAt(g, m.accent, 4.6, 9, 4.2, 0, h * 0.6, d * 0.3);
    cylAt(g, m.accent, 0.7, 2.2, 0, h * 0.6, d * 0.3 + 2.8, "z", 14);
    pulley(g, m, 2.2, 0, h * 0.6 - 7, d * 0.3 + 2.8);
    cable(g, m, V(0, h * 0.6 - 9, d * 0.3 + 2.8), V(0, h * 0.36, d * 0.3 + 4.4));
    handle(g, m, 0, h * 0.32, d * 0.3 + 4.4);
    pulley(g, m, 2.4, 0, h - 5, d * 0.16);
  },
  homeGym(g, w, d, h, m) {
    const rz = -(d / 2 - 5);
    for (const sx of [-1, 1]) boxAt(g, m.frame, 2.6, h, 2.6, sx * w * 0.16, h / 2, rz);
    boxAt(g, m.frame, w * 0.34, 3, 3, 0, h - 1.5, rz);
    boxAt(g, m.frame, w * 0.42, 1.8, d * 0.2, 0, 0.9, rz);
    boxAt(g, m.frame, 4, 2, d * 0.74, 0, 1.4, d * 0.04); // base spine
    boxAt(g, m.frame, w * 0.5, 1.8, 3, 0, 0.9, d / 2 - 5);
    weightStack(g, m, w * 0.17, 0, rz, h * 0.52);
    pulley(g, m, 2.2, 0, h - 5, rz + 3);
    tube(g, m.frame, 1.3, V(0, 2, d * 0.14), V(0, 15, d * 0.2)); // seat post
    padAt(g, m, w * 0.28, 3.4, d * 0.28, 0, 18, d * 0.18);
    tube(g, m.frame, 1.3, V(0, 2, -d * 0.02), V(0, h * 0.56, -d * 0.12)); // mast
    padAt(g, m, w * 0.24, 3, d * 0.34, 0, h * 0.42, -d * 0.04, 0, Math.PI / 2 - 0.08);
    for (const sx of [-1, 1]) {
      const pivot = V(sx * w * 0.06, h * 0.72, -d * 0.12);
      const grip = V(sx * w * 0.3, h * 0.54, d * 0.26);
      bent(g, m.steel, 0.95, [pivot, V(sx * w * 0.24, h * 0.72, d * 0.02), grip]);
      cylAt(g, m.rubber, 1.15, 5.5, grip.x, grip.y, grip.z, "y", 18);
    }
    cylAt(g, m.steel, 1.2, w * 0.14, 0, h * 0.72, -d * 0.12, "x", 18);
    tube(g, m.frame, 1.1, V(0, 14, d * 0.3), V(0, 8, d / 2 - 3));
    for (const sy of [-1, 1]) cylAt(g, m.rubber, 2.3, w * 0.24, 0, 8 + sy * 3.6, d / 2 - 3, "x", 26);
    cylAt(g, m.steel, 0.5, w * 0.26, 0, 8, d / 2 - 3, "x", 12);
    cable(g, m, V(0, h - 7, rz + 3), V(0, h * 0.72, -d * 0.1));
  },
  wallUnit(g, w, d, h, m) {
    const z = -(d / 2 - 1.3);
    boxAt(g, m.plastic, w * 0.52, h, 2.6, 0, h / 2, z);
    boxAt(g, m.seam, w * 0.5, h * 0.97, 0.1, 0, h / 2, z + 1.34);
    const scr = put(g, new THREE.PlaneGeometry(w * 0.44, h * 0.62), m.screen, 0, h * 0.58, z + 1.42);
    scr.rotation.y = 0;
    for (const sx of [-1, 1]) {
      const shoulder = V(sx * w * 0.27, h * 0.52, z + 1);
      const elbow = V(sx * w * 0.36, h * 0.4, d * 0.05);
      const hand = V(sx * w * 0.32, h * 0.28, d * 0.34);
      cylAt(g, m.steel, 1.5, 2.8, shoulder.x, shoulder.y, shoulder.z, "x", 20);
      tube(g, m.plastic, 1.05, shoulder, elbow);
      cylAt(g, m.steel, 1.25, 2.6, elbow.x, elbow.y, elbow.z, "x", 20);
      tube(g, m.plastic, 0.92, elbow, hand);
      cable(g, m, hand, V(hand.x, hand.y - 6, hand.z + 1));
      handle(g, m, hand.x, hand.y - 9, hand.z + 1);
    }
  },
  plateRow(g, w, d, h, m) {
    boxAt(g, m.frame, 4, 2.4, d * 0.86, 0, 1.4, 0);
    boxAt(g, m.frame, w * 0.5, 1.8, 3, 0, 1, d * 0.34);
    boxAt(g, m.frame, w * 0.5, 1.8, 3, 0, 1, -d * 0.34);
    tube(g, m.frame, 1.5, V(0, 2, d * 0.26), V(0, 15, d * 0.22));
    padAt(g, m, 12, 3, 12, 0, 17, d * 0.22);
    tube(g, m.frame, 1.7, V(0, 2, -d * 0.06), V(0, h * 0.72, -d * 0.12));
    padAt(g, m, 12, 3, h * 0.34, 0, h * 0.68, -d * 0.06, 0, Math.PI / 2 - 0.1);
    for (const sx of [-1, 1]) {
      const pivot = V(sx * 4, 4, -d * 0.3);
      const horn = V(sx * (w / 2 - 9), h * 0.42, -d * 0.18);
      cylAt(g, m.steel, 1.6, 3, pivot.x, pivot.y, pivot.z, "x", 20);
      bent(g, m.frame, 1.25, [pivot, V(sx * 7, h * 0.3, -d * 0.28), horn]);
      cylAt(g, m.steel, 1, 7, horn.x + sx * 2.6, horn.y, horn.z, "x", 22);
      plate(g, m, 8.86, 2.6, horn.x + sx * 2, horn.y, horn.z);
      plate(g, m, 7.6, 1.8, horn.x + sx * 4.3, horn.y, horn.z);
      bent(g, m.steel, 0.65, [V(horn.x, horn.y + 1, horn.z), V(horn.x - sx * 2, horn.y + 5, horn.z + 5), V(horn.x - sx * 3.4, horn.y + 8, horn.z + 9)]);
      cylAt(g, m.rubber, 0.92, 5, horn.x - sx * 3.6, horn.y + 8.4, horn.z + 9.6, "y", 18);
    }
  },
  legPress(g, w, d, h, m) {
    boxAt(g, m.frame, w * 0.8, 2.6, d * 0.3, 0, 1.4, d * 0.3);
    for (const sx of [-1, 1]) {
      const a = V(sx * w * 0.24, 3, d * 0.36), b = V(sx * w * 0.24, h * 0.92, -d * 0.36);
      tube(g, m.chrome, 1, a, b);
      tube(g, m.frame, 1.5, V(sx * (w * 0.24 + 3), 3, d * 0.36), V(sx * (w * 0.24 + 3), h * 0.92, -d * 0.36));
      tube(g, m.frame, 1.3, V(sx * w * 0.3, 1, -d * 0.12), V(sx * (w * 0.24 + 3), h * 0.54, -d * 0.22));
      boxAt(g, m.frame, 3, 1.6, d * 0.4, sx * w * 0.3, 0.9, -d * 0.2);
      cylAt(g, m.steel, 1, 9, sx * (w * 0.3 + 2), h * 0.6, -d * 0.24, "x", 22);
      plate(g, m, 8.86, 2.6, sx * (w * 0.3 + 2), h * 0.6, -d * 0.24);
      plate(g, m, 7.6, 1.8, sx * (w * 0.3 + 4.4), h * 0.6, -d * 0.24);
      bent(g, m.steel, 0.65, [V(sx * w * 0.3, 7, d * 0.3), V(sx * w * 0.32, 14, d * 0.34), V(sx * w * 0.28, 16, d * 0.42)]);
    }
    const sled = boxAt(g, m.frame, w * 0.5, d * 0.42, 2, 0, h * 0.66, -d * 0.2);
    sled.rotation.x = -Math.PI / 4.5;
    const tread = boxAt(g, m.rubber, w * 0.46, d * 0.38, 0.5, 0, h * 0.665, -d * 0.19);
    tread.rotation.x = -Math.PI / 4.5;
    padAt(g, m, w * 0.36, 3.2, d * 0.26, 0, 11, d * 0.3);
    padAt(g, m, w * 0.36, 3.2, d * 0.32, 0, 11 + d * 0.13, d * 0.39, 0, Math.PI / 2 - 0.5);
    tube(g, m.frame, 1.2, V(0, 3, d * 0.3), V(0, 9, d * 0.3));
  },
  ghd(g, w, d, h, m) {
    boxAt(g, m.frame, 3, 2.4, d * 0.8, 0, 4.6, 0);
    for (const sz of [-1, 1]) {
      boxAt(g, m.frame, w * 0.56, 1.8, 2.6, 0, 1, sz * (d / 2 - 4));
      for (const sx of [-1, 1]) boxAt(g, m.rubber, 3, 0.5, 3, sx * w * 0.24, 0.25, sz * (d / 2 - 4));
      tube(g, m.frame, 1.1, V(0, 4.6, sz * d * 0.24), V(0, sz > 0 ? h - 7 : h * 0.5, sz * (d / 2 - 9)));
    }
    for (const sx of [-1, 1]) cylAt(g, m.pad, 4.6, w * 0.14, sx * w * 0.085, h - 4.6, d * 0.2, "x", 32);
    cylAt(g, m.steel, 0.8, w * 0.34, 0, h - 4.6, d * 0.2, "x", 16);
    boxAt(g, m.steel, w * 0.34, 0.8, 8, 0, h * 0.52, -(d / 2 - 6));
    boxAt(g, m.rubber, w * 0.3, 0.3, 7.4, 0, h * 0.52 + 0.5, -(d / 2 - 6));
    for (const sy of [-1, 1])
      for (const sx of [-1, 1]) cylAt(g, m.rubber, 1.9, 4, sx * 5.5, h * 0.52 + sy * 3.8 + 1, -(d / 2 - 6) - 4, "x", 24);
  },
  treadmill(g, w, d, h, m) {
    boxAt(g, m.plastic, w * 0.92, 3.6, d * 0.9, -w * 0.02, 3.4, 0);
    boxAt(g, m.rubber, w * 0.8, 0.4, d * 0.62, -w * 0.06, 5.4, 0);
    for (const sz of [-1, 1]) {
      boxAt(g, m.steel, w * 0.82, 0.4, d * 0.1, -w * 0.05, 5.5, sz * d * 0.37);
      boxAt(g, m.frame, 3, 1.5, 3, -w * 0.4, 0.8, sz * d * 0.36);
      boxAt(g, m.frame, 3, 1.5, 3, w * 0.3, 0.8, sz * d * 0.36);
    }
    cylAt(g, m.steel, 1.8, d * 0.72, -(w / 2 - 5), 3.8, 0, "z", 26);
    boxAt(g, m.plastic, w * 0.2, 8, d * 0.9, w / 2 - w * 0.12, 6, 0);
    boxAt(g, m.accent, w * 0.2, 0.4, d * 0.92, w / 2 - w * 0.12, 7.9, 0);
    for (const sz of [-1, 1]) {
      const zOut = sz * (d / 2 - 4);
      tube(g, m.frame, 1.5, V(w / 2 - 9, 8, zOut), V(w / 2 - 4, h - 14, zOut));
      bent(g, m.frame, 0.9, [V(w / 2 - 4, h - 13, zOut), V(w / 2 - 10, h - 15, zOut), V(w * 0.14, h * 0.6, zOut), V(w * 0.08, h * 0.54, zOut)]);
      cylAt(g, m.rubber, 1.05, 11, w * 0.2, h * 0.64 + 0.5, zOut, "x", 18);
    }
    boxAt(g, m.frame, 3, 3, d - 8, w / 2 - 4, h - 13, 0);
    consoleAt(g, m, d * 0.66, d * 0.34, w / 2 - 5, h - 6, 0, -Math.PI / 2, -0.42);
  },
  rower(g, w, d, h, m) {
    const fx = -(w / 2 - 10);
    const r = Math.min(d * 0.42, h * 0.42);
    const cy = r + 3;
    fanWheel(g, m, r, fx, cy, 0);
    for (const s of [-1, 1]) cylAt(g, m.plastic, r * 1.04, 0.5, fx + s * r * 0.24, cy, 0, "x", 40);
    latheAt(g, m.accent, [[r * 0.2, -0.3], [r * 0.5, -0.3], [r * 0.5, 0.3], [r * 0.2, 0.3]], fx + r * 0.24 + 0.3, cy, 0, "x", 32);
    boxAt(g, m.steel, w * 0.68, 1.2, 3, w * 0.12, 11.4, 0); // aluminium rail
    boxAt(g, m.chrome, w * 0.66, 0.3, 1.4, w * 0.12, 12.1, 0);
    for (const [x, sp] of [[fx + 7, 0.44], [w / 2 - 5, 0.36]] as const) {
      boxAt(g, m.frame, 3, 1.6, d * 2 * sp, x, 1.2, 0);
      for (const sz of [-1, 1]) boxAt(g, m.rubber, 3.2, 0.5, 2.6, x, 0.25, sz * d * sp);
      tube(g, m.frame, 1, V(x, 2, 0), V(x, 11, 0));
    }
    padAt(g, m, 8, 1.9, 9, w * 0.12, 14.1, 0);
    for (const k of [-1, 1]) cylAt(g, m.plastic, 0.9, 1, w * 0.12 + k * 3, 12.8, 0, "z", 16);
    for (const sz of [-1, 1]) {
      const fr = boxAt(g, m.plastic, 0.8, 11, 5.4, fx + r + 5, 11, sz * 3.6);
      fr.rotation.z = -0.55;
      const strap = boxAt(g, m.seam, 1.5, 0.3, 5.8, fx + r + 4.4, 12.6, sz * 3.6);
      strap.rotation.z = -0.55;
    }
    cylAt(g, m.steel, 0.5, d * 0.5, fx + r + 9, 16, 0, "z", 14);
    for (const s of [-1, 1]) cylAt(g, m.rubber, 0.75, d * 0.14, fx + r + 9, 16, s * d * 0.18, "z", 16);
    tube(g, m.steel, 0.14, V(fx, cy, 0), V(fx + r + 9, 16, 0), 6);
    tube(g, m.frame, 0.7, V(fx + 2, cy + r, 0), V(fx + 7, h - 5, 0));
    consoleAt(g, m, 5, 4.2, fx + 7.5, h - 2.4, 0, Math.PI / 2, -0.2);
  },
  skiErg(g, w, d, h, m) {
    boxAt(g, m.frame, w * 0.72, 1.4, d, 0, 0.8, 0);
    boxAt(g, m.rubber, w * 0.5, 0.3, d * 0.5, 0, 1.6, d * 0.14);
    const z = -(d / 2 - 3);
    for (const sx of [-1, 1]) tube(g, m.frame, 1.3, V(sx * w * 0.3, 1, d * 0.3), V(sx * w * 0.14, h * 0.7, z));
    boxAt(g, m.frame, w * 0.5, h * 0.42, 3, 0, h * 0.74, z);
    boxAt(g, m.steel, w * 0.52, 0.5, 3.2, 0, h * 0.54, z);
    const r = w * 0.2;
    fanWheel(g, m, r, 0, h * 0.84, z + 2, "z");
    consoleAt(g, m, 5, 4.2, 0, h * 0.62, z + 2.2);
    for (const sx of [-1, 1]) {
      pulley(g, m, 1.5, sx * w * 0.12, h * 0.93, z + 1.8);
      cable(g, m, V(sx * w * 0.12, h * 0.93, z + 2), V(sx * w * 0.2, h * 0.5, d * 0.12));
      cylAt(g, m.rubber, 0.8, 4.6, sx * w * 0.2, h * 0.47, d * 0.13, "y", 16);
    }
  },
  airBike(g, w, d, h, m) {
    const r = Math.min(h * 0.3, d * 0.47);
    const fx = -(w / 2 - r - 1);
    const cy = r + 5;
    fanWheel(g, m, r, fx, cy, 0);
    for (const x of [fx, w * 0.32]) {
      boxAt(g, m.frame, 2.6, 2, d * 0.92, x, 1.4, 0);
      for (const s of [-1, 1]) boxAt(g, m.rubber, 3, 0.5, 3, x, 0.25, s * d * 0.42);
    }
    tube(g, m.frame, 1.5, V(fx, 3, 0), V(w * 0.32, 3, 0));
    tube(g, m.frame, 1.4, V(w * 0.08, 3, 0), V(w * 0.22, h * 0.58, 0));
    saddle(g, m, w * 0.24, h * 0.63, 0);
    tube(g, m.frame, 1.3, V(fx + r * 0.9, 3, 0), V(fx + r * 1.15, h * 0.72, 0));
    for (const s of [-1, 1]) {
      const a = V(fx + r * 0.95, 11, s * 3);
      bent(g, m.steel, 0.72, [a, V(fx + r * 1.15, h * 0.55, s * 4), V(fx + r * 1.35, h * 0.88, s * d * 0.28)]);
      cylAt(g, m.rubber, 0.95, 6, fx + r * 1.38, h * 0.9, s * d * 0.28, "y", 18);
      pedal(g, m, w * 0.04 + s * 3, 10 - s * 4, s * 3.4, s);
      tube(g, m.steel, 0.5, V(w * 0.04, 10, s * 3), V(w * 0.04 + s * 3, 10 - s * 4, s * 3.4), 10);
    }
    cylAt(g, m.dark, 3.6, 3, w * 0.04, 10, 0, "z", 30);
    consoleAt(g, m, 5.5, 4.2, fx + r * 1.2, h * 0.8, 0, Math.PI / 2, -0.3);
  },
  spinBike(g, w, d, h, m) {
    const fwx = -w * 0.22;
    const fr = h * 0.22;
    const cy = fr + 3;
    latheAt(g, m.chrome, [[0, -1.5], [fr * 0.8, -1.5], [fr * 0.86, -1.1], [fr, -1], [fr, 1], [fr * 0.86, 1.1], [fr * 0.8, 1.5], [0, 1.5]], fwx, cy, 0, "z", 48);
    cylAt(g, m.steel, 1.4, 4.4, fwx, cy, 0, "z", 20);
    for (const s of [-1, 1]) boxAt(g, m.frame, fr * 1.3, 1.6, 0.4, fwx + fr * 0.55, cy + 0.6, s * 2);
    const sx = w * 0.26;
    const bx = -w * 0.28;
    for (const s of [-1, 1]) {
      boxAt(g, m.frame, 2.6, 2, d * 0.95, s * w * 0.34, 1.4, 0);
      for (const k of [-1, 1]) boxAt(g, m.rubber, 2.8, 0.5, 3, s * w * 0.34, 0.25, k * d * 0.42);
    }
    tube(g, m.frame, 1.3, V(-w * 0.34, 3, 0), V(w * 0.34, 3, 0));
    tube(g, m.frame, 1.6, V(w * 0.02, h * 0.2, 0), V(sx, h * 0.56, 0));
    tube(g, m.frame, 1.6, V(w * 0.02, h * 0.2, 0), V(bx + 4, h * 0.6, 0));
    tube(g, m.frame, 1.3, V(w * 0.02, h * 0.2, 0), V(w * 0.02, 3, 0));
    saddle(g, m, sx, h * 0.64, 0, 1);
    tube(g, m.steel, 0.75, V(sx, h * 0.55, 0), V(sx, h * 0.62, 0), 14);
    tube(g, m.steel, 0.8, V(bx + 4, h * 0.6, 0), V(bx + 3.6, h * 0.72, 0), 14);
    const by = h * 0.73;
    bent(g, m.rubber, 0.62, [V(bx - 5, by + 3, -d * 0.2), V(bx + 2, by + 0.5, -d * 0.3), V(bx + 4, by, 0), V(bx + 2, by + 0.5, d * 0.3), V(bx - 5, by + 3, d * 0.2)]);
    consoleAt(g, m, 4.2, 3.2, bx + 3, by + 4, 0, -Math.PI / 2, -0.35);
    cylAt(g, m.dark, 3.2, 2.2, w * 0.02, h * 0.2, 0, "z", 30);
    for (const s of [-1, 1]) {
      tube(g, m.steel, 0.5, V(w * 0.02, h * 0.2, s * 1.4), V(w * 0.02 + s * 2.4, h * 0.2 - s * 4, s * 2.4), 10);
      pedal(g, m, w * 0.02 + s * 2.4, h * 0.2 - s * 4, s * 2.6, s);
    }
  },
  elliptical(g, w, d, h, m) {
    boxAt(g, m.frame, w * 0.9, 3, d * 0.3, 0, 2, 0);
    for (const x of [-w * 0.42, w * 0.42]) {
      boxAt(g, m.frame, 3, 1.8, d * 0.92, x, 1, 0);
      for (const s of [-1, 1]) boxAt(g, m.rubber, 3.2, 0.5, 3, x, 0.25, s * d * 0.42);
    }
    const cr = h * 0.17;
    latheAt(g, m.plastic, [[0, -d * 0.2], [cr * 0.94, -d * 0.2], [cr, -d * 0.18], [cr, d * 0.18], [cr * 0.94, d * 0.2], [0, d * 0.2]], -w * 0.32, cr + 2, 0, "z", 48);
    for (const s of [-1, 1]) torusAt(g, m.accent, cr * 0.72, 0.28, -w * 0.32, cr + 2, s * (d * 0.2 + 0.1), false);
    tube(g, m.frame, 1.6, V(w * 0.1, 3, 0), V(w * 0.34, h * 0.56, 0));
    for (const s of [-1, 1]) {
      const px = -s * w * 0.05;
      const py = 9 + s * 2;
      const zz = s * d * 0.25;
      boxAt(g, m.steel, w * 0.3, 0.7, 7, px, py - 0.6, zz);
      boxAt(g, m.rubber, w * 0.27, 0.5, 6.4, px, py, zz);
      tube(g, m.frame, 0.85, V(-w * 0.32, cr + 2, zz), V(px, py - 1, zz));
      bent(g, m.frame, 0.85, [V(px + w * 0.1, py, zz), V(w * 0.18, h * 0.42, zz), V(w * 0.28, h * 0.64 + s * 4, zz)]);
      cylAt(g, m.rubber, 1, 8, w * 0.285, h * 0.68 + s * 4, zz, "y", 18);
      bent(g, m.chrome, 0.7, [V(w * 0.34, h * 0.56, 0), V(w * 0.3, h * 0.54, s * d * 0.14), V(w * 0.24, h * 0.5, s * d * 0.2)]);
    }
    boxAt(g, m.frame, 3, 5, 3, w * 0.35, h * 0.6, 0);
    consoleAt(g, m, d * 0.34, h * 0.12, w * 0.37, h * 0.68, 0, Math.PI / 2, -0.4);
  },
  bench(g, w, d, h, m, adjustable) {
    /* footprint long axis = w */
    const padTop = h;
    const padT = 3.2;
    const padY = padTop - padT / 2;
    const padD = Math.min(d * 0.62, 12);
    const spineY = h * 0.42;
    if (adjustable) {
      padAt(g, m, w * 0.28, padT, padD, -w * 0.28, padY, 0);
      const backLen = w * 0.56;
      const tilt = 0.5;
      const cx = -w * 0.1 + (Math.cos(tilt) * backLen) / 2;
      /* The raised back stays under the height the room check uses. */
      padAt(g, m, backLen, padT, padD, cx, padY - 2 + (Math.sin(tilt) * backLen) / 2.6, 0, tilt * 0.62);
      tube(g, m.steel, 0.9, V(w * 0.02, spineY + 1, 0), V(w * 0.2, padY - 1, 0));
      for (let i = 0; i < 6; i++) boxAt(g, m.steel, 1.4, 0.5, 2.6, -w * 0.02 + i * 2.6, spineY + 2 + i * 0.4, 0);
    } else {
      padAt(g, m, w * 0.68, padT, padD, -w * 0.08, padY, 0);
      padAt(g, m, w * 0.24, padT, padD, w * 0.3, padY, 0);
    }
    boxAt(g, m.frame, w * 0.74, 2.6, 2.6, -w * 0.02, spineY, 0);
    for (const k of [-0.2, 0.08]) tube(g, m.frame, 1, V(w * k, spineY + 1, 0), V(w * k, padY - 1, 0));
    tube(g, m.frame, 1.2, V(-w * 0.28, spineY, 0), V(-w * 0.42, 2, 0));
    tube(g, m.frame, 1.2, V(w * 0.26, spineY, 0), V(w * 0.38, 2, 0));
    for (const x of [-w * 0.42, w * 0.38]) {
      boxAt(g, m.frame, 2.4, 1.8, d * 0.9, x, 1.2, 0);
      for (const s of [-1, 1]) boxAt(g, m.rubber, 2.8, 0.5, 3, x, 0.25, s * d * 0.4);
    }
    for (const s of [-1, 1]) {
      cylAt(g, m.rubber, 1.6, 1.3, w * 0.42, 2.2, s * d * 0.3, "z", 26);
      cylAt(g, m.steel, 0.7, 1.5, w * 0.42, 2.2, s * d * 0.3, "z", 16);
    }
    bent(g, m.steel, 0.5, [V(-w * 0.43, 2.6, -d * 0.22), V(-w * 0.46, 5, -d * 0.16), V(-w * 0.46, 5, d * 0.16), V(-w * 0.43, 2.6, d * 0.22)]);
  },
  dumbbellRack(g, w, d, h, m) {
    for (const sx of [-1, 1]) {
      tube(g, m.frame, 1.5, V(sx * (w / 2 - 2.4), 1, d * 0.42), V(sx * (w / 2 - 2.4), h - 1, -d * 0.3));
      tube(g, m.frame, 1.2, V(sx * (w / 2 - 2.4), 1, -d * 0.42), V(sx * (w / 2 - 2.4), h * 0.6, -d * 0.12));
      boxAt(g, m.frame, 4, 1.8, d * 0.96, sx * (w / 2 - 2.4), 1, 0);
      for (const sz of [-1, 1]) boxAt(g, m.rubber, 4.4, 0.5, 3, sx * (w / 2 - 2.4), 0.25, sz * d * 0.42);
    }
    const tiers: [number, number][] = [[h * 0.42, d * 0.15], [h * 0.76, -d * 0.13]];
    for (const [ti, [y, z]] of tiers.entries()) {
      for (const k of [-1, 1]) boxAt(g, m.steel, w - 5, 1, 1.6, 0, y, z + k * 3.4); // two rails
      const n = Math.max(3, Math.floor(w / 13));
      for (let i = 0; i < n; i++) {
        const x = -w / 2 + 7 + (i + 0.5) * ((w - 14) / n);
        const r = 2.1 + ((i + ti) / n) * 1.1;
        const cy = y + r * 0.92 + 0.5;
        for (const s of [-1, 1]) {
          cylAt(g, m.rubber, r, 3.2, x, cy, z + s * 4.2, "z", 6);
          cylAt(g, m.steel, r * 0.42, 3.4, x, cy, z + s * 4.2, "z", 18);
        }
        cylAt(g, m.knurl, 0.6, 5.4, x, cy, z, "z", 16);
      }
    }
  },
  /* ── Free weights, mobility gear & storage ─────────────────────────── */
  barbell(g, w, d, h, m) {
    const y = h * 0.78;
    for (const sx of [-1, 1]) {
      const x = sx * w * 0.3;
      boxAt(g, m.frame, 5, y - 1.8, d * 0.9, x, (y - 1.8) / 2, 0);
      boxAt(g, m.rubber, 5.4, 1.2, d * 0.5, x, y - 1.2, 0);
    }
    loadedBar(g, m, w * 0.47, y, 0, false);
  },
  plates(g, w, d, h, m) {
    boxAt(g, m.frame, w * 0.8, 1.6, 3.4, 0, 0.8, 0);
    boxAt(g, m.frame, 3.4, 1.6, d * 0.8, 0, 0.8, 0);
    boxAt(g, m.frame, 3, h, 3, 0, h / 2, 0);
    for (const [sx, sz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) boxAt(g, m.rubber, 3, 0.5, 3, sx * w * 0.38, 0.25, sz * d * 0.38);
    [0.34, 0.58, 0.82].forEach((t, i) => {
      const y = h * t;
      const r = Math.min(y - 0.5, h - y - 0.3, 8.86 - i * 1.25);
      for (const sz of [-1, 1]) {
        cylAt(g, m.steel, 1, d * 0.36, 0, y, sz * (d * 0.18 + 1), "z", 20);
        for (let k = 0; k < 2; k++) plate(g, m, r, 2.3, 0, y, sz * (d * 0.1 + 2 + k * 2.5), "z");
      }
    });
  },
  kettlebell(g, w, d, h, m) {
    const n = Math.max(1, Math.min(4, Math.floor((w - 2) / 10)));
    for (let i = 0; i < n; i++) {
      const r = n === 1 ? 4.4 : 3.2 + (i / (n - 1)) * 2.4;
      const x = -w / 2 + 5 + (i + 0.5) * ((w - 10) / n);
      latheAt(g, m.dark, [[0, 0], [r * 0.7, 0], [r * 0.84, r * 0.1], [r, r * 0.55], [r * 1.04, r * 0.95], [r * 0.94, r * 1.42], [r * 0.6, r * 1.8], [0, r * 1.92]], x, 0, 0, "y", 44);
      torusAt(g, m.accent, r * 1.03, 0.16, x, r * 0.95, 0, true);
      const hy = r * 1.75, hw = r * 0.68, top = Math.min(h - Math.max(0.5, r * 0.15) - 0.6, hy + r * 1.05);
      bent(g, m.dark, Math.max(0.5, r * 0.15), [V(x - hw * 0.72, hy - 0.2, 0), V(x - hw * 1.02, hy + (top - hy) * 0.5, 0), V(x - hw * 0.62, top, 0), V(x + hw * 0.62, top, 0), V(x + hw * 1.02, hy + (top - hy) * 0.5, 0), V(x + hw * 0.72, hy - 0.2, 0)], false, 16);
    }
  },
  band(g, w, d, h, m) {
    boxAt(g, m.frame, w * 0.8, 1.6, d * 0.8, 0, 0.8, 0);
    boxAt(g, m.frame, 3, h, 3, 0, h / 2, 0);
    cylAt(g, m.steel, 0.8, w * 0.8, 0, h - 1.5, 0, "x", 18);
    [[-0.3, 0xd93a3a], [-0.1, 0x1f1f24], [0.1, 0x7a3fc2], [0.3, 0x2f9c55]].forEach(([f, hex], i) => {
      const len = 13 + (i % 3) * 4;
      const x = (f as number) * w;
      const y = h - 1.5;
      bent(g, m.tint(hex as number), 0.32 + i * 0.05, [V(x, y + 1.1, 0), V(x, y, 1.15), V(x, y - len * 0.5, 1.5), V(x, y - len, 0.5), V(x, y - len - 0.4, 0), V(x, y - len, -0.5), V(x, y - len * 0.5, -1.5), V(x, y, -1.15)], true, 8);
    });
  },
  flooring(g, w, d, h, m) {
    boxAt(g, m.rubber, w, h, d, 0, h / 2, 0);
    const cols = Math.max(2, Math.round(w / 24));
    const rows = Math.max(2, Math.round(d / 24));
    for (let i = 1; i < cols; i++) boxAt(g, m.seam, 0.22, 0.1, d, -w / 2 + (i * w) / cols, h + 0.01, 0);
    for (let j = 1; j < rows; j++) boxAt(g, m.seam, w, 0.1, 0.22, 0, h + 0.01, -d / 2 + (j * d) / rows);
  },
  yogaMat(g, w, d, h, m) {
    const rr = h * 0.42;
    const flatW = w * 0.74;
    const x0 = -w * 0.12;
    boxAt(g, m.accent, flatW, 0.3, d * 0.86, x0, 0.15, 0);
    const rx = w * 0.36;
    cylAt(g, m.accent, rr, d * 0.86, rx, rr, 0, "z", 36);
    for (const s of [-1, 1]) {
      const end = put(g, new THREE.CircleGeometry(rr * 0.99, 32), m.spiral, rx, rr, s * (d * 0.43 + 0.02));
      if (s < 0) end.rotation.y = Math.PI;
    }
    for (const k of [-0.24, 0.24]) torusAt(g, m.tint(0x25272d), rr + 0.05, 0.1, rx, rr, k * d, false);
  },
  foamRoller(g, w, d, h, m) {
    const r = h * 0.42;
    const len = w * 0.72;
    const x0 = -w * 0.08;
    cylAt(g, m.accent, r, len, x0, r + 0.5, 0, "x", 36);
    const rings = Math.floor(len / 2.1);
    for (let i = 0; i < rings; i++)
      for (let k = 0; k < 14; k++) {
        const a = ((k + (i % 2) * 0.5) / 14) * Math.PI * 2;
        const nub = boxAt(g, m.tint(0x1f2128), 1.1, 0.7, 1.1, x0 - len / 2 + 1 + i * 2.1, r + 0.5 + Math.cos(a) * (r + 0.2), Math.sin(a) * (r + 0.2));
        nub.rotation.x = a;
      }
    sphereBall(g, m, r * 0.72, w * 0.38);
  },
  jumpRope(g, w, d, h, m) {
    const r = w * 0.3;
    const rope = m.tint(0x24262c);
    torusAt(g, rope, r, 0.2, 0, 0.22, 0);
    torusAt(g, rope, r * 0.8, 0.2, 1.2, 0.22, 0.6);
    torusAt(g, rope, r * 0.62, 0.2, -0.6, 0.42, -0.5);
    for (const sz of [-1, 1]) {
      cylAt(g, m.accent, 0.72, h * 1.7, w * 0.32, 0.76, sz * 2.2, "x", 20);
      cylAt(g, m.steel, 0.4, 1, w * 0.32 - h * 0.85 - 0.3, 0.76, sz * 2.2, "x", 12);
    }
  },
  storageShelf(g, w, d, h, m) {
    const px = w / 2 - 1.2;
    const pz = d / 2 - 1.2;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) boxAt(g, m.frame, 1.8, h, 1.8, sx * px, h / 2, sz * pz);
    const levels = [0.06, 0.34, 0.6, 0.86];
    for (const t of levels) {
      boxAt(g, m.frame, w, 1.1, d, 0, h * t, 0);
      for (let k = 0; k < Math.floor(w / 2.4); k++) boxAt(g, m.seam, 0.5, 0.08, d * 0.9, -w / 2 + 1.6 + k * 2.4, h * t + 0.57, 0);
    }
    const sy = (t: number) => h * t + 0.6;
    const tub = (hex: number, r: number, t: number, x: number, z: number) => {
      latheAt(g, m.tint(hex), [[0, 0], [r * 0.9, 0], [r, 0.4], [r, t - 0.4], [r * 0.9, t], [0, t]], x, sy(0.34), z, "y", 28);
      cylAt(g, m.seam, r * 1.03, 1.1, x, sy(0.34) + t + 0.5, z, "y", 28);
    };
    tub(0xe7e9ee, 3.4, 9, -w * 0.34, 0);
    tub(0xf0531e, 2.9, 7.4, -w * 0.15, d * 0.1);
    cylAt(g, m.tint(0xd8dbe2), 2.6, 5, w * 0.08, sy(0.6) + 2.5, 0, "y", 26);
    const belt = m.tint(0x4a3324);
    boxAt(g, belt, 9, 2.4, 5.5, w * 0.3, sy(0.6) + 1.2, 0);
    boxAt(g, m.steel, 1.6, 2.5, 1.6, w * 0.3 + 3, sy(0.6) + 1.2, 0);
    torusAt(g, m.tint(0x2d3a55), 2.4, 0.7, -w * 0.28, sy(0.6) + 0.7, 0);
    boxAt(g, m.tint(0x23262e), w * 0.42, 6.4, d * 0.62, w * 0.16, sy(0.06) + 3.2, 0);
    bent(g, m.seam, 0.3, [V(w * 0.02, sy(0.06) + 6.4, 0), V(w * 0.08, sy(0.06) + 8.4, 0), V(w * 0.24, sy(0.06) + 8.4, 0), V(w * 0.3, sy(0.06) + 6.4, 0)]);
    cylAt(g, m.accent, 1.6, 6, -w * 0.3, sy(0.86) + 3, 0, "y", 22);
    cylAt(g, m.seam, 1.1, 1.4, -w * 0.3, sy(0.86) + 6.7, 0, "y", 18);
  },
  box(g, w, d, h, m) {
    boxAt(g, m.accent, w, h, d, 0, h / 2, 0);
    for (const s of [-1, 1]) {
      boxAt(g, m.seam, w * 0.4, h * 0.12, 0.3, 0, h * 0.6, s * (d / 2 - 0.02));
      for (const t of [0.01, 0.99]) boxAt(g, m.frame, w + 0.2, 0.9, 1, 0, h * t, s * (d / 2 - 0.3));
    }
  },
};
function sphereBall(g: THREE.Group, m: Mats, r: number, x: number) {
  ellipsoid(g, m.tint(0x24262c), r, r, r, x, r, 0);
}

/* Project every triangle's UVs along its dominant axis, in inches, so a
   texture keeps its real size however long the part is. */
function projectUV(geo: THREE.BufferGeometry) {
  const pos = geo.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2);
    n.copy(b).sub(a).cross(c.clone().sub(a));
    const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z);
    for (let k = 0; k < 3; k++) {
      const v = k === 0 ? a : k === 1 ? b : c;
      const [s, t] = ax >= ay && ax >= az ? [v.z, v.y] : ay >= az ? [v.x, v.z] : [v.x, v.y];
      uv[(i + k) * 2] = s;
      uv[(i + k) * 2 + 1] = t;
    }
  }
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
}

/* Hundreds of parts per piece would be hundreds of draw calls on a phone, so
   each piece is merged down to one mesh per material. */
function bake(g: THREE.Group) {
  g.updateMatrixWorld(true);
  const byMat = new Map<THREE.Material, THREE.BufferGeometry[]>();
  for (const o of g.children) {
    const mesh = o as THREE.Mesh;
    const mat = mesh.material as THREE.Material;
    const geo = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
    geo.applyMatrix4(mesh.matrixWorld);
    for (const name of Object.keys(geo.attributes))
      if (!["position", "normal", "uv"].includes(name)) geo.deleteAttribute(name);
    if (!mat.userData.keepUV) projectUV(geo);
    if (!byMat.has(mat)) byMat.set(mat, []);
    byMat.get(mat)!.push(geo);
    mesh.geometry.dispose();
  }
  g.clear();
  for (const [mat, list] of byMat) {
    const merged = mergeGeometries(list, false);
    list.forEach((x) => x.dispose());
    const mesh = new THREE.Mesh(merged, mat);
    mesh.castShadow = !mat.userData.noShadow;
    mesh.receiveShadow = true;
    g.add(mesh);
  }
}

/* Listings whose name says the back pad adjusts get the inclined bench. */
const ADJUSTABLE = /adj|incline|fid|ab-?\d|nighthawk|blackwing/i;

/* Build one piece at real size. `category` picks the family colour. */
export function buildEquipmentModel(
  type: EquipmentType,
  category: string,
  w: number,
  d: number,
  h: number,
  id = "",
): THREE.Group {
  const g = new THREE.Group();
  const m = makeMats(category);
  (BUILDERS[type] ?? BUILDERS.box)(g, w, d, h, m, ADJUSTABLE.test(id));
  bake(g);
  return g;
}

export const MODEL_TYPES = Object.keys(BUILDERS);
