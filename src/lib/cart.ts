"use client";

/* Global site-wide cart (Phase 8). localStorage-backed so it survives
   navigation and reloads; one entry per product id (no quantities — gym gear
   is buy-once). Components read it through useCart() below, which uses
   useSyncExternalStore so every badge/page updates on any change, including
   changes from another tab (storage event). Zero dependencies. */

import { useSyncExternalStore } from "react";
import type { KitProduct } from "@/lib/kit";

const CART_KEY = "gymgear.cart.v1";
const EMPTY: KitProduct[] = [];

let cache: KitProduct[] | null = null;
const listeners = new Set<() => void>();

function read(): KitProduct[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    const parsed = raw ? (JSON.parse(raw) as KitProduct[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(items: KitProduct[]): void {
  cache = items;
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  } catch {
    /* private mode / full — cart still works in memory for this page */
  }
  listeners.forEach((l) => l());
}

function snapshot(): KitProduct[] {
  if (cache === null) cache = read();
  return cache;
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  /* Another tab changed the cart — drop the cache and re-render. */
  const onStorage = (e: StorageEvent) => {
    if (e.key === CART_KEY) {
      cache = null;
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function cartAdd(products: KitProduct | KitProduct[]): void {
  const list = Array.isArray(products) ? products : [products];
  const items = [...snapshot()];
  const have = new Set(items.map((p) => p.id));
  for (const p of list) {
    if (!have.has(p.id)) {
      items.push(p);
      have.add(p.id);
    }
  }
  write(items);
}

export function cartRemove(id: string): void {
  write(snapshot().filter((p) => p.id !== id));
}

export function cartClear(): void {
  write([]);
}

export function cartHas(id: string): boolean {
  return snapshot().some((p) => p.id === id);
}

/* Live cart contents — safe in any client component; empty during SSR. */
export function useCart(): KitProduct[] {
  return useSyncExternalStore(subscribe, snapshot, () => EMPTY);
}
