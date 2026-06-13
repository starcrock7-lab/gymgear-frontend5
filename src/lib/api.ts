import type { QuizAnswers } from "@/lib/quiz";
import type { KitResponse } from "@/lib/kit";

/* All backend calls go through apiFetch so the base URL and the site-key
   header are applied in one place (mirrors the classic site's apiFetch). */
const BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") ||
  "http://localhost:3001";
const SITE_KEY = process.env.NEXT_PUBLIC_SITE_KEY || "";

export async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (SITE_KEY) headers.set("X-Site-Key", SITE_KEY);
  return fetch(`${BASE}${path}`, { ...init, headers });
}

/* POST the quiz answers, get three kits back. Throws on network/HTTP error
   so the caller can show a retry. */
export async function requestKit(answers: QuizAnswers): Promise<KitResponse> {
  const res = await apiFetch("/api/kit", {
    method: "POST",
    body: JSON.stringify(answers),
  });
  if (!res.ok) {
    throw new Error(`Kit request failed (${res.status})`);
  }
  return (await res.json()) as KitResponse;
}
