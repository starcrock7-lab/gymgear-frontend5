# GymGear Compare — Domain Context

## What this project is

An AI-powered gym equipment comparison and recommendation web app at gymgearcompare.com.
Goal: beat ChatGPT for gym gear decisions by being faster, more personalized, and more visual.
Revenue: affiliate commissions (Amazon tag: gymgearcompar-20), display ads (AdSense), sponsored listings.

## Core design decisions (from grilling session, 2026-06-11)

### The product vision
Not a catalog. A guided tool. User answers 5 questions, gets a personalized kit built for them.
Three kit tiers generated in one AI call: Best Value / Best Match / Best Quality.
Comparison tool stays as secondary path for people who already know what they want.

### What makes it different from ChatGPT
- Live product catalog (160 products, 20 categories) — ChatGPT has no prices
- Three optimized kits from one quiz — not a chat conversation
- Affiliate links on every product — actionable, not just informational
- Stays updated — weekly refresh pipeline already built (search.js, not yet active)

### The quiz (5 questions, one screen each)
1. **Goal** — Build strength / Lose weight / Get fit / Home gym setup
2. **Budget** — Under $300 / $300–$800 / $800–$2,000 / $2,000+
3. **Space** — Apartment corner / Small room / Garage / Outdoor
4. **Equipment count** — 1–2 key pieces / Small setup (3–5) / Full home gym
5. **What you own** — Multi-select chips: Barbell, Dumbbells, Bench, Rack, Cardio, Nothing

### Result page
- Three cards side by side: **Best Value** / **Best Match** / **Best Quality**
- Default: Best Match selected and expanded
- Expanded card shows: kit name, total price, 4–6 product cards, 2-sentence AI explanation, affiliate buy buttons
- "Swap a product" per card, "Compare these" shortcut into comparison tool
- Mobile: tabs instead of side-by-side

### AI stack
- **Kit generation:** Groq (Llama 3.3 70B) — free, fast, structured JSON output
- **Comparison verdicts:** Keep Anthropic Claude (already wired in backend)
- One Groq call returns all 3 kits simultaneously — no extra calls per tier

### Design direction
- **Inspiration:** Whoop.com — dark hero, bold typography, premium feel
- **But:** simpler. Cut noise. Reduce friction. Maximum clarity.
- **Components:** 21st.dev prompts for UI components
- **Existing brand stays:** orange (#e8542a), navy (#0d1b35), off-white (#f8f7f5), Syne + DM Sans

### Tech stack (CHANGED from current)
- **Frontend:** Next.js — rebuild from static HTML (needed for quiz transitions, 21st.dev components)
- **Backend:** Keep Node.js/Express on Render — add `/api/kit` route for Groq kit generation
- **Deploy:** Vercel (same as now, auto-deploy on push)
- **Free API constraint:** Groq free tier for kit builder, Anthropic for comparisons

## Permission model
- State what you're about to do before writing/acting
- Never commit API keys or secrets to any file
- Always keep apiFetch() wrapper — all API calls go through it with X-Site-Key header

## Build order — do not skip phases

### Phase 1 — Next.js foundation
- [x] Init Next.js project, port design system (CSS tokens, fonts, logo)
- [x] Homepage with dark hero + "Start Quiz" CTA
- [ ] Deploy to Vercel, confirm gymgearcompare.com still resolves (branch not pushed yet)

### Phase 2 — Quiz flow (done 2026-06-11, on nextjs-rebuild)
- [x] 5-screen quiz with animated transitions (one question per screen)
- [x] Progress indicator
- [x] Quiz state management (store answers, navigate back/forward)
- [x] "Building your kit..." loading screen
- Answers persist to sessionStorage under `gymgear.quiz.v1` (stable option ids in `src/lib/quiz.ts`) — Phase 3 reads this to call /api/kit, and swaps the fixed timer in BuildingScreen for the real request

### Phase 3 — Kit generation (done, on nextjs-rebuild + backend kit-endpoint)
- [x] `POST /api/kit` on the Express backend — deterministic cart builder owns product selection (budget/space/owned-aware), Groq (Llama 3.3 70B) writes only the kit name + description so it can never produce a bad cart; templated copy fallback when no key/API error
- [x] Server validates + hydrates product ids, owns all price data
- [x] Each kit: { type, name, description, products[], totalPrice }; three distinct tiers (value=cheapest decent, match=best-rated, quality=best-built)
- [x] Wire frontend result page to backend (lib/api.ts apiFetch + requestKit, lib/kit.ts types)

### Phase 4 — Result page (done, on nextjs-rebuild)
- [x] Three kit cards (Best Value / Best Match / Best Quality)
- [x] Desktop: all three side by side, Best Match elevated + "Recommended" badge (chose this over expand/collapse — the whole comparison stays visible)
- [x] Product cards with price, sale strikethrough, rating, affiliate-first buy link
- [x] Swap product UX (SwapModal, reuses /api/products/:cat, recomputes total)
- [x] Mobile: tab layout
- [ ] Compare shortcut — deferred to Phase 5 (needs the comparison tool to exist first)

### Phase 5 — Polish + SEO
- [x] Port comparison tool to Next.js — `/compare` is the real tool: grouped category browse → select 2–4 → side-by-side spec matrix (cheapest + best-quality highlighted) + best-value verdict + Buy links + detail panel (CompareTool.tsx)
- [ ] "Compare these" shortcut from a kit — deferred: kit products are cross-category, so they don't share a spec matrix; the standalone tool compares within one category
- [ ] Product pages for SEO (e.g. /compare/rogue-ohio-vs-eleiko)
- [ ] Activate weekly-refresh.yml (real pricing)
- [ ] Social sharing for kit results
- [ ] Real product images (once Amazon PA API approved)

### Phase 6 — Traffic
- [ ] Reddit posts (r/homegym, r/Fitness)
- [ ] TikTok/Reels comparison videos using live site
- [ ] Google SEO articles ("Best home gym under $500 2026")

## Current state of the repo

### What exists (working, live)
- gymgearcompare.com — live on Vercel
- index.html — homepage (hero, 3 category cards, how it works)
- app.html — comparison app (160 products, 20 categories, AI verdict)
- sponsors.html — brand partnership page with Formspree contact form
- server.js / render-server.js — Express backend on Render with all 160 products hardcoded
- Amazon Associates tag active (gymgearcompar-20)
- Google Analytics (G-SY0CTG82TB) + AdSense wired

### What doesn't work yet
- Weekly price refresh (search.js exists but GitHub Action not active)
- Real product images (using emoji — waiting for Amazon PA API approval at 3 sales)
- Affiliate URLs mostly empty (applications in progress)
- Kit builder (not built yet — Phase 3)

## Key files

### Frontend (C:\Users\nirka\Documents\gymgear-frontend-final)
- `index.html` — homepage
- `app.html` — comparison tool
- `sponsors.html` — partnership page
- `CLAUDE.md` — full technical briefing (read this for implementation details)
- `CONTEXT.md` — this file (decisions + roadmap)

### Backend (C:\Users\nirka\Documents\gymgear-backend-new)
- `render-server.js` — main server (all 160 products + API routes)
- `search.js` — weekly AI refresh script (not active)
- `weekly-refresh.yml` — GitHub Action for refresh (not active)

### Live URLs
- Frontend: https://gymgearcompare.com
- Backend: https://gymgear-backend5.onrender.com
- GitHub Frontend: https://github.com/starcrock7-lab/gymgear-frontend5
- GitHub Backend: https://github.com/starcrock7-lab/GYMGEAR-BACKEND5

## Services
| Service | Purpose | Status |
|---|---|---|
| Vercel | Frontend hosting + domain | Active |
| Render.com | Backend hosting (free, sleeps 15min) | Active |
| Groq | Kit generation (Llama 3.3 70B) | Free, to be added |
| Anthropic | Comparison verdicts | Active (Tier 1) |
| Amazon Associates | Affiliate links | Active, tag: gymgearcompar-20 |
| Google AdSense | Display ads | Wired, not yet approved |
| Formspree | Sponsor contact form | Active |

## Important rules
- Never add SITE_KEY or ANTHROPIC_API_KEY to any file — Render env vars only
- Git email must be starcrock7@gmail.com for Vercel to accept deploys
- Both repos are public (required for Vercel free tier)
- apiFetch() wrapper must be preserved — all calls go through it with X-Site-Key header
- JS in app.html has been corrupted before by bad edits — always syntax check after changes
- PROD_IMGS, CAT_IMGS, getProdImg must each appear exactly once in app.html
