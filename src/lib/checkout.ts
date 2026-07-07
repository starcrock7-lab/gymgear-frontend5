/* Checkout link builder (Phase 8 buy-flow upgrade). Replaces "Buy all opens
   one tab per item": products with a known Amazon ASIN collapse into ONE
   Amazon add-to-cart link (all items land in the buyer's Amazon cart in a
   single tab, AssociateTag still earns the commission); everything else is
   grouped per retailer so the buttons read "Checkout at Rogue Fitness (2)"
   instead of a wall of tabs. */

import { AMAZON_TAG, buyUrl, type KitProduct } from "@/lib/kit";

/* ASIN from a /dp/<ASIN> link — affiliate link first, then the store URL. */
export function asinOf(p: KitProduct): string | null {
  for (const u of [p.affiliateUrl, p.url]) {
    const m = u?.match(/\/dp\/([A-Z0-9]{10})(?:[/?]|$)/);
    if (m) return m[1];
  }
  return null;
}

/* Amazon's bulk add-to-cart endpoint: ASIN.n / Quantity.n pairs. */
export function amazonCartUrl(asins: string[]): string {
  const parts = asins.map(
    (a, i) => `ASIN.${i + 1}=${a}&Quantity.${i + 1}=1`,
  );
  return `https://www.amazon.com/gp/aws/cart/add.html?AssociateTag=${AMAZON_TAG}&${parts.join("&")}`;
}

export type CheckoutGroup = {
  retailer: string;
  products: KitProduct[];
  /** One URL for the whole group (Amazon bulk cart) — else buy per item. */
  groupUrl: string | null;
};

/* Split cart items into checkout groups: one combined Amazon group first
   (biggest, single-tab), then remaining retailers by item count. Items whose
   only link is an Amazon *search* (no ASIN) can't join the bulk cart — they
   stay individual under their retailer. */
export function checkoutGroups(items: KitProduct[]): CheckoutGroup[] {
  const amazon: KitProduct[] = [];
  const rest = new Map<string, KitProduct[]>();
  for (const p of items) {
    if (asinOf(p)) {
      amazon.push(p);
    } else {
      const key = p.retailer || "Store";
      rest.set(key, [...(rest.get(key) ?? []), p]);
    }
  }
  const groups: CheckoutGroup[] = [];
  if (amazon.length) {
    groups.push({
      retailer: "Amazon",
      products: amazon,
      groupUrl: amazonCartUrl(amazon.map((p) => asinOf(p) as string)),
    });
  }
  for (const [retailer, products] of [...rest.entries()].sort(
    (a, b) => b[1].length - a[1].length,
  )) {
    groups.push({ retailer, products, groupUrl: null });
  }
  return groups;
}

export { buyUrl };
