/* The room around the gear in the 3D view, one for each answer to "how much
   space". Everything is drawn in code, so it costs no downloads. Walls and
   floors stay mid-toned and matte and the props sit flat against the walls: the
   room says where you are, the black gear stays the brightest idea on screen.
   Each wall hides itself when the camera is behind it, like a dollhouse, so no
   wall ever sits in front of the equipment.

   Only imported from Planner3D, so three.js loads with the 3D view alone. */

import * as THREE from "three";

export type RoomSetting = "apartment-corner" | "small-room" | "garage" | "outdoor" | "studio";

export type RoomLook = {
  bg: number;
  sun: { color: number; intensity: number; dir: [number, number, number] };
  hemi: { sky: number; ground: number; intensity: number };
  env: number;
  exposure: number;
  /* Distance fades for the open-air setting; rooms have no horizon. */
  fog?: boolean;
};

const LOOKS: Record<RoomSetting, RoomLook> = {
  "apartment-corner": {
    bg: 0x20242c,
    sun: { color: 0xfff1df, intensity: 2.1, dir: [0.5, 1, 0.65] },
    hemi: { sky: 0xfff6ea, ground: 0x8a7458, intensity: 0.32 },
    env: 0.8,
    exposure: 1,
  },
  "small-room": {
    bg: 0x1d2330,
    sun: { color: 0xf6f2ff, intensity: 2, dir: [0.6, 1, 0.5] },
    hemi: { sky: 0xeef2ff, ground: 0x77736c, intensity: 0.34 },
    env: 0.8,
    exposure: 1,
  },
  garage: {
    bg: 0x171a20,
    sun: { color: 0xf3f7ff, intensity: 2.2, dir: [0.35, 1, 0.45] },
    hemi: { sky: 0xf2f6ff, ground: 0x6c6c6c, intensity: 0.36 },
    env: 0.95,
    exposure: 1.02,
  },
  outdoor: {
    bg: 0xbcd9ef,
    sun: { color: 0xfff0d8, intensity: 2.7, dir: [-0.55, 1, 0.7] },
    hemi: { sky: 0xcfe6ff, ground: 0x7d8b58, intensity: 0.42 },
    env: 0.85,
    exposure: 0.98,
    fog: true,
  },
  studio: {
    bg: 0x9aa3b0,
    sun: { color: 0xfff6ec, intensity: 1.7, dir: [0.6, 1, 0.4] },
    hemi: { sky: 0xffffff, ground: 0x8f98a6, intensity: 0.3 },
    env: 0.75,
    exposure: 0.97,
  },
};

export type BuiltRoom = {
  group: THREE.Group;
  /* Walls to hide while the camera is behind them. */
  walls: { group: THREE.Group; point: THREE.Vector3; normal: THREE.Vector3 }[];
  look: RoomLook;
  textures: THREE.Texture[];
};

const WALL_H = 96;

export function lookOf(setting: RoomSetting) {
  return LOOKS[setting];
}

export function isRoomSetting(v: string | null | undefined): v is RoomSetting {
  return !!v && v in LOOKS;
}

/* What the metal reflects: the same room, roughly, with its light sources. */
export function buildEnvScene(setting: RoomSetting): THREE.Scene {
  const scene = new THREE.Scene();
  const look: Record<RoomSetting, { wall: number; floor: number; ceil: number; lights: [number, number[], number[]][] }> = {
    "apartment-corner": { wall: 0x8e917f, floor: 0x7d5f40, ceil: 0xd9d4c8, lights: [[14, [0, 2, -9.4], [7, 5, 0.1]], [3, [0, 9.4, 0], [8, 0.1, 8]]] },
    "small-room": { wall: 0x7c8797, floor: 0x7c7770, ceil: 0xd5d8df, lights: [[12, [-3, 2, -9.4], [6, 5, 0.1]], [3.5, [0, 9.4, 0], [7, 0.1, 7]]] },
    garage: { wall: 0x8a8d90, floor: 0x77797c, ceil: 0x66696d, lights: [[18, [-4, 9.4, 0], [1, 0.1, 14]], [18, [4, 9.4, 0], [1, 0.1, 14]], [4, [0, 1, -9.4], [12, 7, 0.1]]] },
    outdoor: { wall: 0x9cc4e4, floor: 0x74824f, ceil: 0xd8ecff, lights: [[40, [-6, 9.4, 6], [3, 0.1, 3]]] },
    studio: { wall: 0x7d848f, floor: 0x6b727d, ceil: 0xa6acb6, lights: [[4, [0, 9.4, 0], [10, 0.1, 10]], [3, [9.4, 3, 0], [0.1, 6, 8]]] },
  };
  const c = look[setting];
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(20, 20, 20),
    [c.wall, c.wall, c.ceil, c.floor, c.wall, c.wall].map(
      (hex) => new THREE.MeshBasicMaterial({ color: hex, side: THREE.BackSide }),
    ),
  );
  scene.add(box);
  for (const [power, pos, size] of c.lights) {
    const mat = new THREE.MeshBasicMaterial();
    mat.color.setScalar(power);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), mat);
    panel.position.set(pos[0], pos[1], pos[2]);
    scene.add(panel);
  }
  return scene;
}

function canvasTex(px: number, draw: (x: CanvasRenderingContext2D, s: number) => void, aniso: number, list: THREE.Texture[]) {
  const c = document.createElement("canvas");
  c.width = c.height = px;
  draw(c.getContext("2d")!, px);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  list.push(t);
  return t;
}
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
function grit(x: CanvasRenderingContext2D, s: number, n: number, light: number, alpha: number) {
  for (let i = 0; i < n; i++) {
    const g = light + rnd(-40, 40);
    x.fillStyle = `rgba(${g | 0},${g | 0},${g | 0},${rnd(0.02, alpha)})`;
    const r = rnd(0.5, 2.4);
    x.fillRect(rnd(0, s), rnd(0, s), r, r);
  }
}

const FLOORS: Record<RoomSetting, { tile: number; roughness: number; draw: (x: CanvasRenderingContext2D, s: number) => void }> = {
  /* Pale oak planks, so black frames stand out against them. */
  "apartment-corner": {
    tile: 72,
    roughness: 0.5,
    draw(x, s) {
      const rows = 8;
      const ph = s / rows;
      for (let r = 0; r < rows; r++) {
        let px = -rnd(0, s * 0.5);
        while (px < s) {
          const len = rnd(s * 0.45, s * 0.8);
          const l = rnd(150, 178);
          x.fillStyle = `rgb(${l + 34},${l + 2},${l - 46})`;
          x.fillRect(px, r * ph, len, ph);
          for (let k = 0; k < 26; k++) {
            x.strokeStyle = `rgba(96,62,28,${rnd(0.03, 0.15)})`;
            x.lineWidth = rnd(0.5, 1.6);
            const y = r * ph + rnd(2, ph - 2);
            x.beginPath();
            x.moveTo(px, y);
            x.bezierCurveTo(px + len * 0.3, y + rnd(-4, 4), px + len * 0.7, y + rnd(-4, 4), px + len, y + rnd(-2, 2));
            x.stroke();
          }
          x.fillStyle = "rgba(45,28,12,0.55)";
          x.fillRect(px + len - 1.5, r * ph, 1.5, ph);
          px += len;
        }
        x.fillStyle = "rgba(45,28,12,0.55)";
        x.fillRect(0, r * ph, s, 1.5);
      }
    },
  },
  /* Low-pile carpet in a warm grey. */
  "small-room": {
    tile: 28,
    roughness: 1,
    draw(x, s) {
      x.fillStyle = "#9d978d";
      x.fillRect(0, 0, s, s);
      for (let i = 0; i < 26000; i++) {
        const l = rnd(120, 186);
        x.strokeStyle = `rgba(${l | 0},${(l - 5) | 0},${(l - 14) | 0},0.42)`;
        x.lineWidth = 1;
        const a = rnd(0, s), b = rnd(0, s);
        x.beginPath(); x.moveTo(a, b); x.lineTo(a + rnd(-3, 3), b + rnd(-3, 3)); x.stroke();
      }
    },
  },
  /* Sealed concrete with stains and a saw-cut joint. */
  garage: {
    tile: 120,
    roughness: 0.62,
    draw(x, s) {
      x.fillStyle = "#7f8284";
      x.fillRect(0, 0, s, s);
      for (let i = 0; i < 26; i++) {
        const cx = rnd(0, s), cy = rnd(0, s), r = rnd(s * 0.06, s * 0.28);
        const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
        const dark = Math.random() > 0.45;
        g.addColorStop(0, dark ? "rgba(62,62,66,0.09)" : "rgba(214,214,212,0.06)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        x.fillStyle = g;
        x.fillRect(0, 0, s, s);
      }
      grit(x, s, 16000, 140, 0.28);
      x.strokeStyle = "rgba(50,50,54,0.7)";
      x.lineWidth = 2;
      x.beginPath(); x.moveTo(s / 2, 0); x.lineTo(s / 2, s); x.moveTo(0, s / 2); x.lineTo(s, s / 2); x.stroke();
      x.strokeStyle = "rgba(60,60,64,0.4)";
      x.lineWidth = 1;
      x.beginPath();
      let px = s * 0.1, py = s * 0.74;
      x.moveTo(px, py);
      while (px < s * 0.45) { px += rnd(4, 14); py += rnd(-8, 8); x.lineTo(px, py); }
      x.stroke();
    },
  },
  /* Large patio pavers. */
  outdoor: {
    tile: 72,
    roughness: 0.85,
    draw(x, s) {
      const n = 3;
      const c = s / n;
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) {
          const l = rnd(168, 192);
          x.fillStyle = `rgb(${l | 0},${(l - 7) | 0},${(l - 18) | 0})`;
          x.fillRect(i * c, j * c, c, c);
        }
      grit(x, s, 14000, 150, 0.22);
      x.strokeStyle = "rgba(72,68,58,0.85)";
      x.lineWidth = 4;
      for (let i = 0; i <= n; i++) {
        x.beginPath(); x.moveTo(i * c, 0); x.lineTo(i * c, s); x.moveTo(0, i * c); x.lineTo(s, i * c); x.stroke();
      }
    },
  },
  studio: {
    tile: 24,
    roughness: 0.88,
    draw(x, s) {
      x.fillStyle = "#858d9a";
      x.fillRect(0, 0, s, s);
      grit(x, s, 7000, 150, 0.2);
      x.strokeStyle = "rgba(92,102,120,0.4)";
      x.lineWidth = 3;
      x.strokeRect(1, 1, s - 2, s - 2);
    },
  },
};

const lit = (color: number, roughness = 0.9) => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });

function add(parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
const slab = (p: THREE.Object3D, m: THREE.Material, w: number, h: number, d: number, x: number, y: number, z: number) =>
  add(p, new THREE.BoxGeometry(w, h, d), m, x, y, z);

/* A window is a bright pane on the wall: there is nothing behind it to see. */
function windowPane(g: THREE.Group, x: number, y: number, w: number, h: number, sky: [string, string], aniso: number, list: THREE.Texture[]) {
  const trim = lit(0xeeece6, 0.5);
  const tex = canvasTex(128, (c, s) => {
    const grad = c.createLinearGradient(0, 0, 0, s);
    grad.addColorStop(0, sky[0]);
    grad.addColorStop(1, sky[1]);
    c.fillStyle = grad;
    c.fillRect(0, 0, s, s);
  }, aniso, list);
  add(g, new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }), x, y, 0.3);
  const f = 1.6;
  slab(g, trim, w + f * 2, f, 2, x, y + h / 2 + f / 2, 0.8);
  slab(g, trim, w + f * 3, f * 0.9, 3.4, x, y - h / 2 - f / 2, 1.4); // sill
  for (const s of [-1, 1]) slab(g, trim, f, h + f, 2, x + s * (w / 2 + f / 2), y, 0.8);
  slab(g, trim, f * 0.6, h, 1.2, x, y, 0.8); // mullion
}
/* Pleated curtain: a plane rippled along its width. */
function curtain(g: THREE.Group, x: number, top: number, w: number, h: number, mat: THREE.Material) {
  const geo = new THREE.PlaneGeometry(w, h, Math.round(w * 2), 1);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(pos.getX(i) * 1.5) * 0.8);
  geo.computeVertexNormals();
  add(g, geo, mat, x, top - h / 2, 3.4);
}
function artFrame(g: THREE.Group, x: number, y: number, w: number, h: number, paint: number, aniso: number, list: THREE.Texture[]) {
  slab(g, lit(0x2b2a29, 0.5), w, h, 1, x, y, 0.6);
  const tex = canvasTex(128, (c, s) => {
    c.fillStyle = "#e9e5dc";
    c.fillRect(0, 0, s, s);
    c.fillStyle = `#${paint.toString(16).padStart(6, "0")}`;
    c.beginPath(); c.arc(s * 0.44, s * 0.46, s * 0.24, 0, Math.PI * 2); c.fill();
    c.fillRect(s * 0.14, s * 0.72, s * 0.72, s * 0.05);
  }, aniso, list);
  add(g, new THREE.PlaneGeometry(w * 0.86, h * 0.86), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }), x, y, 1.12);
}
function door(g: THREE.Group, x: number, color: number) {
  const m = lit(color, 0.45);
  slab(g, lit(0xeeece6, 0.5), 38, 83, 1.6, x, 41.5, 0.6);
  slab(g, m, 34, 80, 1.6, x, 40, 1);
  for (const y of [22, 60]) slab(g, lit(color - 0x0a0a0a, 0.5), 25, 28, 0.5, x, y, 1.8);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(1.1, 16, 12), new THREE.MeshStandardMaterial({ color: 0xc8c2b4, roughness: 0.3, metalness: 1 }));
  knob.position.set(x + 13.5, 37, 2.8);
  g.add(knob);
}

export function buildRoom(setting: RoomSetting, rw: number, rd: number, aniso: number): BuiltRoom {
  const group = new THREE.Group();
  const textures: THREE.Texture[] = [];
  const walls: BuiltRoom["walls"] = [];
  const look = LOOKS[setting];

  /* Floor, tiled at real scale. */
  const f = FLOORS[setting];
  const floorTex = canvasTex(1024, f.draw, aniso, textures);
  floorTex.repeat.set(rw / f.tile, rd / f.tile);
  const floor = add(group, new THREE.PlaneGeometry(rw, rd), new THREE.MeshStandardMaterial({ map: floorTex, roughness: f.roughness, metalness: 0 }), 0, 0, 0);
  floor.rotation.x = -Math.PI / 2;

  /* What lies past the room's edge. */
  const groundColor = setting === "outdoor" ? 0x6e8a45 : setting === "studio" ? 0x8a93a1 : look.bg;
  const ground = add(group, new THREE.PlaneGeometry(rw * 12, rd * 12), lit(groundColor, 1), 0, -0.6, 0);
  ground.rotation.x = -Math.PI / 2;
  if (setting === "studio") return { group, walls, look, textures };

  /* Sides: far z, far x, near z, near x. The first two face the camera's
     opening angle, so they carry what makes the place recognisable. */
  const sides = [
    { len: rw, x: 0, z: -rd / 2, ry: 0, normal: new THREE.Vector3(0, 0, 1) },
    { len: rd, x: -rw / 2, z: 0, ry: Math.PI / 2, normal: new THREE.Vector3(1, 0, 0) },
    { len: rw, x: 0, z: rd / 2, ry: Math.PI, normal: new THREE.Vector3(0, 0, -1) },
    { len: rd, x: rw / 2, z: 0, ry: -Math.PI / 2, normal: new THREE.Vector3(-1, 0, 0) },
  ];
  const wallShade = canvasTex(256, (c, s) => {
    c.fillStyle = "#ffffff";
    c.fillRect(0, 0, s, s);
    grit(c, s, 5000, 215, 0.14);
    const edge = (x0: number, y0: number, x1: number, y1: number, a: number) => {
      const g = c.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, `rgba(30,30,36,${a})`);
      g.addColorStop(1, "rgba(30,30,36,0)");
      c.fillStyle = g;
      c.fillRect(0, 0, s, s);
    };
    edge(0, 0, 0, s * 0.3, 0.3);
    edge(0, s, 0, s * 0.82, 0.16);
    edge(0, 0, s * 0.16, 0, 0.26);
    edge(s, 0, s * 0.84, 0, 0.26);
  }, aniso, textures);
  const paint = { "apartment-corner": 0xa8ab98, "small-room": 0x8f9cae, garage: 0xb3b5b5 }[setting as "garage"] ?? 0;
  sides.forEach((side, i) => {
    const g = new THREE.Group();
    g.position.set(side.x, 0, side.z);
    g.rotation.y = side.ry;
    group.add(g);
    walls.push({ group: g, point: new THREE.Vector3(side.x, 0, side.z), normal: side.normal });

    if (setting === "outdoor") {
      /* Cedar fence, then hedge rising behind it. */
      const H = 70;
      const board = 5.5;
      const n = Math.ceil(side.len / board);
      for (let k = 0; k < n; k++) {
        const tone = rnd(0.86, 1.08);
        const m = lit(new THREE.Color(0x8d6a48).multiplyScalar(tone).getHex(), 0.92);
        slab(g, m, board - 0.35, H, 0.8, -side.len / 2 + (k + 0.5) * (side.len / n), H / 2, 0);
      }
      const rail = lit(0x6f5238);
      for (const y of [14, H - 12]) slab(g, rail, side.len, 3.4, 1.4, 0, y, 0.9);
      const leaf = new THREE.MeshStandardMaterial({ color: 0x4c6d35, roughness: 1 });
      for (let k = 0; k <= Math.ceil(side.len / 30); k++) {
        const r = rnd(20, 34);
        const b = add(g, new THREE.IcosahedronGeometry(r, 2), leaf, -side.len / 2 + k * 30, H + rnd(-14, 4), -r - 6);
        b.scale.y = rnd(0.85, 1.25);
      }
      return;
    }

    /* Painted wall, darker into the ceiling and the corners like a real room. */
    const wallMat = lit(paint, 0.94);
    wallMat.map = wallShade;
    add(g, new THREE.PlaneGeometry(side.len, WALL_H), wallMat, 0, WALL_H / 2, 0);
    slab(g, lit(0xeeece6, 0.55), side.len, 4.5, 0.7, 0, 2.25, 0.35); // baseboard

    if (setting === "apartment-corner") {
      if (i === 0) {
        windowPane(g, -side.len * 0.08, 56, Math.min(46, side.len * 0.5), 50, ["#dff0fb", "#f7f4e6"], aniso, textures);
        const c = lit(0xd9d2c0, 1);
        const pw = Math.min(46, side.len * 0.5);
        for (const s of [-1, 1]) curtain(g, -side.len * 0.08 + s * (pw / 2 + 6), 88, 11, 82, c);
        slab(g, lit(0x2b2a29, 0.4), pw + 28, 0.8, 0.8, -side.len * 0.08, 88.5, 3.4);
      } else if (i === 1) {
        artFrame(g, side.len * 0.14, 62, 18, 24, 0xc76b3f, aniso, textures);
        artFrame(g, -side.len * 0.14, 58, 14, 14, 0x546a78, aniso, textures);
      } else door(g, 0, 0xe6e3da);
    } else if (setting === "small-room") {
      if (i === 0) {
        const pw = Math.min(44, side.len * 0.42);
        windowPane(g, side.len * 0.1, 56, pw, 46, ["#d6e6f5", "#eef2f4"], aniso, textures);
        const slat = lit(0xe8e6df, 0.6);
        for (let y = 36; y < 80; y += 3.2) slab(g, slat, pw, 0.5, 0.25, side.len * 0.1, y, 1.2);
      } else if (i === 1) {
        door(g, -side.len * 0.2, 0xdedcd4);
        artFrame(g, side.len * 0.2, 60, 20, 16, 0x3e5c76, aniso, textures);
      } else {
        slab(g, lit(0x6c5a48, 0.6), 34, 1.2, 8, 0, 56, 4);
      }
    } else if (setting === "garage") {
      if (i === 0) {
        /* Sectional door: four ribbed panels and a row of glass. */
        const dw = Math.min(side.len - 16, 112);
        const dh = 84;
        slab(g, lit(0xc9c9c6, 0.6), dw + 6, dh + 3, 1, 0, (dh + 3) / 2, 0.5);
        const panel = new THREE.MeshStandardMaterial({ color: 0xdcdcda, roughness: 0.48, metalness: 0.1 });
        const rows = 4;
        const ph = dh / rows;
        for (let r = 0; r < rows; r++) {
          slab(g, panel, dw, ph - 0.8, 1, 0, ph * (r + 0.5), 1.4);
          const cols = 4;
          for (let c = 0; c < cols; c++) {
            const px = -dw / 2 + (c + 0.5) * (dw / cols);
            if (r === rows - 1) {
              add(g, new THREE.PlaneGeometry(dw / cols - 8, ph - 8), new THREE.MeshBasicMaterial({ color: 0xcfe0ee, toneMapped: false }), px, ph * (r + 0.5), 2);
            } else slab(g, lit(0xc6c6c3, 0.55), dw / cols - 6, ph - 7, 0.4, px, ph * (r + 0.5), 2);
          }
        }
        for (const s of [-1, 1]) slab(g, new THREE.MeshStandardMaterial({ color: 0x8b8e92, roughness: 0.35, metalness: 0.9 }), 2, dh + 4, 2.6, s * (dw / 2 + 1.6), (dh + 4) / 2, 1.6);
      } else if (i === 1) {
        /* Pegboard and a high shelf: everything is above head height or flat. */
        const bw = Math.min(58, side.len * 0.55);
        const tex = canvasTex(64, (c, s) => {
          c.fillStyle = "#9d8263";
          c.fillRect(0, 0, s, s);
          c.fillStyle = "#3f3224";
          c.beginPath(); c.arc(s / 2, s / 2, s * 0.13, 0, Math.PI * 2); c.fill();
        }, aniso, textures);
        tex.repeat.set(bw / 3, 36 / 3);
        add(g, new THREE.BoxGeometry(bw, 36, 0.6), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }), 0, 62, 0.4);
        const steel = new THREE.MeshStandardMaterial({ color: 0x8d9299, roughness: 0.35, metalness: 0.9 });
        const red = lit(0xa83a2c, 0.5);
        slab(g, red, 1.5, 12, 0.6, -bw * 0.28, 62, 1.1);
        slab(g, steel, 5, 2.2, 0.6, -bw * 0.28, 69, 1.1);
        slab(g, steel, 1, 15, 0.5, -bw * 0.06, 62, 1);
        slab(g, red, 1.8, 6, 0.8, -bw * 0.06, 57, 1.2);
        for (const [k, l] of [0.14, 0.2, 0.26].entries()) slab(g, steel, 0.7, 8 + l * 16, 0.4, bw * (0.14 + k * 0.08), 63, 1);
        slab(g, lit(0x77593a, 0.8), Math.min(72, side.len * 0.7), 1.4, 12, 0, 86, 6);
        const bin = [0x3f5e80, 0x4b4f55, 0x8a6b3e];
        for (let k = 0; k < 3; k++) slab(g, lit(bin[k], 0.6), 14, 9, 10, -18 + k * 18, 91.5, 6);
      } else door(g, 0, 0xc9c7bf);
    }
  });

  return { group, walls, look, textures };
}
