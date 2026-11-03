"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion, type Variants } from "framer-motion";
import { Search } from "lucide-react";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import SearchModal from "@/components/SearchModal";
import DumbbellWall from "@/components/ui/dumbbell-wall";
import { clearKit } from "@/lib/kit";
import { EMPTY_ANSWERS, questionFor, saveAnswers, type QuizAnswers } from "@/lib/quiz";

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

/* Common starting points. Each fills in what it already knows, and the quiz
   only asks for what's left. */
const SHORTCUTS: { label: string; answers: Partial<QuizAnswers> }[] = [
  { label: "Apartment gym under $300", answers: { space: "apartment-corner", budget: "under-300" } },
  { label: "Garage gym under $800", answers: { space: "garage", budget: "300-800" } },
  { label: "Garage gym under $2,000", answers: { space: "garage", budget: "800-2000" } },
  { label: "Gym for a low ceiling", answers: { space: "garage", ceiling: "under-8ft" } },
];

export default function Home() {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const goal = questionFor("goal");

  const startQuiz = (answers: Partial<QuizAnswers>) => {
    clearKit();
    saveAnswers({ ...EMPTY_ANSWERS, ...answers });
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
          className="pointer-events-none relative mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-5 py-8 sm:py-12"
        >
          <motion.h1
            variants={fadeUp}
            className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-balance sm:text-6xl"
          >
            Home gym plans for your budget and space
          </motion.h1>

          <motion.button
            variants={fadeUp}
            type="button"
            onClick={() => setSearchOpen(true)}
            className="pointer-events-auto mt-6 flex min-h-12 w-full items-center gap-3 rounded-xl border border-white/20 bg-navy-deep px-4 text-left text-white/65 transition-colors hover:border-white/40 hover:text-white"
          >
            <Search className="h-4 w-4 shrink-0" />
            Search racks, dumbbells, brands
          </motion.button>

          <motion.div variants={fadeUp} className="mt-7">
            <h2 className="font-display text-xl font-bold">
              Or build a plan: {goal.title.toLowerCase()}
            </h2>
            <div className="pointer-events-auto mt-3 grid grid-cols-2 gap-2.5">
              {goal.options.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => startQuiz({ goal: o.id })}
                  className="min-h-14 rounded-xl bg-accent px-3 py-3 text-center font-body font-bold text-white shadow-[0_8px_20px_-8px_rgba(0,0,0,0.6)] transition-colors hover:bg-accent-hover"
                >
                  {o.label}
                </button>
              ))}
            </div>
          </motion.div>

          <motion.div variants={fadeUp} className="pointer-events-auto mt-6 flex flex-wrap gap-2">
            {SHORTCUTS.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => startQuiz(s.answers)}
                className="min-h-10 rounded-lg border border-white/15 bg-navy-deep px-3 text-sm font-medium text-white/80 transition-colors hover:border-accent/60 hover:text-white"
              >
                {s.label}
              </button>
            ))}
          </motion.div>
        </motion.div>
      </section>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <SiteFooter />
    </>
  );
}
