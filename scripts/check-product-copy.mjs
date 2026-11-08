/* Gate for the product page description (src/lib/product-about.ts): every
   product gets a short, clean sentence and no opinion passed off as fact.
     npm run check:copy        add --show to print them all */
import { aboutProduct, factsOf } from "../src/lib/product-about.ts";

const BASE = (process.env.NEXT_PUBLIC_BACKEND_URL || "https://gymgear-backend5.onrender.com").replace(/\/$/, "");
const headers = { "X-Site-Key": process.env.NEXT_PUBLIC_SITE_KEY || "", Origin: "https://gymgearcompare.com" };
const { categories } = await (await fetch(`${BASE}/api/categories`, { headers })).json();

const fails = [];
let n = 0;
for (const c of categories) {
  const { products = [] } = await (await fetch(`${BASE}/api/products/${c.key}`, { headers })).json();
  for (const p of products) {
    n++;
    const text = aboutProduct({ ...p, category: c.key });
    if (process.argv.includes("--show")) console.log(`[${c.key}] ${text}`);
    if (text.length < 20 || text.length > 320) fails.push(`${p.id}: ${text.length} characters`);
    if (/undefined|null|—|\bbest\b|\bcurrently\b|% off/i.test(text)) fails.push(`${p.id}: ${text}`);
    if (factsOf(p.specs).some((f) => f.value === "—")) fails.push(`${p.id}: empty spec shown`);
  }
}
console.log(`product descriptions: ${n}`);
if (fails.length) {
  console.error(`FAIL (${fails.length})`);
  fails.slice(0, 40).forEach((f) => console.error(`  ${f}`));
  process.exit(1);
}
console.log("OK");
