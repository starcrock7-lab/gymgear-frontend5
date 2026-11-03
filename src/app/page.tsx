"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { Dumbbell, Flame, HeartPulse, Home as HomeIcon, Search, type LucideIcon } from "lucide-react";
import SiteNav, { OPEN_SEARCH } from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import DumbbellWall from "@/components/ui/dumbbell-wall";
import { clearKit } from "@/lib/kit";
import { EMPTY_ANSWERS, questionFor, saveAnswers } from "@/lib/quiz";

const heroStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

/* A small rise only, never hidden: this screen is the site's front door and
   must read even if the animation stalls (slow phone, background tab). */
const fadeUp: Variants = {
  hidden: { y: 14 },
  show: {
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
};

const GOAL_ICONS: Record<string, LucideIcon> = {
  "build-strength": Dumbbell,
  "lose-weight": Flame,
  "get-fit": HeartPulse,
  "home-gym-setup": HomeIcon,
};

/* Real things we list, so the bar shows what it can find before it's tapped. */
const HINTS = ["squat racks", "adjustable dumbbells", "weight benches", "treadmills", "Rogue", "bumper plates"];

/* Its own component, so changing the word re-renders only this span and not
   the whole page. */
function SearchHint() {
  const [hint, setHint] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setHint((h) => (h + 1) % HINTS.length), 2600);
    return () => clearInterval(t);
  }, []);
  return (
    <span key={hint} className="search-hint font-medium text-white">
      {HINTS[hint]}
    </span>
  );
}

export default function Home() {
  const router = useRouter();
  const goal = questionFor("goal");

  const startQuiz = (id: string) => {
    clearKit();
    saveAnswers({ ...EMPTY_ANSWERS, goal: id });
    router.push("/quiz");
  };

  return (
    <>
      <SiteNav />

      <section className="relative flex min-h-[calc(100svh-4rem)] flex-col overflow-hidden bg-navy text-white">
        <DumbbellWall />

        <motion.div
          variants={heroStagger}
          initial="hidden"
          animate="show"
          className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-5 py-8 sm:py-12"
        >
          <motion.h1
            variants={fadeUp}
            className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-balance sm:text-6xl"
          >
            Home gym plans for your budget and space
          </motion.h1>

          <motion.div variants={fadeUp} className="mt-8">
            <h2 className="font-display text-xl font-bold">{goal.title}</h2>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {goal.options.map((o) => {
                const Icon = GOAL_ICONS[o.id];
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => startQuiz(o.id)}
                    className="glow-btn flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border border-white/15 bg-navy-deep px-3 py-4 text-center font-body font-bold text-white"
                  >
                    <Icon className="h-6 w-6 text-accent" />
                    {o.label}
                  </button>
                );
              })}
            </div>
          </motion.div>

          <motion.button
            variants={fadeUp}
            type="button"
            onClick={() => window.dispatchEvent(new Event(OPEN_SEARCH))}
            aria-label="Search products"
            className="glow-btn mt-5 flex min-h-14 w-full items-center gap-3 rounded-xl border border-white/15 bg-navy-deep px-4 text-left"
          >
            <Search className="h-5 w-5 shrink-0 text-accent" />
            <span className="min-w-0 truncate text-white/70">
              Or search <SearchHint />
            </span>
          </motion.button>
        </motion.div>
      </section>

      <SiteFooter />
    </>
  );
}
