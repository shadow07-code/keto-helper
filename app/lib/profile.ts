// ─── User profile + metabolic math ─────────────────────────────────────
// Stores who the user is and derives the physiological constants the
// ketosis engine needs to personalise its estimate: BMR (Mifflin–St Jeor),
// TDEE, and an individualised glycogen capacity.
//
// All body fields are optional — the engine falls back to population
// averages when they're missing, and the AI coach lowers its confidence.

export const PROFILE_KEY = 'keto_profile'

export type AgeBracket = '18-24' | '25-30' | '31-40' | '41-50' | '51-60' | '60+'
export type Sex = 'male' | 'female' | 'neutral'

export interface Profile {
  name:       string                 // what they want to be called
  heightCm:   number | null
  weightKg:   number | null
  ageBracket: AgeBracket | null
  sex:        Sex                     // needed for an accurate BMR
}

// Midpoint age used for BMR from each bracket.
export const AGE_MIDPOINTS: Record<AgeBracket, number> = {
  '18-24': 21, '25-30': 27, '31-40': 35, '41-50': 45, '51-60': 55, '60+': 65,
}

export const AGE_BRACKETS: AgeBracket[] = ['18-24', '25-30', '31-40', '41-50', '51-60', '60+']

// Population-average fallbacks when body data is missing.
const FALLBACK_BMR        = 1600   // kcal/day
const FALLBACK_GLYCOGEN_G = 450    // grams

// ─── Storage ───────────────────────────────────────────────────────────

export function loadProfile(): Profile | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as Partial<Profile>
    if (!p.name) return null
    return {
      name:       p.name,
      heightCm:   typeof p.heightCm === 'number' ? p.heightCm : null,
      weightKg:   typeof p.weightKg === 'number' ? p.weightKg : null,
      ageBracket: (p.ageBracket as AgeBracket) ?? null,
      sex:        (p.sex as Sex) ?? 'neutral',
    }
  } catch { return null }
}

export function saveProfile(p: Profile): Profile {
  if (typeof window !== 'undefined') {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p))
  }
  return p
}

export function hasBodyData(p: Profile | null): boolean {
  return !!(p && p.heightCm && p.weightKg && p.ageBracket)
}

// ─── Metabolic derivations ─────────────────────────────────────────────

/** Basal Metabolic Rate via Mifflin–St Jeor. Null if body data incomplete. */
export function computeBMR(p: Profile | null): number | null {
  if (!p || !p.heightCm || !p.weightKg || !p.ageBracket) return null
  const age = AGE_MIDPOINTS[p.ageBracket]
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * age
  // Sex constant: +5 male, −161 female, −78 neutral (the average of the two).
  const s = p.sex === 'male' ? 5 : p.sex === 'female' ? -161 : -78
  return Math.round(base + s)
}

/** Total Daily Energy Expenditure. Default activity factor = lightly active. */
export function computeTDEE(p: Profile | null, activityFactor = 1.4): number | null {
  const bmr = computeBMR(p)
  return bmr == null ? null : Math.round(bmr * activityFactor)
}

/** BMR with a safe fallback for the metabolic simulation. */
export function effectiveBMR(p: Profile | null): number {
  return computeBMR(p) ?? FALLBACK_BMR
}

/**
 * Individualised total glycogen capacity in grams. Liver (~100g) plus
 * muscle stores, which scale with body mass. Each gram binds ~3g of water,
 * which is why the early "whoosh" of water weight tracks glycogen drain.
 */
export function glycogenCapacityG(p: Profile | null): number {
  if (!p || !p.weightKg) return FALLBACK_GLYCOGEN_G
  // ~6.5 g per kg of body weight, bounded to a physiological range.
  return Math.round(Math.max(300, Math.min(650, p.weightKg * 6.5)))
}

/** Water (kg) held by full glycogen stores — used for the "water weight" cue. */
export function glycogenWaterKg(p: Profile | null): number {
  return +(glycogenCapacityG(p) * 3 / 1000).toFixed(1)
}
