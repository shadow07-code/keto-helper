# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server at http://localhost:3000
npm run build    # Production build
npm run lint     # ESLint via next lint
```

No test suite is configured.

## Environment

Requires `ANTHROPIC_API_KEY` in `.env.local` at the project root. Both API routes fail without it.

## Architecture

Next.js 15 App Router, TypeScript, Tailwind CSS, Recharts. Three client-side pages backed by two server-side API routes.

### Pages (app router, each a client component)

| Route | File | Purpose |
|---|---|---|
| `/` | `app/page.tsx` | Food input + photo upload → AI analysis → results + auto-save |
| `/today` | `app/today/page.tsx` | Today's meals from localStorage, macro bar, smart tips |
| `/past` | `app/past/page.tsx` | Full history, Recharts trend charts, smart observations |

`app/layout.tsx` renders `<NavBar>` (fixed bottom, 64px) globally. Body has `pb-[64px]` clearance.

### API routes

- **`/api/analyze`** — POST `{ food_input: string }` → full `NutritionData` JSON. Calls `claude-sonnet-4-6` with a structured keto-scoring prompt. Returns per-100g and per-quantity macros, keto score 1–10, recommendation, and keto alternatives when score ≤ 6. Validates all returned numeric fields (clamps negatives, NaN, Infinity).
- **`/api/vision`** — POST `{ image_data: string (base64), media_type: string }` → `{ detected_food, estimated_weight_g, confidence }`. Used to pre-fill the food input from a photo. Client rejects files over 5 MB before upload.

Both routes share `app/api/_rateLimit.ts` — an **in-memory** rate limiter (20 req/min per IP). **This does not work on Vercel** (each serverless invocation may get a fresh instance). Replace with Upstash Redis + `@upstash/ratelimit` before multi-user deployment.

### Shared state — `app/lib/history.ts`

All meal data lives in `localStorage` under key `keto_meal_history`. No database. Key exports:

- `MealEntry` / `MacroValues` — shared types used across all three pages
- `saveEntry(entry)` — prepends and persists; called in `page.tsx` after every successful analysis
- `groupByDay()` → `DayGroup[]` — groups entries by calendar day, newest first
- `dayTotals()`, `macroPct()`, `avgKetoScore()` — aggregation helpers
- `generateTips()` — rule-based smart tips for the Today tab (net carbs vs 20g limit, fat %, protein %, avg score)
- `generateObservations()` — trend observations for the Past tab (streak, 7-day avg, best day, carb trend)

### Styling conventions

**NavBar uses 100% inline styles** (not Tailwind classes) to guarantee rendering — Tailwind purging caused the nav to disappear in some builds. Do not convert it to CSS classes.

Custom Tailwind colors (defined in `tailwind.config.ts`):
- `cream` (#FAF6EF) — page background
- `green-rich` (#2D4A3E) — header/primary dark green
- `gold` (#C9A84C) — fat macro, active nav indicator
- `carbs` (#D4714A) — carbs macro / warning color
- `protein` (#4A7C59) — protein macro / success color

Fonts loaded via `next/font/google`: `--font-playfair` (headings) and `--font-lato` (body), applied as CSS variables in `app/layout.tsx`.

### Charts (Recharts)

Past Meals page renders 5 charts — all wrapped in `<ResponsiveContainer width="100%" height={160}>`:
1. Net Carbs line chart — 20g reference line
2. Calories line chart — 1800 kcal reference line
3. Macro % stacked area chart
4. Keto Score bar chart — bars colored by `scoreColor()` (green/gold/red)
5. Daily Macros grams stacked bar chart

Charts only render when `chartData.length >= 2` (i.e. data from at least 2 different calendar days).

### PWA / Add to Home Screen

`public/manifest.json` + `public/icon.svg` make the app installable. Meta tags are set via Next.js `metadata.appleWebApp` in `app/layout.tsx`.

`app/components/AddToHomeScreen.tsx` renders a pill button at the top-right of the Analyse page:
- **Android/Chrome** — captures `beforeinstallprompt`, triggers native install sheet on click. Only fires over HTTPS, so the button is invisible in local dev.
- **iOS Safari** — detects via user-agent, shows a tooltip with Share → "Add to Home Screen" instructions.
- Hides permanently if already in standalone mode or if the user dismisses it (flag stored under `keto_a2hs_dismissed` in localStorage).
