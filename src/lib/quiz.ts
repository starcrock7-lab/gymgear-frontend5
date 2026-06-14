/* Quiz domain model — pure data, no React. Phase 3 reads the saved answers
   from sessionStorage and posts them to /api/kit, so option ids are stable
   identifiers: change labels freely, never change ids. */

export type QuizOption = {
  id: string;
  label: string;
  hint?: string;
};

export type QuizQuestion = {
  key: "goal" | "budget" | "space" | "equipmentCount" | "owned";
  title: string;
  subtitle: string;
  multi?: boolean;
  options: QuizOption[];
};

export type QuizAnswers = {
  goal: string | null;
  budget: string | null;
  space: string | null;
  equipmentCount: string | null;
  owned: string[];
};

export const EMPTY_ANSWERS: QuizAnswers = {
  goal: null,
  budget: null,
  space: null,
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
    key: "budget",
    title: "What's your budget?",
    subtitle: "Total spend for everything in the kit.",
    options: [
      { id: "under-300", label: "Under $300", hint: "Smart essentials" },
      { id: "300-800", label: "$300 – $800", hint: "Solid foundation" },
      { id: "800-2000", label: "$800 – $2,000", hint: "Serious setup" },
      { id: "2000-plus", label: "$2,000+", hint: "No compromises" },
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

/* Every question answered — the quiz is finished and ready to build. */
export function isComplete(a: QuizAnswers): boolean {
  return Boolean(
    a.goal && a.budget && a.space && a.equipmentCount && a.owned.length > 0,
  );
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
