"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  MotionConfig,
  type Variants,
} from "framer-motion";
import {
  ArrowLeft,
  Boxes,
  Building2,
  Check,
  Coins,
  CreditCard,
  DoorOpen,
  Dumbbell,
  Flame,
  Gem,
  HeartPulse,
  Home,
  LayoutGrid,
  Package,
  RotateCcw,
  TreePine,
  Wallet,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import SiteNav from "@/components/SiteNav";
import GridOverlay from "@/components/ui/grid-overlay";
import KitResult from "@/components/quiz/KitResult";
import { cn } from "@/lib/utils";
import { requestKit } from "@/lib/api";
import { saveKit, loadKit, clearKit, type KitResponse } from "@/lib/kit";
import {
  EMPTY_ANSWERS,
  OWNED_NONE,
  QUESTIONS,
  clearAnswers,
  isComplete,
  loadAnswers,
  optionLabel,
  saveAnswers,
  type QuizAnswers,
  type QuizQuestion,
} from "@/lib/quiz";

type KitState =
  | { status: "loading" }
  | { status: "done"; data: KitResponse }
  | { status: "error" };

const OPTION_ICONS: Record<string, LucideIcon> = {
  "build-strength": Dumbbell,
  "lose-weight": Flame,
  "get-fit": HeartPulse,
  "home-gym-setup": Home,
  "under-300": Coins,
  "300-800": Wallet,
  "800-2000": CreditCard,
  "2000-plus": Gem,
  "apartment-corner": Building2,
  "small-room": DoorOpen,
  garage: Warehouse,
  outdoor: TreePine,
  "key-pieces": Package,
  "small-setup": Boxes,
  "full-home-gym": LayoutGrid,
};

/* Screens slide in from the direction of travel and blur out. */
const screenVariants: Variants = {
  enter: (dir: number) => ({ opacity: 0, x: 64 * dir, filter: "blur(6px)" }),
  center: {
    opacity: 1,
    x: 0,
    filter: "blur(0px)",
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
  exit: (dir: number) => ({
    opacity: 0,
    x: -64 * dir,
    filter: "blur(6px)",
    transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
  }),
};

type Phase = "quiz" | "returning" | "building" | "ready";

export default function QuizFlow() {
  const [phase, setPhase] = useState<Phase>("quiz");
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [answers, setAnswers] = useState<QuizAnswers>(EMPTY_ANSWERS);
  const [kit, setKit] = useState<KitState>({ status: "loading" });
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* During a screen transition the exiting screen's buttons are still in
     the DOM with live handlers. These refs let handlers check they belong
     to the current screen, so a stray click can't write the wrong answer. */
  const stepRef = useRef(step);
  const phaseRef = useRef(phase);
  useEffect(() => {
    stepRef.current = step;
    phaseRef.current = phase;
  }, [step, phase]);

  const question = QUESTIONS[step];

  /* On mount, pick up where the user left off:
     - finished quiz  → "returning" choice screen (see kits / start new)
     - half-finished  → resume at the first unanswered question
     One deliberate post-mount re-render; lazy init would mismatch SSR HTML. */
  useEffect(() => {
    const saved = loadAnswers();
    if (!saved) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAnswers(saved);
    if (isComplete(saved)) {
      const cached = loadKit();
      if (cached) setKit({ status: "done", data: cached });
      setPhase("returning");
      return;
    }
    const firstOpen = QUESTIONS.findIndex((q) =>
      q.multi ? saved.owned.length === 0 : !saved[q.key],
    );
    setStep(firstOpen === -1 ? QUESTIONS.length - 1 : firstOpen);
  }, []);

  useEffect(() => {
    return () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    };
  }, []);

  const cancelPendingAdvance = () => {
    if (advanceTimer.current) {
      clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
  };

  const selectSingle = useCallback(
    (key: Exclude<QuizQuestion["key"], "owned">, id: string) => {
      if (phaseRef.current !== "quiz" || QUESTIONS[stepRef.current].key !== key)
        return;
      cancelPendingAdvance();
      setAnswers((prev) => {
        const next = { ...prev, [key]: id };
        saveAnswers(next);
        return next;
      });
      /* Brief pause so the selected state registers before the slide. */
      advanceTimer.current = setTimeout(() => {
        setDirection(1);
        setStep((s) => Math.min(s + 1, QUESTIONS.length - 1));
      }, 260);
    },
    [],
  );

  const toggleOwned = useCallback((id: string) => {
    if (phaseRef.current !== "quiz" || !QUESTIONS[stepRef.current].multi)
      return;
    setAnswers((prev) => {
      let owned: string[];
      if (id === OWNED_NONE) {
        owned = prev.owned.includes(OWNED_NONE) ? [] : [OWNED_NONE];
      } else {
        owned = prev.owned.includes(id)
          ? prev.owned.filter((o) => o !== id)
          : [...prev.owned.filter((o) => o !== OWNED_NONE), id];
      }
      const next = { ...prev, owned };
      saveAnswers(next);
      return next;
    });
  }, []);

  const goBack = useCallback(() => {
    cancelPendingAdvance();
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  /* Kick off the real /api/kit build. The building animation and the request
     race a shared minimum delay so the screen never flashes past. */
  const startBuild = useCallback((finalAnswers: QuizAnswers) => {
    setKit({ status: "loading" });
    setPhase("building");
    const minDelay = new Promise<void>((r) => setTimeout(r, 2400));
    (async () => {
      try {
        const [data] = await Promise.all([
          requestKit(finalAnswers),
          minDelay,
        ]);
        saveKit(data);
        setKit({ status: "done", data });
      } catch {
        await minDelay;
        setKit({ status: "error" });
      }
      setPhase("ready");
    })();
  }, []);

  const submit = useCallback(() => {
    if (phaseRef.current !== "quiz") return;
    cancelPendingAdvance();
    saveAnswers(answers);
    startBuild(answers);
  }, [answers, startBuild]);

  /* Wipe everything and start the quiz over from question one. */
  const startNew = useCallback(() => {
    cancelPendingAdvance();
    clearAnswers();
    clearKit();
    setAnswers(EMPTY_ANSWERS);
    setKit({ status: "loading" });
    setDirection(1);
    setStep(0);
    setPhase("quiz");
  }, []);

  /* Returning user wants their kits — show the cached result instantly, or
     rebuild from the saved answers if the cache is gone. */
  const showResults = useCallback(() => {
    const cached = loadKit();
    if (cached) {
      setKit({ status: "done", data: cached });
      setPhase("ready");
    } else {
      startBuild(answers);
    }
  }, [answers, startBuild]);

  const retake = startNew;

  /* Keyboard: 1–9 picks an option, Backspace goes back, Enter submits the
     final multi-select. */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (phase !== "quiz" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Backspace") {
        e.preventDefault();
        if (step > 0) goBack();
        return;
      }
      const q = QUESTIONS[step];
      if (e.key === "Enter" && q.multi && answers.owned.length > 0) {
        submit();
        return;
      }
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= q.options.length) {
        const opt = q.options[n - 1];
        if (q.multi) toggleOwned(opt.id);
        else selectSingle(q.key as Exclude<QuizQuestion["key"], "owned">, opt.id);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, step, answers.owned.length, goBack, submit, toggleOwned, selectSingle]);

  const progress = phase === "quiz" ? (step + 1) / QUESTIONS.length : 1;

  return (
    <MotionConfig reducedMotion="user">
      <SiteNav />
      <main className="relative flex flex-1 flex-col overflow-hidden bg-navy text-white">
        <GridOverlay />
        <div
          aria-hidden
          className="animate-glow pointer-events-none absolute -top-40 left-1/2 h-130 w-200 -translate-x-1/2 rounded-full bg-accent/15 blur-3xl"
        />

        <div
          className={cn(
            "relative mx-auto flex w-full flex-1 flex-col px-5 pb-16 pt-10 transition-[max-width] duration-500",
            // The three-kit result needs room; quiz + building stay narrow.
            phase === "ready" ? "max-w-6xl" : "max-w-3xl",
          )}
        >
          {/* Progress header */}
          <div
            className={cn(
              "transition-opacity duration-300",
              phase === "quiz" ? "opacity-100" : "opacity-0",
            )}
          >
            <div className="flex h-9 items-center justify-between">
              <button
                type="button"
                onClick={goBack}
                aria-label="Previous question"
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-white/60 transition-all hover:bg-white/10 hover:text-white",
                  step === 0 && "pointer-events-none opacity-0",
                )}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <p className="text-[0.65rem] font-medium uppercase tracking-[0.25em] text-white/50">
                Question {Math.min(step + 1, QUESTIONS.length)} of{" "}
                {QUESTIONS.length}
              </p>
            </div>
            <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full origin-left rounded-full bg-accent"
                initial={false}
                animate={{ scaleX: progress }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                style={{ width: "100%" }}
              />
            </div>
          </div>

          {/* Screens — single keyed child: AnimatePresence mode="wait"
              only swaps reliably when the child stays in one slot. */}
          <div className="flex flex-1 flex-col justify-center py-10">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={phase === "quiz" ? `q-${step}` : phase}
                custom={direction}
                variants={screenVariants}
                initial="enter"
                animate="center"
                exit="exit"
              >
                {phase === "quiz" ? (
                  <>
                    <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                      {question.title}
                    </h1>
                    <p className="mt-3 text-white/60">{question.subtitle}</p>

                    {question.multi ? (
                      <OwnedScreen
                        owned={answers.owned}
                        onToggle={toggleOwned}
                        onSubmit={submit}
                      />
                    ) : (
                      <div className="mt-9 grid gap-3 sm:grid-cols-2">
                        {question.options.map((opt, i) => (
                          <OptionCard
                            key={opt.id}
                            index={i}
                            label={opt.label}
                            hint={opt.hint}
                            icon={OPTION_ICONS[opt.id]}
                            selected={answers[question.key] === opt.id}
                            onSelect={() =>
                              selectSingle(
                                question.key as Exclude<
                                  QuizQuestion["key"],
                                  "owned"
                                >,
                                opt.id,
                              )
                            }
                          />
                        ))}
                      </div>
                    )}
                  </>
                ) : phase === "returning" ? (
                  <ReturningPanel
                    answers={answers}
                    onResults={showResults}
                    onNew={startNew}
                  />
                ) : phase === "building" ? (
                  <BuildingScreen />
                ) : (
                  <ReadyPanel
                    kit={kit}
                    onRetake={retake}
                    onRetry={() => startBuild(answers)}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>
    </MotionConfig>
  );
}

/* --- Option card (single-select questions) ----------------------------- */

function OptionCard({
  index,
  label,
  hint,
  icon: Icon,
  selected,
  onSelect,
}: {
  index: number;
  label: string;
  hint?: string;
  icon?: LucideIcon;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group flex items-center gap-4 rounded-xl border px-5 py-4 text-left transition-all duration-200 ease-out",
        selected
          ? "border-accent bg-accent/15 shadow-lg shadow-accent/20"
          : "border-white/12 bg-white/5 hover:-translate-y-0.5 hover:border-accent/50 hover:bg-white/10",
      )}
    >
      {Icon && (
        <span
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-colors duration-200",
            selected ? "bg-accent text-white" : "bg-white/8 text-accent",
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block font-body font-bold">{label}</span>
        {hint && (
          <span className="mt-0.5 block text-sm text-white/55">{hint}</span>
        )}
      </span>
      {selected ? (
        <Check className="h-5 w-5 shrink-0 text-accent" />
      ) : (
        <kbd className="hidden shrink-0 rounded border border-white/15 px-1.5 py-0.5 text-[0.6rem] text-white/30 sm:block">
          {index + 1}
        </kbd>
      )}
    </button>
  );
}

/* --- Final question: multi-select chips + submit ----------------------- */

function OwnedScreen({
  owned,
  onToggle,
  onSubmit,
}: {
  owned: string[];
  onToggle: (id: string) => void;
  onSubmit: () => void;
}) {
  const question = QUESTIONS[QUESTIONS.length - 1];
  const canSubmit = owned.length > 0;

  return (
    <>
      <div className="mt-9 flex flex-wrap gap-2.5">
        {question.options.map((opt) => {
          const selected = owned.includes(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onToggle(opt.id)}
              aria-pressed={selected}
              className={cn(
                "flex items-center gap-2 rounded-full border px-5 py-2.5 font-medium transition-all duration-200",
                selected
                  ? "border-accent bg-accent/20 text-white"
                  : "border-white/15 bg-white/5 text-white/75 hover:border-accent/50 hover:text-white",
              )}
            >
              {selected && <Check className="h-4 w-4 text-accent" />}
              {opt.label}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit}
        className={cn(
          "group mt-10 w-fit rounded-xl bg-accent px-8 py-4 font-body text-lg font-bold text-white shadow-lg shadow-accent/30 transition-all duration-300 ease-out",
          canSubmit
            ? "hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-xl hover:shadow-accent/50 active:translate-y-0 active:scale-[0.98]"
            : "cursor-not-allowed opacity-40",
        )}
      >
        Build my kit
        <span className="ml-2 inline-block transition-transform duration-300 group-hover:translate-x-1">
          →
        </span>
      </button>
      <p className="mt-4 text-xs text-white/40">
        Pick at least one — &ldquo;Nothing yet&rdquo; counts.
      </p>
    </>
  );
}

/* --- "Building your kit..." loading screen ----------------------------- */

const BUILD_LINES = [
  "Scanning 160 products across 20 categories…",
  "Optimizing for your budget and space…",
  "Assembling Best Value · Best Match · Best Quality…",
];

const LINE_STEP_MS = 1100;

function BuildingScreen() {
  /* Pure animation — QuizFlow.startBuild flips the phase when the real
     /api/kit response and the minimum delay both resolve. */
  return (
    <div className="flex flex-col items-center text-center">
      <motion.div
        aria-hidden
        animate={{ scale: [1, 1.15, 1], opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        className="relative h-16 w-16"
      >
        <div className="absolute inset-0 rounded-full bg-accent/30 blur-xl" />
        <div className="absolute inset-2 rounded-full border-2 border-accent/60" />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
          className="absolute inset-2 rounded-full border-2 border-transparent border-t-accent"
        />
      </motion.div>

      <h1 className="mt-8 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
        Building your kit…
      </h1>

      <div className="mt-8 flex flex-col items-start gap-3">
        {BUILD_LINES.map((line, i) => (
          <motion.p
            key={line}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: (i * LINE_STEP_MS) / 1000,
              duration: 0.45,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="flex items-center gap-2.5 text-sm text-white/65"
          >
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: (i * LINE_STEP_MS + 750) / 1000 }}
              className="text-accent"
            >
              <Check className="h-4 w-4" />
            </motion.span>
            {line}
          </motion.p>
        ))}
      </div>
    </div>
  );
}

/* --- Returning user: choose to see saved kits or start fresh ----------- */

function ReturningPanel({
  answers,
  onResults,
  onNew,
}: {
  answers: QuizAnswers;
  onResults: () => void;
  onNew: () => void;
}) {
  const recap = [
    answers.goal && optionLabel("goal", answers.goal),
    answers.budget && optionLabel("budget", answers.budget),
    answers.space && optionLabel("space", answers.space),
    answers.equipmentCount &&
      optionLabel("equipmentCount", answers.equipmentCount),
  ].filter(Boolean) as string[];

  return (
    <div className="flex flex-col items-center text-center">
      <p className="text-[0.65rem] font-medium uppercase tracking-[0.25em] text-accent">
        Welcome back
      </p>
      <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
        Your kit is right where you left it.
      </h1>
      <div className="mt-6 flex max-w-xl flex-wrap items-center justify-center gap-2">
        {recap.map((chip) => (
          <span
            key={chip}
            className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm text-white/80"
          >
            {chip}
          </span>
        ))}
      </div>
      <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
        <button
          type="button"
          onClick={onResults}
          className="group rounded-xl bg-accent px-8 py-4 font-body text-lg font-bold text-white shadow-lg shadow-accent/30 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-xl hover:shadow-accent/50 active:translate-y-0 active:scale-[0.98]"
        >
          See my kits
          <span className="ml-2 inline-block transition-transform duration-300 group-hover:translate-x-1">
            →
          </span>
        </button>
        <button
          type="button"
          onClick={onNew}
          className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-8 py-4 font-body text-lg font-bold text-white/90 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/10 hover:text-white"
        >
          <RotateCcw className="h-4 w-4" />
          Start a new quiz
        </button>
      </div>
    </div>
  );
}

/* --- Result: render the generated kits, or an error with retry ---------- */

function ReadyPanel({
  kit,
  onRetake,
  onRetry,
}: {
  kit: KitState;
  onRetake: () => void;
  onRetry: () => void;
}) {
  if (kit.status === "done") {
    return <KitResult data={kit.data} onRetake={onRetake} />;
  }

  /* Error (or the brief instant before phase flips) — offer a retry and the
     comparison tool as a fallback path. */
  return (
    <div className="flex flex-col items-center text-center">
      <p className="text-[0.65rem] font-medium uppercase tracking-[0.25em] text-accent">
        Couldn&apos;t reach the kit builder
      </p>
      <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
        That one&apos;s on us.
      </h1>
      <p className="mt-4 max-w-md text-white/60">
        The kit service didn&apos;t respond — your answers are saved, so give
        it another go. The comparison tool is open either way.
      </p>
      <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
        <button
          type="button"
          onClick={onRetry}
          className="group rounded-xl bg-accent px-8 py-4 font-body text-lg font-bold text-white shadow-lg shadow-accent/30 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-xl hover:shadow-accent/50 active:translate-y-0 active:scale-[0.98]"
        >
          Try again
        </button>
        <Link
          href="/compare"
          className="rounded-xl border border-white/20 bg-white/5 px-8 py-4 font-body text-lg font-bold text-white/90 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/10 hover:text-white"
        >
          Compare products
        </Link>
        <button
          type="button"
          onClick={onRetake}
          className="font-body text-sm font-bold text-white/50 transition-colors hover:text-white"
        >
          Retake quiz
        </button>
      </div>
    </div>
  );
}
