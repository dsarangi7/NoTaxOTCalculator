# OpenCode / local agent handoff — NoTaxOTCalculator

You are continuing a **static Astro** US tax **estimator** site (not tax software).

## Product
- **Name:** NoTaxOTCalculator
- **Primary domain (preferred):** `notaxotcalculator.com` (optional short redirect: `notaxotcalc.com`)
- **Purpose:** Free Schedule 1-A style estimators for **No Tax on Overtime** and **No Tax on Tips** (federal income-tax deduction estimates only).
- **Monetization:** No AdSense for 2–3 months. GA4 + Google Search Console + Bing Webmaster only. Set `PUBLIC_GA4_ID` in `.env` when ready (see `.env.example`).

## Hard product rules (do not regress)
Dwight cleared these (C1–C4). Keep golden tests green (`npm run test:golden`):
1. FLSA **regular rate** labeling; Mode A known vs estimate-only; nudge Mode B when needed
2. FLSA §7 Yes/No/Not sure gate — No/Not sure → **$0** deduction
3. Branding: **federal income-tax deduction only**; **FICA/Medicare still taxed**
4. TY2025 W-2 reporting gap panel; Mode B preferred; 2026+ note
5. Caps/phaseouts: OT $12,500 / $25,000 MFJ; Tips $25,000; MAGI thresholds $150k / $300k MFJ; phaseout floor((MAGI−threshold)/1000)×$100
6. Premium-only OT: `0.5 × regular_rate × OT_hours` (not total OT pay)
7. Big disclaimer: educational estimate, not tax advice, not IRS/TurboTax

Golden examples that must keep passing: **$100 / $7,500 / $24,800** (see `tests/golden.mjs` + README).

## Stack
- Astro static (`output: 'static'`)
- Tailwind CSS v4 via `@tailwindcss/vite`
- Math: `src/lib/schedule1a.ts`
- Sitemap: `@astrojs/sitemap`
- Design notes: `DESIGN.md` (Vercel-style)
- Skills refs: `.agents/skills/` (web-design-guidelines, tailwind-4-docs)

## Local setup (VS Code)
```bash
cd notaxotcalc   # unzip root folder name may be notaxotcalc
npm i
npm run test:golden
npm run dev      # http://localhost:4321
npm run build && npm run preview
```
Node **≥ 22.12** recommended (`package.json` engines).

## Deploy (Cloudflare Pages — not Workers)
```bash
npx wrangler login   # once
npm run pages:deploy
```
- Site is **static** → **Pages**, not Workers.
- `public/_headers` noindexes `*.pages.dev` — after custom domain, keep that.
- Point DNS for `notaxotcalculator.com` to Cloudflare Pages.
- Mail routing Cloudflare → Gmail: configure in CF dashboard (not in this repo).

## Key paths
| Path | Role |
|------|------|
| `src/pages/index.astro` | OT calculator + SEO copy |
| `src/pages/tips.astro` | Tips twin |
| `src/pages/about.astro`, `privacy.astro`, `terms.astro`, `contact.astro` | Legal/info |
| `src/pages/404.astro` | Error page |
| `src/lib/schedule1a.ts` | Deduction math |
| `tests/golden.mjs` | Regression math |
| `public/favicon*` / `public/icons/` | Green **nt** brand |
| `public/_headers` | CF Pages headers |
| `public/robots.txt` | Crawl rules |
| `.env.example` | GA4 placeholder |

## Competitors (context only)
- notaxovertimecalculator.com (strong OT SERP)
- nationaltaxtools.com (tips #1-ish)
- TurboTax blog calculators
Differentiate on correct premium-only math, FLSA gate, FICA honesty, mobile UX — not fake “#1” claims.

## Suggested next agent tasks
1. Confirm site URL / canonical for `notaxotcalculator.com` in config
2. Add real `PUBLIC_GA4_ID` when Dibya provides it
3. Cloudflare Pages deploy + custom domain + GSC/Bing verify
4. Optional: improve OG image text branding
5. Later products (do not mix into this repo unless asked): freight class calc, construction hub

## Do not
- Add AdSense until Dibya says so
- Claim tax advice / guaranteed refunds
- Delete or weaken golden tests
- Switch to Workers for this static site
