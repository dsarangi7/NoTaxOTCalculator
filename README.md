# NoTaxOTCalculator

**Brand:** NoTaxOTCalculator · **Domain candidate:** [notaxotcalc.com](https://notaxotcalc.com)

Production Astro **static** site for Schedule 1-A **No Tax on Overtime** and **No Tax on Tips** federal *income-tax deduction* estimates.

> Educational only. Not tax advice. Not affiliated with IRS / TurboTax. **FICA still applies.**

Reference MVP (keep; do not delete): `/workspace/no-tax-overtime-calculator/`

---

## Stack

- Astro (`output: 'static'`)
- Tailwind CSS **v4** (`@tailwindcss/vite`)
- TypeScript math: `src/lib/schedule1a.ts` (ported C1–C4 from Dwight-cleared `calc.js`)
- `@astrojs/sitemap`
- Design: `DESIGN.md` from `npx getdesign@latest add vercel` (black/white, Geist)
- Skills installed: `web-design-guidelines`, `tailwind-4-docs` under `.agents/skills/`

---

## Local development

```bash
cd /workspace/notaxotcalc
npm i
npm run test:golden   # must pass
npm run dev           # http://localhost:4321
```

Production preview:

```bash
npm run build && npm run preview
```

Golden math (Dwight-cleared):

| Case | Expected |
|------|----------|
| Single $20×10 hrs MAGI 140k | **$100** |
| Single premium $8k MAGI 155500 | **$7,500** |
| Tips MFJ $28k MAGI 302400 | **$24,800** |
| FLSA No / Not sure | **$0** (Mode A+B blocked) |

---

## C1–C4 preserved

| ID | Behavior |
|----|----------|
| **C1** | Mode A: FLSA regular-rate labeling; known vs simple hourly estimate; estimate-only banner; Mode B preferred (esp. TY2025) |
| **C2** | FLSA §7 Yes/No/Not sure; unanswered → warn + $0; No/Not sure → $0 and block Mode A+B |
| **C3** | FICA/payroll callout under H1 **and** results (OT + Tips); income-tax deduction only |
| **C4** | TY2025 reporting-gap panel + Mode B nudge; 2026+ note; sunset after 2028 |

Math: premium `0.5 × FLSA_regular_rate × OT_hours`; phaseout `floor(excess/1000)*100`; caps OT $12.5k/$25k MFJ; Tips $25k/return; MAGI $150k/$300k; MFS ineligible.

---

## Environment

Copy `.env.example`:

```bash
PUBLIC_SITE_URL=https://notaxotcalc.com
PUBLIC_GA4_ID=          # set only when ready, e.g. G-XXXXXXXXXX
```

- Canonical + OG + sitemap use `PUBLIC_SITE_URL` / `astro.config` `site`.
- GA4 script injects **only if** `PUBLIC_GA4_ID` is set.
- **No AdSense** / no `adsbygoogle` for 2–3 months (office lock). Do not leave empty visible ad slots.

---

## Deploy — Cloudflare Pages (static Astro, NOT Workers)

Follow: [Astro → Cloudflare](https://docs.astro.build/en/guides/deploy/cloudflare/)

### A) Dashboard (recommended first time)

1. Push this repo (or connect the folder) to GitHub/GitLab.
2. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → Connect repo.
3. Build settings:
   - **Framework preset:** Astro (or None)
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Node version:** `22` (or `22.12.0+`)
4. Environment variables (Production + Preview):
   - `PUBLIC_SITE_URL` = `https://notaxotcalc.com` (production) or leave default
   - `PUBLIC_GA4_ID` = your GA4 id when ready
5. Deploy. Confirm `*.pages.dev` URL loads.

### B) Wrangler CLI (after `wrangler login` on the deploy machine)

```bash
npm run pages:deploy
# equivalent: npm run build && wrangler pages deploy dist --project-name=notaxotcalc
```

> This workspace intentionally does **not** run wrangler auth. Scripts are prepared; Dibya/Chan authenticate locally or in CI.

### Custom domain + noindex on pages.dev

1. Pages project → **Custom domains** → add `notaxotcalc.com` (+ `www` if desired).
2. `public/_headers` already sends `X-Robots-Tag: noindex, nofollow` for `https://:project.pages.dev/*` so preview URLs stay out of the index once the custom domain is live.
3. Confirm production host is indexed; preview host is not.

### Security headers

`public/_headers` sets `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`.

---

## Email routing (Cloudflare → Gmail)

Dibya configures DNS after domain attach:

1. Cloudflare Dashboard → domain → **Email** → **Email Routing** → Enable.
2. Create destination address (Gmail) and verify.
3. Add route: the future branded contact address → the project Gmail (and any aliases needed).
4. Cloudflare will prompt for MX / SPF records — accept/add them.
5. Test send from an external mailbox.

The Contact page currently uses the temporary address `dsarangi7@gmail.com`; replace it with the branded domain address when email routing is ready.

---

## GA4 / Search Console

1. Create GA4 property → Measurement ID → set `PUBLIC_GA4_ID` in Pages env → redeploy.
2. Google Search Console + Bing Webmaster: verify domain (DNS TXT) once custom domain is live.
3. **No AdSense** until office unlock (2–3 months monitor-only).

---

## Project map

```
src/lib/schedule1a.ts     # C1–C4 math (source of truth for TS)
src/components/           # OtCalculator, TipsCalculator, FAQ, chrome
src/pages/                # /, /tips/, /about/, /privacy/, /terms/, /contact/, 404, 500
public/_headers           # CF Pages headers
public/robots.txt
public/icons/             # favicon set + android chrome
tests/golden.mjs          # golden math harness
DESIGN.md                 # Vercel/Geist design system
```

---

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Local dev server |
| `npm run build` | Static build → `dist/` |
| `npm run preview` | Preview `dist/` |
| `npm run test:golden` | Golden math |
| `npm run pages:deploy` | Build + `wrangler pages deploy dist` |
| `npm run favicons` | Regenerate favicon/OG assets |

---

## Done criteria checklist

- [x] `output: 'static'`
- [x] Tailwind v4 + DESIGN.md
- [x] Skills installed (web-design-guidelines, tailwind-4-docs)
- [x] C1–C4 + golden math
- [x] Pages: `/`, `/tips/`, legal, 404/500
- [x] FAQ JSON-LD, sitemap, robots, `_headers`
- [x] Favicon set (ico/svg/png/apple/android)
- [x] README deploy docs (no wrangler auth in this workspace)
- [x] No AdSense / no empty ad slots
