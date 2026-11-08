"use client";

import { useEffect, useRef, useState } from "react";

/* A retailer's photo on white, or the brand's initial when the store's image
   is missing or stops loading. */
export default function ProductPhoto({
  src,
  brand,
  alt = "",
  className = "",
}: {
  src?: string | null;
  brand: string;
  alt?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const img = useRef<HTMLImageElement>(null);
  /* A photo that failed before the page became interactive never fires
     onError, so look once on mount. */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the browser's load result
    if (img.current?.complete && !img.current.naturalWidth) setFailed(true);
  }, []);
  if (!src || failed)
    return (
      <span className="flex h-full w-full items-center justify-center font-display text-4xl font-bold text-navy/30">
        {brand.charAt(0)}
      </span>
    );
  return (
    // eslint-disable-next-line @next/next/no-img-element -- remote retailer photo
    <img
      ref={img}
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`h-full w-full object-contain ${className}`}
    />
  );
}
