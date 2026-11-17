"use client";

import { useEffect } from "react";

/* Counts link clicks site-wide with one listener, so no link needs changing.
   Site links are counted by path, store links by address without the query
   string. sendBeacon survives the page closing as the link opens. */
export default function ClickTracker() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.button > 1 || location.pathname.startsWith("/stats")) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      let u: URL;
      try {
        u = new URL(a.href);
      } catch {
        return;
      }
      if (!/^https?:$/.test(u.protocol)) return;
      const href = u.host === location.host ? u.pathname : u.origin + u.pathname;
      navigator.sendBeacon?.("/api/click", new Blob([JSON.stringify({ href })], { type: "application/json" }));
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener("auxclick", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("auxclick", onClick, true);
    };
  }, []);
  return null;
}
