# GymGear Compare — Frontend

The live Next.js app behind **[gymgearcompare.com](https://gymgearcompare.com)**: answer a 5-question quiz, get three personalized gym-gear kits (Best Value / Best Match / Best Quality) with affiliate buy links; or use the standalone comparison tool. Products are ranked by the **GymGear Score**, a data-derived quality rubric.

> **If you are an AI assistant working on this repo:** read [CLAUDE.md](CLAUDE.md) (working rules — includes a framer-motion trap that once froze production), then this file, then [CONTEXT.md](CONTEXT.md) (decisions + roadmap). [AGENTS.md](AGENTS.md) warns that Next.js 16 differs from training data — check `node_modules/next/dist/docs/` for Next specifics.

## Stack

Next **16.2.9** (App Router, `src/` layout) · React **19.2.4** · Tailwind **v4** · framer-motion 12 · GSAP + lenis (scroll) · TypeScript. Hosted on **Vercel** (auto-deploy on push to `main`). Talks to an Express backend on Render (`C:\Users\nirka\Documents\gymgear-backend-new`, repo `GYMGEAR-BACKEND5`).

## Route map (`src/app/`)

| Route | File | What it is |
|---|---|---|
| `/` | `page.tsx` | Homepage — dark hero, quiz CTA |
| `/quiz` | `quiz/page.tsx` | 5-screen quiz → kit results |
| `/compare` | `compare/page.tsx` | Comparison tool (2–4 products, spec matrix, verdict) |
| `/extras` | `extras/page.tsx` | Gear finder (`GearFinder.tsx`) |
| `/gear`, `/gear/[slug]` | `gear/` | Catalog browse + product detail |
| `/category/[slug]` | `category/` | Category listing |
| `/guides`, `/guides/[slug]` | `guides/` | Buying guides ranked by GymGear Score (`src/lib/guides.ts`) |
| `/methodology` | `methodology/page.tsx` | Explains the GymGear Score rubric |
| `/about`, `/contact`, `/sponsors`, `/privacy`, `/disclosure`, `/maintenance` | — | Static/support pages |
| `/api/catalog/*` | `api/catalog/` | Local Next API routes serving catalog data (`all`, `categories`, `products/[cat]`) |
| `/api/kit` | `api/kit/route.ts` | Local kit builder (port of backend KIT BUILDER — keep in lockstep with server.js) |

> **No cart.** A site-wide cart + Amazon bulk "Buy all" shipped 2026-07 and was **removed the same week**: Amazon deprecated the `gp/aws/cart/add.html` bulk endpoint ("Cart is empty / unavailable"), so a unified checkout can't work. Every product sells through its own affiliate Buy link — same commission. Don't rebuild a cart without a working checkout mechanism.

`robots.ts` + `sitemap.ts` generate SEO artifacts.

## Module map

| Path | Owns |
|---|---|
| `src/lib/api.ts` | **`apiFetch()` + `requestKit()`** — the only sanctioned way to call the backend (adds `X-Site-Key` header) |
| `src/lib/quiz.ts` | Quiz questions + stable option ids; answers persist to sessionStorage key `gymgear.quiz.v1` |
| `src/lib/kit.ts` | Kit + product types, `gymgearScore`, `ScoreFacet` breakdown |
| `src/lib/catalog.ts` | Catalog access/sorting (sorts by GymGear Score) |
| `src/lib/guides.ts` | Guide content, picks driven by GymGear Score data |
| `src/lib/deals.ts` | Deals engine — `productDeal`/`findDeals` (curated `salePrice` only), `saleExpired`, honest countdowns; AI pitch layer from `src/data/deal-pitches.json` |
| `src/data/deal-pitches.json` | Weekly Groq-written pitch per sale item (committed by `.github/workflows/weekly-deal-pitches.yml`) |
| `scripts/check-deals.mjs` | `npm run check:deals` — audits every product's sale state (live/ending/expired/data-error) |
| `src/components/quiz/` | `QuizFlow` (screens/transitions), `KitResult` (3-tier results), `SwapModal` (swap product, recompute total), `ProductModal` |
| `src/components/compare/CompareTool.tsx` | Entire comparison tool |
| `src/components/extras/GearFinder.tsx` | Extras finder |
| `src/components/ui/` | Visual primitives (aurora background, spotlight card, text scramble, buttons…) — mostly 21st.dev-style components |
| `src/components/SiteNav/SiteFooter/SearchModal` | Chrome |
| `src/app/globals.css` | Design tokens — source of truth for colors/fonts |

**Do not touch:** `legacy/` (retired static-HTML site, 793 files), `.next/`, `node_modules/`, `tsconfig.tsbuildinfo`.

## Data flow: quiz → kit

```
/quiz (QuizFlow) — 5 answers → sessionStorage["gymgear.quiz.v1"]
  → requestKit() (lib/api.ts) → POST /api/kit  (our own Next route — never Render)
      src/app/api/kit/route.ts: deterministic cart builder (port of server.js KIT
      BUILDER; budget/space/owned-aware, templated copy) over the same ISR-cached
      catalog as /api/catalog/* — so a sleeping Render backend can't stall the
      quiz's conversion moment with a 30–60s cold start
  → KitResult renders 3 tiers; SwapModal swaps via /api/products/:cat and recomputes totals
```

The catalog owns product selection and all price data. Keep `src/app/api/kit/route.ts` selection logic in lockstep with the backend's server.js KIT BUILDER section. Buy links resolve `affiliateUrl || url` (Amazon tag `gymgearcompar-20`).

## Deals engine

Deterministic wall (same as the kit builder): **the LLM never sources a price or expiry** — deals derive only from curated `salePrice`/`saleEndsAt` in server.js; Groq writes copy over computed numbers, weekly, as a cached artifact. `lib/catalog.ts` strips expired sale fields at fetch time, so every surface (gear, category, compare, kit, search) drops a dead sale automatically within the hourly ISR window; the client deal strip re-checks live via `productDeal()`. Audit the whole catalog any time with `npm run check:deals`. Note: countdown labels only render when a sale has a curated `saleEndsAt` — as of 2026-07-09 none do, so add dates in server.js to activate them (never invent one).

## Security (review 2026-07-09)

- **Public repos, no secrets ever** — keys live in Vercel/Render env vars; `.env.example` holds placeholders only; no hardcoded fallbacks next to `process.env` reads (a real value there defeats rotation).
- Security headers on every response via `next.config.ts` (nosniff, frame-deny, referrer-policy, permissions-policy); HSTS comes from Vercel. CSP deferred until user-generated content exists.
- Backend gate: CORS origin allowlist + `X-Site-Key` + 60 req/min per-IP rate limit (`trust proxy` set so Render's LB doesn't collapse it to one bucket). `NEXT_PUBLIC_SITE_KEY` ships to the browser by design — a soft gate, not a secret.
- Known accepted risk: `postcss` moderate advisory via Next itself — build-time only, no untrusted CSS; clears with the next Next patch.
- No `dangerouslySetInnerHTML` anywhere; keep it that way.

## Runbook

| Action | Command |
|---|---|
| Dev server | `npm run dev` → http://localhost:3000 |
| **Verify before push** | `npm run build` (Vercel runs the same — broken build = blocked deploy) |
| Lint | `npm run lint` |
| Deals audit | `npm run check:deals` — every product's sale state in one table |
| Deploy | push to `main` (git email **must** be `starcrock7@gmail.com`) → Vercel auto-deploys |
| Env | `.env.local` (gitignored) — backend URL + site key; never commit values (public repo) |

## Conventions for AI editors

1. Smallest possible diff; this codebase has been corrupted by careless bulk edits before.
2. Never combine blur/filter transitions with `AnimatePresence mode="wait"` (framer-motion 12 + React 19 hang — see CLAUDE.md rule 1).
3. All backend calls through `apiFetch()`; all new backend interaction types belong in `src/lib/api.ts`.
4. `npm run build` green before any push; a task isn't done until it builds.
5. Keep the brand tokens (`globals.css`) — orange `#e8542a`, navy `#0d1b35`, Syne + DM Sans.
6. Next 16 idioms: verify against `node_modules/next/dist/docs/`, not memory.
7. **After each completed task, append one line to the Session log below** (date · what changed · commit) — newest first, one line, no essays.

## Session log

Newest first. One line per completed task: `YYYY-MM-DD · what · commit`.

- 2026-07-11 · Planner: machine icons + crop-to-room + revert halos: each piece (map + palette) now shows a top-down type icon (rack/treadmill/rower/bike/bench/dumbbell/cable via components/planner/equipment-icon); dropping/uploading an image opens a "select your room" crop tool (drag a box → that section fills the map at the dimensions you set, "Re-select room" to redo, different rooms/shapes supported via the crop rect + independent W×D); safety halos reverted from directional back to the previous uniform per-category rings · (this commit)
- 2026-07-10 · Planner: regulation directional clearances + drag-drop image: safety halos are now per-edge regulation boxes (6 ft treadmill fall zone behind belt, 4 ft rack fronts, 3 ft dumbbell-to-bench, 36" sides) that rotate WITH the piece so you can aim a fall zone at a wall; collision uses the directional boxes; floor images can now be dragged and dropped anywhere onto the grid (drop overlay + non-image rejection, stays in-browser) · (this commit)
- 2026-07-10 · Smarter questions + editable quantities + floor-plan visualizer: home quiz gains experience + ceiling-height questions (low ceilings gate tall racks/machines, beginners get machine-led kits — backend + route lockstep); gym planner gains ceiling question + live qty steppers; new /planner page — upload your floor image, set room size, drag true-scale equipment rects with research-backed safety halos (red on crowding) + layout advice; kit result & gym plan hand their lists to it via sessionStorage · (this commit)
- 2026-07-10 · "For Gyms" commercial track: new /gym tab (6-question stepper → zone-by-zone facility plan with quantities, totals, contingency + Groq-written build plan), /api/gym-plan proxy route; backend adds pro-flagged commercial catalog (Hammer Strength, Body-Solid SGLP500, LF Club Series+, REP sets, Rogue GHD, flooring category) + deterministic zone allocator; verified end-to-end in preview desktop+mobile · (this commit)
- 2026-07-10 · Discount tag → corner tag: deal badge now hugs the tile's top-right corner with a zigzag "torn tag" clip-path edge pointing toward the middle (`.gg-corner-deal`, drop-shadow glow follows the cut shape, sheen kept); modal keeps the pill; verified desktop + mobile + zoom · (this commit)
- 2026-07-10 · Award emblem, clearer + slicker: scrapped the CSS pseudo "plates" (read as a bubble) for a custom solid-fill dumbbell glyph (`components/ui/dumbbell-mark.tsx`) in a slim frosted navy-glass pill with a green ring/glow — matches the score badge's glass language, static (no pulse); verified zoomed at desktop + mobile · (this commit)
- 2026-07-09 · Award tag → dumbbell emblem: the hero award is now a bigger, centred `.gg-dumbbell` at the top-middle of grid cards (handle + two round weight-plate pseudo-elements, brand green + glow); deal/score stay as corner pills; verified desktop + mobile · (this commit)
- 2026-07-09 · Glowing product tags: replaced the flat award/deal/score overlay bars with theme-lit pill badges (green throbbing award, orange deal with sheen sweep, accent-ringed GymGear Score) via a `@layer components` `.gg-tag` system in globals.css; wired CompareTool, GearFinder, ProductModal; verified glow + motion at desktop/mobile/modal · (this commit)
- 2026-07-09 · Household-name expansion: +9 staples (Rogue Ohio Power Bar & SML-2, PRx folding rack, PowerBlock, Kettlebell Kings, WaterRower, TRX PRO4, Tonal 2, Ironmaster Super Bench), 6 new brands, all URLs verified; compact-flag gating extended to racks (wall-folding rack now legal in small rooms — blanket rack ban removed) in backend + lockstep route port · (this commit)
- 2026-07-09 · Major catalog + kit-algorithm update: new `machines` category (11 all-in-one/functional trainers — Force USA, Life Fitness, REP, Bells of Steel, Body-Solid, Bowflex, Marcy), +5 racks/cardio products, kit builder personalised (GymGear-Score match tier, budget-share fit, machine↔rack exclusivity, compact gating for tight spaces) in backend server.js + lockstep port in api/kit/route.ts · (this commit)
- 2026-07-09 · Security review: removed old-key fallbacks (catalog.ts, backend .env.example), security headers in next.config.ts, backend `trust proxy` rate-limit fix; email + repo leak scan clean · (this commit)
- 2026-07-09 · Deals: expired-sale strip at catalog layer + `npm run check:deals` audit (256 products, 28 sales, 0 errors; no `saleEndsAt` curated yet) · (this commit)
- 2026-07-09 · Removed cart system — Amazon bulk add-to-cart endpoint deprecated ("Cart is empty"); per-item affiliate links kept everywhere · 42b92b4
- 2026-07-08 · Amazon-first honest cart split + buy-all (superseded next day by cart removal) · 0ffebd2
