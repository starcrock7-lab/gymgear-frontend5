/* Search logic, no React: ranking with typo tolerance, the words people use for
   gear our categories name differently, and recent searches. The panel lives in
   components/SearchModal.tsx; scripts/check-search.mjs covers this file. */

export type SearchProduct = {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  salePrice: number | null;
  rating: number | null;
  gymgearScore: number | null;
  image: string | null;
};

/* What buyers type, and the category each term lives in. "Squat rack" finds
   nothing by name alone: our listings say "Squat Stand" or "Power Rack". */
export const TERMS: { term: string; cat: string }[] = [
  { term: "squat rack", cat: "racks" },
  { term: "power rack", cat: "racks" },
  { term: "squat stand", cat: "racks" },
  { term: "home gym machine", cat: "machines" },
  { term: "functional trainer", cat: "machines" },
  { term: "cable machine", cat: "machines" },
  { term: "adjustable dumbbells", cat: "dumbbells" },
  { term: "hex dumbbells", cat: "dumbbells" },
  { term: "weight bench", cat: "benches" },
  { term: "flat bench", cat: "benches" },
  { term: "olympic barbell", cat: "barbells" },
  { term: "bumper plates", cat: "plates" },
  { term: "weight plates", cat: "plates" },
  { term: "treadmill", cat: "cardio" },
  { term: "exercise bike", cat: "cardio" },
  { term: "rowing machine", cat: "cardio" },
  { term: "kettlebell", cat: "kettlebells" },
  { term: "resistance bands", cat: "bands" },
  { term: "pull up bands", cat: "bands" },
  { term: "gym flooring", cat: "flooring" },
  { term: "yoga mat", cat: "yogamats" },
  { term: "foam roller", cat: "foamrollers" },
  { term: "jump rope", cat: "jumpropes" },
  { term: "lifting belt", cat: "belts" },
  { term: "protein powder", cat: "protein" },
  { term: "creatine", cat: "creatine" },
];

/* Search words for a term that the listings word differently, so choosing a
   suggestion always lists something. */
const SAME_AS: Record<string, string[]> = {
  "squat rack": ["rack", "squat stand", "cage"],
  "power rack": ["power rack", "cage"],
  "home gym machine": ["home gym", "all-in-one", "smart gym"],
  "exercise bike": ["bike", "cycle"],
  "rowing machine": ["rower", "rowerg", "row"],
  "pull up bands": ["pull-up", "resistance band", "monster band"],
  "lifting belt": ["belt"],
  "protein powder": ["protein", "whey"],
  "gym flooring": ["floor", "mat"],
  "weight plates": ["plate"],
  "cable machine": ["cable"],
  "olympic barbell": ["barbell"],
};

const tidy = (s: string) => s.toLowerCase().replace(/[^a-z0-9$ ]+/g, " ").replace(/\s+/g, " ").trim();

/* Edit distance, stopping early once it can't come in under `max`. */
function within(a: string, b: string, max: number): boolean {
  if (Math.abs(a.length - b.length) > max) return false;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++)
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    if (Math.min(...cur) > max) return false;
    prev = cur;
  }
  return prev[b.length] <= max;
}

/* A typed word against one word of a listing. Short words must match exactly,
   or "bar" would also find "bag". The typed word is also compared with the
   start of the listing word, so a half-typed "dumbel" still finds "dumbbells". */
function wordMatches(typed: string, word: string): boolean {
  if (word.startsWith(typed)) return true;
  if (typed.length < 4) return false;
  const max = typed.length >= 7 ? 2 : 1;
  return within(typed, word, max) || within(typed, word.slice(0, typed.length + 1), max);
}

/* Lower is better, -1 is no match. Exact wording first, then every word found
   somewhere, then the same with typos allowed. */
export function rank(p: SearchProduct, query: string, catLabel: string): number {
  const q = tidy(query);
  if (!q) return -1;
  const name = tidy(p.name);
  const brand = tidy(p.brand);
  const cat = tidy(catLabel);
  /* Matches must start a word, or "tr" brings up wrist wraps and straps. */
  const startsWord = (text: string, s: string) => ` ${text}`.includes(` ${s}`);
  if (name.startsWith(q)) return 0;
  if (startsWord(name, q)) return 1;
  if (startsWord(cat, q)) return 2;
  if (startsWord(brand, q)) return 3;
  const typed = q.split(" ");
  const hay = `${name} ${brand} ${cat}`;
  if (typed.every((w) => startsWord(hay, w))) return 4;
  const words = hay.split(" ");
  if (typed.every((w) => words.some((h) => wordMatches(w, h)))) return 5;
  return -1;
}

/* Products for a query, best first. A known term also searches the words the
   listings use for it, inside its own category. */
export function searchProducts(
  products: SearchProduct[],
  query: string,
  labelOf: (cat: string) => string,
): SearchProduct[] {
  const q = tidy(query);
  const known = TERMS.find((t) => t.term === q);
  const also = known ? (SAME_AS[known.term] ?? []).map(tidy) : [];
  const scored: { p: SearchProduct; r: number }[] = [];
  for (const p of products) {
    let r = rank(p, q, labelOf(p.category));
    if (known && p.category === known.cat && r !== 0 && r !== 1) {
      const name = tidy(p.name);
      if (also.some((a) => name.includes(a))) r = 2;
    }
    /* A term names one kind of gear: don't let its words pull in another. */
    if (known && p.category !== known.cat) r = -1;
    if (r >= 0) scored.push({ p, r });
  }
  return scored
    .sort((a, b) => a.r - b.r || (b.p.gymgearScore ?? 0) - (a.p.gymgearScore ?? 0))
    .map((x) => x.p);
}

/* Completions for what's been typed so far, closest wording first. */
export function suggestTerms(query: string, max = 4): typeof TERMS {
  const q = tidy(query);
  if (q.length < 2) return [];
  const score = (term: string) => {
    if (term === q) return -1;
    if (term.startsWith(q)) return 0;
    if (term.split(" ").some((w) => w.startsWith(q))) return 1;
    const typed = q.split(" ");
    if (typed.every((w) => term.split(" ").some((t) => wordMatches(w, t)))) return 2;
    return -1;
  };
  return TERMS.map((t) => ({ t, s: score(t.term) }))
    .filter((x) => x.s >= 0)
    .sort((a, b) => a.s - b.s)
    .slice(0, max)
    .map((x) => x.t);
}

/* --- Recent searches (this browser only) ------------------------------- */

const RECENT_KEY = "gymgear.search.recent";

export function loadRecent(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === "string").slice(0, 5) : [];
  } catch {
    return [];
  }
}

export function saveRecent(term: string): string[] {
  const clean = term.trim();
  const next = [clean, ...loadRecent().filter((s) => s.toLowerCase() !== clean.toLowerCase())].slice(0, 5);
  if (clean.length < 2) return loadRecent();
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* private mode: search still works, it just won't remember */
  }
  return next;
}

export function clearRecent(): void {
  try {
    localStorage.removeItem(RECENT_KEY);
  } catch {
    /* nothing stored */
  }
}
