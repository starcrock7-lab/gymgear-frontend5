"use client";

/* Commercial gym planner ("For Gyms" tab). Six questions → POST /api/gym-plan
   (local proxy → backend) → zone-by-zone equipment plan with quantities,
   totals, contingency, and a written build plan. The backend owns every
   product/quantity/price deterministically; the prose is Groq with a
   templated fallback, so this view just renders what it's given. */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Building2, Loader2, Map, Minus, Plus, RefreshCw } from "lucide-react";
import { formatPrice } from "@/lib/kit";
import { PLACEABLE_CATS, footprintOf, saveFloorItems, saveFloorOrigin, type FloorItem } from "@/lib/floor-plan";

/* Persist the built plan so leaving for the floor visualizer (or a stray
   reload) doesn't lose it — returning to /gym restores it, same as the
   home quiz's returning screen. "Start over" clears it. */
const PLAN_KEY = "gymgear.gymplan.v1";

type Answers = {
  projectType: string;
  gymType: string;
  space: string;
  ceilingHeight: string;
  capacity: string;
  budget: string;
  renoScope: string[]; // renovation only — what's driving it
  renoTargets: string[]; // renovation only — which zones to (re)do
};

/* multi-select answer keys (arrays) — everything else is a single string. */
const MULTI_KEYS = new Set<keyof Answers>(["renoScope", "renoTargets"]);

type PlanItem = {
  id: string;
  name: string;
  brand: string;
  category: string;
  qty: number;
  unitPrice: number;
  subtotal: number;
  url?: string;
  affiliateUrl?: string;
};

type PlanZone = {
  key: string;
  label: string;
  budget: number;
  subtotal: number;
  items: PlanItem[];
  coverageSqFt?: number;
  coverageTarget?: number;
};

type GymPlan = {
  zones: PlanZone[];
  totalPrice: number;
  budgetCap: number;
  areaSqFt: number;
  peakCapacity: number;
  contingency: number;
  writtenPlan: string;
  generatedBy: string;
};

type Option = { value: string; label: string; hint?: string };

const STEPS: {
  key: keyof Answers;
  title: string;
  sub: string;
  multi?: boolean;
  options: Option[];
  showIf?: (a: Answers) => boolean;
  copy?: (a: Answers) => { title?: string; sub?: string }; // context-aware wording
}[] = [
  {
    key: "projectType",
    title: "What's the project?",
    sub: "New build and renovation get different plans.",
    options: [
      { value: "new", label: "Starting a new gym", hint: "Empty room, full outfit" },
      { value: "renovation", label: "Renovating an existing gym", hint: "Upgrade what's weak, keep what works" },
    ],
  },
  {
    key: "gymType",
    title: "What kind of facility?",
    sub: "This sets how the budget splits across zones.",
    options: [
      { value: "strength-club", label: "Strength / powerlifting club", hint: "Racks, bars and iron first" },
      { value: "crossfit-box", label: "Functional fitness box", hint: "Rigs, ergs, air bikes, open floor" },
      { value: "boutique-studio", label: "Boutique PT studio", hint: "Small-group and 1-on-1 coaching" },
      { value: "general-fitness", label: "General fitness gym", hint: "Balanced cardio + machines + weights" },
    ],
  },
  {
    key: "space",
    title: "How much floor space?",
    sub: "Total usable training area, roughly.",
    /* Renovation sizes quantities off the area being redone, not the whole
       building — ask for that instead. */
    copy: (a) =>
      a.projectType === "renovation"
        ? { title: "How much are you renovating?", sub: "The floor area of the section you're redoing — that's what we size the order to." }
        : {},
    options: [
      { value: "under-1500", label: "Under 1,500 sq ft" },
      { value: "1500-3000", label: "1,500 – 3,000 sq ft" },
      { value: "3000-6000", label: "3,000 – 6,000 sq ft" },
      { value: "6000-plus", label: "6,000+ sq ft" },
    ],
  },
  {
    /* Research-backed add: ceiling height decides rack/rig heights and
       whether overhead work is even possible. */
    key: "ceilingHeight",
    title: "How high is the ceiling?",
    sub: "Decides upright heights and whether overhead zones work.",
    options: [
      { value: "under-9ft", label: "Under 9 ft", hint: "Low slab — short uprights" },
      { value: "9-12ft", label: "9 – 12 ft", hint: "Standard commercial" },
      { value: "12ft-plus", label: "12 ft+", hint: "Warehouse height" },
    ],
  },
  {
    key: "capacity",
    title: "Peak members at once?",
    sub: "Busiest hour, people on the floor — this sizes quantities.",
    options: [
      { value: "under-15", label: "Under 15" },
      { value: "15-30", label: "15 – 30" },
      { value: "30-60", label: "30 – 60" },
      { value: "60-plus", label: "60+" },
    ],
  },
  {
    key: "budget",
    title: "Equipment budget?",
    sub: "Gear only — the plan holds back contingency for delivery and install.",
    options: [
      { value: "10-25k", label: "$10k – $25k" },
      { value: "25-75k", label: "$25k – $75k" },
      { value: "75-200k", label: "$75k – $200k" },
      { value: "200k-plus", label: "$200k+" },
    ],
  },
  {
    /* Renovation follow-up #1 — what's actually driving the project. Shapes
       where the budget leans and the written plan. */
    key: "renoScope",
    title: "What's driving the renovation?",
    sub: "Pick everything that applies — it steers where the budget goes.",
    multi: true,
    showIf: (a) => a.projectType === "renovation",
    options: [
      { value: "replace-gear", label: "Replace worn-out gear", hint: "Swap tired, unsafe or dated equipment" },
      { value: "add-capacity", label: "Add capacity", hint: "More stations so peak hours aren't a bottleneck" },
      { value: "add-training", label: "Add new training styles", hint: "Functional, cable, conditioning zones" },
      { value: "reconfigure", label: "Reconfigure the layout", hint: "Re-floor and re-zone the space" },
      { value: "modernize", label: "Modernize the look", hint: "Fresher cardio, selectorized machines, finish" },
    ],
  },
  {
    /* Renovation follow-up #2 — exactly which areas to spend on. Whatever
       isn't selected is left as-is, and its budget flows into these. */
    key: "renoTargets",
    title: "Which areas are you redoing?",
    sub: "Only these get budget; anything you leave unchecked stays as it is.",
    multi: true,
    showIf: (a) => a.projectType === "renovation",
    options: [
      { value: "strength", label: "Strength zone", hint: "Racks, bars, plates, benches" },
      { value: "machines", label: "Machine row", hint: "Plate-loaded & selectorized" },
      { value: "cardio", label: "Cardio row", hint: "Treadmills, bikes, rowers" },
      { value: "functional", label: "Functional zone", hint: "GHD, kettlebells, rig accessories" },
      { value: "flooring", label: "Flooring", hint: "Rubber matting / platforms" },
    ],
  },
];

const EMPTY: Answers = {
  projectType: "",
  gymType: "",
  space: "",
  ceilingHeight: "",
  capacity: "",
  budget: "",
  renoScope: [],
  renoTargets: [],
};

const buyHref = (i: PlanItem) => i.affiliateUrl || i.url || "#";

export default function GymPlanner() {
  const [answers, setAnswers] = useState<Answers>(EMPTY);
  const [stepIdx, setStepIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [plan, setPlan] = useState<GymPlan | null>(null);

  /* Restore a saved plan on mount (returning from the visualizer / a reload). */
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(PLAN_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { answers?: Answers; plan?: GymPlan };
      if (parsed.plan) {
        if (parsed.answers) setAnswers(parsed.answers);
        setPlan(parsed.plan);
      }
    } catch {
      /* ignore */
    }
  }, []);

  /* Keep the saved copy in step with the current plan (incl. qty edits). */
  useEffect(() => {
    if (!plan) return;
    try {
      sessionStorage.setItem(PLAN_KEY, JSON.stringify({ answers, plan }));
    } catch {
      /* ignore */
    }
  }, [plan, answers]);

  const steps = useMemo(
    () => STEPS.filter((s) => !s.showIf || s.showIf(answers)),
    [answers],
  );
  const step = steps[Math.min(stepIdx, steps.length - 1)];
  const isLast = stepIdx >= steps.length - 1;
  const stepCopy = step.copy ? step.copy(answers) : {};
  const stepTitle = stepCopy.title ?? step.title;
  const stepSub = stepCopy.sub ?? step.sub;

  async function submit(finalAnswers: Answers) {
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/gym-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalAnswers),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Planner unavailable.");
      setPlan(data as GymPlan);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong — try again.");
    } finally {
      setLoading(false);
    }
  }

  function pick(value: string) {
    if (step.multi) {
      const key = step.key;
      const cur = new Set((answers[key] as string[]) ?? []);
      if (cur.has(value)) cur.delete(value);
      else cur.add(value);
      setAnswers({ ...answers, [key]: [...cur] });
      return; // multi advances via the Next / Build button, not on click
    }
    const next = { ...answers, [step.key]: value } as Answers;
    setAnswers(next);
    if (isLast) void submit(next);
    else setStepIdx(stepIdx + 1);
  }

  function restart() {
    setAnswers(EMPTY);
    setStepIdx(0);
    setPlan(null);
    setError("");
    try {
      sessionStorage.removeItem(PLAN_KEY);
    } catch {
      /* ignore */
    }
  }

  /* Owner tweaks quantities on the result — totals recompute locally.
     (Prices stay server-owned; we only multiply what it sent.) */
  function setQty(zoneKey: string, id: string, delta: number) {
    if (!plan) return;
    const zones = plan.zones.map((z) => {
      if (z.key !== zoneKey) return z;
      const items = z.items.map((i) => {
        if (i.id !== id) return i;
        const qty = Math.max(0, Math.min(99, i.qty + delta));
        return { ...i, qty, subtotal: qty * i.unitPrice };
      });
      return { ...z, items, subtotal: items.reduce((s, i) => s + i.subtotal, 0) };
    });
    const totalPrice = zones.reduce((s, z) => s + z.subtotal, 0);
    setPlan({
      ...plan,
      zones,
      totalPrice,
      contingency: Math.max(0, plan.budgetCap - totalPrice),
    });
  }

  /* Hand the (possibly qty-tweaked) list to the floor-plan visualizer. */
  function visualize() {
    if (!plan) return;
    const out: FloorItem[] = [];
    for (const z of plan.zones)
      for (const i of z.items) {
        if (!PLACEABLE_CATS.has(i.category) || i.qty < 1) continue;
        const { w, d } = footprintOf(i.id, i.category);
        out.push({ id: i.id, name: i.name, brand: i.brand, category: i.category, qty: i.qty, w, d });
      }
    saveFloorItems(out);
    saveFloorOrigin("/gym");
  }

  /* ── Loading ── */
  if (loading) {
    return (
      <Shell>
        <div className="mx-auto max-w-xl py-24 text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-accent" />
          <h2 className="mt-6 font-display text-2xl font-bold text-ink">
            Drawing up your facility plan…
          </h2>
          <p className="mt-3 text-sm text-ink-2">
            Zoning the floor, sizing quantities and writing your build plan.
            First run can take up to a minute while the planner wakes up.
          </p>
        </div>
      </Shell>
    );
  }

  /* ── Result ── */
  if (plan) {
    return (
      <Shell>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-accent">
              Your facility plan
            </p>
            <h1 className="mt-1 font-display text-3xl font-extrabold text-ink">
              {answers.projectType === "renovation" ? "Renovation plan" : "New gym build"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/planner"
              onClick={visualize}
              className="flex items-center gap-2 rounded-lg bg-accent px-3.5 py-2 text-sm font-bold text-white transition-colors hover:bg-accent-hover"
            >
              <Map className="h-3.5 w-3.5" /> Visualize floor plan
            </Link>
            <button
              onClick={restart}
              className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm text-ink-2 transition-colors hover:border-accent/60 hover:text-ink"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Start over
            </button>
          </div>
        </div>

        {/* Headline numbers */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Budget" value={formatPrice(plan.budgetCap)} />
          <Stat label="Planned spend" value={formatPrice(plan.totalPrice)} accent />
          <Stat label="Held for install & contingency" value={formatPrice(plan.contingency)} />
          <Stat label="Floor / peak" value={`${plan.areaSqFt.toLocaleString()} sq ft · ${plan.peakCapacity}`} />
        </div>

        {/* Written plan */}
        <div className="mt-8 rounded-2xl border border-accent/40 bg-card p-6 shadow-[0_0_24px_rgba(240,83,30,0.12)]">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-accent" />
            <h2 className="font-display text-lg font-bold text-ink">The written plan</h2>
          </div>
          <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-ink-2">
            {plan.writtenPlan}
          </p>
        </div>

        {/* Zones */}
        <div className="mt-8 space-y-6">
          {plan.zones.map((z) => (
            <div key={z.key} className="rounded-2xl border border-line bg-card p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-display text-lg font-bold text-ink">{z.label}</h3>
                <p className="text-sm text-ink-2">
                  <span className="font-bold text-ink">{formatPrice(z.subtotal)}</span>
                  <span className="text-ink-3"> of {formatPrice(z.budget)} zone budget</span>
                </p>
              </div>
              {z.key === "flooring" && z.coverageSqFt ? (
                <p className="mt-1 text-xs text-ink-3">
                  Covers ~{z.coverageSqFt.toLocaleString()} sq ft of the ~
                  {(z.coverageTarget || 0).toLocaleString()} sq ft target.
                </p>
              ) : null}
              <div className="mt-4 divide-y divide-line">
                {z.items.map((i) => (
                  <div
                    key={i.id}
                    className={`flex items-center justify-between gap-3 py-2.5 ${i.qty === 0 ? "opacity-40" : ""}`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-ink">{i.name}</p>
                      <p className="text-xs text-ink-3">
                        {i.brand} · {formatPrice(i.unitPrice)} each
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      {/* Quantity stepper — totals recompute live */}
                      <div className="flex items-center gap-1.5 rounded-lg border border-line px-1.5 py-1">
                        <button
                          onClick={() => setQty(z.key, i.id, -1)}
                          className="text-ink-3 transition-colors hover:text-accent"
                          aria-label={`One fewer ${i.name}`}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-6 text-center text-sm font-bold text-accent">{i.qty}</span>
                        <button
                          onClick={() => setQty(z.key, i.id, 1)}
                          className="text-ink-3 transition-colors hover:text-accent"
                          aria-label={`One more ${i.name}`}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <span className="w-20 text-right text-sm font-bold text-ink">{formatPrice(i.subtotal)}</span>
                      <a
                        href={buyHref(i)}
                        target="_blank"
                        rel="noopener noreferrer sponsored"
                        className="flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-xs font-bold text-ink-2 transition-colors hover:border-accent/60 hover:text-accent"
                      >
                        View <ArrowUpRight className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-6 text-xs text-ink-3">
          Prices come from each retailer&apos;s live product page and change without
          notice. Treat this as a starting blueprint — commercial pieces often
          have 5–7 week lead times, and volume orders usually qualify for
          dealer pricing below what&apos;s listed.
        </p>
      </Shell>
    );
  }

  /* ── Questions ── */
  return (
    <Shell>
      <div className="mx-auto max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-widest text-accent">
          For gym owners
        </p>
        <h1 className="mt-1 font-display text-3xl font-extrabold text-ink sm:text-4xl">
          Outfit a real gym
        </h1>
        <p className="mt-2 text-sm text-ink-2">
          New build or renovation — a few quick questions, then a zone-by-zone
          commercial equipment plan with quantities, totals and a written
          build plan.
        </p>

        {/* Progress */}
        <div className="mt-8 flex items-center gap-2">
          {steps.map((s, i) => (
            <div
              key={s.key}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i < stepIdx ? "bg-accent" : i === stepIdx ? "bg-accent/60" : "bg-line"
              }`}
            />
          ))}
        </div>

        <div className="mt-8">
          <h2 className="font-display text-xl font-bold text-ink">{stepTitle}</h2>
          <p className="mt-1 text-sm text-ink-3">{stepSub}</p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {step.options.map((o) => {
              const selected = MULTI_KEYS.has(step.key)
                ? (answers[step.key] as string[]).includes(o.value)
                : answers[step.key] === o.value;
              return (
                <button
                  key={o.value}
                  onClick={() => pick(o.value)}
                  className={`rounded-2xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 ${
                    selected
                      ? "border-accent bg-accent/10 shadow-[0_0_18px_rgba(240,83,30,0.25)]"
                      : "border-line bg-card hover:border-accent/50"
                  }`}
                >
                  <p className="font-display text-sm font-bold text-ink">{o.label}</p>
                  {o.hint ? <p className="mt-1 text-xs text-ink-3">{o.hint}</p> : null}
                </button>
              );
            })}
          </div>

          {error ? (
            <p className="mt-4 rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-accent">
              {error}
            </p>
          ) : null}

          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={() => setStepIdx(Math.max(0, stepIdx - 1))}
              disabled={stepIdx === 0}
              className="flex items-center gap-1.5 text-sm text-ink-3 transition-colors enabled:hover:text-ink disabled:opacity-40"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
            {step.multi ? (
              isLast ? (
                <button
                  onClick={() => void submit(answers)}
                  className="rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-accent-hover"
                >
                  Build my plan →
                </button>
              ) : (
                <button
                  onClick={() => setStepIdx(stepIdx + 1)}
                  className="rounded-xl border border-accent/60 px-5 py-2.5 text-sm font-bold text-accent transition-colors hover:bg-accent/10"
                >
                  Next →
                </button>
              )
            ) : null}
          </div>
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-off">
      <div className="mx-auto max-w-5xl px-5 py-12">{children}</div>
    </main>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <p className="text-[0.65rem] font-bold uppercase tracking-wider text-ink-3">{label}</p>
      <p className={`mt-1 font-display text-lg font-extrabold ${accent ? "text-accent" : "text-ink"}`}>
        {value}
      </p>
    </div>
  );
}
