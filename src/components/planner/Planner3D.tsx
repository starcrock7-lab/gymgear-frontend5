"use client";

/* Sims-style 3D view of the floor plan. Renders the room (floor grid,
   walls from the detected wall grid — door gaps stay open — or the room
   borders), plus every placed piece as a real-size 3D model from
   lib/equipment-3d. Orbit to look around; hover a piece for its name and
   true dimensions. Loaded only on demand (dynamic import), so three.js
   never touches the 2D page's bundle. */

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { PlacedItem } from "@/lib/floor-plan";
import type { WallGrid } from "@/lib/auto-layout";
import { equipmentTypeOf } from "@/components/planner/equipment-icon";
import { buildEquipmentModel, heightOf } from "@/lib/equipment-3d";

const WALL_H = 96; // inches — sims-style see-through walls
const ft = (inches: number) => Math.round((inches / 12) * 10) / 10;

export default function Planner3D({
  placed,
  roomW,
  roomD,
  grid,
  selectedUid = null,
  onSelect,
}: {
  placed: PlacedItem[];
  roomW: number; // feet
  roomD: number; // feet
  grid: WallGrid | null;
  /* Click-to-inspect: clicking a piece selects it (glow + camera close-up)
     and the parent shows the product card; empty space deselects. */
  selectedUid?: string | null;
  onSelect?: (uid: string | null) => void;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [hover, setHover] = useState("");
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  /* Scene handles for the selection effect — set by the build effect. */
  const sceneApi = useRef<{
    byUid: Map<string, THREE.Group>;
    refreshGlow: () => void;
    flyTo: (g: THREE.Group) => void;
  } | null>(null);
  const selRef = useRef<string | null>(selectedUid);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const rwIn = roomW * 12;
    const rdIn = roomD * 12;

    /* Light showroom scene — dark graphite equipment + family accents pop
       against it (the old dark-on-dark navy scene swallowed the models). */
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe9edf3);
    scene.fog = new THREE.Fog(0xe9edf3, Math.max(rwIn, rdIn) * 2, Math.max(rwIn, rdIn) * 6);

    const camera = new THREE.PerspectiveCamera(50, 1, 10, Math.max(rwIn, rdIn) * 10);
    camera.position.set(rwIn * 0.55, Math.max(rwIn, rdIn) * 0.75, rdIn * 1.15);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    wrap.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI * 0.49; // never go under the floor
    controls.minDistance = 60;
    controls.maxDistance = Math.max(rwIn, rdIn) * 3;

    /* Lights */
    scene.add(new THREE.HemisphereLight(0xffffff, 0xb9c2d1, 1.05));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(rwIn * 0.6, Math.max(rwIn, rdIn), rdIn * 0.4);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const shadowSpan = Math.max(rwIn, rdIn) * 0.75;
    sun.shadow.camera.left = -shadowSpan;
    sun.shadow.camera.right = shadowSpan;
    sun.shadow.camera.top = shadowSpan;
    sun.shadow.camera.bottom = -shadowSpan;
    sun.shadow.camera.far = Math.max(rwIn, rdIn) * 4;
    scene.add(sun);

    /* Ground + room floor (clean, no grid — the shadows carry the depth) */
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(rwIn * 6, rdIn * 6),
      new THREE.MeshStandardMaterial({ color: 0xc6cdd9, roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.5;
    ground.receiveShadow = true;
    scene.add(ground);
    /* Room floor is the brightest surface — the equipment's stage. */
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(rwIn, rdIn),
      new THREE.MeshStandardMaterial({ color: 0xe4e9f0, roughness: 0.95 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    /* Walls. Detected grid → instanced boxes on the wall SHELL (blocked
       cells touching open floor), so interior walls show and door gaps
       stay open. No detection → the four room borders. Semi-transparent,
       sims-style, so the inside is always visible. */
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xb9c3d4,
      roughness: 0.7,
      transparent: true,
      opacity: 0.28,
      depthWrite: false, // keep equipment behind glass walls fully visible
    });
    if (grid && grid.detected) {
      const { cols, rows, cell, blocked } = grid;
      const shell: [number, number][] = [];
      for (let y = 0; y < rows; y++)
        for (let x = 0; x < cols; x++) {
          if (!blocked[y * cols + x]) continue;
          const open =
            (x > 0 && !blocked[y * cols + x - 1]) ||
            (x < cols - 1 && !blocked[y * cols + x + 1]) ||
            (y > 0 && !blocked[(y - 1) * cols + x]) ||
            (y < rows - 1 && !blocked[(y + 1) * cols + x]);
          if (open) shell.push([x, y]);
        }
      const inst = new THREE.InstancedMesh(
        new THREE.BoxGeometry(cell, WALL_H, cell),
        wallMat,
        shell.length,
      );
      const m4 = new THREE.Matrix4();
      shell.forEach(([x, y], i) => {
        m4.setPosition(-rwIn / 2 + x * cell + cell / 2, WALL_H / 2, -rdIn / 2 + y * cell + cell / 2);
        inst.setMatrixAt(i, m4);
      });
      inst.castShadow = true;
      scene.add(inst);
    } else {
      const t = 4;
      const mk = (w: number, d: number, x: number, z: number) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, WALL_H, d), wallMat);
        mesh.position.set(x, WALL_H / 2, z);
        mesh.castShadow = true;
        scene.add(mesh);
      };
      mk(rwIn + t * 2, t, 0, -rdIn / 2 - t / 2);
      mk(rwIn + t * 2, t, 0, rdIn / 2 + t / 2);
      mk(t, rdIn, -rwIn / 2 - t / 2, 0);
      mk(t, rdIn, rwIn / 2 + t / 2, 0);
    }

    /* Equipment — real footprints, real heights, one distinct model per type. */
    const pieces = new THREE.Group();
    const byUid = new Map<string, THREE.Group>();
    for (const p of placed) {
      const type = equipmentTypeOf(p.id, p.category);
      const h = heightOf(p.id, type);
      const model = buildEquipmentModel(type, p.category, p.w, p.d, h);
      const rw = p.rot ? p.d : p.w;
      const rd = p.rot ? p.w : p.d;
      model.rotation.y = p.rot ? -Math.PI / 2 : 0;
      model.position.set(p.x + rw / 2 - rwIn / 2, 0, p.y + rd / 2 - rdIn / 2);
      model.userData = { uid: p.uid, label: `${p.name} · ${ft(p.w)} × ${ft(p.d)} ft, ${ft(h)} ft tall` };
      pieces.add(model);
      byUid.set(p.uid, model);
    }
    scene.add(pieces);

    /* Glow = emissive lit from the piece's own material colours, so racks
       glow orange, cardio glows sky, etc. Materials are unique per piece
       (makeMats per build), so mutating them is safe. */
    let hovered: THREE.Group | null = null;
    function glowOf(g: THREE.Group): number {
      if (g.userData.uid === selRef.current) return 0.85;
      return g === hovered ? 0.4 : 0;
    }
    function setGlow(g: THREE.Group, intensity: number) {
      g.traverse((o) => {
        const mat = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
        if (!mat || !mat.emissive) return;
        if (intensity > 0) {
          mat.emissive.copy(mat.color);
          mat.emissiveIntensity = intensity;
        } else {
          mat.emissive.setRGB(0, 0, 0);
          mat.emissiveIntensity = 1;
        }
      });
    }
    const refreshGlow = () => { for (const g of byUid.values()) setGlow(g, glowOf(g)); };

    /* Camera close-up: glide the orbit target + camera toward the piece.
       Any manual orbit/zoom cancels the glide. */
    let flyGoal: { target: THREE.Vector3; pos: THREE.Vector3 } | null = null;
    function flyTo(g: THREE.Group) {
      const box = new THREE.Box3().setFromObject(g);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const span = Math.max(size.x, size.y, size.z);
      const dir = camera.position.clone().sub(center).setY(0);
      if (dir.lengthSq() < 1) dir.set(1, 0, 1);
      dir.normalize();
      const pos = center.clone().addScaledVector(dir, span * 2.1);
      pos.y = center.y + span * 0.9;
      flyGoal = { target: center, pos };
    }
    controls.addEventListener("start", () => { flyGoal = null; });

    sceneApi.current = { byUid, refreshGlow, flyTo };
    refreshGlow();
    if (selRef.current && byUid.has(selRef.current)) flyTo(byUid.get(selRef.current)!);

    /* Raycast helpers — hover (tooltip + glow + cursor) and click (select). */
    const ray = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    function pieceAt(e: PointerEvent): THREE.Group | null {
      const r = renderer.domElement.getBoundingClientRect();
      mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(mouse, camera);
      const hit = ray.intersectObjects(pieces.children, true)[0];
      if (!hit) return null;
      let o: THREE.Object3D | null = hit.object;
      while (o && !o.userData.uid) o = o.parent;
      return (o as THREE.Group) ?? null;
    }
    let lastLabel = "";
    function onMove(e: PointerEvent) {
      const g = pieceAt(e);
      if (g !== hovered) {
        hovered = g;
        refreshGlow();
        renderer.domElement.style.cursor = g ? "pointer" : "";
      }
      const label = (g?.userData.label as string) ?? "";
      if (label !== lastLabel) {
        lastLabel = label;
        setHover(label);
      }
    }
    /* Click vs orbit-drag: only a press that barely moved selects. */
    let downAt: { x: number; y: number } | null = null;
    const onDown = (e: PointerEvent) => { downAt = { x: e.clientX, y: e.clientY }; };
    function onUp(e: PointerEvent) {
      if (!downAt || Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 6) return;
      const g = pieceAt(e);
      if (g) {
        onSelectRef.current?.(g.userData.uid as string);
        flyTo(g);
      } else {
        onSelectRef.current?.(null);
      }
    }
    renderer.domElement.addEventListener("pointermove", onMove);
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointerup", onUp);

    /* Size to container, keep in step with it. */
    const resize = () => {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    let raf = 0;
    const tick = () => {
      if (flyGoal) {
        controls.target.lerp(flyGoal.target, 0.08);
        camera.position.lerp(flyGoal.pos, 0.08);
        if (camera.position.distanceTo(flyGoal.pos) < 1) flyGoal = null;
      }
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      sceneApi.current = null;
      renderer.domElement.removeEventListener("pointermove", onMove);
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointerup", onUp);
      controls.dispose();
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((mm) => mm.dispose());
        else if (mat) mat.dispose();
      });
      renderer.dispose();
      wrap.removeChild(renderer.domElement);
    };
  }, [placed, roomW, roomD, grid]);

  /* Selection changed (click here or in the 2D view): update glows and glide
     to the piece — without rebuilding the scene. */
  useEffect(() => {
    selRef.current = selectedUid;
    const api = sceneApi.current;
    if (!api) return;
    api.refreshGlow();
    if (selectedUid) {
      const g = api.byUid.get(selectedUid);
      if (g) api.flyTo(g);
    }
  }, [selectedUid]);

  return (
    <div
      ref={wrapRef}
      className="relative h-[420px] w-full touch-none overflow-hidden rounded-2xl border border-line bg-navy sm:h-[520px]"
    >
      {hover ? (
        <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-lg border border-accent/50 bg-navy/95 px-3 py-1.5 text-xs font-bold text-white shadow-lg">
          {hover}
        </div>
      ) : null}
      <span className="pointer-events-none absolute bottom-2.5 left-3.5 z-10 select-none font-display text-sm font-extrabold tracking-tight text-[#0d1b35]/75">
        Gym<span className="text-accent">Gear</span>
      </span>
      <p className="pointer-events-none absolute bottom-2 right-3 z-10 text-[0.6rem] font-bold uppercase tracking-wider text-[#3b4763]/70">
        Drag to orbit · scroll to zoom · hover a piece
      </p>
    </div>
  );
}
