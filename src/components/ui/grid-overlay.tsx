import { cn } from "@/lib/utils";

/**
 * Faint masked grid lines for depth on dark sections. Static by design —
 * ambience comes from the gradient, not from moving decoration.
 */
export default function GridOverlay({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0",
        "bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)]",
        "bg-[size:54px_54px]",
        "[mask-image:radial-gradient(ellipse_60%_55%_at_50%_25%,#000_60%,transparent_100%)]",
        className,
      )}
    />
  );
}
