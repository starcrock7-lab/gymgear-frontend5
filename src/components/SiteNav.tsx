import Link from "next/link";
import { LogoMark } from "@/components/ui/logo-mark";

export default function SiteNav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-navy/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="group flex items-center gap-2.5">
          <LogoMark className="h-9 w-[3.25rem]" />
          <span className="font-display text-lg font-bold tracking-tight text-white">
            GymGear<span className="text-accent">Compare</span>
          </span>
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="/extras"
            className="hidden text-sm font-medium text-white/70 transition-colors hover:text-white sm:block"
          >
            Gear
          </Link>
          <Link
            href="/compare"
            className="hidden text-sm font-medium text-white/70 transition-colors hover:text-white sm:block"
          >
            Compare Tool
          </Link>
          <Link
            href="/quiz"
            className="rounded-lg bg-accent px-4 py-2 font-body text-sm font-bold text-white transition-all hover:-translate-y-px hover:bg-accent-hover"
          >
            Build My Kit →
          </Link>
        </div>
      </div>
    </nav>
  );
}
