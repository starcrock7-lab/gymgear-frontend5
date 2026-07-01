"use client";

import { useEffect, useRef } from "react";
import { ReactLenis, type LenisRef } from "lenis/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/* Lenis smooth scroll, wired to GSAP so ScrollTrigger pins/scrubs stay in sync.
   Without this, GSAP reads native scroll while Lenis drives the page and any
   pinned scroll animation (see ui/story-scroll) tears or freezes. Pattern:
   Lenis stops its own RAF (autoRaf:false) and is driven by gsap.ticker; every
   Lenis scroll pushes an update into ScrollTrigger. */
export default function SmoothScroll({
  children,
}: {
  children: React.ReactNode;
}) {
  const lenisRef = useRef<LenisRef>(null);

  useEffect(() => {
    const lenis = lenisRef.current?.lenis;
    if (!lenis) return;

    lenis.on("scroll", ScrollTrigger.update);
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.off("scroll", ScrollTrigger.update);
      gsap.ticker.remove(raf);
    };
  }, []);

  return (
    <ReactLenis
      root
      ref={lenisRef}
      options={{ lerp: 0.12, smoothWheel: true, autoRaf: false }}
    >
      {children}
    </ReactLenis>
  );
}
