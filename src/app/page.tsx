"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  type Variants,
} from "framer-motion";
import { ClipboardList, Sparkles, ShieldCheck } from "lucide-react";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import DumbbellWall from "@/components/ui/dumbbell-wall";
import IntroLoader from "@/components/ui/intro-loader";
import AuroraBackground from "@/components/ui/aurora-background";
import FloatingPaths from "@/components/ui/background-paths";
import { TextScramble } from "@/components/ui/text-scramble";
import { ButtonColorful } from "@/components/ui/button-colorful";
import { LiquidButton } from "@/components/ui/liquid-glass-button";
import { HighlightButton } from "@/components/ui/highlight-button";
import { PulsingBorder } from "@/components/ui/pulsing-border";
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

/* Shader halo that exists only while its button is hovered — the canvas
   mounts on enter (nothing at rest) and pops in with the same soft elastic
   spring as the how-it-works cards, then shrinks/fades out on leave. */
function HoverHalo({ children }: { children: ReactNode }) {
  const [hot, setHot] = useState(false);
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setHot(true)}
      onMouseLeave={() => setHot(false)}
    >
      <AnimatePresence>
        {hot && (
          <motion.span
            key="halo"
            initial={{ opacity: 0, scale: 0.65 }}
            animate={{
              opacity: 1,
              scale: 1,
              transition: { type: "spring", stiffness: 210, damping: 15, mass: 1 },
            }}
            exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.22, ease: "easeOut" } }}
            className="pointer-events-none absolute -inset-3"
          >
            <PulsingBorder
              colors={["#ff8a5c", "#e8542a", "#b13a16"]}
              colorBack="#00000000"
              roundness={0.35}
              thickness={0.09}
              softness={0.85}
              intensity={0.55}
              bloom={0.6}
              spots={3}
              spotSize={0.5}
              pulse={0.35}
              smoke={0.35}
              smokeSize={0.6}
              speed={0.45}
              scale={1}
              style={{ width: "100%", height: "100%" }}
            />
          </motion.span>
        )}
      </AnimatePresence>
      {children}
    </span>
  );
}

const steps: FlowStep[] = [
  {
    n: "01",
    icon: <ClipboardList className="h-4.5 w-4.5" />,
    title: "Answer 7 questions",
    body: "Your goal, experience, budget, space, ceiling, setup size, and what you already own. Takes under a minute.",
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
      "250+ real products across 30+ categories, live prices",
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
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.04 } },
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

      {/* Hero — full first viewport (immersive: nothing below bleeds in),
          dumbbell-wallpaper backdrop whose edges ignite around the cursor */}
      <section className="relative flex min-h-[calc(100svh-4rem)] flex-col overflow-hidden bg-navy text-white">
        <DumbbellWall />

        <motion.div
          variants={heroStagger}
          initial="hidden"
          animate={introDone ? "show" : "hidden"}
          className="pointer-events-none relative mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-5 py-16 text-center"
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
            Answer 7 quick questions. Our AI builds you three complete
            equipment kits — optimized for value, fit, and quality — from real
            products with real prices.
          </motion.p>
          <motion.div
            variants={fadeUp}
            className="pointer-events-auto mt-10 flex flex-wrap items-center justify-center gap-4"
          >
            {/* Shader halo ignites only on hover (was always-on: laggy) */}
            <HoverHalo>
              <ButtonColorful
                label="Start the Quiz"
                onClick={() => router.push("/start")}
                className="relative h-14 rounded-xl px-8 font-body text-lg font-bold shadow-lg shadow-accent/30 transition-shadow duration-300 hover:shadow-[0_0_30px_rgba(232,84,42,0.55)]"
              />
            </HoverHalo>
            {/* Liquid glass edges ignite orange on hover (same glow language
                as the wallpaper) */}
            <LiquidButton
              size="xl"
              onClick={() => router.push("/compare")}
              className="h-14 font-body text-lg font-bold text-white/90 ring-1 ring-transparent transition-all duration-300 hover:text-white hover:ring-accent/70 hover:shadow-[0_0_24px_rgba(232,84,42,0.45),inset_0_0_14px_rgba(232,84,42,0.18)]"
            >
              Just compare products
            </LiquidButton>
          </motion.div>
          <motion.p variants={fadeUp} className="mt-5 text-xs text-white/40">
            No account needed · 250+ products · 30+ categories · 100% independent
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
      </section>

      {/* How it works — dark tech section; tiles cascade in on scroll */}
      <section className="relative overflow-hidden bg-navy-deep py-24">
        {/* Circuit-grid backdrop + ember glows for depth */}
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(ellipse_75%_80%_at_50%_40%,#000_50%,transparent_100%)]"
        />
        <div
          aria-hidden
          className="absolute -left-32 top-16 h-72 w-72 rounded-full bg-accent/10 blur-[110px]"
        />
        <div
          aria-hidden
          className="absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-accent/[0.07] blur-[120px]"
        />

        {/* Seam between sections: a glow line that draws itself on scroll */}
        <motion.div
          aria-hidden
          initial={{ scaleX: 0, opacity: 0 }}
          whileInView={{ scaleX: 1, opacity: 1 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-x-16 top-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent shadow-[0_0_16px_rgba(232,84,42,0.7)]"
        />

        {/* Star speckle — the "gym equipment in space" garnish */}
        <div aria-hidden className="starfield absolute inset-0 opacity-70" />

        {/* Section transition 1 (hero → how): whole block rises out of the
            seam as you scroll into it */}
        <motion.div
          initial={{ opacity: 0, y: 90 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-140px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto max-w-6xl px-5"
        >
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="text-center font-display text-3xl font-bold tracking-tight text-white sm:text-4xl"
          >
            How it works
          </motion.h2>
          <motion.div
            variants={tileContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            className="mt-14 grid items-stretch gap-6 sm:grid-cols-3"
          >
            {steps.map((s) => (
              <FlowCard key={s.n} step={s} />
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* CTA band: aurora + flowing paths + scramble */}
      <section className="relative overflow-hidden bg-navy-deep py-28 text-white">
        {/* Seam glow line between sections */}
        <motion.div
          aria-hidden
          initial={{ scaleX: 0, opacity: 0 }}
          whileInView={{ scaleX: 1, opacity: 1 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-x-16 top-0 z-10 h-px bg-gradient-to-r from-transparent via-accent/70 to-transparent shadow-[0_0_14px_rgba(232,84,42,0.6)]"
        />
        <AuroraBackground />
        <div className="text-white/40">
          <FloatingPaths position={1} />
          <FloatingPaths position={-1} />
        </div>
        {/* Star speckle continues the space backdrop */}
        <div aria-hidden className="starfield absolute inset-0 opacity-60" />
        {/* Section transition 2 (how → CTA): rise + settle-in scale */}
        <motion.div
          initial={{ opacity: 0, y: 80, scale: 0.96 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: "-140px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
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
            {/* Shader halo on hover + glow bloom — no 3D lift */}
            <HoverHalo>
              <HighlightButton
                onClick={() => router.push("/start")}
                className="relative h-14 rounded-xl bg-accent px-10 font-body text-lg font-bold text-white shadow-lg shadow-accent/30 transition-all duration-300 hover:bg-accent-hover hover:shadow-[0_0_36px_rgba(232,84,42,0.6)] hover:brightness-110"
              >
                Build my kit →
              </HighlightButton>
            </HoverHalo>
          </div>
        </motion.div>
      </section>

      <SiteFooter />
    </>
  );
}
