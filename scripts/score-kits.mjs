/* Kit quality score: how good the kits are for a buyer, beyond the pass/fail
   rules audit:kits enforces. Builds every kit the quiz can produce today
   (three screens plus the quick edits) and counts the problems a buyer would
   notice.
     npm run score:kits            # summary
     npm run score:kits -- --eg    # plus examples of each problem */
import { selectKits, KIT_CATEGORIES, BUDGET_CAP, OWNED_TO_CAT } from "../src/lib/kit-builder.ts";
import { muscleCoverage } from "../src/lib/coverage.ts";
import { toFloorItems } from "../src/lib/floor-plan.ts";
import { autoPlace, emptyGrid } from "../src/lib/auto-layout.ts";

const BASE = (process.env.NEXT_PUBLIC_BACKEND_URL || "https://gymgear-backend5.onrender.com").replace(/\/$/, "");
const headers = { "X-Site-Key": process.env.NEXT_PUBLIC_SITE_KEY || "", Origin: "https://gymgearcompare.com" };
const EG = process.argv.includes("--eg");

const catalog = {};
for (const cat of KIT_CATEGORIES) {
  const d = await (await fetch(`${BASE}/api/products/${cat}`, { headers })).json();
  catalog[cat] = (d.products ?? []).map((p) => ({ ...p, category: cat }));
}
const total = catalog && Object.values(catalog).flat().length;

/* The room the results page lays the kit out in (KitResult ROOM_FOR_SPACE). */
const ROOM = { "apartment-corner": [8, 8], "small-room": [10, 11], garage: [14, 12], outdoor: [12, 12] };
const PIECES = { "under-300": "key-pieces", "300-800": "small-setup", "800-2000": "full-home-gym", "2000-plus": "full-home-gym" };
const SPACES = [["apartment-corner", null], ["small-room", "under-8ft"], ["small-room", "8-9ft"], ["garage", "under-8ft"], ["garage", "8-9ft"], ["garage", "9ft-plus"], ["outdoor", null]];
/* Kettlebell rows priced at their lightest size: a kit's total runs low. */
const FROM_PRICED = new Set(["rogue-kb", "rep-kb"]);

const priceOf = (p) => p.salePrice ?? p.price;
const problems = {};
const flag = (name, tag, detail) => {
  (problems[name] ??= []).push(`${tag}: ${detail}`);
};
const used = new Set();
let sets = 0, kits = 0, matchSpend = 0, matchScore = 0;

for (const goal of ["build-strength", "lose-weight", "get-fit", "home-gym-setup"])
  for (const budget of Object.keys(PIECES))
    for (const [space, ceiling] of SPACES)
      for (const experience of ["beginner", "intermediate", "advanced"])
        for (const owned of [["nothing"], ["rack", "barbell"], ["dumbbells", "bench"]]) {
          const a = { goal, budget, space, ceiling, experience, equipmentCount: PIECES[budget], owned };
          const tag = `${goal}/${budget}/${space}/${ceiling ?? "-"}/${experience}/own:${owned.join("+")}`;
          const res = selectKits(catalog, a);
          const ownedCats = owned.map((o) => OWNED_TO_CAT[o]).filter(Boolean);
          sets++;
          const gear = (k) => k.products.map((p) => p.id).sort().join();
          if (new Set(res.map(gear)).size < res.length) flag("identical tiers", tag, res.map((k) => `$${Math.round(k.totalPrice)}`).join(" / "));
          const cap = BUDGET_CAP[budget];
          for (const k of res) {
            kits++;
            k.products.forEach((p) => used.add(p.id));
            const cats = new Set([...k.products.map((p) => p.category), ...ownedCats]);
            const list = k.products.map((p) => `${p.name} $${Math.round(priceOf(p))}`).join(" + ");
            /* The 3D check on the results page: does it all fit the room? */
            const [w, d] = ROOM[space];
            const placed = autoPlace(toFloorItems(k.products), w * 12, d * 12, emptyGrid(w * 12, d * 12));
            if (placed.unplacedCount > 0) {
              const ids = new Set(placed.placed.map((x) => x.id));
              const left = k.products.filter((p) => !ids.has(p.id)).map((p) => p.category);
              flag("doesn't fit the room layout", `${tag} [${k.type}]`, `${space} unplaced:${left.join(",")} | ${list}`);
            }
            if (k.products.some((p) => FROM_PRICED.has(p.id))) flag("total understated (from-priced kettlebell)", `${tag} [${k.type}]`, list);
            if (k.type !== "match") continue;
            matchSpend += k.totalPrice / Math.min(cap, 2000);
            matchScore += k.products.reduce((s, p) => s + (p.gymgearScore ?? 0), 0) / k.products.length;
            /* The recommended plan leaves most of a capped budget unused. */
            if (cap <= 2000 && k.totalPrice < cap * 0.5) flag("recommended plan uses under half the budget", tag, `$${Math.round(k.totalPrice)} of $${cap} | ${list}`);
            /* Strength with room and money for a barbell, but no barbell path. */
            const barbellRoom = space !== "apartment-corner";
            if (goal === "build-strength" && barbellRoom && cap >= 2000 && !(cats.has("barbells") && cats.has("plates")))
              flag("strength kit with no barbell", tag, list);
            /* Fat loss or fitness without real conditioning. */
            const groups = muscleCoverage(k.products, ownedCats);
            const cond = groups.find((g) => g.key === "conditioning");
            if ((goal === "lose-weight" || goal === "get-fit") && cond && cond.level < 2) flag("fat-loss/fitness kit with no real cardio", tag, list);
            /* Any recommended kit with an untrainable muscle group. */
            const missing = groups.filter((g) => g.level === 0).map((g) => g.label);
            if (missing.length) flag("recommended plan misses a muscle group", tag, `${missing.join(", ")} | ${list}`);
          }
        }

const pct = (n, of) => `${((100 * n) / of).toFixed(1)}%`;
console.log(`answer sets: ${sets}   kits: ${kits}`);
console.log(`recommended plan: avg ${pct(matchSpend, sets)} of budget used, avg GymGear Score ${(matchScore / sets).toFixed(1)}`);
console.log(`catalog reach: ${used.size}/${total} products ever chosen\n`);
for (const [name, list] of Object.entries(problems).sort((a, b) => b[1].length - a[1].length)) {
  const per = /\[/.test(list[0]) ? kits : sets;
  console.log(`${String(list.length).padStart(5)}  ${pct(list.length, per).padStart(6)}  ${name}`);
  if (EG) for (const e of list.filter((_, i) => i % Math.max(1, Math.floor(list.length / 4)) === 0).slice(0, 4)) console.log(`         ${e.slice(0, 230)}`);
}
