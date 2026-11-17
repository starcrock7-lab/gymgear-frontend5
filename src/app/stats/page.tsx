import type { Metadata } from "next";
import Link from "next/link";
import { getAllProducts } from "@/lib/catalog";
import { buyUrl } from "@/lib/kit";
import { clicksEnabled, dayKey, KEEP_DAYS, redis } from "@/lib/clicks";

/* Private page (password-protected in src/proxy.ts): which links people click. */
export const metadata: Metadata = { title: "Link clicks", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const RANGES = [
  { key: "1", label: "Today", days: 1 },
  { key: "7", label: "7 days", days: 7 },
  { key: "30", label: "30 days", days: 30 },
  { key: "all", label: "All time", days: 0 },
] as const;

type Row = { href: string; clicks: number; people: number };

const pairs = (flat: unknown) => {
  const a = (flat as string[]) ?? [];
  const out: [string, number][] = [];
  for (let i = 0; i < a.length; i += 2) out.push([a[i], Number(a[i + 1])]);
  return out;
};

async function load(days: number): Promise<Row[]> {
  const dayList = days
    ? Array.from({ length: days }, (_, i) => dayKey(new Date(Date.now() - i * 86400000)))
    : [];
  const hashes = await redis(days ? dayList.map((d) => ["HGETALL", `clicks:${d}`]) : [["HGETALL", "clicks:all"]]);
  const clicks = new Map<string, number>();
  for (const h of hashes) for (const [href, n] of pairs(h)) clicks.set(href, (clicks.get(href) ?? 0) + n);
  const hrefs = [...clicks.keys()];
  /* PFCOUNT over several days' sets counts each person once across them. */
  const people = await redis(
    hrefs.map((h) => ["PFCOUNT", ...(days ? dayList.map((d) => `people:${d}:${h}`) : [`people:all:${h}`])]),
  );
  return hrefs
    .map((href, i) => ({ href, clicks: clicks.get(href)!, people: Number(people[i] ?? 0) }))
    .sort((a, b) => b.clicks - a.clicks);
}

export default async function StatsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range = "7" } = await searchParams;
  const r = RANGES.find((x) => x.key === range) ?? RANGES[1];
  const on = clicksEnabled();
  const [rows, products] = on
    ? await Promise.all([load(r.days).catch(() => null), getAllProducts().catch(() => [])])
    : [[], []];

  /* Name store links and product pages after the product. */
  const names = new Map<string, string>();
  for (const p of products) {
    names.set(`/gear/${p.id}`, p.name);
    try {
      const u = new URL(buyUrl(p));
      names.set(u.origin + u.pathname, `${p.name} (${p.retailer})`);
    } catch {}
  }
  const store = (rows ?? []).filter((x) => x.href.startsWith("http"));
  const site = (rows ?? []).filter((x) => x.href.startsWith("/"));
  const total = (rows ?? []).reduce((s, x) => s + x.clicks, 0);

  const table = (title: string, note: string, list: Row[]) => (
    <section className="mt-10">
      <h2 className="font-display text-2xl font-extrabold tracking-tight">{title}</h2>
      <p className="mt-1 text-sm text-white/60">{note}</p>
      {list.length ? (
        <table className="mt-4 w-full text-left text-sm">
          <thead className="text-white/60">
            <tr>
              <th className="py-2 pr-3 font-semibold">Link</th>
              <th className="py-2 pr-3 text-right font-semibold">Clicks</th>
              <th className="py-2 text-right font-semibold">People</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {list.slice(0, 100).map((x) => (
              <tr key={x.href} className="border-t border-white/10 align-top">
                <td className="py-2.5 pr-3">
                  <span className="block font-semibold text-white">{names.get(x.href) ?? (x.href === "/" ? "Home page" : x.href)}</span>
                  {names.has(x.href) && <span className="block break-all text-xs text-white/50">{x.href}</span>}
                </td>
                <td className="py-2.5 pr-3 text-right font-bold">{x.clicks.toLocaleString("en-US")}</td>
                <td className="py-2.5 text-right text-white/80">{x.people.toLocaleString("en-US")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="mt-4 text-white/70">No clicks in this period yet.</p>
      )}
    </section>
  );

  return (
    <main className="min-h-screen bg-navy text-white">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Link href="/" className="text-sm text-white/60 hover:text-white">
          ← gymgearcompare.com
        </Link>
        <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight">Link clicks</h1>

        {!on ? (
          <p className="mt-4 text-white/80">
            Click counting isn&apos;t connected yet. In Vercel, open the project&apos;s Storage tab, add Upstash
            for Redis (free plan), connect it to this project, and redeploy.
          </p>
        ) : rows === null ? (
          <p className="mt-4 text-white/80">Couldn&apos;t read the counts just now. Refresh in a minute.</p>
        ) : (
          <>
            <nav className="mt-6 flex flex-wrap gap-2" aria-label="Time range">
              {RANGES.map((x) => (
                <Link
                  key={x.key}
                  href={`/stats?range=${x.key}`}
                  aria-current={x.key === r.key ? "page" : undefined}
                  className={
                    "min-h-11 rounded-xl px-4 py-2.5 text-sm font-bold " +
                    (x.key === r.key ? "bg-accent text-white" : "border border-white/15 text-white/70 hover:text-white")
                  }
                >
                  {x.label}
                </Link>
              ))}
            </nav>
            <p className="mt-4 text-white/80">
              {total.toLocaleString("en-US")} clicks {r.days ? `in the last ${r.label.toLowerCase()}` : "since counting started"}.
            </p>
            {table("Store links", "Buy buttons that open a store's page.", store)}
            {table("Site links", "Links to pages on this site.", site)}
            <p className="mt-10 text-xs text-white/50">
              People is an estimate (within about 1%) of how many different visitors clicked. Daily counts are kept{" "}
              {KEEP_DAYS} days; all-time counts are kept forever. Days run on New York time.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
