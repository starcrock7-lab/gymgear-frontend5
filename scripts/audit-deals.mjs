/* Deal rules gate: what counts as a deal, and what a deal is worth.
 *
 * Both rules are silent when they break. A too-low floor badges 1% "sales"
 * until the word deal means nothing; a wrong settleSale quotes the LIST price
 * on a product that is actually cheaper, which overcharges the customer in the
 * only direction that matters. Neither throws — they just render wrong.
 *
 *   npm run audit:deals
 */
import assert from "node:assert/strict";
import { MIN_DEAL_PCT, productDeal, rankWithDeals, settleSale } from "../src/lib/deals.ts";

const base = { id: "x", name: "X", brand: "B", price: 100, category: "racks" };
const day = 86400000;
let checks = 0;
const check = (label, fn) => {
  fn();
  checks++;
  console.log(`ok   ${label}`);
};

check("a real discount survives settlement and reads as a deal", () => {
  const p = settleSale({ ...base, salePrice: 80 });
  assert.equal(p.price, 100);
  assert.equal(p.salePrice, 80);
  assert.equal(productDeal(p).pct, 20);
});

check("a sub-floor discount becomes the plain price, not a badge", () => {
  const p = settleSale({ ...base, price: 2315.82, salePrice: 2298.79 });
  // They still pay the lower number — dropping salePrice must not requote list.
  assert.equal(p.price, 2298.79);
  assert.equal(p.salePrice, undefined);
  assert.equal(productDeal(p), null);
});

check("an expired sale reverts to list price", () => {
  const p = settleSale({
    ...base,
    salePrice: 80,
    saleEndsAt: new Date(Date.now() - day).toISOString(),
  });
  assert.equal(p.price, 100);
  assert.equal(p.salePrice, undefined);
  assert.equal(productDeal(p), null);
});

check("a live end date keeps the deal", () => {
  const p = settleSale({
    ...base,
    salePrice: 80,
    saleEndsAt: new Date(Date.now() + day).toISOString(),
  });
  assert.equal(productDeal(p).pct, 20);
});

check(`the floor sits at ${MIN_DEAL_PCT}%`, () => {
  assert.equal(productDeal({ ...base, salePrice: 100 - MIN_DEAL_PCT }).pct, MIN_DEAL_PCT);
  assert.equal(productDeal({ ...base, salePrice: 100 - MIN_DEAL_PCT + 1 }), null);
});

check("a deal outranks an equal product at full price", () => {
  const [first] = rankWithDeals([
    { ...base, id: "full", gymgearScore: 80 },
    { ...base, id: "sale", gymgearScore: 80, salePrice: 70 },
  ]);
  assert.equal(first.id, "sale");
});

check("a discount never buys the top spot from a much better product", () => {
  const [first] = rankWithDeals([
    { ...base, id: "great", gymgearScore: 95 },
    { ...base, id: "cheap-junk", gymgearScore: 62, salePrice: 50 },
  ]);
  assert.equal(first.id, "great");
});

check("a deal cannot jump a product a clear step better", () => {
  /* Real case from /category/racks: a 17%-off rack scoring 82 must not
     displace the 90s. Category scores cluster in a ~10-point band, so any
     boost worth more than a few points rewrites the ranking wholesale. */
  const [first] = rankWithDeals([
    { ...base, id: "better", gymgearScore: 90 },
    { ...base, id: "on-sale", gymgearScore: 82, salePrice: 83 },
  ]);
  assert.equal(first.id, "better");
});

check("a deal still wins a near-tie", () => {
  const [first] = rankWithDeals([
    { ...base, id: "full-price", gymgearScore: 84 },
    { ...base, id: "on-sale", gymgearScore: 82, salePrice: 80 },
  ]);
  assert.equal(first.id, "on-sale");
});

console.log(`\n${checks} checks passed`);
