import { NextResponse } from "next/server";

/* Thin proxy to the backend gym planner. Unlike the home kit (built locally
   because the quiz funnel can't wait on a Render cold start), the gym plan
   is a low-volume, high-intent B2B flow — a longer first-load wait is fine,
   and the written plan needs the backend's server-side Groq key anyway. */

const BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") ||
  "https://gymgear-backend5.onrender.com";
const SITE_KEY = process.env.NEXT_PUBLIC_SITE_KEY || "";
const SITE_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_URL || "https://gymgearcompare.com";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  try {
    const r = await fetch(`${BASE}/api/gym-plan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Site-Key": SITE_KEY,
        Origin: SITE_ORIGIN,
      },
      body: JSON.stringify(body),
      cache: "no-store",
      /* Render free tier sleeps; a cold start can take ~60s. */
      signal: AbortSignal.timeout(90000),
    });
    const data = await r.json().catch(() => ({ error: "Bad backend response." }));
    return NextResponse.json(data, { status: r.status });
  } catch {
    return NextResponse.json(
      { error: "The planner is waking up — give it a minute and try again." },
      { status: 503 },
    );
  }
}
