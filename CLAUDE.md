# GymGear Compare — Frontend Briefing

## Orientation — read in this order
1. This file — working rules
2. [README.md](README.md) — route map, module map, data flows, runbook
3. [CONTEXT.md](CONTEXT.md) — product vision, quiz/kit design decisions, phased roadmap
4. [AGENTS.md](AGENTS.md) — **Next.js 16 differs from your training data**; read `node_modules/next/dist/docs/` before writing Next-specific code
5. `graphify-out/graph.json` — knowledge graph (query via `/graphify`); a merged cross-repo graph lives in `..\gymgear-compare-graph\graphify-out\`

## What it is
The live Next.js app for **gymgearcompare.com**: quiz → personalized gear **kit** (3 tiers), `/compare` tool, `/extras` gear finder, guides, and the **GymGear Score** (data-derived quality rubric, `src/lib/kit.ts`, explained at `/methodology`).
Stack: **Next 16.2.9 (App Router, `src/`), React 19.2.4, Tailwind v4, framer-motion 12, GSAP + lenis**. Deployed on Vercel; Express backend on Render (`..\gymgear-backend-new`).

## The rules that prevent 90% of breakage
1. **framer-motion trap (took prod down once):** blur/filter transitions combined with `AnimatePresence mode="wait"` silently hang on framer-motion 12 + React 19 — the quiz funnel froze with no error. Use keyed `motion.div` remounts instead; never reintroduce `mode="wait"` around filtered elements.
2. **All backend calls go through `apiFetch()`** (`src/lib/api.ts`) — it attaches the `X-Site-Key` header. Never call `fetch(BACKEND + ...)` raw. Never commit the key value (public repo).
3. **`npm run build` must pass before pushing.** Vercel runs the same build; a broken build blocks deploy. `npm run lint` for a faster signal.
4. **Deploy commits must use git email `starcrock7@gmail.com`** or Vercel rejects the deploy.
5. **`legacy/` is the retired static-HTML site (793 files) — never edit it**, never import from it, it's excluded from graphify. `.next/` and `node_modules/` are generated.
6. Next 16 conventions over memory: check `node_modules/next/dist/docs/` when touching routing, metadata, or server/client component boundaries (per AGENTS.md).
7. **Consistency sweep with every change — copy is code.** If your change alters anything the site's copy states (question counts, product counts, feature claims, metadata), grep for every mention and fix them in the same commit (the quiz said "5 questions" site-wide long after it grew to 7). Prefer count-free phrasing where the number varies.
8. **Dark-theme invariants (site-wide dark since 2026-07-07):** the body background is still the light default — every page sets its own dark bg (`bg-navy` wrapper). `bg-card` is the raised-surface token; **`bg-white` is reserved for product-photo/brand-initial tiles only**. Never `bg-ink text-white` chips (white-on-white after the token flip) — use accent chips. No `backdrop-filter`/blur on elements that animate (re-raster jank). Hover language is orange glow, not translate-y lift.

## Key flows (detail in README)
- **Quiz → kit:** `/quiz` (`QuizFlow.tsx`) stores answers in sessionStorage `gymgear.quiz.v1` (option ids in `src/lib/quiz.ts`) → `requestKit()` → local `POST /api/kit` (`src/app/api/kit/route.ts`, deterministic port of the backend kit builder — keep in lockstep with server.js) → `KitResult.tsx` (3 tiers, swap via `SwapModal`).
- **Compare:** `/compare` (`CompareTool.tsx`) — pick 2–4 in a category → spec matrix + best-value verdict.
- **Catalog:** local Next API routes `src/app/api/catalog/*` + `src/lib/catalog.ts`.

## Style
Brand: orange `#e8542a` accent, navy `#0d1b35`, Syne + DM Sans. Site-wide dark, techy/futuristic ("gym gear in space"), premium, Whoop-inspired; token source of truth is `src/app/globals.css` (dark-flipped `--off/--ink*/--line`, `--card` surface, `.starfield` utility). Hero wallpaper = `ui/dumbbell-wall.tsx` (SVG glass dumbbells, whole-dumbbell hover ignition — no cursor-following spotlights, they were rejected as laggy). Motion recipes: `smooth-motion` skill.

## Known issues / deferred
- Local `npm run build` spams `[TypeError: fetch failed] ECONNREFUSED` during page-data collection: `.env.local` points `NEXT_PUBLIC_BACKEND_URL` at `localhost:3001`, and SSG pages fetch the catalog at build time. Build still passes (fallback data), but a faithful local prod preview needs the backend running first (`node server.js` in the backend repo). Vercel builds are unaffected (no `.env.local` → Render URL).
- "Compare these" shortcut from a kit — deferred (kit products are cross-category; the tool compares within one category)
- SEO product pages, weekly price refresh (`.github` workflow), social sharing, real product images (waiting on Amazon PA API) — not built yet; see CONTEXT.md phases
