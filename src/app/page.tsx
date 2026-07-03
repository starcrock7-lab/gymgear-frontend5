"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
  type Variants,
} from "framer-motion";
import { ClipboardList, Sparkles, ShieldCheck } from "lucide-react";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import CursorLight from "@/components/ui/cursor-light";
import IntroLoader from "@/components/ui/intro-loader";
import AuroraBackground from "@/components/ui/aurora-background";
import FloatingPaths from "@/components/ui/background-paths";
import { TextScramble } from "@/components/ui/text-scramble";
import { ButtonColorful } from "@/components/ui/button-colorful";
import { LiquidButton } from "@/components/ui/liquid-glass-button";
import { HighlightButton } from "@/components/ui/highlight-button";
import FlowCard, { type FlowStep } from "@/components/ui/flow-card";

const heroStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

/* hero-futuristic-style masked word reveal for the headline. */
const wordStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
};

const wordRise: Variants = {
  hidden: { y: "110%", opacity: 0 },
  show: {
    y: "0%",
    opacity: 1,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

const heroLine1 = "Your perfect home gym.".split(" ");
const heroLine2 = "Built in 60 seconds.".split(" ");

const steps: FlowStep[] = [
  {
    n: "01",
    icon: <ClipboardList className="h-4.5 w-4.5" />,
    title: "Answer 5 questions",
    body: "Your goal, budget, space, setup size, and what you already own. Takes under a minute.",
    details: [
      "Goal — build strength, lose weight, get fit, or full home gym",
      "Budget — from under $300 to $2,000+",
      "Space — apartment corner up to a full garage",
      "Tell it what you already own, it builds around it",
    ],
  },
  {
    n: "02",
    icon: <Sparkles className="h-4.5 w-4.5" />,
    title: "AI builds 3 kits",
    body: "Best Value, Best Match, and Best Quality — assembled from 250+ real products with live prices.",
    details: [
      "Best Value — the cheapest route to your goal",
      "Best Match — balanced for your exact answers",
      "Best Quality — buy once, cry once",
      "250+ real products across 29 categories, live prices",
    ],
  },
  {
    n: "03",
    icon: <ShieldCheck className="h-4.5 w-4.5" />,
    title: "Buy with confidence",
    body: "Every pick explained in plain English, with direct buy links. Swap anything you don't like.",
    details: [
      "Plain-English reason behind every pick",
      "Swap any product for an alternative in one click",
      "Send picks into the comparison tool side by side",
      "Direct buy links — same price, zero markup",
    ],
  },
];

/* One staggered reveal for the tiles — tune the per-tile entrance in
   FlowCard's TILE_REVEAL; this container just cascades them on scroll. */
const tileContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.14, delayChildren: 0.05 } },
};

export default function Home() {
  const router = useRouter();
  const [introDone, setIntroDone] = useState(false);
  const { scrollY } = useScroll();
  const hintOpacity = useTransform(scrollY, [0, 160], [1, 0]);

  return (
    <>
      <IntroLoader onComplete={() => setIntroDone(true)} />
      <SiteNav />

      {/* Hero */}
      <section className="relative overflow-hidden bg-navy text-white">
        {/* Moving photo backdrop: slow Ken Burns drift + navy veils for text */}
        <div aria-hidden className="absolute inset-0 overflow-hidden">
          <Image
            src="/hero.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="animate-kenburns object-cover"
          />
          <div className="absolute inset-0 bg-navy/40" />
          <div className="absolute inset-0 bg-gradient-to-b from-navy/70 via-transparent to-navy/50" />
          <div
            aria-hidden
            className="animate-scanline absolute left-0 h-px w-full bg-gradient-to-r from-transparent via-accent/60 to-transparent shadow-[0_0_14px_rgba(232,84,42,0.55)]"
          />
        </div>
        <CursorLight />

        <motion.div
          variants={heroStagger}
          initial="hidden"
          animate={introDone ? "show" : "hidden"}
          className="relative mx-auto flex max-w-4xl flex-col items-center px-5 pt-24 pb-32 text-center"
        >
          <motion.p
            variants={fadeUp}
            className="mb-6 flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-medium tracking-wide text-white/80 backdrop-blur-sm"
          >
            <span className="text-[0.5rem] text-accent">●</span>
            Free · No Sign-Up · AI-Powered · Always Independent
          </motion.p>
          <motion.h1
            variants={wordStagger}
            className="font-display text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-7xl"
          >
            <span className="block">
              {heroLine1.map((w, i) => (
                <span
                  key={i}
                  className="inline-block overflow-hidden pb-1.5 align-bottom"
                >
                  <motion.span
                    variants={wordRise}
                    className="inline-block bg-gradient-to-b from-white via-white to-white/60 bg-clip-text text-transparent"
                  >
                    {w}
                    {i < heroLine1.length - 1 ? " " : ""}
                  </motion.span>
                </span>
              ))}
            </span>
            <span className="block">
              {heroLine2.map((w, i) => (
                <span
                  key={i}
                  className="inline-block overflow-hidden pb-1.5 align-bottom"
                >
                  <motion.span
                    variants={wordRise}
                    className="inline-block bg-gradient-to-r from-accent via-[#ff7a4d] to-accent-deep bg-clip-text text-transparent"
                  >
                    {w}
                    {i < heroLine2.length - 1 ? " " : ""}
                  </motion.span>
                </span>
              ))}
            </span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            className="mt-6 max-w-xl text-lg leading-relaxed text-white/70"
          >
            Answer 5 quick questions. Our AI builds you three complete
            equipment kits — optimized for value, fit, and quality — from real
            products with real prices.
          </motion.p>
          <motion.div
            variants={fadeUp}
            className="mt-10 flex flex-wrap items-center justify-center gap-4"
          >
            <ButtonColorful
              label="Start the Quiz"
              onClick={() => router.push("/quiz")}
              className="h-14 rounded-xl px-8 font-body text-lg font-bold shadow-lg shadow-accent/30"
            />
            <LiquidButton
              size="xl"
              onClick={() => router.push("/compare")}
              className="h-14 font-body text-lg font-bold text-white/90 hover:text-white"
            >
              Just compare products
            </LiquidButton>
          </motion.div>
          <motion.p variants={fadeUp} className="mt-5 text-xs text-white/40">
            No account needed · 250+ products · 29 categories · 100% independent
          </motion.p>

          {/* Scroll hint, fades as you move (Vectr hero__scroll-btn) */}
          <motion.div
            variants={fadeUp}
            style={{ opacity: hintOpacity }}
            className="mt-14 flex flex-col items-center gap-2 text-[0.65rem] font-medium uppercase tracking-[0.25em] text-white/40"
          >
            scroll to see how it works
            <motion.span
              animate={{ y: [0, 6, 0] }}
              transition={{
                duration: 1.6,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }}
              className="text-accent"
            >
              ↓
            </motion.span>
          </motion.div>
        </motion.div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-off to-transparent"
        />
      </section>

      {/* How it works — tiles cascade in on scroll (one staggered transition) */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl"
        >
          How it works
        </motion.h2>
        <motion.div
          variants={tileContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-12 grid items-start gap-6 sm:grid-cols-3"
        >
          {steps.map((s) => (
            <FlowCard key={s.n} step={s} />
          ))}
        </motion.div>
      </section>

      {/* CTA band: aurora + flowing paths + scramble */}
      <section className="relative overflow-hidden bg-navy-deep py-28 text-white">
        <AuroraBackground />
        <div className="text-white/40">
          <FloatingPaths position={1} />
          <FloatingPaths position={-1} />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto flex max-w-3xl flex-col items-center px-5 text-center"
        >
          <TextScramble
            text="READY WHEN YOU ARE"
            className="text-white/60"
          />
          <h2 className="mt-6 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            Stop guessing.{" "}
            <span className="bg-gradient-to-r from-accent via-[#ff7a4d] to-accent-deep bg-clip-text text-transparent">
              Start training.
            </span>
          </h2>
          <p className="mt-4 max-w-lg text-white/60">
            One minute of questions. Three kits built for your space, your
            budget, your goals.
          </p>
          <div className="mt-9">
            <HighlightButton
              onClick={() => router.push("/quiz")}
              className="h-14 rounded-xl bg-accent px-10 font-body text-lg font-bold text-white shadow-lg shadow-accent/30 transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-xl hover:shadow-accent/50 active:translate-y-0"
            >
              Build my kit →
            </HighlightButton>
          </div>
        </motion.div>
      </section>

      <SiteFooter />
    </>
  );
}
