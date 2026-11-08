/* Plain words for a product page, built only from what the catalog already
   holds (facts read from the store's listing). Nothing here invents a claim,
   and store copy is never pasted in: it belongs to the store. */

type Noun = { word: string; plural?: boolean; typeAlone?: boolean };

const NOUNS: Record<string, Noun> = {
  benches: { word: "weight bench" },
  machines: { word: "strength machine", typeAlone: true },
  flooring: { word: "gym flooring", plural: true },
  barbells: { word: "barbell" },
  dumbbells: { word: "dumbbells", plural: true },
  plates: { word: "weight plates", plural: true },
  racks: { word: "rack", typeAlone: true },
  cardio: { word: "cardio machine", typeAlone: true },
  kettlebells: { word: "kettlebell" },
  bands: { word: "resistance bands", plural: true },
  preworkout: { word: "pre-workout supplement" },
  protein: { word: "protein supplement" },
  creatine: { word: "creatine supplement" },
  recovery: { word: "recovery supplement" },
  vitamins: { word: "vitamin supplement" },
  fatburners: { word: "fat burner" },
  belts: { word: "lifting belt" },
  straps: { word: "lifting straps", plural: true },
  wraps: { word: "wrist wraps", plural: true },
  sleeves: { word: "knee sleeves", plural: true },
  chalk: { word: "lifting chalk", plural: true },
  yogamats: { word: "yoga mat" },
  foamrollers: { word: "foam roller" },
  gymbags: { word: "gym bag" },
  jumpropes: { word: "jump rope" },
};
const LOAD_RATED = new Set(["benches", "racks", "barbells", "machines"]);

/* A verdict can stand in as the description unless it is a superlative, a
   comparison only true on the day it was written (price, stock, a sale), or
   notes-to-self. */
const NOT_A_DESCRIPTION =
  /\b(best|greatest|ultimate|perfect|unbeatable|benchmark|ever|every|top|most|favou?rite|must-have|no-brainer|to beat|gold standard|on the market|currently|sold out|in stock|discount\w*|rivals?|batch|site-wide)\b|\d+% off/i;
const NOT_A_FEATURE =
  /best|top|overbuilt|value|pick|premium|professional|legend|standard|staple|budget|guarantee|most|great|clean|highest|perfect|flagship|every|huge|alternative|driest|stock|sizes|on sale|rock|wobble|quality|smooth|maximum|max|record|athletes|ultra|range|entry|popular|collab|american made|canadian made|made in/i;

export type Fact = { label: string | null; value: string };

/* Only rows with a real value. Some rows store listing bullets under numeric
   keys; those have no label of their own. */
export function factsOf(specs: unknown): Fact[] {
  if (!specs || typeof specs !== "object" || Array.isArray(specs)) return [];
  const out: Fact[] = [];
  for (const [k, v] of Object.entries(specs as Record<string, unknown>)) {
    if (typeof v !== "string") continue;
    const value = v.trim();
    if (!value || value === "—") continue;
    out.push({ label: /^\d+$/.test(k) ? null : k, value });
  }
  return out;
}

export function aboutProduct(p: { brand: string; category: string; specs?: unknown; expertVerdict?: unknown; aspects?: unknown }): string {
  const verdict = typeof p.expertVerdict === "string" ? p.expertVerdict.trim() : "";
  if (verdict.length >= 40 && !NOT_A_DESCRIPTION.test(verdict)) return verdict.replace(/\s+(--|—)\s+/g, ", ");

  const facts = factsOf(p.specs);
  const get = (...keys: string[]) => facts.find((f) => f.label && keys.includes(f.label.toLowerCase()))?.value;
  const noun = NOUNS[p.category] ?? { word: "product" };
  const rawType = get("type");
  /* Lower-case a word like "Flat", but leave an initialism like "GHD" alone. */
  const type = rawType && /^[A-Za-z][A-Za-z -]{1,24}$/.test(rawType)
    ? rawType.split(" ").map((w) => (w === w.toUpperCase() ? w : w.toLowerCase())).join(" ")
    : "";
  const last = noun.word.split(" ").pop() ?? "";
  let thing = noun.word;
  if (type) {
    if (noun.typeAlone) thing = type === "all-in-one" ? "all-in-one machine" : type;
    else thing = type.includes(last.replace(/s$/, "")) ? type : `${type} ${noun.word}`;
  }
  const opening = noun.plural
    ? thing.charAt(0).toUpperCase() + thing.slice(1)
    : `${/^[aeiou]/.test(thing) ? "An" : "A"} ${thing}`;

  const rated = LOAD_RATED.has(p.category) ? get("capacity", "weight capacity") : undefined;
  const parts = [`${opening} from ${p.brand.replace(/\.+$/, "")}${rated ? `, rated to ${rated}` : ""}.`];
  const made = get("made in");
  if (made) parts.push(`Made in ${made}.`);
  const years = get("warranty")?.match(/^(\d+)\s*(?:yr|year)s?$/i)?.[1];
  if (years) parts.push(`Comes with a ${years}-year warranty.`);
  const bullet = facts.find((f) => !f.label)?.value;
  if (bullet) parts.push(`${bullet.replace(/\.$/, "")}.`);
  const features = (Array.isArray(p.aspects) ? p.aspects : []).filter((a) => typeof a === "string" && !NOT_A_FEATURE.test(a));
  if (features.length) parts.push(`Features: ${features.slice(0, 3).join(", ")}.`);
  return parts.join(" ");
}

/* What a score means, in one word. */
export function scoreWord(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Great";
  if (score >= 70) return "Good";
  if (score >= 60) return "Fair";
  return "Below average";
}

export function facetWord(key: string, score: number): string {
  if (key === "trust") return score >= 70 ? "Many reviews" : score >= 40 ? "Some reviews" : "Few reviews";
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 50) return "Average";
  return "Low";
}
