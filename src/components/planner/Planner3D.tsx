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
import { buildEnvScene, buildRoom, isRoomSetting } from "@/lib/room-settings";

const WALL_H = 96; // inches — sims-style see-through walls
const ft = (inches: number) => Math.round((inches / 12) * 10) / 10;

export default function Planner3D({
  placed,
  roomW,
  roomD,
  grid,
  selectedUid = null,
  onSelect,
  cardSlot,
  walls = true,
  setting,
}: {
  placed: PlacedItem[];
  roomW: number; // feet
  roomD: number; // feet
  grid: WallGrid | null;
  /* Click-to-inspect: clicking a piece selects it (glow + camera close-up)
     and the parent shows the product card; empty space deselects. */
  selectedUid?: string | null;
  onSelect?: (uid: string | null) => void;
  /* Rendered inside the scene wrapper, anchored beside the selected piece —
     the product card rides the camera like part of the 3D playground. */
  cardSlot?: React.ReactNode;
  /* See-through walls help when planning a real room; the kit preview
     leaves them out so they never sit in front of the gear. */
  walls?: boolean;
  /* The room drawn around the gear, from the "how much space" answer. */
  setting?: string | null;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const cardAnchorRef = useRef<HTMLDivElement | null>(null);
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

    /* A detected floor plan keeps its own glass walls, so its room stays bare. */
    const place = !grid?.detected && isRoomSetting(setting) ? setting : "studio";
    const room = buildRoom(place, rwIn, rdIn, 8);
    const { look } = room;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(look.bg);
    if (look.fog) scene.fog = new THREE.Fog(look.bg, Math.max(rwIn, rdIn) * 2.2, Math.max(rwIn, rdIn) * 6);
    scene.add(room.group);

    const camera = new THREE.PerspectiveCamera(50, 1, 10, Math.max(rwIn, rdIn) * 10);
    camera.position.set(rwIn * 0.62, Math.max(rwIn, rdIn) * 0.6, rdIn * 1.08);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = look.exposure;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    wrap.appendChild(renderer.domElement);

    /* Image-based lighting. Without an environment map every metalness > 0
       surface has nothing to reflect and resolves to flat grey. This one is a
       rough copy of the room's own light, so chrome picks up the garage's strip
       lights or the patio's sky. */
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = buildEnvScene(place);
    const envRT = pmrem.fromScene(envScene, 0.04);
    scene.environment = envRT.texture;
    scene.environmentIntensity = look.env;
    pmrem.dispose();
    envScene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.geometry) return;
      mesh.geometry.dispose();
      ([] as THREE.Material[]).concat(mesh.material).forEach((mat) => mat.dispose());
    });

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 26, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI * 0.49; // never go under the floor
    controls.minDistance = 60;
    controls.maxDistance = Math.max(rwIn, rdIn) * 3;

    /* Lights */
    /* Ambient now comes mostly from the environment map, so the hemisphere
       is a gentle top-up rather than the main source — otherwise the two
       stack and wash the models flat again. */
    const hemi = new THREE.HemisphereLight(look.hemi.sky, look.hemi.ground, look.hemi.intensity);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(look.sun.color, look.sun.intensity);
    sun.position.set(...look.sun.dir).multiplyScalar(Math.max(rwIn, rdIn) * 1.1);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    /* Scene units are inches, so the default bias is far too small and the
       shadows acne on curved surfaces. Keep normalBias small though — push
       it far and contact shadows detach, leaving everything looking floaty. */
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.22;
    /* Cool fill from the opposite side: keeps shadowed faces readable and
       stops the graphite frames from crushing to black. */
    const fill = new THREE.DirectionalLight(0xdce8ff, 0.42);
    fill.position.set(-rwIn * 0.7, Math.max(rwIn, rdIn) * 0.55, -rdIn * 0.6);
    scene.add(fill);
    const shadowSpan = Math.max(rwIn, rdIn) * 0.75;
    sun.shadow.camera.left = -shadowSpan;
    sun.shadow.camera.right = shadowSpan;
    sun.shadow.camera.top = shadowSpan;
    sun.shadow.camera.bottom = -shadowSpan;
    sun.shadow.camera.far = Math.max(rwIn, rdIn) * 4;
    scene.add(sun);
    /* Movie spotlight for the selected piece — warm cone, faded in with the
       mood so the hero keeps its real material colours while the room dims. */
    const spot = new THREE.SpotLight(0xffe9d6, 0, 0, 0.7, 0.55, 0); // decay 0: scene units are inches
    scene.add(spot);
    scene.add(spot.target);

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
    if (!walls || place !== "studio") {
      /* no glass walls: bare floor, or a themed room with its own */
    } else if (grid && grid.detected) {
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
    const contactTex = (() => {
      const c = document.createElement("canvas");
      c.width = c.height = 128;
      const x = c.getContext("2d")!;
      const g = x.createRadialGradient(64, 64, 18, 64, 64, 64);
      g.addColorStop(0, "rgba(0,0,0,0.5)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      x.fillStyle = g;
      x.fillRect(0, 0, 128, 128);
      return new THREE.CanvasTexture(c);
    })();
    const contactMat = new THREE.MeshBasicMaterial({ map: contactTex, transparent: true, depthWrite: false });
    const pieces = new THREE.Group();
    const byUid = new Map<string, THREE.Group>();
    for (const p of placed) {
      const type = equipmentTypeOf(p.id, p.category);
      const h = heightOf(p.id, type);
      const model = buildEquipmentModel(type, p.category, p.w, p.d, h, p.id);
      const rw = p.rot ? p.d : p.w;
      const rd = p.rot ? p.w : p.d;
      model.rotation.y = p.rot ? -Math.PI / 2 : 0;
      model.position.set(p.x + rw / 2 - rwIn / 2, 0, p.y + rd / 2 - rdIn / 2);
      model.userData = { uid: p.uid, label: `${p.name} · ${ft(p.w)} × ${ft(p.d)} ft, ${ft(h)} ft tall` };
      pieces.add(model);
      byUid.set(p.uid, model);
      /* Soft dark pool where the piece meets the floor, which is what stops
         gear from looking pasted on. */
      const pool = new THREE.Mesh(new THREE.PlaneGeometry(rw * 1.3, rd * 1.3), contactMat);
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(model.position.x, 0.08, model.position.z);
      room.group.add(pool);
    }
    scene.add(pieces);
    /* Open framed on the gear, not the empty room around it. Portrait phones
       see less width, so they stand further back. */
    if (placed.length) {
      const box = new THREE.Box3().setFromObject(pieces);
      const mid = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const fit = Math.max(1, 1.3 / (wrap.clientWidth / wrap.clientHeight));
      const dist = Math.min((Math.max(size.x, size.y, size.z) * 1.1 + 40) * fit, Math.max(rwIn, rdIn) * 2);
      controls.target.set(mid.x, Math.min(34, size.y * 0.42), mid.z);
      camera.position.copy(controls.target).add(new THREE.Vector3(0.5, 0.46, 0.74).normalize().multiplyScalar(dist));
    }

    /* Hover glow = the piece's own family colour; SELECTED glow = brand
       orange, same as the home-page cards. Materials are unique per piece
       (makeMats per build), so mutating them is safe. */
    const ACCENT = new THREE.Color(0xf0531e);
    let hovered: THREE.Group | null = null;
    function setGlow(g: THREE.Group, mode: "off" | "hover" | "selected") {
      g.traverse((o) => {
        const mat = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
        if (!mat || !mat.emissive || mat.userData.keepEmissive) return;
        if (mode === "selected") {
          mat.emissive.copy(ACCENT);
          mat.emissiveIntensity = 0.09; // orange tint; the spotlight carries the reveal
        } else if (mode === "hover") {
          mat.emissive.copy(mat.color);
          mat.emissiveIntensity = 0.4;
        } else {
          mat.emissive.setRGB(0, 0, 0);
          mat.emissiveIntensity = 1;
        }
      });
    }
    const refreshGlow = () => {
      for (const g of byUid.values())
        setGlow(g, g.userData.uid === selRef.current ? "selected" : g === hovered ? "hover" : "off");
    };

    /* Every scene material we re-tint for the spotlight mood keeps its base
       colour so the lerp is exact both ways. */
    pieces.traverse((o) => {
      const mat = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (mat && !mat.userData.base) mat.userData.base = mat.color.getHex();
    });
    /* The room dims as one with the lights; the contact pools are already dark. */
    const roomMats = new Set<THREE.MeshStandardMaterial>();
    room.group.traverse((o) => {
      const mat = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (mat?.color && mat !== (contactMat as unknown)) {
        mat.userData.base = mat.color.getHex();
        roomMats.add(mat);
      }
    });
    const DARK = new THREE.Color(0x11151d);
    const MOOD = {
      bg: [new THREE.Color(look.bg), DARK] as const,
      hemi: [look.hemi.intensity, look.hemi.intensity * 0.45] as const,
      sun: [look.sun.intensity, look.sun.intensity * 0.6] as const,
      /* The environment map has to dim with everything else, or the room
         stays lit and the close-up spotlight has nothing to reveal. */
      env: [look.env, look.env * 0.3] as const,
    };
    let mood = 0; // 0 = lit room · 1 = dark spotlight on the selection

    /* Cinematic close-up: a time-eased dolly (ease-in-out) from wherever the
       camera is to a hero angle on the piece. Manual orbit cancels it. */
    let fly: {
      p0: THREE.Vector3; p1: THREE.Vector3;
      t0: THREE.Vector3; t1: THREE.Vector3;
      start: number; dur: number;
    } | null = null;
    const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    function flyTo(g: THREE.Group) {
      const box = new THREE.Box3().setFromObject(g);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const span = Math.max(size.x, size.y, size.z);
      const dir = camera.position.clone().sub(center).setY(0);
      if (dir.lengthSq() < 1) dir.set(1, 0, 1);
      dir.normalize();
      const pos = center.clone().addScaledVector(dir, span * 2.1);
      pos.y = center.y + span * 0.85;
      /* park the spotlight high between camera and piece */
      spot.position.set(center.x + dir.x * span, center.y + span * 2.2, center.z + dir.z * span);
      spot.target.position.copy(center);
      spot.distance = span * 6;
      fly = {
        p0: camera.position.clone(), p1: pos,
        t0: controls.target.clone(), t1: center,
        start: performance.now(), dur: 1300,
      };
    }
    controls.addEventListener("start", () => { fly = null; });

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
    const corner = new THREE.Vector3();
    const selBox = new THREE.Box3();
    const wallEye = new THREE.Vector3();
    const tick = () => {
      /* eased cinematic dolly */
      if (fly) {
        const k = easeInOut(Math.min(1, (performance.now() - fly.start) / fly.dur));
        camera.position.lerpVectors(fly.p0, fly.p1, k);
        controls.target.lerpVectors(fly.t0, fly.t1, k);
        if (k >= 1) fly = null;
      }

      /* spotlight mood: darken the room around a selection, restore after */
      const sel = selRef.current ? byUid.get(selRef.current) ?? null : null;
      const target = sel ? 1 : 0;
      if (Math.abs(mood - target) > 0.002 || target === 1) {
        mood += (target - mood) * 0.07;
        (scene.background as THREE.Color).lerpColors(MOOD.bg[0], MOOD.bg[1], mood);
        if (scene.fog) scene.fog.color.lerpColors(MOOD.bg[0], MOOD.bg[1], mood);
        for (const mat of roomMats) mat.color.setHex(mat.userData.base as number).lerp(DARK, mood * 0.8);
        hemi.intensity = MOOD.hemi[0] + (MOOD.hemi[1] - MOOD.hemi[0]) * mood;
        sun.intensity = MOOD.sun[0] + (MOOD.sun[1] - MOOD.sun[0]) * mood;
        scene.environmentIntensity = MOOD.env[0] + (MOOD.env[1] - MOOD.env[0]) * mood;
        spot.intensity = mood * 2.4;
        for (const g of byUid.values()) {
          const dim = g === sel ? 0 : mood * 0.8;
          g.traverse((o) => {
            const mat = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
            if (!mat?.userData.base) return;
            mat.color.setHex(mat.userData.base as number);
            if (dim > 0) mat.color.lerp(DARK, dim);
          });
        }
      }

      controls.update();
      /* Dollhouse walls: one seen from behind steps aside. */
      for (const w of room.walls) w.group.visible = wallEye.copy(camera.position).sub(w.point).dot(w.normal) > 0;
      renderer.render(scene, camera);

      /* anchor the product card just right of the selected piece on screen */
      const anchor = cardAnchorRef.current;
      if (anchor) {
        if (sel) {
          selBox.setFromObject(sel);
          let maxX = -Infinity, sumY = 0, n = 0;
          for (let i = 0; i < 8; i++) {
            corner.set(
              i & 1 ? selBox.max.x : selBox.min.x,
              i & 2 ? selBox.max.y : selBox.min.y,
              i & 4 ? selBox.max.z : selBox.min.z,
            ).project(camera);
            maxX = Math.max(maxX, corner.x);
            sumY += corner.y;
            n++;
          }
          const bw = wrap.clientWidth, bh = wrap.clientHeight;
          const px = Math.min(bw - 276, Math.max(8, ((maxX + 1) / 2) * bw + 18));
          const py = Math.min(bh - 180, Math.max(8, (1 - (sumY / n + 1) / 2) * bh - 110));
          anchor.style.display = "block";
          anchor.style.transform = `translate(${Math.round(px)}px, ${Math.round(py)}px)`;
        } else {
          anchor.style.display = "none";
        }
      }
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
      envRT.dispose();
      room.textures.forEach((t) => t.dispose());
      contactTex.dispose();
      renderer.dispose();
      wrap.removeChild(renderer.domElement);
    };
  }, [placed, roomW, roomD, grid, walls, setting]);

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
      {cardSlot ? (
        <div ref={cardAnchorRef} className="absolute left-0 top-0 z-30" style={{ display: "none" }}>
          {cardSlot}
        </div>
      ) : null}
      <span className="pointer-events-none absolute bottom-2.5 left-3.5 z-10 select-none font-display text-sm font-extrabold tracking-tight text-white/80 [text-shadow:0_1px_4px_rgba(0,0,0,0.6)]">
        Gym<span className="text-accent">Gear</span>
      </span>
      <p className="pointer-events-none absolute bottom-2 right-3 z-10 hidden text-[0.6rem] sm:block font-bold uppercase tracking-wider text-white/75 [text-shadow:0_1px_4px_rgba(0,0,0,0.6)]">
        Drag to orbit · scroll to zoom · hover a piece
      </p>
    </div>
  );
}
