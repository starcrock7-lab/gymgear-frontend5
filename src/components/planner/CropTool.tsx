"use client";

/* Draw a rectangle over the uploaded floor image to pick the section that is
   the room you're planning (a larger plan may hold several rooms, or margins).
   Returns the selection as fractions of the image so it scales to any display
   size. Pure pointer math, no library. */

import { useRef, useState } from "react";
import { Check, Maximize2, X } from "lucide-react";
import type { Crop } from "@/lib/floor-plan";
import { FULL_CROP } from "@/lib/floor-plan";

type Rect = { x: number; y: number; w: number; h: number };

export default function CropTool({
  imgUrl,
  onApply,
  onCancel,
}: {
  imgUrl: string;
  onApply: (crop: Crop) => void;
  onCancel: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const [sel, setSel] = useState<Rect | null>(null);

  const rel = (e: React.PointerEvent) => {
    const b = wrapRef.current!.getBoundingClientRect();
    return {
      x: Math.min(Math.max(0, e.clientX - b.left), b.width),
      y: Math.min(Math.max(0, e.clientY - b.top), b.height),
      W: b.width,
      H: b.height,
    };
  };

  function down(e: React.PointerEvent) {
    const p = rel(e);
    start.current = { x: p.x, y: p.y };
    setSel({ x: p.x, y: p.y, w: 0, h: 0 });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function move(e: React.PointerEvent) {
    if (!start.current) return;
    const p = rel(e);
    const s = start.current;
    setSel({
      x: Math.min(s.x, p.x),
      y: Math.min(s.y, p.y),
      w: Math.abs(p.x - s.x),
      h: Math.abs(p.y - s.y),
    });
  }
  function up() {
    start.current = null;
  }

  function apply() {
    const wrap = wrapRef.current;
    if (!wrap || !sel || sel.w < 12 || sel.h < 12) {
      onApply(FULL_CROP);
      return;
    }
    const W = wrap.clientWidth, H = wrap.clientHeight;
    onApply({ cx: sel.x / W, cy: sel.y / H, cw: sel.w / W, ch: sel.h / H });
  }

  return (
    <div className="rounded-2xl border border-accent/50 bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-sm font-bold text-ink">Select your room</h2>
          <p className="mt-0.5 text-xs text-ink-3">
            Drag a box around just the room you&apos;re planning. Skip this to use the whole image.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onApply(FULL_CROP)}
            className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-ink-2 transition-colors hover:border-accent/60 hover:text-ink"
          >
            <Maximize2 className="h-3.5 w-3.5" /> Use full image
          </button>
          <button
            onClick={apply}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-accent-hover"
          >
            <Check className="h-3.5 w-3.5" /> Use this section
          </button>
          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-bold text-ink-3 transition-colors hover:text-ink"
            aria-label="Cancel crop"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div
        ref={wrapRef}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        className="relative mt-3 w-full cursor-crosshair touch-none select-none overflow-hidden rounded-xl border border-line"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imgUrl} alt="Uploaded floor plan" className="pointer-events-none block w-full" />
        {sel && sel.w > 0 ? (
          <>
            {/* dim everything, punch out the selection with a bright ring */}
            <div className="pointer-events-none absolute inset-0 bg-navy/55" />
            <div
              className="pointer-events-none absolute border-2 border-accent bg-transparent shadow-[0_0_0_9999px_rgba(9,18,38,0.55)]"
              style={{ left: sel.x, top: sel.y, width: sel.w, height: sel.h }}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
