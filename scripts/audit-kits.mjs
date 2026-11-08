/* Kit audit — builds every kit the quiz can produce and checks each one is a
   gym, not just a coherent shopping list.
   ---------------------------------------------------------------------------
   Two classes of failure:

   STRUCTURAL — the pieces don't work together: a bar with no plates, free
   weights with nothing to press on, a one-item "kit", a wild budget overrun.

   COVERAGE — the pieces work together but leave a muscle group untrainable.
   This is the one that used to slip through: a $8,548 "strength" kit anchored
   by a commercial leg press, with no rack, no pull-up bar and no way to train
   your back, passed every structural rule there was.

   Usage:
     npm run audit:kits            # every answer combination the quiz can emit
     npm run audit:kits -- --json  # machine-readable, for CI

   Exits non-zero on any failure, so it works as a gate. */
import {
  coverageGaps, HEAVY_FIXED_PAIR_DUMBBELLS, isPlateLoaded, muscleCoverage, PATTERN_LABEL,
  PRICED_BY_SIZE, replacesRack, SMALL_PLATE_PAIRS,
} from "../src/lib/coverage.ts";
import { selectKits, BUDGET_CAP } from "../src/lib/kit-builder.ts";

const BASE = (process.env.NEXT_PUBLIC_BACKEND_URL || "https://gymgear-backend5.onrender.com").replace(/\/$/, "");
const SITE_KEY = process.env.NEXT_PUBLIC_SITE_KEY || "";
const ORIGIN = process.env.NEXT_PUBLIC_SITE_URL || "https://gymgearcompare.com";
const JSON_OUT = process.argv.includes("--json");

const GOALS = ["lose-weight", "build-strength", "get-fit", "home-gym-setup"];
const BUDGETS = ["under-300", "300-800", "800-2000", "2000-plus"];
/* null = not asked: the quiz now asks only goal, budget and space, so
   experience and ceiling arrive empty (lib/quiz.ts withDefaults). */
const EXPS = ["beginner", "intermediate", "advanced", null];
const COUNTS = ["key-pieces", "small-setup", "full-home-gym"];
/* These must be the ids the quiz actually emits (see lib/quiz.ts). They drifted
   once — the audit swept a "spare-room" the quiz can't produce while never
   testing "outdoor", and pinned ceiling to a "normal" that isn't an option
   either, so the low-ceiling gate went unexercised for its whole life. */
const SPACES = ["apartment-corner", "small-room", "garage", "outdoor"];
const CEILINGS = ["under-8ft", "8-9ft", "9ft-plus", null];
/* Owned gear is a real branch: those categories are excluded from the kit but
   still count toward what the buyer can train. A kit for someone who owns a
   rack must not "fix" their pull-up bar with a resistance band. */
const OWNED = [["nothing"], ["bench"], ["rack", "barbell"], ["dumbbells", "bench"], ["cardio"]];
const OWNED_TO_CAT = { barbell: "barbells", dumbbells: "dumbbells", bench: "benches", rack: "racks", cardio: "cardio" };

const KIT_CATS = [
  "racks", "machines", "barbells", "plates", "benches", "dumbbells",
  "kettlebells", "cardio", "bands", "jumpropes", "yogamats", "foamrollers",
];
const NEEDS_BENCH = ["dumbbells", "barbells", "plates", "racks"];
const HARD = { racks: ["barbells", "plates"], barbells: ["plates"], plates: ["barbells"] };

async function loadCatalog() {
  const catalog = {};
  for (const cat of KIT_CATS) {
    const res = await fetch(`${BASE}/api/products/${cat}`, {
      headers: { "Content-Type": "application/json", "X-Site-Key": SITE_KEY, Origin: ORIGIN },
    });
    if (!res.ok) throw new Error(`${cat} → ${res.status} (is the backend up, and NEXT_PUBLIC_SITE_KEY set?)`);
    const d = await res.json();
    catalog[cat] = (d.products ?? []).map((p) => ({ ...p, category: cat }));
  }
  return catalog;
}

const catalog = await loadCatalog();
const allById = new Map(Object.values(catalog).flat().map((p) => [p.id, p]));
const byId = (id) => allById.get(id);
const structural = [];
const coverageFails = [];
const rows = [];

for (const goal of GOALS)
  for (const budget of BUDGETS)
    for (const experience of EXPS)
      for (const equipmentCount of COUNTS)
        for (const space of SPACES)
         for (const ceiling of CEILINGS)
          for (const owned of OWNED) {
            const a = { goal, experience, budget, space, ceiling, equipmentCount, owned };
            const ownedCats = new Set(owned.map((id) => OWNED_TO_CAT[id]).filter(Boolean));
            const kits = selectKits(catalog, a);
            const tag = `${goal}/${budget}/${experience}/${equipmentCount}/${space}/${ceiling}/own:${owned.join("+")}`;
            if (!kits.length) { structural.push(`${tag}: produced NO kits`); continue; }
            /* A label is a price promise: Best Value is never the dearer plan. */
            if (kits.some((k, i) => i > 0 && k.totalPrice < kits[i - 1].totalPrice))
              structural.push(`${tag}: tiers out of price order`);
            for (const k of kits) {
              const cats = k.products.map((p) => p.category);
              const has = (c) => cats.includes(c);
              const bad = [];
              if (k.products.length < 3) bad.push(`only ${k.products.length} pieces`);
              if (NEEDS_BENCH.some(has) && !has("benches") && !ownedCats.has("benches")) bad.push("free weights, no bench");
              for (const [c, needs] of Object.entries(HARD))
                /* Plates also load a plate-loaded machine, no barbell needed. */
                if (has(c) && !(c === "plates" && k.products.some(isPlateLoaded)))
                  for (const nd of needs) if (!has(nd) && !ownedCats.has(nd)) bad.push(`${c} without ${nd}`);
              /* A kit total has to be what the buyer pays for what we list, and
                 every slot has to train something. */
              for (const p of k.products) {
                if (PRICED_BY_SIZE.has(p.id)) bad.push(`${p.id} is priced by the size you pick`);
                if (p.category === "foamrollers") bad.push(`${p.id} trains nothing`);
              }
              /* The buyer's budget is a promise, on every tier. */
              if (k.totalPrice > BUDGET_CAP[budget] + 0.005) bad.push(`$${k.totalPrice} over the $${BUDGET_CAP[budget]} budget`);
              if (new Set(cats).size !== cats.length) bad.push("duplicate category");
              /* Coverage can pass and the kit still be unusable: a plate-loaded
                 machine with nothing to load, a bar with 20 lb of plates, a pair
                 of 110s for someone who never said they were advanced. */
              const rackLike = k.products.some((p) => replacesRack(p.category, p.specs));
              const base = has("racks") || rackLike || ownedCats.has("racks");
              for (const p of k.products) {
                if (isPlateLoaded(p) && !has("plates") && !ownedCats.has("barbells")) bad.push(`${p.id} has no plates`);
                if (SMALL_PLATE_PAIRS.has(p.id)) bad.push(`${p.id} is not a plate set`);
                if (p.category === "machines" && !replacesRack(p.category, p.specs) && !base) bad.push(`single-station ${p.id} with no rack or all-in-one`);
                if (HEAVY_FIXED_PAIR_DUMBBELLS.has(p.id) && experience !== "advanced") bad.push(`${p.id} for a ${experience ?? "unstated"} lifter`);
              }
              /* Selling someone what they told us they already own is the
                 single most obvious way to look like we weren't listening. */
              for (const c of cats) if (ownedCats.has(c)) bad.push(`re-sold owned ${c}`);
              if (bad.length) structural.push(`${tag} [${k.type}] $${k.totalPrice}: ${bad.join("; ")}`);

              const gaps = coverageGaps(k.products, goal, ownedCats);
              rows.push({ tag, goal, budget, space, owned, count: equipmentCount, type: k.type, price: k.totalPrice, pieces: k.products.length, gaps, ids: k.products.map((p) => p.id), ownedCats: [...ownedCats] });
              if (gaps.length) coverageFails.push({ tag, type: k.type, price: k.totalPrice, gaps, cats });
            }
          }

const n = rows.length;
if (JSON_OUT) {
  console.log(JSON.stringify({ checked: n, structural, coverageFails, rows }, null, 2));
} else {
  console.log(`kits checked: ${n}  (${GOALS.length}x${BUDGETS.length}x${EXPS.length}x${COUNTS.length}x${SPACES.length}x${CEILINGS.length}x${OWNED.length} answer combinations x 3 tiers)`);

  console.log(`\nSTRUCTURAL problems: ${structural.length}`);
  structural.slice(0, 20).forEach((p) => console.log("  " + p));
  if (structural.length > 20) console.log(`  ...and ${structural.length - 20} more`);

  console.log(`\nCOVERAGE failures: ${coverageFails.length} / ${n}  (${((coverageFails.length / n) * 100).toFixed(1)}%)`);
  const byGap = {};
  for (const f of coverageFails) for (const g of f.gaps) byGap[g] = (byGap[g] || 0) + 1;
  if (coverageFails.length)
    console.log("  most-missed:", Object.entries(byGap).sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${PATTERN_LABEL[k]}:${v}`).join("  "));
  coverageFails.slice(0, 15).forEach((f) =>
    console.log(`  $${String(f.price).padEnd(6)} ${f.tag} [${f.type}] missing ${f.gaps.map((g) => PATTERN_LABEL[g]).join(", ")} | ${f.cats.join("+")}`));
  if (coverageFails.length > 15) console.log(`  ...and ${coverageFails.length - 15} more`);

  /* Coverage is the headline number, so report it even when everything passes:
     "all green" should be a measurement you can see, not an absence of noise. */
  console.log("\nmuscle groups trainable, worst case per goal:");
  for (const g of GOALS) {
    const sub = rows.filter((r) => r.goal === g);
    const worst = sub.reduce((m, r) => {
      const covered = muscleCoverage(r.ids.map((id) => byId(id)), r.ownedCats).filter((x) => x.level > 0).length;
      return covered < m.covered ? { covered, r } : m;
    }, { covered: 99, r: null });
    console.log(`  ${g.padEnd(16)} ${worst.covered}/8   (worst: ${worst.r.tag} [${worst.r.type}])`);
  }

  console.log("\nprice range per budget x tier:");
  for (const b of BUDGETS) {
    const line = ["value", "match", "quality"].map((t) => {
      const a = rows.filter((r) => r.budget === b && r.type === t).map((r) => r.price);
      return `${t} $${Math.min(...a)}-$${Math.max(...a)}`;
    }).join("   ");
    console.log(`  ${b.padEnd(11)} ${line}`);
  }
  const pieces = rows.map((r) => r.pieces);
  console.log(`\npieces per kit: min ${Math.min(...pieces)}  max ${Math.max(...pieces)}  avg ${(pieces.reduce((s, x) => s + x, 0) / pieces.length).toFixed(1)}`);
}

const failed = structural.length + coverageFails.length;
if (!JSON_OUT)
  console.log(failed ? `\nFAIL — ${structural.length} structural, ${coverageFails.length} coverage` : "\nPASS — every kit is structurally sound and trains every muscle group its goal requires");
process.exit(failed ? 1 : 0);
