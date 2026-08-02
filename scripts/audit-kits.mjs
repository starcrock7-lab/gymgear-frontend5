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
     npm run audit:kits            # all 432 combinations
     npm run audit:kits -- --json  # machine-readable, for CI

   Exits non-zero on any failure, so it works as a gate. */
import {
  coverageOf, coverageGaps, muscleCoverage, needsFor, PATTERN_LABEL,
} from "../src/lib/coverage.ts";
import { selectKits, BUDGET_CAP, capFor, ESSENTIAL_OVERFLOW } from "../src/lib/kit-builder.ts";

const BASE = (process.env.NEXT_PUBLIC_BACKEND_URL || "https://gymgear-backend5.onrender.com").replace(/\/$/, "");
const SITE_KEY = process.env.NEXT_PUBLIC_SITE_KEY || "";
const ORIGIN = process.env.NEXT_PUBLIC_SITE_URL || "https://gymgearcompare.com";
const JSON_OUT = process.argv.includes("--json");

const GOALS = ["lose-weight", "build-strength", "get-fit", "home-gym-setup"];
const BUDGETS = ["under-300", "300-800", "800-2000", "2000-plus"];
const EXPS = ["beginner", "intermediate", "advanced"];
const COUNTS = ["key-pieces", "small-setup", "full-home-gym"];
const SPACES = ["spare-room", "garage", "small-room", "apartment-corner"];

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
        for (const space of SPACES) {
          const a = { goal, experience, budget, space, ceiling: "normal", equipmentCount, owned: ["nothing"] };
          const kits = selectKits(catalog, a);
          const tag = `${goal}/${budget}/${experience}/${equipmentCount}/${space}`;
          if (!kits.length) { structural.push(`${tag}: produced NO kits`); continue; }
          for (const k of kits) {
            const cats = k.products.map((p) => p.category);
            const has = (c) => cats.includes(c);
            const bad = [];
            if (k.products.length < 3) bad.push(`only ${k.products.length} pieces`);
            if (NEEDS_BENCH.some(has) && !has("benches")) bad.push("free weights, no bench");
            for (const [c, needs] of Object.entries(HARD))
              if (has(c)) for (const nd of needs) if (!has(nd)) bad.push(`${c} without ${nd}`);
            const ceiling = capFor(k.type, BUDGET_CAP[budget]) * ESSENTIAL_OVERFLOW;
            if (k.totalPrice > ceiling) bad.push(`$${k.totalPrice} over stretched cap $${Math.round(ceiling)}`);
            if (new Set(cats).size !== cats.length) bad.push("duplicate category");
            if (bad.length) structural.push(`${tag} [${k.type}] $${k.totalPrice}: ${bad.join("; ")}`);

            const gaps = coverageGaps(k.products, goal);
            rows.push({ tag, goal, budget, space, count: equipmentCount, type: k.type, price: k.totalPrice, pieces: k.products.length, gaps, ids: k.products.map((p) => p.id) });
            if (gaps.length) coverageFails.push({ tag, type: k.type, price: k.totalPrice, gaps, cats });
          }
        }

const n = rows.length;
if (JSON_OUT) {
  console.log(JSON.stringify({ checked: n, structural, coverageFails, rows }, null, 2));
} else {
  console.log(`kits checked: ${n}  (${GOALS.length}x${BUDGETS.length}x${EXPS.length}x${COUNTS.length}x${SPACES.length} answer combinations x 3 tiers)`);

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
      const covered = muscleCoverage(r.ids.map((id) => byId(id))).filter((x) => x.level > 0).length;
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
