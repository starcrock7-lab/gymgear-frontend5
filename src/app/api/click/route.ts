import { createHash } from "node:crypto";
import { clicksEnabled, dayKey, KEEP_DAYS, redis } from "@/lib/clicks";

/* One link click, sent by ClickTracker. Stores counts only: the link, how many
   clicks, and an estimate of how many different people (a HyperLogLog of a
   salted hash of IP + browser, which can't be turned back into either). */

const SITE_PATH = /^\/[a-z0-9\-/]{0,120}$/;
const STORE_URL = /^https:\/\/[a-z0-9.-]+\.[a-z]{2,}\/[^\s]{0,240}$/i;

/* ponytail: per-instance memory, resets on cold start; stops one script
   from inflating counts. */
const hits = new Map<string, number[]>();
function limited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 30;
}

const done = () => new Response(null, { status: 204 });

export async function POST(req: Request) {
  if (!clicksEnabled()) return done();
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (origin && host && new URL(origin).host !== host) return done();

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (limited(ip)) return done();

  const body = (await req.json().catch(() => ({}))) as { href?: unknown };
  const href = typeof body.href === "string" ? body.href : "";
  if (!SITE_PATH.test(href) && !STORE_URL.test(href)) return done();

  const day = dayKey();
  const ttl = KEEP_DAYS * 86400;
  const person = createHash("sha256")
    .update(`${ip}|${req.headers.get("user-agent") ?? ""}|${process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN}`)
    .digest("hex")
    .slice(0, 16);

  await redis([
    ["HINCRBY", "clicks:all", href, 1],
    ["HINCRBY", `clicks:${day}`, href, 1],
    ["EXPIRE", `clicks:${day}`, ttl],
    ["PFADD", `people:all:${href}`, person],
    ["PFADD", `people:${day}:${href}`, person],
    ["EXPIRE", `people:${day}:${href}`, ttl],
  ]).catch(() => null);
  return done();
}
