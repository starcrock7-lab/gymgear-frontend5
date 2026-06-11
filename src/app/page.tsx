"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { ChevronRight } from "lucide-react";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import SmoothScroll from "@/components/SmoothScroll";
import AnimatedGradientBackground from "@/components/ui/animated-gradient-background";
import GridOverlay from "@/components/ui/grid-overlay";

const steps = [
  {
    n: "01",
    title: "Answer 5 questions",
    body: "Your goal, budget, space, setup size, and what you already own. Takes under a minute.",
  },
  {
    n: "02",
    title: "AI builds 3 kits",
    body: "Best Value, Best Match, and Best Quality — assembled from 160 real products with live prices.",
  },
  {
    n: "03",
    title: "Buy with confidence",
    body: "Every pick explained in plain English, with direct buy links. Swap anything you don't like.",
  },
];

const heroStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function Home() {
  return (
    <SmoothScroll>
      <SiteNav />

      {/* Hero */}
      <section className="relative overflow-hidden bg-navy text-white">
        <AnimatedGradientBackground />
        <GridOverlay />
        <div
          aria-hidden
          className="animate-glow pointer-events-none absolute -top-40 left-1/2 h-130 w-200 -translate-x-1/2 rounded-full bg-accent/20 blur-3xl"
        />
        <motion.div
          variants={heroStagger}
          initial="hidden"
          animate="show"
          className="relative mx-auto flex max-w-4xl flex-col items-center px-5 pt-24 pb-28 text-center"
        >
          <motion.p
            variants={fadeUp}
            className="mb-6 flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-medium tracking-wide text-white/80 backdrop-blur-sm"
          >
            <span className="text-[0.5rem] text-accent">●</span>
            Free · No Sign-Up · AI-Powered · Always Independent
            <ChevronRight className="h-3.5 w-3.5 text-white/50" />
          </motion.p>
          <motion.h1
            variants={fadeUp}
            className="font-display text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-7xl"
          >
            <span className="bg-gradient-to-b from-white via-white to-white/60 bg-clip-text text-transparent">
              Your perfect home gym.
            </span>
            <br />
            <span className="bg-gradient-to-r from-accent via-[#ff7a4d] to-accent-deep bg-clip-text text-transparent">
              Built in 60 seconds.
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
            <Link
              href="/quiz"
              className="group rounded-xl bg-accent px-8 py-4 font-display text-lg font-bold text-white shadow-lg shadow-accent/30 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-xl hover:shadow-accent/50 active:translate-y-0 active:scale-[0.98]"
            >
              Start the Quiz
              <span className="ml-2 inline-block transition-transform duration-300 group-hover:translate-x-1">
                →
              </span>
            </Link>
            <Link
              href="/compare"
              className="rounded-xl border border-white/20 bg-white/5 px-8 py-4 font-display text-lg font-bold text-white/90 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/10 hover:text-white"
            >
              Just compare products
            </Link>
          </motion.div>
          <motion.p variants={fadeUp} className="mt-5 text-xs text-white/40">
            No account needed · 160+ products · 20 categories
          </motion.p>
        </motion.div>
        {/* Soft fade into the page background */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-off to-transparent"
        />
      </section>

      {/* How it works */}
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
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {steps.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{
                duration: 0.6,
                delay: i * 0.12,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="group rounded-2xl border border-line bg-white p-7 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-accent/40 hover:shadow-xl hover:shadow-accent/10"
            >
              <p className="font-display text-sm font-bold text-accent transition-transform duration-300 group-hover:scale-110 group-hover:[transform-origin:left]">
                {s.n}
              </p>
              <h3 className="mt-3 font-display text-xl font-bold text-ink">
                {s.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">
                {s.body}
              </p>
            </motion.div>
          ))}
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mt-12 text-center"
        >
          <Link
            href="/quiz"
            className="inline-block rounded-xl bg-accent px-8 py-4 font-display text-base font-bold text-white shadow-lg shadow-accent/20 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-xl hover:shadow-accent/40 active:translate-y-0 active:scale-[0.98]"
          >
            Build my kit →
          </Link>
        </motion.div>
      </section>

      <SiteFooter />
    </SmoothScroll>
  );
}
