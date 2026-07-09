/* Checkout split (Amazon-first honest cart). Only products with a real Amazon
   ASIN are truly "cartable": they collapse into ONE add-to-cart link so every
   item lands in the buyer's Amazon cart in a single tab (AssociateTag earns the
   commission). Everything else — brand-store pages and Amazon *search*
   fallbacks — is bought individually with an honest per-item label (see
   linkKind), never dressed up as a unified checkout that doesn't exist. */

import {
  AMAZON_TAG,
  amazonAsin,
  buyUrl,
  linkKind,
  type KitProduct,
} from "@/lib/kit";

/* Kept as the historical name; ASIN detection now lives in kit.ts so the cart
   labels and the bulk-cart link can never disagree. */
export const asinOf = amazonAsin;

/* Amazon's bulk add-to-cart endpoint: ASIN.n / Quantity.n pairs. */
export function amazonCartUrl(asins: string[]): string {
  const parts = asins.map(
    (a, i) => `ASIN.${i + 1}=${a}&Quantity.${i + 1}=1`,
  );
  return `https://www.amazon.com/gp/aws/cart/add.html?AssociateTag=${AMAZON_TAG}&${parts.join("&")}`;
}

export type CartSplit = {
  /** Real Amazon /dp items — the true one-click cart, all earn commission. */
  cartable: KitProduct[];
  /** Brand-store or Amazon-search items — bought individually, honestly. */
  direct: KitProduct[];
  /** Bulk add-to-cart URL for every cartable item in one tab, or null. */
  amazonUrl: string | null;
};

export function splitCart(items: KitProduct[]): CartSplit {
  const cartable = items.filter((p) => amazonAsin(p));
  const direct = items.filter((p) => !amazonAsin(p));
  const amazonUrl = cartable.length
    ? amazonCartUrl(cartable.map((p) => amazonAsin(p) as string))
    : null;
  return { cartable, direct, amazonUrl };
}

export { buyUrl, linkKind };
