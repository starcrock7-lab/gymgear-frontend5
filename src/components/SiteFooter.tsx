import Link from "next/link";

const navLinks = [
  { href: "/quiz", label: "Build My Kit" },
  { href: "/compare", label: "Compare Tool" },
  { href: "/sponsors", label: "Partners" },
] as const;

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M4 12h14M12 5l7 7-7 7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function SiteFooter() {
  return (
    <footer className="mt-auto bg-navy-deep text-white/60">
      {/* Vectr-style big nav rows: bg fill rises, arrow swaps through */}
      <nav className="mx-auto max-w-6xl px-5 pt-14">
        {navLinks.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="group relative flex items-center justify-between overflow-hidden border-t border-white/10 py-7 last:border-b"
          >
            <span
              aria-hidden
              className="absolute inset-0 origin-bottom scale-y-0 bg-accent transition-transform duration-400 ease-[cubic-bezier(0.76,0,0.24,1)] group-hover:scale-y-100"
            />
            <span className="relative font-display text-2xl font-bold text-white transition-colors duration-300 sm:text-3xl">
              {l.label}
            </span>
            <span className="relative h-8 w-8 overflow-hidden">
              <ArrowIcon className="absolute inset-0 h-8 w-8 text-white transition-transform duration-400 ease-[cubic-bezier(0.76,0,0.24,1)] group-hover:translate-x-10" />
              <ArrowIcon className="absolute inset-0 h-8 w-8 -translate-x-10 text-white transition-transform duration-400 ease-[cubic-bezier(0.76,0,0.24,1)] group-hover:translate-x-0" />
            </span>
          </Link>
        ))}
      </nav>

      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-sm font-bold text-white">
            GymGear<span className="text-accent">Compare</span>™
          </p>
          <p className="mt-1 max-w-md text-xs leading-relaxed">
            Some links are affiliate links — we may earn a commission at no
            extra cost to you. Verdicts stay independent.
          </p>
        </div>
        <div className="flex gap-5 text-xs font-medium">
          <Link href="/privacy" className="transition-colors hover:text-white">
            Privacy
          </Link>
        </div>
      </div>
    </footer>
  );
}
