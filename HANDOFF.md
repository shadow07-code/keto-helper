# KetoHelper — Handoff

_Last updated: 2026-06-07 · Latest commit: `c5bce72` · Live: https://ketohelper.vercel.app_

A keto-diet companion PWA, redesigned into an **intelligent, game-first "Ketosis Journey"**:
a personalized metabolic meter + an AI coach, with AI meal analysis as the core daily action.
Next.js 15 (App Router) · TypeScript · Tailwind · Recharts · Anthropic SDK. All user data is
client-side `localStorage` (no DB).

> For the detailed architecture, read [`CLAUDE.md`](CLAUDE.md). This file is the **state + context**
> handoff: where things are, why, the gotchas, and what's next.

---

## Current state (what's shipped & deployed)

- **Phase 5 — game-first redesign** (commit `4726900`): dark theme app-wide, Journey hub home,
  raised-center "Fuel ⊕" nav, KetoMeter speedometer, XP/levels, missions, keto-flu forecast,
  hydration/body-cue cards, achievement badges. Progress page cut 2 charts, added the ketosis-level
  journey curve.
- **Comeback-timing fix + wine accent** (commit `f0bd0ec`): same-day carb-over no longer says
  "comeback today" (that's impossible) — it shows **Damage control** today / **Comeback** tomorrow.
  Added a wine-red accent (`#B8344C`/`#D44866`/`#8B2238`) to **Today** and **Fuel** pages for variety.
- **Intelligence layer** (commit `c5bce72`, current): user profile → personalized metabolic model →
  AI coach. This is the headline feature. Details below.
- **Deployed**: Vercel project `keto_helper`, aliased to `ketohelper.vercel.app`, `ANTHROPIC_API_KEY`
  set on Preview + Production. Last deploy `READY`. GitHub `master` in sync.

---

## The intelligence layer (most important to understand)

The app moved from a deterministic streak engine to a **personalized physiological model + AI coach**.
Architecture is a deliberate **hybrid**:

- **Meter & XP = deterministic scientific model** (instant, offline, reliable, no jitter).
- **Coaching = AI** (interpretive, personal, cached) — never drives the needle directly.

### 1. Profile — `app/lib/profile.ts`
Stored at `keto_profile`. Fields: `name`, `heightCm`, `weightKg`, `ageBracket`, `sex`
(`male`/`female`/`neutral`). Derivations:
- **BMR** via Mifflin–St Jeor (age-bracket midpoint; sex constant +5/−161/−78).
- **TDEE** = BMR × 1.4 (lightly active).
- **Glycogen capacity** ≈ 6.5 g/kg, bounded 300–650 g.
- Body fields optional → fall back to population averages (`effectiveBMR`=1600, capacity=450g) and
  the model/coach mark themselves non-personalized / lower confidence.

### 2. Metabolic meter — `computeKetosisModel(journey, groups, profile?)` in `app/lib/ketosis.ts`
A **day-by-day glycogen-depletion + fat-adaptation simulation**:
- Carbs **refill** glycogen; metabolism (scaled by BMR) **burns** ~32%/day of capacity on a near-zero
  carb day; fat-adaptation builds asymptotically while genuinely in ketosis, decays otherwise.
- Displayed `level` = `0.6·(100−glyPct) + 0.4·adaptation`, with a `×0.65` dip on a carb-over day.
- `dayQuality(totals)` → 0–1 per day from **carbs (55%) + fat ratio (30%) + protein moderation (15%)**.
- A 95 kg vs 55 kg person logging identical meals now get **different** trajectories. The old fixed
  `LEVEL_ANCHORS` curve was removed.
- Model exposes `glyPct`, `adaptation`, `avgQuality`, `personalized`. Streak still exists but only
  drives badges/missions now, not the needle.
- **XP is quality-weighted**: `computeProgress` rewards clean days more than borderline ones.

### 3. AI coach — `/api/coach` + `app/lib/coach.ts` + `app/components/CoachCard.tsx`
- Route calls Claude `claude-sonnet-4-6` with profile + model + recent logs → returns
  `{ focus, state_estimate, confidence, assessment, reasoning, guidance[] }`, addressed by name,
  with an **estimated** ketone range. Explicitly honest it's not a substitute for a ketone meter.
- `coach.ts` builds the payload and **caches per-day** at `keto_coach_cache`, keyed by a djb2 hash of
  the salient data — only re-queries when something material changes (new meal, streak shift, manual ↻).
- `CoachCard` paints cached data instantly, refreshes in the background, has a manual refresh + graceful
  error fallback. It's the visual centrepiece of the Journey hub.

---

## Information architecture

Bottom nav (4 slots, raised center): **Journey (`/`) · Today (`/today`) · ⊕ Fuel (`/analyse`) · Progress (`/past`)**

| Route | File | Role |
|---|---|---|
| `/` | `app/page.tsx` | Journey hub: greeting by name, KetoMeter, **CoachCard**, XP, mission, flu, hydration, badges, profile/reset controls |
| `/today` | `app/today/page.tsx` | Today's meals + mission/flu/hydration strip + macro bar + tips (wine accent) |
| `/analyse` | `app/analyse/page.tsx` | Meal analysis + photo upload → "Log & Earn XP" (wine accent) |
| `/past` | `app/past/page.tsx` | Ketosis-level journey curve + Net Carbs / Macro% / Keto-Score charts + achievements |

API routes: `/api/analyze`, `/api/vision`, `/api/coach` (all POST, all use `ANTHROPIC_API_KEY`,
share `app/api/_rateLimit.ts` — in-memory, **not** multi-instance safe on Vercel; replace with Upstash
before real multi-user load).

### localStorage keys
- `keto_meal_history` — meal log (`app/lib/history.ts`)
- `keto_journey` — start date, seedStreak (backdate), seenAchievements, hydration map
- `keto_profile` — user profile (`app/lib/profile.ts`)
- `keto_coach_cache` — per-day cached coaching
- `keto_a2hs_dismissed` — Add-to-Home-Screen dismissal

---

## Critical gotchas (don't relearn these the hard way)

1. **NavBar is 100% inline styles.** Tailwind purging made the nav vanish in builds. Do NOT convert
   to classes. Same defensive inline-style approach is used for the meter, cards, and nav.
2. **Flex ratios use inline `style={{ flex: '2 1 0%' }}`**, never Tailwind arbitrary values
   (`flex-[2]`) — they got purged and destroyed the input/camera layout.
3. **Hidden file inputs use inline `style={{ display: 'none' }}`**, never the Tailwind `hidden` class,
   and must sit **outside** the flex row.
4. **Vercel 4.5 MB request-body limit** + base64 inflation (~33%) broke photo upload. Fixed with
   client-side Canvas compression targeting 2.5 MB (`compressImage` in `app/analyse/page.tsx`).
5. **The home page is a client component** rendering from `localStorage` — SSR shows only the K loader,
   real content hydrates client-side. So `curl`-ing the homepage won't show onboarding copy; that's
   expected, not a deploy failure. (Confirm new code via `/api/coach` returning 405 on GET.)
6. **Preview screenshot flakiness**: in recent sessions the Claude Preview screenshot tool wedged
   mid-session (RAF paused, captures time out) even though `preview_eval` kept working. Verify via DOM
   (`preview_eval` reading `innerText`/computed styles) and just open the site in a real browser.
   `innerText` reflects CSS `text-transform`, so uppercase eyebrows read as UPPERCASE — search
   case-insensitively.

---

## Build / run / deploy

```bash
npm run dev      # localhost:3000 (Claude Preview launch config: "KetoHelper Next.js")
npm run build    # must stay clean — run after every change
vercel deploy --prod --yes   # CLI authenticated as antonysajan-9019; dir linked to project keto_helper
```
- GitHub: `https://github.com/shadow07-code/keto-helper.git` (branch `master`).
- Requires `ANTHROPIC_API_KEY` in `.env.local` locally; already set on Vercel Preview+Production.
- No test suite.

### Seed snippet for manual QA (paste in browser console / preview_eval)
Creates an 8-day journey + profile so the meter, charts, and coach have real data:
```js
const DAY=864e5, now=Date.now(), sd=o=>{const d=new Date(now);d.setDate(d.getDate()-o);d.setHours(8,0,0,0);return d.getTime()};
const plan=[[7,[['oatmeal & banana',65,2],['pizza',45,1]]],[6,[['eggs & avocado',4,9],['chicken',6,9]]],[5,[['bacon & eggs',2,10],['salmon',5,9]]],[4,[['omelette',3,10],['ribeye',1,10]]],[3,[['avocado feta',5,9],['cauliflower',6,9]]],[2,[['eggs',2,10],['salmon',1,10]]],[1,[['eggs benedict',4,9],['lamb',5,9]]],[0,[['avocado & eggs',4,9]]]];
let id=1,meals=[];for(const[o,l]of plan){const b=sd(o);l.forEach((m,i)=>{const[n,c,s]=m;meals.push({id:String(id++),timestamp:b+i*3*36e5,food_name:n,quantity_display:'200g',keto_score:s,per_quantity:{calories:400,fat_g:32,protein_g:22,carbs_g:c+3,net_carbs_g:c,fiber_g:3}})})}
localStorage.setItem('keto_meal_history',JSON.stringify(meals));
localStorage.setItem('keto_journey',JSON.stringify({startDate:new Date(now-8*DAY).toDateString(),seedStreak:0,restartHistory:[],seenAchievements:[],hydration:{}}));
localStorage.setItem('keto_profile',JSON.stringify({name:'Antony',heightCm:178,weightKg:75,ageBracket:'25-30',sex:'male'}));
localStorage.removeItem('keto_coach_cache');location.href='/';
```

---

## Known issues & next ideas

- **Rate limiter is in-memory** → ineffective across Vercel instances. Upstash Redis before multi-user.
- **No auth / multi-device sync** — everything is local to one browser. A backend would unlock
  cross-device journeys and real accounts.
- **Coach cost/latency**: one Claude call per material change per day (cached). Fine for single-user;
  watch token spend if it scales.
- **Ketone estimates are modeled, not measured** — intentionally framed as estimates. A logical next
  step is optional manual entry of real blood/breath ketone readings to calibrate the model.
- **Possible enhancements**: weekly AI recap, electrolyte/water reminders as push notifications,
  exercise input feeding glycogen depletion, weight-trend tracking vs the glycogen-water model.
- **`unitless` profile** — only metric (cm/kg). Add imperial toggle if users ask.
