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

Next.js 15 App Router, TypeScript, Tailwind CSS, Recharts. **Game-first design** — the home screen is a gamified "Ketosis Journey" hub; meal analysis is the core daily action accessible via a raised center nav button.

### Information Architecture (nav with raised center Fuel button)

| Slot | Route | File | Purpose |
|---|---|---|---|
| **Journey** | `/` | `app/page.tsx` | Game hub: Keto Meter, XP/level, missions, flu forecast, body cues, hydration, badges |
| **Today** | `/today` | `app/today/page.tsx` | Today's meals + mission + flu/hydration strip + macro bar + smart tips |
| **⊕ Fuel** (raised center) | `/analyse` | `app/analyse/page.tsx` | Core action: food analysis + photo upload → AI → results → "Log & Earn XP" |
| **Progress** | `/past` | `app/past/page.tsx` | Journey timeline (ketosis level curve) + Net Carbs/Macro%/Keto Score charts + achievements + day summaries |

`app/layout.tsx` renders `<NavBar>` (fixed bottom, 64px) globally. Body has `pb-[64px]` clearance. The center Fuel button is a raised gold circle (`marginTop: -18px`).

### Game engine — `app/lib/ketosis.ts`

All game state derives from `keto_meal_history` + a small `keto_journey` anchor in localStorage. Stored state is minimal; everything else is computed. Key exports:

- `Journey` interface + `loadJourney()`, `startJourney(backdateDays)`, `resetJourney()`, `markAchievementsSeen()`, `setHydration()`, `getHydration()`
- `KETO_CARB_LIMIT = 25` g net carbs/day for a "compliant" day
- `computeKetosisModel(journey, groups)` — walks day-by-day from startDate, classifies compliant/broken/unlogged, maintains streak/level/momentum via physiology-anchored `LEVEL_ANCHORS` curve
- `predictKetoFlu(model)` — active on days 2–5 of genuine fresh transition, peaks 3–4
- `dailyMission(model, todayTotals, todayMealCount)` — phase-tuned daily carb targets
- `dailyBodyCue(model)` — science narrative with hydration targets + supplement recommendations
- `computeProgress(model, allMeals, achievements)` — XP/levels (6 titles: Carb Dependent → Fat-Adapted Master)
- `computeAchievements(model, allMeals)` — 9 achievement badges
- `buildGameState()` — convenience aggregator, returns full `GameState | null`

### Game UI components (`app/components/`)

| Component | Purpose |
|---|---|
| `KetoMeter.tsx` | Hero semicircular SVG gauge, 5 zone arcs, animated needle |
| `XpBar.tsx` | Level title + gold progress bar + "X XP to next" |
| `MissionCard.tsx` | Today's mission text + live progress bar (net carbs vs target) |
| `FluForecast.tsx` | Flu-watch card with status/severity pills, mitigation tips |
| `HydrationCard.tsx` | Day's water target, tap-to-track glasses counter, supplement chips |
| `BadgeShelf.tsx` | Responsive grid of achievement badges with NEW flash |
| `StreakFlame.tsx` | Flame + streak count (sm/lg variants) |
| `OnboardingHero.tsx` | Two-path start: "Starting keto today" vs "Already on keto" + duration picker |

### API routes

- **`/api/analyze`** — POST `{ food_input: string }` → full `NutritionData` JSON. Calls `claude-sonnet-4-6` with a structured keto-scoring prompt. Returns per-100g and per-quantity macros, keto score 1–10, recommendation, and keto alternatives when score ≤ 6.
- **`/api/vision`** — POST `{ image_data: string (base64), media_type: string }` → `{ detected_food, estimated_weight_g, confidence }`. Client compresses images to ~2.5 MB via Canvas API before upload (Vercel 4.5 MB body limit).

Both routes share `app/api/_rateLimit.ts` — in-memory rate limiter (20 req/min per IP). **Does not work on Vercel** (serverless instances). Replace with Upstash Redis before multi-user deployment.

### Shared state — `app/lib/history.ts`

All meal data lives in `localStorage` under key `keto_meal_history`. No database. Key exports: `MealEntry`, `MacroValues`, `DayGroup`, `loadHistory()`, `saveEntry()`, `groupByDay()`, `dayTotals()`, `macroPct()`, `avgKetoScore()`, `generateTips()`, `generateObservations()`, `updateEntry()`, `deleteEntry()`, `generateSummaryText()`.

### Styling conventions — DARK THEME

**Full dark reskin** across all pages. Body background: `#14201A` (near-black green).

**Dark palette tokens** (in `tailwind.config.ts`):
- `ink` (#14201A) — app background
- `ink-raised` (#1E2E26) — cards / panels
- `ink-line` (#2C4036) — borders / hairlines
- `gold` (#C9A84C) — primary accent
- `gold-bright` (#E6C24A) — glowing highlights, meter needle, active states
- `text-hi` (#F3EEE2) — primary text (warm off-white)
- `text-lo` (#8FA396) — muted text

**Critical layout rules** (learned from production breakage):
- **NavBar uses 100% inline styles** — Tailwind purging has caused the nav to disappear. Do NOT convert to CSS classes.
- **Flex ratios MUST use inline `style={{ flex: '2 1 0%' }}`** — not Tailwind arbitrary values (purge risk).
- **Hidden file inputs MUST use `style={{ display: 'none' }}`** — not Tailwind `hidden` class. Place them OUTSIDE flex containers.

Fonts: `--font-playfair` (headings) + `--font-lato` (body) via CSS variables.

### Charts (Recharts, dark themed)

Progress page renders 4 charts with dark theming (grid `#2C4036`, ticks `#8FA396`, dark tooltip `#1E2E26`):
1. **Ketosis Level over time** — hero area chart with zone reference bands (NEW)
2. Net Carbs line chart — 20g reference line
3. Macro % stacked area chart
4. Keto Score bar chart — bars colored by `scoreColor()`

Removed in Phase 5: Calories line chart, Daily Macros grams bar chart.

### PWA / Add to Home Screen

`public/manifest.json` + `public/icon.svg` make the app installable. `AddToHomeScreen` component renders on the Journey hub page.
