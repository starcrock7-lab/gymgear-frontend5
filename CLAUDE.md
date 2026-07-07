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

## Key flows (detail in README)
- **Quiz → kit:** `/quiz` (`QuizFlow.tsx`) stores answers in sessionStorage `gymgear.quiz.v1` (option ids in `src/lib/quiz.ts`) → `requestKit()` → local `POST /api/kit` (`src/app/api/kit/route.ts`, deterministic port of the backend kit builder — keep in lockstep with server.js) → `KitResult.tsx` (3 tiers, swap via `SwapModal`).
- **Compare:** `/compare` (`CompareTool.tsx`) — pick 2–4 in a category → spec matrix + best-value verdict.
- **Catalog:** local Next API routes `src/app/api/catalog/*` + `src/lib/catalog.ts`.

## Style
Brand stays: orange `#e8542a`, navy `#0d1b35`, off-white `#f8f7f5`, Syne + DM Sans. Dark, premium, Whoop-inspired; token source of truth is `src/app/globals.css`.

## Known issues / deferred
- "Compare these" shortcut from a kit — deferred (kit products are cross-category; the tool compares within one category)
- SEO product pages, weekly price refresh (`.github` workflow), social sharing, real product images (waiting on Amazon PA API) — not built yet; see CONTEXT.md phases
