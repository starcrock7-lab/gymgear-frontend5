"use client";

import { useEffect, useState } from "react";

/* Real things we list, so the bar shows what it can find before it's tapped. */
const HINTS = ["squat racks", "adjustable dumbbells", "weight benches", "treadmills", "Rogue", "bumper plates"];

/* Its own component, so changing the word re-renders only this span and not
   the whole page. */
export default function SearchHint() {
  const [hint, setHint] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setHint((h) => (h + 1) % HINTS.length), 2600);
    return () => clearInterval(t);
  }, []);
  return (
    <span key={hint} className="search-hint font-medium text-white">
      {HINTS[hint]}
    </span>
  );
}
