/* Movement coverage — can you actually train every muscle group with this kit?
   ---------------------------------------------------------------------------
   A kit used to be judged on whether its pieces made sense together (a bar has
   plates, free weights have a bench). That let genuinely useless kits pass: a
   $8,548 "strength" kit whose anchor was a commercial leg press, with no rack,
   no pull-up bar and nothing to train your back with.

   Trainability is a property of the COMBINATION, not of any product — a
   barbell trains nothing without plates, and pressing needs a bench. So we
   model what each piece unlocks, union it across the kit, and check the result
   against what the user's goal actually requires.

   Levels: 2 = properly trainable, 1 = limited (assistance bands, floor
   pressing, bodyweight-ish), 0 = not at all.

   Kept deliberately conservative: everything here is derivable from what a
   product IS (its category, or the type the listing itself states). We never
   claim a capability a piece of equipment doesn't plainly have.

   LOCKSTEP: mirrored in the backend's server.js (COVERAGE MODEL section).
   Any change here must be made there too. */

export type Pattern =
  | "push-h" | "push-v" | "pull-h" | "pull-v"
  | "squat" | "hinge" | "core" | "conditioning";

export const PATTERNS: Pattern[] = [
  "push-h", "push-v", "pull-h", "pull-v", "squat", "hinge", "core", "conditioning",
];

/* Plain-English name for the movement, for kit copy and the coverage panel. */
export const PATTERN_LABEL: Record<Pattern, string> = {
  "push-h": "Chest press",
  "push-v": "Overhead press",
  "pull-h": "Rows",
  "pull-v": "Pull-ups & pulldowns",
  squat: "Squats",
  hinge: "Deadlifts & hinges",
  core: "Core",
  conditioning: "Conditioning",
};

export type Coverage = Record<Pattern, 0 | 1 | 2>;

/* What each category lets you train on its own, before enablers. Anything not
   listed is 0 — plates, benches and foam rollers train nothing by themselves,
   which is exactly the point: they are enablers and recovery, not training. */
const CAT_TRAINS: Record<string, Partial<Record<Pattern, 1 | 2>>> = {
  /* Presses go to 2 once a bench is in the kit (see coverageOf). */
  dumbbells: { "push-h": 1, "push-v": 2, "pull-h": 2, squat: 2, hinge: 2, core: 1 },
  /* Squat is 1 without a rack — you can only train what you can clean to your
     shoulders, which caps a barbell squat well below a racked one. */
  barbells: { "push-h": 1, "push-v": 2, "pull-h": 2, squat: 1, hinge: 2, core: 1 },
  kettlebells: { "push-h": 1, "push-v": 2, "pull-h": 1, squat: 2, hinge: 2, core: 2, conditioning: 2 },
  /* A rack's own contribution is the pull-up bar; its real job is unlocking
     the barbell squat, handled as an enabler below. */
  racks: { "pull-v": 2 },
  /* Bands train every pattern, none of them heavy — assistance level. */
  bands: { "push-h": 1, "push-v": 1, "pull-h": 1, "pull-v": 1, squat: 1, hinge: 1, core: 1 },
  cardio: { conditioning: 2, squat: 1 },
  jumpropes: { conditioning: 2 },
  yogamats: { core: 1 },
};

/* Machines vary more than any other category — a functional trainer covers
   most of a gym, a linear leg press covers one joint. Read what the listing
   itself states rather than assuming the category means anything. */
export function machineTrains(specs: Record<string, string> | undefined): Partial<Record<Pattern, 1 | 2>> {
  const type = String(specs?.Type || "");
  const move = String(specs?.Movement || "");
  if (/Leg Press/i.test(move)) return { squat: 2 };
  if (/Row/i.test(move)) return { "pull-h": 2 };
  if (/Posterior/i.test(move) || /GHD/i.test(type)) return { hinge: 2, core: 2 };
  if (/All-In-One/i.test(type))
    return { "push-h": 2, "push-v": 2, "pull-h": 2, "pull-v": 2, squat: 2, hinge: 1, core: 2 };
  if (/Functional Trainer|Cable Tower/i.test(type))
    return { "push-h": 2, "push-v": 1, "pull-h": 2, "pull-v": 2, squat: 1, core: 2 };
  if (/Multi-Station|Home Gym|Smart Gym/i.test(type))
    return { "push-h": 2, "push-v": 1, "pull-h": 2, "pull-v": 2, squat: 1, core: 1 };
  return {};
}

/* Products the category default overstates. An EZ curl bar sits in `barbells`
   but is a 47" accessory bar: it will not sit in a rack, will not bench and
   will not squat. Treating it as the kit's barbell produced kits pairing a
   squat stand and bumper plates with a curl bar. */
const PRODUCT_TRAINS: Record<string, Partial<Record<Pattern, 1 | 2>>> = {
  "rep-equalizer": { "pull-h": 1 },
};

/* Bars that cannot anchor a barbell setup — excluded from the kit's barbell
   slot entirely (they stay in the catalog as the accessory bars they are). */
export const SPECIALTY_BARS = new Set(["rep-equalizer"]);

/* A machine only makes a rack redundant when it IS one: uprights plus cables.
   A leg press, an iso-lateral row or a GHD is a single station — letting those
   block the rack is what left $8k kits with nothing to squat in or pull from. */
export function replacesRack(category: string, specs: Record<string, string> | undefined): boolean {
  if (category !== "machines") return false;
  const t = machineTrains(specs);
  return (t["pull-v"] ?? 0) >= 2 && (t["push-h"] ?? 0) >= 2;
}

export type CoverageInput = {
  id: string;
  category: string;
  specs?: Record<string, string>;
};

/* What one product unlocks, before the kit's enablers are applied. */
export function trainsOf(p: CoverageInput): Partial<Record<Pattern, 1 | 2>> {
  return (
    PRODUCT_TRAINS[p.id] ??
    (p.category === "machines" ? machineTrains(p.specs) : CAT_TRAINS[p.category] ?? {})
  );
}

/* Union of what the kit can train, with the enablers that only exist at kit
   level: a bench turns floor pressing into real pressing, and a rack turns a
   barbell into a squat you can unrack and bail out of.

   Takes pre-resolved capabilities so the kit builder can reuse it on its own
   lightweight rows without re-deriving every product. */
export function coverageFromTrains(
  items: { category: string; trains: Partial<Record<Pattern, 1 | 2>> }[],
): Coverage {
  const cats = new Set(items.map((p) => p.category));
  const cov = Object.fromEntries(PATTERNS.map((k) => [k, 0])) as Coverage;
  const put = (k: Pattern, v: 1 | 2) => { if (v > cov[k]) cov[k] = v; };

  for (const p of items) {
    /* Barbell gear is inert without plates to load onto it. */
    if (p.category === "barbells" && !cats.has("plates")) continue;
    for (const [k, v] of Object.entries(p.trains)) put(k as Pattern, v as 1 | 2);
  }
  const hasWeight = ["dumbbells", "barbells", "kettlebells"].some((c) => cats.has(c));
  if (cats.has("benches") && hasWeight) put("push-h", 2);
  if (cats.has("benches") && cats.has("dumbbells")) put("pull-h", 2);
  if (cats.has("racks") && cats.has("barbells") && cats.has("plates")) put("squat", 2);
  return cov;
}

/* Gear the buyer already owns counts. The kit deliberately doesn't re-sell you
   a rack you have, so judging coverage on the kit alone would conclude you
   can't do pull-ups and bolt a resistance band on to "fix" it. Owning a
   barbell means owning a loaded one — nobody answers "I have a barbell" about
   a bare shaft — so it brings its plates with it. */
export function ownedTrains(ownedCats: Iterable<string>): { category: string; trains: Partial<Record<Pattern, 1 | 2>> }[] {
  const cats = [...ownedCats];
  const rows = cats.map((c) => ({ category: c, trains: CAT_TRAINS[c] ?? {} }));
  if (cats.includes("barbells") && !cats.includes("plates"))
    rows.push({ category: "plates", trains: {} });
  return rows;
}

export function coverageOf(products: CoverageInput[], ownedCats: Iterable<string> = []): Coverage {
  return coverageFromTrains([
    ...products.map((p) => ({ category: p.category, trains: trainsOf(p) })),
    ...ownedTrains(ownedCats),
  ]);
}

/* What each goal has to be able to train before the kit is honest about
   itself. Strength and a full home gym must cover the whole body; fat-loss and
   general fitness lead with conditioning but still can't skip a muscle group.
   LOCKSTEP: mirrored in server.js. */
export const GOAL_NEEDS: Record<string, Partial<Record<Pattern, 1 | 2>>> = {
  "build-strength": { "push-h": 2, "push-v": 1, "pull-h": 2, "pull-v": 1, squat: 2, hinge: 2, core: 1 },
  "home-gym-setup": { "push-h": 2, "push-v": 1, "pull-h": 2, "pull-v": 1, squat: 2, hinge: 2, core: 1 },
  "get-fit": { "push-h": 1, "push-v": 1, "pull-h": 1, "pull-v": 1, squat: 1, hinge: 1, core: 1, conditioning: 2 },
  "lose-weight": { "push-h": 1, "pull-h": 1, squat: 1, hinge: 1, core: 1, conditioning: 2 },
};

export function needsFor(goal: string): Partial<Record<Pattern, 1 | 2>> {
  return GOAL_NEEDS[goal] ?? GOAL_NEEDS["get-fit"];
}

/* Patterns the goal requires that the kit can't deliver. Empty = complete. */
export function coverageGaps(products: CoverageInput[], goal: string, ownedCats: Iterable<string> = []): Pattern[] {
  const cov = coverageOf(products, ownedCats);
  return (Object.entries(needsFor(goal)) as [Pattern, 1 | 2][])
    .filter(([k, v]) => cov[k] < v)
    .map(([k]) => k);
}

/* --- Display ---------------------------------------------------------------
   Users think in muscles, not movement patterns. Each group lists the
   movements that train it, so the panel can say WHY a group is covered
   ("Back — rows, pulldowns") instead of asking anyone to trust a checkmark. */
export type MuscleGroup = {
  key: string;
  label: string;
  patterns: Pattern[];
  /* Arms need a push AND a pull — triceps and biceps are not the same job. */
  needsBoth?: [Pattern[], Pattern[]];
};

export const MUSCLE_GROUPS: MuscleGroup[] = [
  { key: "chest", label: "Chest", patterns: ["push-h"] },
  { key: "back", label: "Back", patterns: ["pull-h", "pull-v"] },
  { key: "shoulders", label: "Shoulders", patterns: ["push-v", "push-h"] },
  { key: "arms", label: "Arms", patterns: ["push-h", "push-v", "pull-h", "pull-v"], needsBoth: [["push-h", "push-v"], ["pull-h", "pull-v"]] },
  { key: "quads", label: "Quads", patterns: ["squat"] },
  { key: "posterior", label: "Hamstrings & glutes", patterns: ["hinge", "squat"] },
  { key: "core", label: "Core", patterns: ["core"] },
  { key: "conditioning", label: "Conditioning", patterns: ["conditioning"] },
];

export type MuscleStatus = {
  key: string;
  label: string;
  level: 0 | 1 | 2;
  /* The covered movements, for the "how" line under each group. */
  via: string[];
};

export function muscleCoverage(products: CoverageInput[], ownedCats: Iterable<string> = []): MuscleStatus[] {
  const cov = coverageOf(products, ownedCats);
  const maxOf = (ps: Pattern[]): 0 | 1 | 2 =>
    ps.reduce<0 | 1 | 2>((m, p) => (cov[p] > m ? cov[p] : m), 0);
  return MUSCLE_GROUPS.map((g) => ({
    key: g.key,
    label: g.label,
    level: g.needsBoth
      ? (Math.min(maxOf(g.needsBoth[0]), maxOf(g.needsBoth[1])) as 0 | 1 | 2)
      : maxOf(g.patterns),
    via: g.patterns.filter((p) => cov[p] > 0).map((p) => PATTERN_LABEL[p]),
  }));
}

/* One-line summary for kit copy: "Trains all 8 muscle groups" or the honest
   version naming what is missing. */
export function coverageSummary(products: CoverageInput[], ownedCats: Iterable<string> = []): string {
  const groups = muscleCoverage(products, ownedCats);
  const missing = groups.filter((g) => g.level === 0);
  if (!missing.length) return `Trains all ${groups.length} muscle groups.`;
  const names = missing.map((g) => g.label.toLowerCase());
  const list =
    names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  return `Covers everything except ${list}.`;
}
