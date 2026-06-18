import { cn } from "@/lib/utils";

/* Shimmering placeholder block. The sweep animation lives in globals.css
   (.gg-skeleton) so it can respect prefers-reduced-motion. Compose shape with
   utility classes, e.g. <Skeleton className="h-3 w-2/3" />. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("gg-skeleton rounded-lg", className)} />;
}
