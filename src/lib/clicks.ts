/* Link-click counts in Upstash Redis (free tier, added through Vercel's
   Storage tab, which sets the KV_REST_API_* env vars). Talks to its REST API
   with fetch, so there's no extra package. Without the env vars every call
   is a no-op and the stats page says storage isn't connected. */

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export const clicksEnabled = () => !!(URL_ && TOKEN);

/* Runs several Redis commands in one request; returns each result. */
export async function redis(cmds: (string | number)[][]): Promise<unknown[]> {
  if (!URL_ || !TOKEN) return [];
  const res = await fetch(`${URL_}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify(cmds),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`redis ${res.status}`);
  return ((await res.json()) as { result: unknown }[]).map((r) => r.result);
}

/* Days are counted in New York time, like the sale dates. */
export const dayKey = (d = new Date()) => d.toLocaleDateString("en-CA", { timeZone: "America/New_York" });

export const KEEP_DAYS = 100;
