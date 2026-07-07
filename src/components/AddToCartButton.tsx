"use client";

import { Check, Plus } from "lucide-react";
import { useCart, cartAdd } from "@/lib/cart";
import type { KitProduct } from "@/lib/kit";

/* Site-wide "Add to cart" (Phase 8). Drop into any page — server components
   included — with the full product object; state comes live from the global
   cart so it flips to "In cart" everywhere at once. */
export default function AddToCartButton({
  product,
  variant = "dark",
  className = "",
}: {
  product: KitProduct;
  /** dark = navy pages (quiz/compare); light = off-white pages (gear). */
  variant?: "dark" | "light";
  className?: string;
}) {
  const inCart = useCart().some((p) => p.id === product.id);
  const idle =
    variant === "dark"
      ? "border border-white/20 bg-white/5 text-white/90 hover:-translate-y-0.5 hover:border-accent/60 hover:bg-accent/10 hover:text-accent"
      : "border border-line bg-card text-ink hover:-translate-y-0.5 hover:border-accent/60 hover:text-accent";
  return (
    <button
      type="button"
      onClick={() => cartAdd(product)}
      disabled={inCart}
      className={
        "flex items-center justify-center gap-1.5 rounded-xl px-5 py-2.5 font-body text-sm font-bold transition-all " +
        (inCart ? "cursor-default bg-win/15 text-win" : idle) +
        " " +
        className
      }
    >
      {inCart ? (
        <>
          <Check className="h-4 w-4" />
          In cart
        </>
      ) : (
        <>
          <Plus className="h-4 w-4" />
          Add to cart
        </>
      )}
    </button>
  );
}
