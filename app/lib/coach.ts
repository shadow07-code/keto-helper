// ─── AI coach client ───────────────────────────────────────────────────
// Assembles the personalised payload from the game state + profile, calls
// /api/coach, and caches the result per-day keyed by a hash of the salient
// data — so it only re-queries when something material changes (a new meal,
// a streak shift), keeping the coach fast and cheap.

import { buildGameState, KETO_CARB_LIMIT, type GameState } from './ketosis'
import { computeBMR, computeTDEE, glycogenCapacityG } from './profile'
import { loadHistory, dayTotals, macroPct } from './history'
import { predictKetoFlu } from './ketosis'

export interface Coaching {
  focus:          string
  state_estimate: string
  confidence:     'low' | 'moderate' | 'high'
  assessment:     string
  reasoning:      string
  guidance:       string[]
}

const COACH_KEY = 'keto_coach_cache'

interface CoachCache { dateKey: string; hash: string; data: Coaching }

// Cheap, stable string hash (djb2).
function hash(s: string): string {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

function buildPayload(gs: GameState) {
  const { profile, model } = gs
  const todayKey   = new Date().toDateString()
  const allMeals   = loadHistory()
  const todayMeals = allMeals.filter(m => new Date(m.timestamp).toDateString() === todayKey)
  const todayTotals= dayTotals(todayMeals)
  const tPct       = macroPct(todayTotals)
  const flu        = predictKetoFlu(model)

  const recentDays = model.dayStates
    .filter(d => d.status !== 'unlogged')
    .slice(-7)
    .reverse()
    .map(d => ({
      day: d.dayIndex, netCarbs: Math.round(d.netCarbs),
      fatPct: d.fatPct, status: d.status,
      quality: d.quality == null ? null : +d.quality.toFixed(2),
    }))

  return {
    profile: profile ? {
      name: profile.name, ageBracket: profile.ageBracket,
      heightCm: profile.heightCm, weightKg: profile.weightKg, sex: profile.sex,
    } : { name: 'there' },
    metabolic: {
      bmr: computeBMR(profile), tdee: computeTDEE(profile),
      glycogenCapacityG: glycogenCapacityG(profile),
    },
    state: {
      daysSinceStart: model.daysSinceStart,
      level: model.level, phase: model.phase.label,
      glyPct: model.glyPct, adaptation: model.adaptation,
      streak: model.streak, maxStreak: model.maxStreak,
      genuineStart: model.genuineStart,
      fluActive: flu.active, fluCleared: flu.cleared,
      avgQuality: model.avgQuality == null ? null : +model.avgQuality.toFixed(2),
      personalized: model.personalized,
    },
    today: {
      netCarbs: Math.round(todayTotals.net_carbs_g),
      fatPct: tPct.fat_pct, proteinPct: tPct.protein_pct,
      calories: Math.round(todayTotals.calories),
      mealCount: todayMeals.length,
      status: todayMeals.length === 0
        ? 'no meals yet'
        : todayTotals.net_carbs_g <= KETO_CARB_LIMIT ? 'compliant' : 'broken',
    },
    recentDays,
  }
}

function readCache(): CoachCache | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(COACH_KEY)
    return raw ? JSON.parse(raw) as CoachCache : null
  } catch { return null }
}

export function loadCachedCoaching(): Coaching | null {
  const c = readCache()
  return c && c.dateKey === new Date().toDateString() ? c.data : null
}

/**
 * Fetch (or reuse) today's coaching. Returns cached data instantly when the
 * underlying data is unchanged; otherwise calls the API. `force` bypasses cache.
 */
export async function getCoaching(opts?: { force?: boolean }): Promise<{
  data: Coaching | null; error?: string; cached: boolean
}> {
  const gs = buildGameState()
  if (!gs) return { data: null, error: 'No journey started.', cached: false }

  const payload = buildPayload(gs)
  const sig     = hash(JSON.stringify(payload))
  const todayKey= new Date().toDateString()

  if (!opts?.force) {
    const cached = readCache()
    if (cached && cached.dateKey === todayKey && cached.hash === sig) {
      return { data: cached.data, cached: true }
    }
  }

  try {
    const res  = await fetch('/api/coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    if (!res.ok || json.error) {
      return { data: loadCachedCoaching(), error: json.error ?? 'Coach unavailable.', cached: false }
    }
    const data = json as Coaching
    try { localStorage.setItem(COACH_KEY, JSON.stringify({ dateKey: todayKey, hash: sig, data })) } catch {}
    return { data, cached: false }
  } catch {
    return { data: loadCachedCoaching(), error: 'Network error reaching the coach.', cached: false }
  }
}
