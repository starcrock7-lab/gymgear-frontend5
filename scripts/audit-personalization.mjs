/* Personalization audit — does the kit actually change when the ANSWER does?
   ---------------------------------------------------------------------------
   audit-kits.mjs proves every kit is trainable. That is a FLOOR: it says the
   kit is a gym, not that it is THIS buyer's gym. A builder that returned the
   same competent kit to everybody would pass it with full marks.

   So this measures the other half, as Jaccard overlap of the product-id sets
   two answers produce: 1.00 means the answer changed nothing at all, 0.00
   means a completely different kit. It exists because the numbers were once
   genuinely damning — changing the goal from "lose weight" to "build
   strength" left 43% of kits byte-identical, and garage vs spare-room and
   apartment-corner vs small-room were identical in 100% of cases. Those are
   not opinions about taste; they are a quiz that wasn't reading its answers.

   Usage:
     npm run audit:personalization
     npm run audit:personalization -- --json

   Exits non-zero when a threshold is breached, so it works as a gate. */
import { selectKits } from "../src/lib/kit-builder.ts";
import { beats } from "../src/lib/price-check.ts";

const BASE = (process.env.NEXT_PUBLIC_BACKEND_URL || "https://gymgear-backend5.onrender.com").replace(/\/$/, "");
const SITE_KEY = process.env.NEXT_PUBLIC_SITE_KEY || "";
const ORIGIN = process.env.NEXT_PUBLIC_SITE_URL || "https://gymgearcompare.com";
const JSON_OUT = process.argv.includes("--json");

/* Answer ids exactly as lib/quiz.ts emits them. */
const GOALS = ["lose-weight", "build-strength", "get-fit", "home-gym-setup"];
const BUDGETS = ["under-300", "300-800", "800-2000", "2000-plus"];
const EXPS = ["beginner", "intermediate", "advanced"];
const COUNTS = ["key-pieces", "small-setup", "full-home-gym"];
const SPACES = ["apartment-corner", "small-room", "garage", "outdoor"];
const OWNED = [["nothing"], ["bench"], ["rack", "barbell"], ["dumbbells", "bench"], ["cardio"]];
const TIERS = ["value", "match", "quality"];

/* Headroom for ordinary catalog churn, tight enough to catch a real collapse.
   PAIR_MAX is the important one: it is what a "this answer does nothing" bug
   looks like from the outside, and it is how both space questions were caught
   behaving as a single boolean. */
const THRESHOLDS = {
  goalMean: 0.62, goalIdentical: 0.30,
  spaceMean: 0.65, spaceIdentical: 0.30,
  experienceMean: 0.86,
  pairMax: 0.95,
  catalogReach: 0.55,
};

const KIT_CATS = ["racks", "machines", "barbells", "plates", "benches", "dumbbells",
  "kettlebells", "cardio", "bands", "jumpropes", "yogamats", "foamrollers"];

const catalog = {};
for (const cat of KIT_CATS) {
  const res = await fetch(`${BASE}/api/products/${cat}`, {
    headers: { "Content-Type": "application/json", "X-Site-Key": SITE_KEY, Origin: ORIGIN },
  });
  if (!res.ok) throw new Error(`${cat} → ${res.status} (is the backend up, and NEXT_PUBLIC_SITE_KEY set?)`);
  catalog[cat] = ((await res.json()).products ?? []).map((p) => ({ ...p, category: cat }));
}
/* Reach counts only products a kit may pick: one a comparable product beats on
   price and score is never kept (lib/price-check beats()), by design. */
const lite = (p) => ({ id: p.id, price: p.salePrice || p.price, gs: p.gymgearScore || 0 });
const all = Object.values(catalog).flat();
const catalogSize = all.filter((p) => !all.some((q) => beats(lite(q), lite(p)))).length;

/* Every kit is built at most once; the sweeps below reuse them. */
const kitCache = new Map();
const key = (a) => `${a.goal}|${a.budget}|${a.experience}|${a.equipmentCount}|${a.space}|${a.owned.join("+")}`;
function kitsFor(a) {
  const k = key(a);
  if (!kitCache.has(k)) {
    const out = {};
    for (const kit of selectKits(catalog, a)) out[kit.type] = kit.products.map((p) => p.id);
    kitCache.set(k, out);
  }
  return kitCache.get(k);
}
const jaccard = (a, b) => {
  const A = new Set(a), B = new Set(b);
  const inter = [...A].filter((x) => B.has(x)).length;
  const union = new Set([...A, ...B]).size;
  return union ? inter / union : 1;
};

/* Vary ONE answer while every other answer takes each of its values in turn,
   so the result is not an artifact of one lucky baseline. */
function sweep(dimension, values) {
  const pairs = [];
  for (const goal of GOALS)
    for (const budget of BUDGETS)
      for (const experience of EXPS)
        for (const equipmentCount of COUNTS)
          for (const space of SPACES)
            for (const owned of OWNED) {
              const a = { goal, budget, experience, equipmentCount, space, ceiling: "8-9ft", owned };
              const kits = values.map((v) => kitsFor({ ...a, [dimension]: v }));
              for (let i = 0; i < values.length; i++)
                for (let j = i + 1; j < values.length; j++)
                  for (const t of TIERS)
                    pairs.push({ j: jaccard(kits[i][t] || [], kits[j][t] || []), a: values[i], b: values[j] });
            }
  const mean = pairs.reduce((s, p) => s + p.j, 0) / pairs.length;
  const identical = pairs.filter((p) => p.j === 1).length / pairs.length;
  const byPair = {};
  for (const p of pairs) (byPair[`${p.a} vs ${p.b}`] ||= []).push(p.j);
  const perPair = Object.entries(byPair)
    .map(([k, v]) => ({ pair: k, mean: v.reduce((s, x) => s + x, 0) / v.length }))
    .sort((x, y) => y.mean - x.mean);
  return { mean, identical, perPair };
}

const goal = sweep("goal", GOALS);
const space = sweep("space", SPACES);
const experience = sweep("experience", EXPS);

const seen = new Set();
for (const kits of kitCache.values()) for (const t of TIERS) for (const id of kits[t] || []) seen.add(id);
const reach = seen.size / catalogSize;

const failures = [];
const check = (ok, msg) => { if (!ok) failures.push(msg); };
check(goal.mean <= THRESHOLDS.goalMean, `goal overlap ${goal.mean.toFixed(2)} > ${THRESHOLDS.goalMean}`);
check(goal.identical <= THRESHOLDS.goalIdentical, `goal identical ${(goal.identical * 100).toFixed(0)}% > ${THRESHOLDS.goalIdentical * 100}%`);
check(space.mean <= THRESHOLDS.spaceMean, `space overlap ${space.mean.toFixed(2)} > ${THRESHOLDS.spaceMean}`);
check(space.identical <= THRESHOLDS.spaceIdentical, `space identical ${(space.identical * 100).toFixed(0)}% > ${THRESHOLDS.spaceIdentical * 100}%`);
check(experience.mean <= THRESHOLDS.experienceMean, `experience overlap ${experience.mean.toFixed(2)} > ${THRESHOLDS.experienceMean}`);
check(reach >= THRESHOLDS.catalogReach, `catalog reach ${(reach * 100).toFixed(0)}% < ${THRESHOLDS.catalogReach * 100}%`);
for (const [label, s] of [["goal", goal], ["space", space], ["experience", experience]])
  for (const p of s.perPair)
    check(p.mean < THRESHOLDS.pairMax, `${label}: "${p.pair}" overlap ${p.mean.toFixed(2)} — this answer barely changes the kit`);

if (JSON_OUT) {
  console.log(JSON.stringify({ goal, space, experience, reach, failures }, null, 2));
} else {
  console.log(`personalization over ${kitCache.size * 3} kits  (1.00 = the answer changed nothing)\n`);
  for (const [label, s] of [["GOAL", goal], ["SPACE", space], ["EXPERIENCE", experience]]) {
    console.log(`${label}  mean ${s.mean.toFixed(2)}   identical ${(s.identical * 100).toFixed(0)}%`);
    for (const p of s.perPair) console.log(`    ${p.mean.toFixed(2)}  ${p.pair}`);
  }
  console.log(`\nCATALOG REACH  ${seen.size}/${catalogSize} pickable products ever selected (${(reach * 100).toFixed(0)}%; ${all.length - catalogSize} beaten on price and score not counted)`);
  console.log(failures.length ? `\nFAIL — ${failures.length} threshold(s) breached:` : "\nPASS — every answer measurably changes the kit");
  failures.forEach((f) => console.log("  " + f));
}
process.exit(failures.length ? 1 : 0);
