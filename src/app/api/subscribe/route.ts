import { NextResponse } from "next/server";

/* Deal-alert signup → MailerLite. The key lives only in Vercel's env
   (MAILERLITE_API_KEY, optional MAILERLITE_GROUP_ID), never in this public
   repo. Double opt-in is switched on in the MailerLite account, so a signup
   gets a confirmation email before it joins the list. */

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

/* ponytail: per-instance memory, resets on cold start. Enough to stop a
   script hammering one instance; move to a shared store if abuse shows up. */
const hits = new Map<string, number[]>();
const LIMIT = 5;
const WINDOW_MS = 10 * 60 * 1000;

function limited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > LIMIT;
}

const fail = (error: string, status: number) => NextResponse.json({ ok: false, error }, { status });

export async function POST(req: Request) {
  const key = process.env.MAILERLITE_API_KEY;
  if (!key) return fail("Email signup isn't open yet.", 503);

  /* Only our own pages may post here. */
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (origin && host && new URL(origin).host !== host) return fail("Not allowed.", 403);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (limited(ip)) return fail("Too many tries. Wait a few minutes and try again.", 429);

  const body = (await req.json().catch(() => ({}))) as { email?: unknown; company?: unknown };
  /* Honeypot: people never see this field, bots fill it. Pretend it worked. */
  if (body.company) return NextResponse.json({ ok: true });

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL.test(email)) return fail("That email address doesn't look right.", 400);

  const group = process.env.MAILERLITE_GROUP_ID;
  const res = await fetch("https://connect.mailerlite.com/api/subscribers", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ email, ...(group ? { groups: [group] } : {}) }),
  }).catch(() => null);

  if (res?.ok) return NextResponse.json({ ok: true });
  if (res?.status === 422) return fail("That email address doesn't look right.", 400);
  return fail("We couldn't sign you up just now. Try again in a minute.", 502);
}
