/* Search check: real buyer wording and typos against the live catalog.
     npm run check:search
   Every line is a query a buyer could type and what must come back. */
import assert from "node:assert/strict";
import { searchProducts, suggestTerms, TERMS } from "../src/lib/search.ts";

const BASE = (process.env.NEXT_PUBLIC_BACKEND_URL || "https://gymgear-backend5.onrender.com").replace(/\/$/, "");
const headers = { "X-Site-Key": process.env.NEXT_PUBLIC_SITE_KEY || "", Origin: "https://gymgearcompare.com" };
const get = async (path) => (await fetch(`${BASE}${path}`, { headers })).json();

const categories = (await get("/api/categories")).categories;
const labels = new Map(categories.map((c) => [c.key, c.label]));
const products = [];
for (const c of categories)
  for (const p of (await get(`/api/products/${c.key}`)).products)
    products.push({ ...p, category: c.key, salePrice: p.salePrice ?? null, gymgearScore: p.gymgearScore ?? null });

const find = (q) => searchProducts(products, q, (k) => labels.get(k) ?? "");

/* query -> the category its top result must be in */
const CASES = {
  barbell: "barbells", dumbbells: "dumbbells", "squat rack": "racks", "power rack": "racks",
  treadmill: "cardio", "rowing machine": "cardio", "exercise bike": "cardio",
  // typos and half-typed words
  dumbels: "dumbbells", dumbel: "dumbbells", barbel: "barbells", kettelbell: "kettlebells",
  tredmill: "cardio", creatne: "creatine",
};
let failed = 0;
for (const [q, cat] of Object.entries(CASES)) {
  const top = find(q)[0];
  if (top?.category !== cat) {
    failed++;
    console.log(`FAIL "${q}": wanted ${cat}, got ${top ? `${top.name} (${top.category})` : "nothing"}`);
  }
}

/* Every suggested term must lead somewhere, and only to its own category. */
for (const { term, cat } of TERMS) {
  const hits = find(term);
  if (!hits.length || hits.some((p) => p.category !== cat)) {
    failed++;
    console.log(`FAIL term "${term}": ${hits.length} results, cats ${[...new Set(hits.map((p) => p.category))]}`);
  }
}

assert.equal(suggestTerms("squat r")[0].term, "squat rack");
assert.equal(suggestTerms("tre")[0].term, "treadmill");
assert.equal(suggestTerms("x").length, 0);
/* Short words stay exact: "bar" must not turn into bags. */
assert.ok(find("bar").every((p) => p.category !== "gymbags"));
assert.equal(find("zzzzqqq").length, 0);
/* Short searches match the start of a word: "tr" must not find "straps". */
const tr = find("tr");
const startsTr = (p) => /\btr/i.test(`${p.name} ${p.brand} ${labels.get(p.category)}`);
assert.ok(tr.length > 0 && tr.every(startsTr), `"tr" returned ${tr.find((p) => !startsTr(p))?.name}`);
assert.equal(find("treadmill")[0].category, "cardio");
assert.ok(find("rogue rack").every((p) => p.brand.startsWith("Rogue")));

console.log(failed ? `${failed} search checks failed` : `search OK, ${products.length} products`);
process.exit(failed ? 1 : 0);
