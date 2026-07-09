#!/usr/bin/env node
/* Deals audit — checks EVERY product's sale state in one run.
   Usage:  npm run check:deals            (uses .env.local backend + key)
           node scripts/check-deals.mjs   (same)
   Reads NEXT_PUBLIC_BACKEND_URL / NEXT_PUBLIC_SITE_KEY from .env.local at
   runtime — no secret lives in this file (public repo). Reports, per product
   with a salePrice: % off, end date, and status (LIVE / ENDING SOON /
   EXPIRED / NO END DATE), plus data-error flags (salePrice >= price).
   EXPIRED rows are hidden from the site automatically (lib/catalog.ts strips
   them), but they are stale data in server.js worth cleaning. */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function envLocal() {
  const out = {};
  try {
    for (const line of readFileSync(resolve(root, ".env.local"), "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch { /* no .env.local — fall back to prod defaults */ }
  return out;
}

const env = envLocal();
const BASE = (env.NEXT_PUBLIC_BACKEND_URL || "https://gymgear-backend5.onrender.com").replace(/\/$/, "");
const KEY = env.NEXT_PUBLIC_SITE_KEY || "";
const ORIGIN = env.NEXT_PUBLIC_SITE_URL || "https://gymgearcompare.com";

async function get(path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", "X-Site-Key": KEY, Origin: ORIGIN },
  });
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return res.json();
}

const now = Date.now();
const day = 86400000;

function status(p) {
  if (p.salePrice >= p.price) return "DATA ERROR (sale >= list)";
  if (!p.saleEndsAt) return "NO END DATE";
  const t = Date.parse(p.saleEndsAt);
  if (!Number.isFinite(t)) return "DATA ERROR (bad date)";
  if (t <= now) return "EXPIRED";
  if (t - now < 3 * day) return "ENDING SOON";
  return "LIVE";
}

const { categories } = await get("/api/categories");
console.log(`Backend: ${BASE} · ${categories.length} categories\n`);

let total = 0;
const rows = [];
for (const c of categories) {
  const { products } = await get(`/api/products/${c.key}`);
  total += products.length;
  for (const p of products) {
    if (p.salePrice != null) {
      rows.push({
        id: p.id,
        cat: c.key,
        list: p.price,
        sale: p.salePrice,
        off: `${Math.round((1 - p.salePrice / p.price) * 100)}%`,
        ends: p.saleEndsAt || "—",
        status: status(p),
      });
    }
  }
}

rows.sort((a, b) => a.status.localeCompare(b.status) || a.cat.localeCompare(b.cat));
console.table(rows);

const by = (s) => rows.filter((r) => r.status.startsWith(s)).length;
console.log(
  `\n${total} products checked · ${rows.length} on sale · ` +
  `${by("LIVE")} live · ${by("ENDING")} ending soon · ` +
  `${by("NO END")} no end date · ${by("EXPIRED")} expired (hidden on site — clean in server.js) · ` +
  `${by("DATA ERROR")} data errors`,
);
if (by("DATA ERROR")) process.exitCode = 1;
