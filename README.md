# GymGear Compare — Frontend

The live Next.js app behind **[gymgearcompare.com](https://gymgearcompare.com)**: answer a 5-question quiz, get three personalized gym-gear kits (Best Value / Best Match / Best Quality) with affiliate buy links; or use the standalone comparison tool. Products are ranked by the **GymGear Score**, a data-derived quality rubric.

> **If you are an AI assistant working on this repo:** read [CLAUDE.md](CLAUDE.md) (working rules — includes a framer-motion trap that once froze production), then this file, then [CONTEXT.md](CONTEXT.md) (decisions + roadmap). [AGENTS.md](AGENTS.md) warns that Next.js 16 differs from training data — check `node_modules/next/dist/docs/` for Next specifics.

## Stack

Next **16.2.9** (App Router, `src/` layout) · React **19.2.4** · Tailwind **v4** · framer-motion 12 · GSAP + lenis (scroll) · TypeScript. Hosted on **Vercel** (auto-deploy on push to `main`). Talks to an Express backend on Render (`C:\Users\nirka\Documents\gymgear-backend-new`, repo `GYMGEAR-BACKEND5`).

## Route map (`src/app/`)

| Route | File | What it is |
|---|---|---|
| `/` | `page.tsx` | Homepage — dark hero, quiz CTA |
| `/start` | `start/page.tsx` | Path chooser: home quiz vs For Gyms (+ renovation questions) |
| `/quiz` | `quiz/page.tsx` | 5-screen quiz → kit results |
| `/gym` | `gym/page.tsx` | For Gyms — commercial facility planner (`GymPlanner.tsx`): questionnaire → zone plan + written build plan |
| `/planner` | `planner/page.tsx` | Floor-plan visualizer (`FloorPlanner.tsx`): drop/paste a schematic → walls auto-detected → equipment auto-arranged (or drag at true scale); also embedded in /gym as the plan's floor dashboard |
| `/compare` | `compare/page.tsx` | Comparison tool (2–4 products, spec matrix, verdict) |
| `/extras` | `extras/page.tsx` | Gear finder (`GearFinder.tsx`) |
| `/gear`, `/gear/[slug]` | `gear/` | Catalog browse + product detail |
| `/category/[slug]` | `category/` | Category listing |
| `/guides`, `/guides/[slug]` | `guides/` | Buying guides ranked by GymGear Score (`src/lib/guides.ts`) |
| `/methodology` | `methodology/page.tsx` | Explains the GymGear Score rubric |
| `/about`, `/contact`, `/sponsors`, `/privacy`, `/disclosure`, `/maintenance` | — | Static/support pages |
| `/api/catalog/*` | `api/catalog/` | Local Next API routes serving catalog data (`all`, `categories`, `products/[cat]`) |
| `/api/kit` | `api/kit/route.ts` | Local kit builder (port of backend KIT BUILDER — keep in lockstep with server.js) |
| `/api/gym-plan` | `api/gym-plan/route.ts` | **Thin proxy** to the backend's gym planner (NOT a port — B2B flow tolerates the Render cold start; 90s timeout) |

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
| `src/components/gym/GymPlanner.tsx` | For Gyms questionnaire + zone-by-zone plan (qty steppers, written plan, handoff to /planner) |
| `src/components/planner/` | `FloorPlanner.tsx` (drag-to-place map), `CropTool.tsx` (select room from image), `equipment-icon.tsx` (26-glyph top-down icon library, id→type map) |
| `src/lib/floor-plan.ts` | Planner domain: `FOOTPRINTS` (per-product W×D inches — every placeable product needs an entry), clearances, layout advice, sessionStorage handoff (`gymgear.floor.*.v1`, layout now carries room dims) |
| `src/lib/equipment-3d.ts` | 3D model library for the sims-style view: one primitive-composed builder per equipment type (same `equipmentTypeOf` resolver as the 2D icons), real published heights (`TYPE_HEIGHT` + per-product `HEIGHT_OVERRIDES`), family colours. Only imported by `Planner3D` |
| `src/components/planner/Planner3D.tsx` | Sims-style 3D scene (three.js, dynamic-imported so it never touches the 2D bundle): floor grid, see-through walls from the detected wall grid (door gaps stay open), real-size models, orbit controls, hover tooltip with true dimensions |
| `src/lib/auto-layout.ts` | Auto-layout engine: client-side wall detection from the uploaded schematic (Otsu threshold → dilate → flood-fill interior; photos fall back to borders-only) + formation packer (cardio rows w/ fall zones, racks backed to walls, dumbbells+facing benches, machines w/ aisles). ≥17" air between pieces so results never render red |
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
8. **Consistency sweep with every change — copy is code.** If a change alters a number or behaviour the site states anywhere (question counts, product counts, feature claims, metadata descriptions, homepage steps), grep the repo for every mention and fix them in the same commit. Canonical example: the quiz grew from 5 to 7 questions but the homepage, hero, and three metadata descriptions still said "5 quick questions" for days. After touching quiz/questionnaire structure run `grep -rin "question" src/app src/components` and audit the hits; prefer count-free phrasing ("a short questionnaire") where the number genuinely varies.

## Session log

Newest first. One line per completed task: `YYYY-MM-DD · what · commit`.

- 2026-07-14 · 3D sims-style view + kit-side floor builder: new `lib/equipment-3d.ts` (20 primitive-composed models — power/half rack, squat/wall rack, functional/all-in-one/cable/home-gym/wall-unit, iso row, leg press, GHD, treadmill, rower, ski erg, air/spin bike, elliptical, bench, dumbbell rack — real footprints + published heights w/ per-product overrides, family colours) + `Planner3D.tsx` (three.js dynamic-imported: floor grid, see-through walls from detected grid w/ open door gaps, orbit controls, hover tooltip w/ true dims); FloorPlanner gains 2D↔3D toggle (2D map stays mounted/hidden so observers survive); KitResult embeds the same floor dashboard as /gym (selected-kit items, anchor link, sessionStorage sync) so home gyms get builder + 3D too; deps + three,@types/three · (this commit)
- 2026-07-14 · Site nav on the trap pages: /gym, /planner and /start rendered their tool component with no `SiteNav`, so landing there left no way back to the rest of the site — wrapped all three with `<SiteNav/>…<SiteFooter/>` like every other page (pattern: /compare). /quiz stays nav-free by design (conversion funnel). (Note: the user's word "dashboard" throughout this work meant the site nav header, not the floor-plan board.) · (this commit)
- 2026-07-14 · Room-aware auto-layout + unmissable dashboard + copy sweep: auto-layout now reads rooms geometrically (erode open space ~27" so door throats sever → keep largest core → regrow) so gear never lands in bathrooms/offices connected by doors (note reports "read N rooms"); floor dashboard moved above the written plan on /gym + new 4-chip stat strip (placed/room/footprint/floor-used) on the planner board both embedded and full-screen; stale copy sweep — quiz is 7 questions (homepage step card, hero, site+quiz metadata) and gym metadata went count-free; new standing rule #8 (consistency sweep, copy is code) added here + CLAUDE.md · (this commit)
- 2026-07-14 · Polish pass (ui-ux-pro-max): sponsors form now submits via fetch with inline loading→success/error states (no more redirect to Formspree's generic page; glow hover per brand rules) via new `components/SponsorForm.tsx`; equipment pieces land with a staggered overshoot pop (`.gg-pop-in`, transform-only) on auto-arrange/palette drop; embedded dashboard intro copy shortened; mobile verified at 375px · (this commit)
- 2026-07-14 · Floor dashboard in For Gyms + auto-layout engine + fixes: /gym plan now embeds the floor planner (`FloorPlanner embedded` + itemsProp, room auto-sized to plan area) so the plan no longer vanishes behind a page switch; new `lib/auto-layout.ts` — schematic upload/drag/paste (Ctrl+V) → wall detection (canvas Otsu+flood-fill, orange detected-walls overlay) → auto-arrange with formations (cardio rows+fall zones, racks on walls, dumbbells↔benches, machine aisles); works for gym plans AND home kits; layout+room dims persist across /gym↔/planner (fixed StrictMode save-clobber); Start over needs a confirm click; sponsors Formspree endpoint fixed (xkoekoqq) · (this commit)
- 2026-07-12 · Site audit: scrubbed dead SITE_KEY from legacy/app.html (rotated 07-05, verified 403 in prod), gitignored .claude/, README route+module maps caught up to /start·/gym·/planner (backend got a rate-limit eviction sweep + JSON error handler in its own repo) · (this commit)
- 2026-07-12 · Realistic per-product equipment icons across the gym area: 26-glyph top-down icon library (power/half rack, squat stand, wall rack, functional trainer, all-in-one, cable tower, home gym, wall unit, iso row, leg press, GHD, treadmill, rower, ski erg, air/spin bike, elliptical, bench, dumbbell rack, barbell, plates, kettlebell, band, flooring), id→type map for all placeable products, icon tiles in /gym zone listings (rows now wrap on mobile), same icons on /planner map + palette · (this commit)
- 2026-07-11 · Renovation depth — per-zone sizes, must-have machines, ranked selection: reno now sizes each redone area separately (per-zone Compact/Standard/Large → total area = sum, quantities off each room) instead of one figure; new "Any machines you must have?" picker locks specific catalog models into the plan (backend reserves budget + pins them, incl. matching gear they already run); machine row now drawn from a GymGear-Score-ranked catalog pool (gpPool) so the best pieces float up and new products flow in automatically · (this commit)
- 2026-07-11 · Visualizer back button: /planner now shows a "← Back to your plan/kit" link to wherever you came from (origin tracked in sessionStorage on the way in); the gym plan is persisted so returning to /gym restores it (incl. qty edits) instead of dropping you back at the empty quiz — "Start over" clears it · (this commit)
- 2026-07-11 · Path chooser + real renovation flow: new /start page ("What are you setting up?" — Home Gym vs Professional Gym, dark premium cards); all "Build My Kit" CTAs (nav, footer, homepage, 404) now route there. Gym quiz renovation branch fixed: area question reworded to "how much are you renovating" (sizes the order to the renovated section), + two new questions — what's driving it (renoScope multi) and which areas to redo (renoTargets multi). Backend maps renoTargets→kept zones (budget flows to the redone areas), renoScope biases the split, written plan reflects it · (this commit)
- 2026-07-11 · Planner fixes: piece toolbar (rotate/delete) moved onto the piece's top-right corner so it no longer vanishes when you reach for it and isn't clipped at the map's top edge (delete now works); safety halos shrunk to a small nudge (cardio/racks 8", machines 6", benches/dumbbells 5", default 4") so pieces can sit close together · (this commit)
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
