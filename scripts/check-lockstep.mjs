/* Lockstep gate — the frontend builds kits locally (src/lib/kit-builder.ts) so
   the quiz never waits on Render's cold start, which means the same algorithm
   exists twice. This proves the two copies still agree: same products, same
   order, same total, for a spread of quiz answers.

   Usage: npm run check:lockstep [backendUrl]
   Defaults to NEXT_PUBLIC_BACKEND_URL. Exits non-zero on any divergence. */
import { selectKits } from "../src/lib/kit-builder.ts";

const BACKEND = (process.argv[2] || process.env.NEXT_PUBLIC_BACKEND_URL || "https://gymgear-backend5.onrender.com").replace(/\/$/, "");
const SITE_KEY = process.env.NEXT_PUBLIC_SITE_KEY || "";
const ORIGIN = process.env.NEXT_PUBLIC_SITE_URL || "https://gymgearcompare.com";
const HEADERS = { "Content-Type": "application/json", "X-Site-Key": SITE_KEY, Origin: ORIGIN };

const KIT_CATS = [
  "racks", "machines", "barbells", "plates", "benches", "dumbbells",
  "kettlebells", "cardio", "bands", "jumpropes", "yogamats", "foamrollers",
];

/* Every goal x budget x piece-count, plus the space/ceiling edge cases that
   have historically diverged (tight spaces and low ceilings gate products, and
   a gate applied on one side only is exactly the bug this catches). */
const CASES = [];
for (const goal of ["lose-weight", "build-strength", "get-fit", "home-gym-setup"])
  for (const budget of ["under-300", "300-800", "800-2000", "2000-plus"])
    for (const equipmentCount of ["key-pieces", "small-setup", "full-home-gym"])
      CASES.push({ goal, budget, equipmentCount, experience: "intermediate", space: "spare-room", ceiling: "normal", owned: ["nothing"] });
for (const space of ["small-room", "apartment-corner", "garage"])
  for (const ceiling of ["normal", "under-8ft"])
    CASES.push({ goal: "build-strength", budget: "800-2000", equipmentCount: "small-setup", experience: "advanced", space, ceiling, owned: ["nothing"] });
for (const owned of [["bench"], ["rack", "barbell"], ["dumbbells", "cardio"]])
  CASES.push({ goal: "home-gym-setup", budget: "2000-plus", equipmentCount: "full-home-gym", experience: "beginner", space: "garage", ceiling: "normal", owned });

const catalog = {};
for (const cat of KIT_CATS) {
  const res = await fetch(`${BACKEND}/api/products/${cat}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`${cat} → ${res.status}`);
  catalog[cat] = ((await res.json()).products ?? []).map((p) => ({ ...p, category: cat }));
}

const sig = (kits) =>
  kits.map((k) => `${k.type}:${k.products.map((p) => p.id).join("|")}@${k.totalPrice}`).join("  ");

/* The backend rate-limits to 60 requests a minute, and this script makes one
   per case — pace under it, and back off once if we still trip it, so a red
   run always means real divergence and never "too fast". */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function postKit(c) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(`${BACKEND}/api/kit`, { method: "POST", headers: HEADERS, body: JSON.stringify(c) });
    if (res.ok) return await res.json();
    if (attempt === 0) { console.log(`  (backend ${res.status} — backing off 61s)`); await sleep(61_000); }
    else throw new Error(`backend ${res.status} for ${JSON.stringify(c)}`);
  }
}

let bad = 0;
for (const c of CASES) {
  const local = sig(selectKits(catalog, c));
  await sleep(1050);
  const remote = sig((await postKit(c)).kits ?? []);
  const tag = `${c.goal}/${c.budget}/${c.equipmentCount}/${c.space}/${c.ceiling}/owned:${c.owned.join("+")}`;
  if (local !== remote) {
    bad++;
    console.log(`MISMATCH ${tag}\n  frontend: ${local}\n  backend : ${remote}`);
  }
}

console.log(bad ? `\n${bad}/${CASES.length} MISMATCHES` : `\nLOCKSTEP OK — ${CASES.length} cases identical on both sides`);
process.exit(bad ? 1 : 0);
