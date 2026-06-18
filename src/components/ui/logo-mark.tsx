import Image from "next/image";
import { cn } from "@/lib/utils";

/* The brand mark from the intro loader, reused at nav/footer scale: the logo
   sitting inside two concentric "orbit" rings (accent outer, faint-white
   inner). Pure SVG + Image — no hooks — so it stays server-renderable. The
   rings nudge outward on hover when placed inside a `group` (e.g. the nav link). */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center transition-transform duration-500 group-hover:scale-110",
        className,
      )}
    >
      <svg
        viewBox="0 0 64 44"
        className="absolute inset-0 h-full w-full overflow-visible"
        fill="none"
        aria-hidden
      >
        <ellipse
          cx="32"
          cy="22"
          rx="30"
          ry="17"
          stroke="var(--accent)"
          strokeWidth="1.5"
        />
        <ellipse
          cx="32"
          cy="22"
          rx="22.5"
          ry="11.5"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth="1"
        />
      </svg>
      <Image
        src="/logo.svg"
        alt="GymGear Compare"
        width={26}
        height={18}
        className="relative"
      />
    </span>
  );
}
