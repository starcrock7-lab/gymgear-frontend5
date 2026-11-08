/* Quiz domain model — pure data, no React. Phase 3 reads the saved answers
   from sessionStorage and posts them to /api/kit, so option ids are stable
   identifiers: change labels freely, never change ids. */

export type QuizOption = {
  id: string;
  label: string;
  hint?: string;
};

export type QuizQuestion = {
  key: "goal" | "experience" | "budget" | "space" | "ceiling" | "equipmentCount" | "owned";
  title: string;
  subtitle: string;
  multi?: boolean;
  options: QuizOption[];
};

export type QuizAnswers = {
  goal: string | null;
  experience: string | null;
  budget: string | null;
  space: string | null;
  ceiling: string | null;
  equipmentCount: string | null;
  owned: string[];
};

export const EMPTY_ANSWERS: QuizAnswers = {
  goal: null,
  experience: null,
  budget: null,
  space: null,
  ceiling: null,
  equipmentCount: null,
  owned: [],
};

/* "Nothing yet" is exclusive with every other owned chip. */
export const OWNED_NONE = "nothing";

export const QUESTIONS: QuizQuestion[] = [
  {
    key: "goal",
    title: "What's your goal?",
    subtitle: "We optimize every kit around the result you're chasing.",
    options: [
      { id: "build-strength", label: "Build strength", hint: "Lift heavier, add muscle" },
      { id: "lose-weight", label: "Lose weight", hint: "Burn fat, move more" },
      { id: "get-fit", label: "Get fit", hint: "All-round health and energy" },
      { id: "home-gym-setup", label: "Home gym setup", hint: "Build the full space" },
    ],
  },
  {
    /* Research-backed add: experience changes WHAT to buy — beginners do
       better with adjustable/machine-led setups, advanced lifters want the
       barbell + rack path first. */
    key: "experience",
    title: "How experienced are you?",
    subtitle: "Honest answer — it changes what we put in your kit.",
    options: [
      { id: "beginner", label: "Just starting", hint: "First year of training" },
      { id: "intermediate", label: "Intermediate", hint: "Consistent for 1–3 years" },
      { id: "advanced", label: "Advanced", hint: "Years under the bar" },
    ],
  },
  {
    key: "budget",
    title: "What's your budget?",
    subtitle: "Total spend for everything in the kit.",
    options: [
      { id: "under-300", label: "Affordable", hint: "Under $300" },
      { id: "300-800", label: "Moderate", hint: "$300 to $800" },
      { id: "800-2000", label: "Premium", hint: "$800 to $2,000" },
      { id: "2000-plus", label: "Elite", hint: "$2,000 and up" },
    ],
  },
  {
    key: "space",
    title: "How much space do you have?",
    subtitle: "Every pick has to physically fit your life.",
    options: [
      { id: "apartment-corner", label: "Apartment corner", hint: "A few square feet" },
      { id: "small-room", label: "Small room", hint: "A spare room or office" },
      { id: "garage", label: "Garage", hint: "Room to grow" },
      { id: "outdoor", label: "Outdoor", hint: "Weather-proof picks" },
    ],
  },
  {
    /* Research-backed add: ceiling height is the constraint most buyers
       miss — a 90" rack doesn't fit under an 8 ft basement ceiling. */
    key: "ceiling",
    title: "How high is your ceiling?",
    subtitle: "The detail most people forget — tall racks need headroom.",
    options: [
      { id: "under-8ft", label: "Under 8 ft", hint: "Basement / low room" },
      { id: "8-9ft", label: "8 – 9 ft", hint: "Standard room height" },
      { id: "9ft-plus", label: "9 ft or more", hint: "Garage / high ceiling" },
    ],
  },
  {
    key: "equipmentCount",
    title: "How big a setup?",
    subtitle: "How many pieces of equipment you want to end up with.",
    options: [
      { id: "key-pieces", label: "1–2 key pieces", hint: "Just the essentials" },
      { id: "small-setup", label: "Small setup", hint: "3–5 pieces" },
      { id: "full-home-gym", label: "Full home gym", hint: "The complete build" },
    ],
  },
  {
    key: "owned",
    title: "What do you already own?",
    subtitle: "Select everything you have — we won't make you buy it twice.",
    multi: true,
    options: [
      { id: "barbell", label: "Barbell" },
      { id: "dumbbells", label: "Dumbbells" },
      { id: "bench", label: "Bench" },
      { id: "rack", label: "Rack" },
      { id: "cardio", label: "Cardio machine" },
      { id: OWNED_NONE, label: "Nothing yet" },
    ],
  },
];

export function optionLabel(key: QuizQuestion["key"], id: string): string {
  const q = QUESTIONS.find((q) => q.key === key);
  return q?.options.find((o) => o.id === id)?.label ?? id;
}

/* The quiz only asks what changes the kit most. Experience and owned gear are
   quick edits on the results page; the other answers keep their ids (the
   builder, audits and saved sessions still read them) and get defaults in
   withDefaults() instead of a screen each. */
export const ASKED: QuizQuestion["key"][] = ["goal", "budget", "space"];
export const QUIZ_QUESTIONS = QUESTIONS.filter((q) => ASKED.includes(q.key));
export const questionFor = (key: QuizQuestion["key"]) =>
  QUESTIONS.find((q) => q.key === key) as QuizQuestion;

/* Ceiling height is asked on the space screen, only where a tall rack is a
   real option: a corner of a flat rules one out and outdoors has no ceiling. */
export const needsCeiling = (space: string | null) =>
  space === "small-room" || space === "garage";

const PIECES_FOR_BUDGET: Record<string, string> = {
  "under-300": "key-pieces",
  "300-800": "small-setup",
  "800-2000": "full-home-gym",
  "2000-plus": "full-home-gym",
};

export function withDefaults(a: QuizAnswers): QuizAnswers {
  return {
    ...a,
    equipmentCount: a.equipmentCount ?? (a.budget ? PIECES_FOR_BUDGET[a.budget] ?? null : null),
    experience: a.experience ?? "beginner",
    owned: a.owned.length ? a.owned : [OWNED_NONE],
  };
}

/* The first screen still waiting on an answer, or -1 when the quiz is done. */
export function firstOpenStep(a: QuizAnswers): number {
  return QUIZ_QUESTIONS.findIndex((q) =>
    q.key === "space" ? !a.space || (needsCeiling(a.space) && !a.ceiling) : !a[q.key],
  );
}

/* Every asked question answered — the quiz is finished and ready to build. */
export function isComplete(a: QuizAnswers): boolean {
  return firstOpenStep(a) === -1;
}

/* --- Persistence (sessionStorage) ------------------------------------- */

const STORAGE_KEY = "gymgear.quiz.v1";

export function saveAnswers(answers: QuizAnswers): void {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ answers, savedAt: Date.now() }),
    );
  } catch {
    /* private mode / storage full — quiz still works in memory */
  }
}

export function loadAnswers(): QuizAnswers | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { answers?: Partial<QuizAnswers> };
    if (!parsed.answers) return null;
    return { ...EMPTY_ANSWERS, ...parsed.answers };
  } catch {
    return null;
  }
}

export function clearAnswers(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
