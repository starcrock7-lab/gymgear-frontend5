/* Weekly deal-pitch refresh (deals engine v1.5 — CONTEXT.md Phase 7).
   Runs in GitHub Actions on a Monday cron: pulls the live catalog, finds
   every product with a curated sale price, makes ONE batched Groq call to
   write a short pitch per deal, and writes src/data/deal-pitches.json for
   the frontend bundle. The workflow commits the file only when it changed,
   which triggers a Vercel rebuild with fresh copy.

   Hard rule (see src/lib/deals.ts): the model never sources a price — every
   number in the prompt is computed here from catalog data, and the model
   only writes prose. Output is sanitized: known product ids only, dashes
   stripped (house style), length capped. If Groq or the catalog is
   unavailable the script exits 0 without changes — the frontend's templated
   copy is the permanent fallback, so this job can never break the site.

   Env: BACKEND_URL (default prod Render), SITE_KEY (backend gate),
   GROQ_API_KEY (repo secret). */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "data", "deal-pitches.json");
const BASE = (process.env.BACKEND_URL || "https://gymgear-backend5.onrender.com").replace(/\/$/, "");
const SITE_KEY = process.env.SITE_KEY || "";
const GROQ_KEY = process.env.GROQ_API_KEY || "";

const headers = {
  "Content-Type": "application/json",
  Origin: "https://gymgearcompare.com",
  ...(SITE_KEY ? { "X-Site-Key": SITE_KEY } : {}),
};

async function get(path, tries = 3) {
  /* Render free tier cold-starts in 30–60s; first try may time out. */
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(`${BASE}${path}`, { headers, signal: AbortSignal.timeout(90000) });
      if (r.ok) return await r.json();
      console.warn(`${path} -> ${r.status}`);
    } catch (e) {
      console.warn(`${path} attempt ${i + 1}: ${e.message}`);
    }
  }
  return null;
}

const cats = (await get("/api/categories"))?.categories?.map((c) => c.key) ?? [];
if (!cats.length) {
  console.warn("no categories — leaving existing pitches untouched");
  process.exit(0);
}

const deals = [];
for (const cat of cats) {
  const products = (await get(`/api/products/${cat}`))?.products ?? [];
  for (const p of products) {
    if (!p.salePrice || p.salePrice >= p.price) continue;
    /* Deals v2: skip sales whose curated end date has passed. */
    if (p.saleEndsAt && Date.parse(p.saleEndsAt) <= Date.now()) continue;
    deals.push({
      id: p.id,
      name: p.name,
      brand: p.brand,
      category: cat,
      price: p.price,
      salePrice: p.salePrice,
      pct: Math.round((1 - p.salePrice / p.price) * 100),
    });
  }
}
console.log(`${deals.length} live deals across ${cats.length} categories`);

if (!GROQ_KEY) {
  /* Missing repo secret must not erase last week's good pitches. */
  console.warn("no GROQ_API_KEY — keeping existing pitches untouched");
  process.exit(0);
}
if (!deals.length) {
  /* Genuinely zero live deals: empty map so stale pitches can't show. */
  writeOut({});
  process.exit(0);
}

const sys = `You write one deal pitch per product for a home gym gear site. Return strict JSON {"pitches":[{"id":string,"text":string}]} with an entry for every id provided. Each text is exactly two full sentences totaling 18 to 32 words. Sentence one names a concrete benefit of that specific product, what it is for or why lifters rate it. Sentence two gives honest urgency using the exact percent provided, such as sale prices can end without notice. Never restate only the name and percent, never invent any other number, price, or end date. Plain everyday words, never a dash or hyphen character. Match this example in depth and tone but never copy its phrasing, vary every pitch: "The PR 5000 is the rack most home lifters build their whole gym around. At 14% off it rarely gets cheaper, and sale prices can end without notice."`;
const user = deals
  .map((d) => `${d.id} = ${d.brand} ${d.name} (${d.category}), ${d.pct}% off`)
  .join("\n");

let pitches = {};
try {
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    signal: AbortSignal.timeout(60000),
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      temperature: 0.85,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
    }),
  });
  if (!r.ok) throw new Error(`Groq ${r.status}`);
  const parsed = JSON.parse((await r.json()).choices[0].message.content);
  if (!Array.isArray(parsed.pitches)) throw new Error("bad shape");
  const known = new Set(deals.map((d) => d.id));
  for (const { id, text } of parsed.pitches) {
    if (!known.has(id) || typeof text !== "string") continue;
    const clean = text.replace(/[-—–]/g, " ").replace(/\s+/g, " ").trim().slice(0, 220);
    /* Quality gate: a pitch shorter than ~14 words is a bare "X is Y% off"
       restatement — worse than the frontend template, so drop it. */
    if (clean.split(" ").length >= 14) pitches[id] = clean;
  }
  console.log(`Groq wrote ${Object.keys(pitches).length}/${deals.length} pitches`);
} catch (e) {
  console.warn(`Groq failed (${e.message}) — writing empty map, templates take over`);
  pitches = {};
}

writeOut(pitches);

function writeOut(map) {
  /* No timestamp in the file — identical pitches must produce an identical
     file so quiet weeks don't trigger a pointless commit + Vercel deploy. */
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify({ pitches: map }, null, 2) + "\n");
  console.log(`wrote ${OUT}`);
}
