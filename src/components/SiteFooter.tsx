import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="mt-auto bg-navy-deep text-white/60">
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
          <Link href="/compare" className="transition-colors hover:text-white">
            Compare
          </Link>
          <Link href="/sponsors" className="transition-colors hover:text-white">
            Partners
          </Link>
          <Link href="/privacy" className="transition-colors hover:text-white">
            Privacy
          </Link>
        </div>
      </div>
    </footer>
  );
}
