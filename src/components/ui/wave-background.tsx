"use client";

import * as React from "react";
import { useEffect, useRef } from "react";
import { createNoise2D } from "simplex-noise";

interface Point {
  x: number;
  y: number;
  wave: { x: number; y: number };
  cursor: { x: number; y: number; vx: number; vy: number };
}

interface WavesProps {
  className?: string;
  /** Line color. Keep low-alpha when layered over another background. */
  strokeColor?: string;
  /** Cursor dot color. */
  dotColor?: string;
  backgroundColor?: string;
  pointerSize?: number;
  /** Grid spacing in px — larger = fewer points = cheaper frames. */
  xGap?: number;
  yGap?: number;
}

/**
 * Mouse-reactive wave line field (21st.dev wave-background), adapted:
 * transparent by default so it layers over the hero shader, sparser grid for
 * full-bleed paint cost, passive touch (never blocks scroll), per-event rect
 * for correct coords under scroll, and a no-op under prefers-reduced-motion.
 */
export function Waves({
  className = "",
  strokeColor = "rgba(255,255,255,0.10)",
  dotColor = "var(--accent)",
  backgroundColor = "transparent",
  pointerSize = 0.5,
  xGap = 26,
  yGap = 22,
}: WavesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const mouseRef = useRef({
    x: -10,
    y: 0,
    lx: 0,
    ly: 0,
    sx: 0,
    sy: 0,
    v: 0,
    vs: 0,
    a: 0,
    set: false,
  });
  const pathsRef = useRef<SVGPathElement[]>([]);
  const linesRef = useRef<Point[][]>([]);
  const noiseRef = useRef<((x: number, y: number) => number) | null>(null);
  const rafRef = useRef<number | null>(null);
  const boundingRef = useRef<DOMRect | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const svg = svgRef.current;
    if (!container || !svg) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    noiseRef.current = createNoise2D();

    const setSize = () => {
      boundingRef.current = container.getBoundingClientRect();
      svg.style.width = `${boundingRef.current.width}px`;
      svg.style.height = `${boundingRef.current.height}px`;
    };

    const setLines = () => {
      if (!boundingRef.current) return;
      const { width, height } = boundingRef.current;
      linesRef.current = [];
      pathsRef.current.forEach((p) => p.remove());
      pathsRef.current = [];

      const oWidth = width + 200;
      const oHeight = height + 30;
      const totalLines = Math.ceil(oWidth / xGap);
      const totalPoints = Math.ceil(oHeight / yGap);
      const xStart = (width - xGap * totalLines) / 2;
      const yStart = (height - yGap * totalPoints) / 2;

      for (let i = 0; i < totalLines; i++) {
        const points: Point[] = [];
        for (let j = 0; j < totalPoints; j++) {
          points.push({
            x: xStart + xGap * i,
            y: yStart + yGap * j,
            wave: { x: 0, y: 0 },
            cursor: { x: 0, y: 0, vx: 0, vy: 0 },
          });
        }
        const path = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path",
        );
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", strokeColor);
        path.setAttribute("stroke-width", "1");
        svg.appendChild(path);
        pathsRef.current.push(path);
        linesRef.current.push(points);
      }
    };

    const updateMousePosition = (clientX: number, clientY: number) => {
      // Fresh rect each event: cheap, and stays correct while scrolling.
      const rect = container.getBoundingClientRect();
      const mouse = mouseRef.current;
      mouse.x = clientX - rect.left;
      mouse.y = clientY - rect.top;
      if (!mouse.set) {
        mouse.sx = mouse.x;
        mouse.sy = mouse.y;
        mouse.lx = mouse.x;
        mouse.ly = mouse.y;
        mouse.set = true;
      }
    };

    const onResize = () => {
      setSize();
      setLines();
    };
    const onMouseMove = (e: MouseEvent) =>
      updateMousePosition(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) =>
      updateMousePosition(e.touches[0].clientX, e.touches[0].clientY);

    const movePoints = (time: number) => {
      const noise = noiseRef.current;
      const mouse = mouseRef.current;
      if (!noise) return;
      linesRef.current.forEach((points) => {
        points.forEach((p) => {
          const move =
            noise((p.x + time * 0.008) * 0.003, (p.y + time * 0.003) * 0.002) *
            8;
          p.wave.x = Math.cos(move) * 12;
          p.wave.y = Math.sin(move) * 6;

          const dx = p.x - mouse.sx;
          const dy = p.y - mouse.sy;
          const d = Math.hypot(dx, dy);
          const l = Math.max(175, mouse.vs);
          if (d < l) {
            const s = 1 - d / l;
            const f = Math.cos(d * 0.001) * s;
            p.cursor.vx += Math.cos(mouse.a) * f * l * mouse.vs * 0.00035;
            p.cursor.vy += Math.sin(mouse.a) * f * l * mouse.vs * 0.00035;
          }
          p.cursor.vx += (0 - p.cursor.x) * 0.01;
          p.cursor.vy += (0 - p.cursor.y) * 0.01;
          p.cursor.vx *= 0.95;
          p.cursor.vy *= 0.95;
          p.cursor.x += p.cursor.vx;
          p.cursor.y += p.cursor.vy;
          p.cursor.x = Math.min(50, Math.max(-50, p.cursor.x));
          p.cursor.y = Math.min(50, Math.max(-50, p.cursor.y));
        });
      });
    };

    const moved = (point: Point, withCursorForce = true) => ({
      x: point.x + point.wave.x + (withCursorForce ? point.cursor.x : 0),
      y: point.y + point.wave.y + (withCursorForce ? point.cursor.y : 0),
    });

    const drawLines = () => {
      linesRef.current.forEach((points, lIndex) => {
        const path = pathsRef.current[lIndex];
        if (points.length < 2 || !path) return;
        const first = moved(points[0], false);
        let d = `M ${first.x} ${first.y}`;
        for (let i = 1; i < points.length; i++) {
          const c = moved(points[i]);
          d += `L ${c.x} ${c.y}`;
        }
        path.setAttribute("d", d);
      });
    };

    const tick = (time: number) => {
      const mouse = mouseRef.current;
      mouse.sx += (mouse.x - mouse.sx) * 0.1;
      mouse.sy += (mouse.y - mouse.sy) * 0.1;
      const dx = mouse.x - mouse.lx;
      const dy = mouse.y - mouse.ly;
      const d = Math.hypot(dx, dy);
      mouse.v = d;
      mouse.vs += (d - mouse.vs) * 0.1;
      mouse.vs = Math.min(100, mouse.vs);
      mouse.lx = mouse.x;
      mouse.ly = mouse.y;
      mouse.a = Math.atan2(dy, dx);

      container.style.setProperty("--x", `${mouse.sx}px`);
      container.style.setProperty("--y", `${mouse.sy}px`);

      movePoints(time);
      drawLines();
      rafRef.current = requestAnimationFrame(tick);
    };

    setSize();
    setLines();
    window.addEventListener("resize", onResize);
    window.addEventListener("mousemove", onMouseMove);
    container.addEventListener("touchmove", onTouchMove, { passive: true });
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMouseMove);
      container.removeEventListener("touchmove", onTouchMove);
    };
  }, [strokeColor, xGap, yGap]);

  return (
    <div
      ref={containerRef}
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      style={
        {
          backgroundColor,
          "--x": "-0.5rem",
          "--y": "50%",
        } as React.CSSProperties
      }
    >
      <svg ref={svgRef} className="block h-full w-full" xmlns="http://www.w3.org/2000/svg" />
      <div
        className="absolute left-0 top-0 hidden rounded-full md:block"
        style={{
          width: `${pointerSize}rem`,
          height: `${pointerSize}rem`,
          background: dotColor,
          transform:
            "translate3d(calc(var(--x) - 50%), calc(var(--y) - 50%), 0)",
          willChange: "transform",
        }}
      />
    </div>
  );
}
