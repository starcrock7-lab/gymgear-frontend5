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

`robots.ts` + `sitemap.ts` generate SEO artifacts.

## Module map

| Path | Owns |
|---|---|
| `src/lib/api.ts` | **`apiFetch()` + `requestKit()`** — the only sanctioned way to call the backend (adds `X-Site-Key` header) |
| `src/lib/quiz.ts` | Quiz questions + stable option ids; answers persist to sessionStorage key `gymgear.quiz.v1` |
| `src/lib/kit.ts` | Kit + product types, `gymgearScore`, `ScoreFacet` breakdown |
| `src/lib/catalog.ts` | Catalog access/sorting (sorts by GymGear Score) |
| `src/lib/guides.ts` | Guide content, picks driven by GymGear Score data |
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
  → requestKit() (lib/api.ts) → POST {backend}/api/kit  (X-Site-Key header)
      backend: deterministic cart builder picks products (budget/space/owned-aware);
               Groq writes only kit name/description; template fallback on error
  → KitResult renders 3 tiers; SwapModal swaps via /api/products/:cat and recomputes totals
```

The backend owns product selection and all price data — the LLM can never produce a bad cart. Buy links resolve `affiliateUrl || url` (Amazon tag `gymgearcompar-20`).

## Runbook

| Action | Command |
|---|---|
| Dev server | `npm run dev` → http://localhost:3000 |
| **Verify before push** | `npm run build` (Vercel runs the same — broken build = blocked deploy) |
| Lint | `npm run lint` |
| Deploy | push to `main` (git email **must** be `starcrock7@gmail.com`) → Vercel auto-deploys |
| Env | `.env.local` (gitignored) — backend URL + site key; never commit values (public repo) |

## Conventions for AI editors

1. Smallest possible diff; this codebase has been corrupted by careless bulk edits before.
2. Never combine blur/filter transitions with `AnimatePresence mode="wait"` (framer-motion 12 + React 19 hang — see CLAUDE.md rule 1).
3. All backend calls through `apiFetch()`; all new backend interaction types belong in `src/lib/api.ts`.
4. `npm run build` green before any push; a task isn't done until it builds.
5. Keep the brand tokens (`globals.css`) — orange `#e8542a`, navy `#0d1b35`, Syne + DM Sans.
6. Next 16 idioms: verify against `node_modules/next/dist/docs/`, not memory.
