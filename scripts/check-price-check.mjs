/* Gate for the price check (src/lib/price-check.ts, rules in
   docs/plans/price-check.md). Fails on any comparison that could state
   something untrue; prints how often each tier comes out cheaper or dearer.
     npm run check:price */
import { readFileSync } from "node:fs";
import { selectKits, KIT_CATEGORIES } from "../src/lib/kit-builder.ts";
import { PRICED_BY_SIZE } from "../src/lib/coverage.ts";
import { CLASS_OF, COMPARE_CLASSES, MIN_COMPARABLES, beats, classStats, priceCheck } from "../src/lib/price-check.ts";

const BASE = (process.env.NEXT_PUBLIC_BACKEND_URL || "https://gymgear-backend5.onrender.com").replace(/\/$/, "");
const headers = { "X-Site-Key": process.env.NEXT_PUBLIC_SITE_KEY || "", Origin: "https://gymgearcompare.com" };
const catalog = {};
for (const cat of KIT_CATEGORIES) {
  const d = await (await fetch(`${BASE}/api/products/${cat}`, { headers })).json();
  catalog[cat] = (d.products ?? []).map((p) => ({ ...p, category: cat }));
}
const byId = new Map(Object.values(catalog).flat().map((p) => [p.id, p]));
const stats = classStats(catalog);

const fails = [];
const warn = [];
const fail = (m) => fails.push(m);

/* Class table: one class per product, one category per class, no listing
   priced across sizes, enough published members to call anything typical. */
const seen = new Map();
for (const [key, c] of Object.entries(COMPARE_CLASSES)) {
  const cats = new Set();
  for (const id of c.ids) {
    if (seen.has(id)) fail(`${id} is in both ${seen.get(id)} and ${key}`);
    seen.set(id, key);
    if (PRICED_BY_SIZE.has(id)) fail(`${id} is priced by size and cannot be compared (${key})`);
    const p = byId.get(id);
    if (p) cats.add(p.category);
    else warn.push(`${key}: ${id} is not published (left out of the typical)`);
  }
  if (cats.size > 1) fail(`${key} mixes categories: ${[...cats].join(", ")}`);
  const live = c.ids.filter((id) => byId.has(id)).length;
  if (live < MIN_COMPARABLES) warn.push(`${key}: only ${live} published, class is not used`);
}

/* The page must not use reference-price words we can't back (see the plan). */
const BANNED = /retail value|\bworth\b|\bMSRP\b|elsewhere|market price|save up to|guarantee|lowest price|best price/i;
for (const f of ["src/components/quiz/PriceCheck.tsx", "src/app/methodology/page.tsx"]) {
  const src = readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
  for (const [i, line] of src.split("\n").entries())
    if (BANNED.test(line) && !line.includes("check:price allow")) fail(`${f}:${i + 1} uses a banned phrase: ${line.trim()}`);
}

/* Every kit the quiz can produce: each line and total must be arithmetic on
   the catalog and nothing else. */
const PIECES = { "under-300": "key-pieces", "300-800": "small-setup", "800-2000": "full-home-gym", "2000-plus": "full-home-gym" };
const SPACES = [["apartment-corner", null], ["small-room", "8-9ft"], ["garage", "9ft-plus"], ["outdoor", null]];
const tally = {};
let kits = 0;
for (const goal of ["build-strength", "lose-weight", "get-fit", "home-gym-setup"])
  for (const budget of Object.keys(PIECES))
    for (const [space, ceiling] of SPACES)
      for (const experience of ["beginner", "intermediate", "advanced"])
        for (const owned of [["nothing"], ["rack", "barbell"], ["dumbbells", "bench"]])
          for (const k of selectKits(catalog, { goal, budget, space, ceiling, experience, equipmentCount: PIECES[budget], owned })) {
            kits++;
            const t = (tally[k.type] ??= { kits: 0, none: 0, cheaper: 0, dearer: 0, same: 0, diff: [] });
            t.kits++;
            const pc = priceCheck(k.products, stats);
            if (!pc) { t.none++; continue; }
            const tag = `${k.type} ${goal}/${budget}/${space}`;
            for (const l of pc.lines) {
              const p = k.products.find((x) => x.id === l.id);
              if (!p) fail(`${tag}: line ${l.id} is not in the kit`);
              if (l.count < MIN_COMPARABLES) fail(`${tag}: ${l.id} compared against ${l.count}`);
              if (!(l.low <= l.typical && l.typical <= l.high)) fail(`${tag}: ${l.id} typical outside its range`);
              if (!(l.low <= l.yours && l.yours <= l.high)) fail(`${tag}: ${l.id} your price outside the class range`);
              if (Math.abs(l.yours - (p.salePrice || p.price)) > 0.01) fail(`${tag}: ${l.id} price differs from the kit`);
            }
            const sum = (f) => Math.round(pc.lines.reduce((s, l) => s + l[f], 0) * 100) / 100;
            if (Math.abs(sum("yours") - pc.yours) > 0.01 || Math.abs(sum("typical") - pc.typical) > 0.01) fail(`${tag}: totals are not the sum of the lines`);
            /* A pick a like-for-like product beats on price and score: the
               builder's last pass removes these. If a room or owned-gear rule
               ever makes the beater off limits, narrow this to eligible
               beaters rather than deleting it. */
            const lite = (m) => ({ id: m.id, price: m.salePrice || m.price, gs: m.gymgearScore || 0 });
            for (const l of pc.lines) {
              const cur = lite(k.products.find((x) => x.id === l.id));
              const beat = COMPARE_CLASSES[CLASS_OF.get(l.id)].ids.map((id) => byId.get(id)).find((m) => m && beats(lite(m), cur));
              if (beat) fail(`${tag}: ${l.id} is beaten on price and score by ${beat.id}`);
            }
            const d = Math.round(pc.typical - pc.yours);
            if (d > 0) t.cheaper++; else if (d < 0) t.dearer++; else t.same++;
            t.diff.push(d);
          }

console.log(`price check over ${kits} kits`);
for (const [type, t] of Object.entries(tally)) {
  const s = t.diff.sort((a, b) => a - b);
  const med = s.length ? s[s.length >> 1] : 0;
  console.log(`  ${type.padEnd(7)} no comparison ${t.none}/${t.kits} · cheaper ${t.cheaper} · dearer ${t.dearer} · same ${t.same} · median difference $${med}`);}
for (const w of [...new Set(warn)]) console.log(`  note: ${w}`);
if (fails.length) {
  console.error(`\nFAIL (${fails.length})`);
  for (const f of fails.slice(0, 30)) console.error(`  ${f}`);
  process.exit(1);
}
console.log("OK");
