// ─── The Ketosis Engine ───────────────────────────────────────────────
// Reconstructs the body's metabolic state from logged meal history + an
// explicit journey anchor, and powers the whole game layer: the Keto Meter,
// keto-flu forecast, daily missions, body-cue narrative, XP/levels, badges.
//
// Everything derives from `keto_meal_history` (via history.ts) + a small
// `keto_journey` anchor. Stored state is intentionally minimal and robust.

import {
  loadHistory, groupByDay, dayTotals, macroPct,
  type MealEntry, type MacroValues, type DayGroup,
} from './history'
import {
  loadProfile, effectiveBMR, glycogenCapacityG,
  type Profile,
} from './profile'

// ─── Constants ─────────────────────────────────────────────────────────

export const KETO_CARB_LIMIT = 25   // g net carbs/day for a "compliant" day
export const JOURNEY_KEY     = 'keto_journey'

export interface Phase { key: string; label: string; color: string; min: number; max: number }

export const PHASES: Phase[] = [
  { key: 'carb',    label: 'Carb Mode',           color: '#D4714A', min: 0,  max: 20  },
  { key: 'switch',  label: 'The Switch',          color: '#E08A4C', min: 20, max: 40  },
  { key: 'ignite',  label: 'Ignition',            color: '#E6C24A', min: 40, max: 60  },
  { key: 'ketosis', label: 'Nutritional Ketosis', color: '#5FA372', min: 60, max: 80  },
  { key: 'adapted', label: 'Fat-Adapted',         color: '#4ADE80', min: 80, max: 101 },
]

// XP level ladder
const LEVELS: { title: string; xp: number }[] = [
  { title: 'Carb Dependent',     xp: 0    },
  { title: 'Glycogen Burner',    xp: 300  },
  { title: 'Ketone Initiate',    xp: 800  },
  { title: 'Fat Burner',         xp: 1800 },
  { title: 'Keto Adept',         xp: 3500 },
  { title: 'Fat-Adapted Master', xp: 6000 },
]

// ─── Stored journey state ──────────────────────────────────────────────

export interface Journey {
  startDate: string                  // toDateString() of when tracking began
  seedStreak: number                 // 0 = fresh start; >0 = "already on keto" head-start
  restartHistory: string[]           // prior start dates after resets
  seenAchievements: string[]         // achievement ids already flashed as NEW
  hydration: Record<string, number>  // dateKey → glasses logged
}

function dayKey(d: Date): string { return d.toDateString() }

export function loadJourney(): Journey | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(JOURNEY_KEY)
    if (!raw) return null
    const j = JSON.parse(raw) as Partial<Journey>
    if (!j.startDate) return null
    return {
      startDate:        j.startDate,
      seedStreak:       j.seedStreak ?? 0,
      restartHistory:   j.restartHistory ?? [],
      seenAchievements: j.seenAchievements ?? [],
      hydration:        j.hydration ?? {},
    }
  } catch { return null }
}

function persist(j: Journey) {
  if (typeof window === 'undefined') return
  localStorage.setItem(JOURNEY_KEY, JSON.stringify(j))
}

/** Begin (or restart) a journey. `backdateDays` seeds the meter for people already on keto. */
export function startJourney(backdateDays = 0): Journey {
  const prev = loadJourney()
  const j: Journey = {
    startDate:        dayKey(new Date()),
    seedStreak:       Math.max(0, Math.round(backdateDays)),
    restartHistory:   prev ? [...prev.restartHistory, prev.startDate] : [],
    seenAchievements: prev?.seenAchievements ?? [],
    hydration:        prev?.hydration ?? {},
  }
  persist(j)
  return j
}

export function resetJourney(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(JOURNEY_KEY)
}

export function markAchievementsSeen(ids: string[]): void {
  const j = loadJourney()
  if (!j) return
  j.seenAchievements = Array.from(new Set([...j.seenAchievements, ...ids]))
  persist(j)
}

export function setHydration(dateKey: string, glasses: number): Journey | null {
  const j = loadJourney()
  if (!j) return null
  j.hydration = { ...j.hydration, [dateKey]: Math.max(0, glasses) }
  persist(j)
  return j
}

export function getHydration(dateKey: string): number {
  const j = loadJourney()
  return j?.hydration?.[dateKey] ?? 0
}

// ─── Curve + zone helpers ──────────────────────────────────────────────

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

export function ketoZone(level: number): Phase {
  return PHASES.find(p => level >= p.min && level < p.max) ?? PHASES[PHASES.length - 1]
}

// ─── The model ─────────────────────────────────────────────────────────

export type DayStatus = 'compliant' | 'broken' | 'unlogged'

export interface DayState {
  dateKey:  string
  dayIndex: number       // 1-based day of the journey
  status:   DayStatus
  netCarbs: number
  fatPct:   number       // % of kcal from fat (0 when unlogged)
  quality:  number | null// 0–1 ketogenic quality of the day (null if unlogged)
  glyPct:   number       // glycogen fullness 0–100 at end of this day
  level:    number       // 0–100 at end of this day
  streak:   number       // consecutive compliant days at end of this day
}

export interface KetosisModel {
  level:        number      // current ketosis level 0–100
  streak:       number      // current consecutive compliant days
  maxStreak:    number      // best streak ever in this journey
  phase:        Phase
  genuineStart: boolean     // fresh transition (seedStreak 0) → flu arc applies
  hadBreak:     boolean     // any broken day occurred
  daysSinceStart: number
  glyPct:       number      // current glycogen fullness 0–100 (low = deep ketosis)
  adaptation:   number      // current fat-adaptation memory 0–100
  avgQuality:   number | null // avg ketogenic quality over recent logged days
  personalized: boolean     // true when the model used real body data
  dayStates:    DayState[]
  levelHistory: { day: number; dateKey: string; level: number }[]
  streakStartIndex: number  // index in dayStates where the current streak began (-1 if none)
}

// ─── Per-day ketogenic quality ─────────────────────────────────────────
// Not all "compliant" days are equal. A 5 g-carb / 75%-fat day drives far
// deeper ketosis than a 24 g-carb / 45%-fat day. Quality (0–1) blends three
// signals and feeds both the metabolic sim and quality-weighted XP.

export interface MacroQuality {
  quality:      number   // 0–1 overall
  carbScore:    number   // 1 at 0g, 0 at ≥50g net carbs
  fatScore:     number   // 0 at ≤45% kcal, 1 at ≥70% kcal
  proteinScore: number   // 1 up to 35% kcal, penalised above (gluconeogenesis)
  fatPct:       number   // % of kcal from fat
  proteinPct:   number   // % of kcal from protein
}

export function dayQuality(totals: MacroValues): MacroQuality {
  const pct        = macroPct(totals)
  const fatFrac    = pct.fat_pct / 100
  const proteinFrac= pct.protein_pct / 100
  const carbScore    = clamp(1 - totals.net_carbs_g / 50, 0, 1)
  const fatScore     = clamp((fatFrac - 0.45) / 0.25, 0, 1)
  const proteinScore = proteinFrac <= 0.35 ? 1 : clamp(1 - (proteinFrac - 0.35) / 0.25, 0.3, 1)
  const quality = 0.55 * carbScore + 0.30 * fatScore + 0.15 * proteinScore
  return { quality, carbScore, fatScore, proteinScore, fatPct: pct.fat_pct, proteinPct: pct.protein_pct }
}

// Walks the journey day-by-day as a metabolic simulation. Each day, logged
// carbs refill glycogen while the body's metabolism (scaled by BMR) burns
// through it; fat-adaptation builds while genuinely in ketosis and decays
// otherwise. The displayed level blends glycogen depletion with adaptation,
// so the meter responds to *who the user is* and *what they actually ate* —
// not merely how many days in a row they stayed compliant.
export function computeKetosisModel(
  journey: Journey,
  groups: DayGroup[],
  profile: Profile | null = null,
): KetosisModel {
  const dayMap = new Map<string, MealEntry[]>(groups.map(g => [g.dateKey, g.meals]))

  const capG       = glycogenCapacityG(profile)   // personalised glycogen stores (g)
  const bmr        = effectiveBMR(profile)         // metabolic rate (kcal/day)
  const burnFactor = bmr / 1600                    // larger engine drains faster
  const BASE_BURN  = 32                            // % of capacity burned on a ~0-carb day

  const start = new Date(journey.startDate); start.setHours(0, 0, 0, 0)
  const today = new Date();                  today.setHours(0, 0, 0, 0)

  // Seed state from any "already on keto" head-start.
  const seed = journey.seedStreak
  let glyPct     = seed > 0 ? clamp(100 - Math.min(seed, 5) * 19, 4, 100) : 100
  let adaptation = seed > 0 ? clamp((Math.min(seed, 45) / 45) * 92, 0, 92) : 0
  let level      = clamp(0.6 * (100 - glyPct) + 0.4 * adaptation, 0, 100)

  let streak    = seed
  let maxStreak = seed
  let hadBreak  = false

  const dayStates: DayState[] = []
  const levelHistory: { day: number; dateKey: string; level: number }[] = []
  const qualitySamples: number[] = []

  let dayIndex = 0
  for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    dayIndex += 1
    const key   = d.toDateString()
    const meals = dayMap.get(key) ?? []

    let status: DayStatus
    let netCarbs = 0
    let quality: number | null = null
    let fatPct = 0

    if (meals.length === 0) {
      status = 'unlogged'
      // Unknown intake → assume a light refeed drift; adaptation eases off.
      glyPct = clamp(glyPct + 3, 0, 100)
      adaptation = Math.max(0, adaptation - 3)
    } else {
      const totals = dayTotals(meals)
      netCarbs = totals.net_carbs_g
      const q  = dayQuality(totals)
      quality  = q.quality
      fatPct   = q.fatPct
      qualitySamples.push(q.quality)
      status = netCarbs <= KETO_CARB_LIMIT ? 'compliant' : 'broken'

      // Glycogen balance: carbs refill, metabolism burns (cleaner days spare less).
      const refillPct = (netCarbs / capG) * 100
      const burnPct   = BASE_BURN * burnFactor * (0.6 + 0.4 * q.quality)
      glyPct = clamp(glyPct + refillPct - burnPct, 0, 100)

      // Fat-adaptation builds asymptotically while genuinely in ketosis.
      if (glyPct < 55 && q.quality >= 0.5) {
        adaptation = clamp(adaptation + (100 - adaptation) * 0.10, 0, 100)
      } else {
        adaptation = Math.max(0, adaptation - 6)
      }
    }

    // Streak bookkeeping drives badges & missions (not the meter directly).
    if (status === 'compliant') {
      streak += 1
    } else if (status === 'broken') {
      hadBreak = true
      streak = Math.round(streak * 0.25)
    } // unlogged → streak pauses
    maxStreak = Math.max(maxStreak, streak)

    // Displayed ketosis level: depletion + adaptation, with a visible carb-day dip.
    let dayLevel = 0.6 * (100 - glyPct) + 0.4 * adaptation
    if (status === 'broken') dayLevel *= 0.65
    level = clamp(dayLevel, 0, 100)

    dayStates.push({
      dateKey: key, dayIndex, status, netCarbs,
      fatPct: Math.round(fatPct),
      quality,
      glyPct: Math.round(glyPct),
      level: Math.round(level),
      streak,
    })
    levelHistory.push({ day: dayIndex, dateKey: key, level: Math.round(level) })
  }

  // Where did the current streak begin?
  let streakStartIndex = -1
  if (streak > 0) {
    for (let i = dayStates.length - 1; i >= 0; i--) {
      if (dayStates[i].status === 'compliant') streakStartIndex = i
      else break
    }
  }

  const recentQ = qualitySamples.slice(-7)
  const avgQuality = recentQ.length ? recentQ.reduce((s, q) => s + q, 0) / recentQ.length : null
  const genuineStart = journey.seedStreak === 0

  return {
    level: Math.round(level),
    streak,
    maxStreak,
    phase: ketoZone(level),
    genuineStart,
    hadBreak,
    daysSinceStart: dayIndex,
    glyPct: Math.round(glyPct),
    adaptation: Math.round(adaptation),
    avgQuality,
    personalized: !!(profile && profile.weightKg && profile.heightCm && profile.ageBracket),
    dayStates,
    levelHistory,
    streakStartIndex,
  }
}

// ─── Keto-flu forecast ─────────────────────────────────────────────────

export type FluSeverity = 'mild' | 'moderate' | 'strong'

export interface FluForecast {
  active:      boolean
  peak:        boolean
  cleared:     boolean
  minimalRisk: boolean
  day:         number          // which day of the streak
  severity:    FluSeverity | null
  headline:    string
  tips:        string[]
}

const FLU_TIPS = [
  'Add 3–5 g extra sodium (broth, salted water, electrolytes)',
  'Supplement magnesium (300–400 mg) and potassium-rich keto foods',
  'Hydrate hard — aim for 3+ litres today',
  'Rest and go easy on intense exercise',
  'Don’t over-restrict calories — eat enough fat',
]

export function predictKetoFlu(model: KetosisModel): FluForecast {
  const veteran = !model.genuineStart

  // Did an earlier point in this journey already pass the flu window (streak ≥ 6)?
  // If so, this isn't the first transition — minimal risk.
  let passedBefore = false
  if (model.streakStartIndex > 0) {
    for (let i = 0; i < model.streakStartIndex; i++) {
      if (model.dayStates[i].streak >= 6) { passedBefore = true; break }
    }
  } else if (model.streakStartIndex === -1) {
    for (const ds of model.dayStates) if (ds.streak >= 6) { passedBefore = true; break }
  }

  const firstTransition = model.genuineStart && !passedBefore

  // Severity from the carb drop going into this streak (pre-streak logged days vs the limit).
  let severity: FluSeverity = 'moderate'
  if (model.streakStartIndex > 0) {
    const pre = model.dayStates
      .slice(Math.max(0, model.streakStartIndex - 3), model.streakStartIndex)
      .filter(d => d.status !== 'unlogged')
    if (pre.length) {
      const avg = pre.reduce((s, d) => s + d.netCarbs, 0) / pre.length
      severity = avg > 120 ? 'strong' : avg > 60 ? 'moderate' : 'mild'
    }
  }

  if (firstTransition && model.streak >= 2 && model.streak <= 5) {
    return {
      active: true,
      peak: model.streak === 3 || model.streak === 4,
      cleared: false,
      minimalRisk: false,
      day: model.streak,
      severity,
      headline: model.streak === 3 || model.streak === 4
        ? 'Keto flu likely peaking today — push through'
        : 'Keto flu window — stay ahead of it',
      tips: FLU_TIPS,
    }
  }

  if (firstTransition && model.streak >= 6) {
    return {
      active: false, peak: false, cleared: true, minimalRisk: false,
      day: model.streak, severity: null,
      headline: 'You’ve cleared the keto-flu window 🎉',
      tips: ['Keep electrolytes steady', 'Energy and clarity climb from here'],
    }
  }

  return {
    active: false, peak: false, cleared: false, minimalRisk: true,
    day: model.streak, severity: null,
    headline: veteran ? 'Minimal flu risk — your body remembers' : 'No active flu risk',
    tips: ['Maintain electrolytes and hydration'],
  }
}

// ─── Daily mission ─────────────────────────────────────────────────────

export interface Mission {
  title:       string
  detail:      string
  targetG:     number
  currentG:    number
  overBudget:  boolean
  done:        boolean    // logged ≥1 meal today AND under target
  hasMeals:    boolean
}

export function dailyMission(model: KetosisModel, todayTotals: MacroValues, todayMealCount: number): Mission {
  const s = model.streak
  const todayStatus     = model.dayStates.at(-1)?.status
  const yesterdayStatus = model.dayStates.at(-2)?.status
  let title: string, detail: string, targetG: number

  if (todayStatus === 'broken') {
    // Already over today's carb budget — can't re-enter ketosis until tomorrow.
    title = 'Damage control'; targetG = KETO_CARB_LIMIT
    detail = 'Today’s carbs are already over the limit. Hold steady — no more carbs — and tomorrow is your comeback day.'
  } else if (yesterdayStatus === 'broken') {
    title = 'Comeback'; targetG = 20
    detail = 'Re-enter ketosis today — under 20g net carbs. Your body remembers how.'
  } else if (s <= 0) {
    title = 'Drain the tank'; targetG = 25
    detail = 'Keep net carbs under 25g to start burning through stored glycogen.'
  } else if (s === 1) {
    title = 'Flip the switch'; targetG = 20
    detail = 'Under 20g + hydrate well — insulin is dropping and ketones are coming.'
  } else if (s <= 4) {
    title = 'Electrolyte armor'; targetG = 20
    detail = 'Under 20g. Salt + magnesium are your shield through the flu window.'
  } else if (s <= 6) {
    title = 'Climbing out'; targetG = 20
    detail = 'Under 20g — ketones are taking over and the fog starts to lift.'
  } else if (s <= 13) {
    title = 'Hold the line'; targetG = 20
    detail = 'Stay under 20g and keep fat high — your clarity is rising.'
  } else {
    title = 'Stay adapted'; targetG = 20
    detail = 'Under 20g protects your fat-adapted engine. This is your baseline now.'
  }

  const currentG = todayTotals.net_carbs_g
  const overBudget = currentG > targetG
  return {
    title, detail, targetG,
    currentG,
    overBudget,
    hasMeals: todayMealCount > 0,
    done: todayMealCount > 0 && !overBudget,
  }
}

// ─── Body-cue narrative (the science story) ────────────────────────────

export type CueTone = 'neutral' | 'warn' | 'celebrate'

export interface BodyCue {
  icon:        string
  headline:    string
  detail:      string
  hydrationMl: number
  supplements: string[]
  tone:        CueTone
}

export function dailyBodyCue(model: KetosisModel): BodyCue {
  const s = model.streak
  const todayStatus     = model.dayStates.at(-1)?.status
  const yesterdayStatus = model.dayStates.at(-2)?.status
  if (todayStatus === 'broken') {
    return { icon: '⚠️', headline: 'Glycogen refilling', detail: 'Today’s carb spike is topping up your glycogen stores. Stop here — your ketosis returns within 24–48 hours of staying low.', hydrationMl: 3000, supplements: ['sodium'], tone: 'warn' }
  }
  if (yesterdayStatus === 'broken') {
    return { icon: '🔄', headline: 'Refuel reset', detail: 'Yesterday refilled some glycogen — get back under 20g today and you’ll re-enter ketosis fast.', hydrationMl: 3000, supplements: ['sodium'], tone: 'warn' }
  }
  if (s <= 0)  return { icon: '🫗', headline: 'Your tank is draining', detail: 'You’re burning through stored glycogen. You’ll shed water weight — replace fluids and salt.', hydrationMl: 3000, supplements: ['sea salt'], tone: 'neutral' }
  if (s === 1) return { icon: '⚡', headline: 'The switch is flipping', detail: 'Insulin is dropping and your kidneys are flushing sodium — replace salt to stay ahead of the flu.', hydrationMl: 3000, supplements: ['sodium', 'potassium'], tone: 'warn' }
  if (s <= 4)  return { icon: '🛡️', headline: 'Push through the dip', detail: 'Headache or fatigue today is the keto flu — temporary. Salt, magnesium, and rest are your armor.', hydrationMl: 3500, supplements: ['sodium 3–5g', 'magnesium', 'potassium'], tone: 'warn' }
  if (s <= 6)  return { icon: '🌅', headline: 'Climbing out', detail: 'Ketones are fueling you now. The fog begins to lift over the next couple of days.', hydrationMl: 3000, supplements: ['magnesium'], tone: 'neutral' }
  if (s <= 13) return { icon: '🧠', headline: 'Mental clarity rising', detail: 'Notice steadier energy and sharper focus — your brain is running clean on ketones.', hydrationMl: 2500, supplements: ['magnesium (optional)'], tone: 'celebrate' }
  if (s <= 29) return { icon: '🔥', headline: 'Fat-burning mode', detail: 'Cravings fade and energy stays stable all day — no afternoon crash.', hydrationMl: 2500, supplements: [], tone: 'celebrate' }
  return { icon: '👑', headline: 'Fully fat-adapted', detail: 'Your body is an efficient fat-burner — clarity, stable energy, and appetite control are your baseline.', hydrationMl: 2500, supplements: [], tone: 'celebrate' }
}

// ─── XP / levels ───────────────────────────────────────────────────────

export interface Progress {
  xp:          number
  levelIndex:  number
  title:       string
  nextTitle:   string | null
  xpIntoLevel: number
  xpForLevel:  number
  progressPct: number
}

export function computeProgress(model: KetosisModel, allMeals: MealEntry[], achievements: Achievement[]): Progress {
  let xp = 0
  for (const d of model.dayStates) {
    if (d.status === 'compliant') {
      // Quality-weighted: a clean 5g/75%-fat day earns far more than a
      // borderline 24g/45%-fat one. Streak adds a loyalty multiplier.
      const q = d.quality ?? 0.6
      xp += Math.round((50 + 100 * q) * (1 + Math.min(d.streak, 10) * 0.08))
    }
  }
  xp += allMeals.length * 10
  xp += achievements.filter(a => a.unlocked).reduce((s, a) => s + a.bounty, 0)

  let levelIndex = 0
  for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i].xp) levelIndex = i

  const cur  = LEVELS[levelIndex]
  const next = LEVELS[levelIndex + 1] ?? null
  const xpIntoLevel = xp - cur.xp
  const xpForLevel  = next ? next.xp - cur.xp : xpIntoLevel
  const progressPct = next ? clamp((xpIntoLevel / xpForLevel) * 100, 0, 100) : 100

  return {
    xp,
    levelIndex,
    title: cur.title,
    nextTitle: next?.title ?? null,
    xpIntoLevel,
    xpForLevel,
    progressPct: Math.round(progressPct),
  }
}

// ─── Achievements ──────────────────────────────────────────────────────

export interface Achievement {
  id: string; icon: string; name: string; desc: string
  bounty: number; unlocked: boolean
  progress: number          // 0–1 toward unlocking (1 when unlocked)
  progressLabel: string     // e.g. "5/7"
}

export function computeAchievements(model: KetosisModel, allMeals: MealEntry[]): Achievement[] {
  const ds = model.dayStates

  // 5 consecutive days under 15g net carbs (track the best run for progress)
  let sharp = false, run = 0, bestRun = 0
  for (const d of ds) {
    if (d.status === 'compliant' && d.netCarbs < 15) { run++; bestRun = Math.max(bestRun, run); if (run >= 5) sharp = true }
    else run = 0
  }

  // Comeback: a 3-day streak rebuilt AFTER the first break
  let comeback = false, seenBreak = false, bestPostBreak = 0
  for (const d of ds) {
    if (d.status === 'broken') seenBreak = true
    if (seenBreak) bestPostBreak = Math.max(bestPostBreak, d.streak)
    if (seenBreak && d.streak >= 3) comeback = true
  }

  const def: Omit<Achievement, 'unlocked' | 'progress' | 'progressLabel'>[] = [
    { id: 'first_fuel',    icon: '🥑', name: 'First Fuel',    desc: 'Log your first meal',            bounty: 50  },
    { id: 'first_ketones', icon: '🔥', name: 'First Ketones', desc: 'Reach a 3-day streak',           bounty: 100 },
    { id: 'flu_fighter',   icon: '🛡️', name: 'Flu Fighter',   desc: 'Clear day 6 of a transition',    bounty: 200 },
    { id: 'week_warrior',  icon: '📅', name: 'Week Warrior',  desc: '7-day streak',                   bounty: 150 },
    { id: 'fortnight',     icon: '⚡', name: 'Fortnight',     desc: '14-day streak',                  bounty: 300 },
    { id: 'fat_adapted',   icon: '👑', name: 'Fat Adapted',   desc: '30-day streak',                  bounty: 500 },
    { id: 'sharpshooter',  icon: '🎯', name: 'Sharpshooter',  desc: '5 straight days under 15g',      bounty: 200 },
    { id: 'comeback_kid',  icon: '🔄', name: 'Comeback Kid',  desc: 'Rebuild a 3-day streak post-break', bounty: 150 },
    { id: 'documentarian', icon: '📸', name: 'Documentarian', desc: 'Log 25 meals total',             bounty: 100 },
  ]

  const unlocked: Record<string, boolean> = {
    first_fuel:    allMeals.length >= 1,
    first_ketones: model.maxStreak >= 3,
    flu_fighter:   model.genuineStart && model.maxStreak >= 6,
    week_warrior:  model.maxStreak >= 7,
    fortnight:     model.maxStreak >= 14,
    fat_adapted:   model.maxStreak >= 30,
    sharpshooter:  sharp,
    comeback_kid:  comeback,
    documentarian: allMeals.length >= 25,
  }

  // [current, target] toward each badge — fuels the "almost there" pull.
  const counts: Record<string, [number, number]> = {
    first_fuel:    [Math.min(allMeals.length, 1), 1],
    first_ketones: [Math.min(model.maxStreak, 3), 3],
    flu_fighter:   [model.genuineStart ? Math.min(model.maxStreak, 6) : 0, 6],
    week_warrior:  [Math.min(model.maxStreak, 7), 7],
    fortnight:     [Math.min(model.maxStreak, 14), 14],
    fat_adapted:   [Math.min(model.maxStreak, 30), 30],
    sharpshooter:  [Math.min(bestRun, 5), 5],
    comeback_kid:  [Math.min(bestPostBreak, 3), 3],
    documentarian: [Math.min(allMeals.length, 25), 25],
  }

  return def.map(a => {
    const isUnlocked = unlocked[a.id] ?? false
    const [cur, target] = counts[a.id] ?? [0, 1]
    return {
      ...a,
      unlocked: isUnlocked,
      progress: isUnlocked ? 1 : clamp(cur / target, 0, 1),
      progressLabel: `${cur}/${target}`,
    }
  })
}

// ─── Convenience aggregator ────────────────────────────────────────────

export interface GameState {
  journey:      Journey
  profile:      Profile | null
  model:        KetosisModel
  flu:          FluForecast
  bodyCue:      BodyCue
  progress:     Progress
  achievements: Achievement[]
}

/** Build the full game state from localStorage. Returns null if no journey started. */
export function buildGameState(): GameState | null {
  const journey = loadJourney()
  if (!journey) return null
  const profile  = loadProfile()
  const allMeals = loadHistory()
  const groups   = groupByDay(allMeals)
  const model    = computeKetosisModel(journey, groups, profile)
  const flu      = predictKetoFlu(model)
  const bodyCue  = dailyBodyCue(model)
  const achievements = computeAchievements(model, allMeals)
  const progress = computeProgress(model, allMeals, achievements)
  return { journey, profile, model, flu, bodyCue, progress, achievements }
}
