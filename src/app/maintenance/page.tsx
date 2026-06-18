import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Down for maintenance",
  description: "GymGear Compare is briefly down for maintenance — back shortly.",
  robots: { index: false, follow: false },
};

/* Standalone holding page (no nav/footer). Point traffic here while the site
   is being updated — e.g. a temporary redirect in vercel.json or next.config. */
export default function MaintenancePage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-navy px-5 text-center text-white">
      {/* ambient glow */}
      <div
        aria-hidden
        className="animate-glow pointer-events-none absolute -top-40 left-1/2 h-130 w-200 -translate-x-1/2 rounded-full bg-accent/15 blur-3xl"
      />

      <div className="relative flex flex-col items-center">
        <Image src="/logo.svg" alt="GymGear Compare" width={64} height={44} priority />

        <p className="mt-10 flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-medium tracking-wide text-white/80">
          <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
          Scheduled maintenance
        </p>

        <h1 className="mt-6 font-display text-4xl font-extrabold tracking-tight sm:text-6xl">
          We&apos;re tuning things up.
        </h1>
        <p className="mt-5 max-w-md text-lg leading-relaxed text-white/65">
          GymGear Compare is briefly offline while we refresh prices and ship
          improvements. We&apos;ll be back shortly — thanks for your patience.
        </p>

        <a
          href="mailto:roei.karpik@gmail.com"
          className="mt-9 rounded-xl border border-white/20 bg-white/5 px-6 py-3 font-display font-bold text-white/90 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/10 hover:text-white"
        >
          Need us? Get in touch
        </a>

        <p className="mt-10 font-display text-sm font-bold text-white/50">
          GymGear<span className="text-accent">Compare</span>™
        </p>
      </div>
    </main>
  );
}
