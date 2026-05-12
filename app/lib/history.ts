// ─── Shared types & localStorage helpers ─────────────────────

export interface MacroValues {
  calories: number
  carbs_g: number
  protein_g: number
  fat_g: number
  fiber_g: number
  net_carbs_g: number
}

export interface MealEntry {
  id: string               // Date.now().toString()
  timestamp: number        // Date.now()
  food_name: string        // corrected_name from analysis
  quantity_display: string
  keto_score: number
  per_quantity: MacroValues
}

export const STORAGE_KEY = 'keto_meal_history'

// ─── Load / Save ─────────────────────────────────────────────

export function loadHistory(): MealEntry[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

/** Prepend a new entry and persist. Returns the updated array. */
export function saveEntry(entry: MealEntry): MealEntry[] {
  const prev = loadHistory()
  const next = [entry, ...prev]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}

// ─── Day grouping ─────────────────────────────────────────────

export interface DayGroup {
  dateKey: string        // toDateString() — used as stable key
  label: string          // "Today", "Yesterday", "Mon 9 May"
  meals: MealEntry[]
}

export function groupByDay(entries: MealEntry[]): DayGroup[] {
  const map = new Map<string, MealEntry[]>()
  for (const e of entries) {
    const key = new Date(e.timestamp).toDateString()
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(e)
  }

  const todayKey     = new Date().toDateString()
  const yesterdayKey = new Date(Date.now() - 86_400_000).toDateString()

  return Array.from(map.entries()).map(([dateKey, meals]) => {
    let label: string
    if (dateKey === todayKey)          label = 'Today'
    else if (dateKey === yesterdayKey) label = 'Yesterday'
    else {
      const d = new Date(dateKey)
      label = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
    }
    return { dateKey, label, meals }
  })
}

// ─── Aggregation helpers ──────────────────────────────────────

export function dayTotals(meals: MealEntry[]): MacroValues {
  return meals.reduce(
    (acc, m) => ({
      calories:    acc.calories    + m.per_quantity.calories,
      carbs_g:     acc.carbs_g     + m.per_quantity.carbs_g,
      protein_g:   acc.protein_g   + m.per_quantity.protein_g,
      fat_g:       acc.fat_g       + m.per_quantity.fat_g,
      fiber_g:     acc.fiber_g     + m.per_quantity.fiber_g,
      net_carbs_g: acc.net_carbs_g + m.per_quantity.net_carbs_g,
    }),
    { calories: 0, carbs_g: 0, protein_g: 0, fat_g: 0, fiber_g: 0, net_carbs_g: 0 }
  )
}

export function avgKetoScore(meals: MealEntry[]): number {
  if (!meals.length) return 0
  return meals.reduce((s, m) => s + m.keto_score, 0) / meals.length
}

// ─── Macro % from gram totals ─────────────────────────────────

export function macroPct(totals: MacroValues) {
  const kcal = totals.carbs_g * 4 + totals.protein_g * 4 + totals.fat_g * 9
  if (kcal === 0) return { carbs_pct: 0, protein_pct: 0, fat_pct: 0 }
  return {
    carbs_pct:   Math.round((totals.carbs_g   * 4 / kcal) * 100),
    protein_pct: Math.round((totals.protein_g * 4 / kcal) * 100),
    fat_pct:     Math.round((totals.fat_g     * 9 / kcal) * 100),
  }
}

// ─── Smart tip generation ─────────────────────────────────────

export interface Tip { icon: string; text: string; level: 'ok' | 'warn' | 'info' }

export function generateTips(totals: MacroValues, meals: MealEntry[]): Tip[] {
  const tips: Tip[] = []
  const pct = macroPct(totals)
  const avgScore = avgKetoScore(meals)

  // Net carbs
  if (totals.net_carbs_g > 20) {
    tips.push({ icon: '⚠️', text: `Net carbs at ${Math.round(totals.net_carbs_g)}g — you've hit your keto limit for today`, level: 'warn' })
  } else if (totals.net_carbs_g >= 15) {
    tips.push({ icon: '⚠️', text: `Net carbs at ${Math.round(totals.net_carbs_g)}g — stay cautious with remaining meals`, level: 'warn' })
  } else {
    tips.push({ icon: '✅', text: `Net carbs at ${Math.round(totals.net_carbs_g)}g — you're well within keto range`, level: 'ok' })
  }

  // Fat %
  if (pct.fat_pct < 60 && meals.length > 0) {
    tips.push({ icon: '💡', text: 'Fat intake is low — boost it with avocado, olive oil, cheese, or nuts', level: 'info' })
  } else if (pct.fat_pct >= 65) {
    tips.push({ icon: '✅', text: `Fat at ${pct.fat_pct}% — great macro balance for ketosis`, level: 'ok' })
  }

  // Protein %
  if (pct.protein_pct > 30 && meals.length > 0) {
    tips.push({ icon: '💡', text: 'Protein is high — excess can convert to glucose; pair with more fat', level: 'info' })
  }

  // Calories
  if (totals.calories > 2200) {
    tips.push({ icon: '⚠️', text: `${Math.round(totals.calories)} kcal consumed today — caloric intake is high`, level: 'warn' })
  }

  // Avg keto score
  if (meals.length > 0) {
    if (avgScore < 5) {
      tips.push({ icon: '⚠️', text: "Today's meals are mostly non-keto — consider swapping to keto alternatives", level: 'warn' })
    } else if (avgScore >= 8) {
      tips.push({ icon: '✅', text: "Excellent day — all meals score highly on keto compliance 🎉", level: 'ok' })
    }
  }

  return tips
}

// ─── Trend observations ───────────────────────────────────────

export interface Observation { icon: string; text: string }

export function generateObservations(groups: DayGroup[]): Observation[] {
  const obs: Observation[] = []
  if (groups.length === 0) return obs

  // Streak: consecutive days with avg keto score ≥ 7
  let streak = 0
  for (const g of groups) {
    if (avgKetoScore(g.meals) >= 7) streak++
    else break
  }
  if (streak >= 2) obs.push({ icon: '🔥', text: `${streak}-day keto streak — keep it going!` })

  // 7-day avg net carbs
  const last7 = groups.slice(0, 7)
  if (last7.length >= 2) {
    const avgNetCarbs = last7.reduce((s, g) => s + dayTotals(g.meals).net_carbs_g, 0) / last7.length
    obs.push({ icon: '📊', text: `7-day avg net carbs: ${Math.round(avgNetCarbs)}g/day` })
  }

  // Best day
  const best = [...groups].sort((a, b) => avgKetoScore(b.meals) - avgKetoScore(a.meals))[0]
  if (best) {
    obs.push({ icon: '⭐', text: `Best keto day: ${best.label} (avg score ${avgKetoScore(best.meals).toFixed(1)})` })
  }

  // Carb trend: compare first half vs second half of last 7 days
  if (last7.length >= 4) {
    const half = Math.floor(last7.length / 2)
    const recent = last7.slice(0, half).reduce((s, g) => s + dayTotals(g.meals).net_carbs_g, 0) / half
    const older  = last7.slice(half).reduce((s, g)  => s + dayTotals(g.meals).net_carbs_g, 0)  / (last7.length - half)
    if (recent < older - 3) obs.push({ icon: '📉', text: 'Net carbs are trending down — great progress!' })
    else if (recent > older + 3) obs.push({ icon: '📈', text: 'Net carbs are creeping up — watch your intake' })
  }

  return obs
}

// ─── Update / Delete ─────────────────────────────────────────

/** Replace an entry by id, persist, return updated array. */
export function updateEntry(id: string, updated: MealEntry): MealEntry[] {
  const prev = loadHistory()
  const next = prev.map(e => e.id === id ? updated : e)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}

/** Remove an entry by id, persist, return updated array. */
export function deleteEntry(id: string): MealEntry[] {
  const prev = loadHistory()
  const next = prev.filter(e => e.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}

// ─── 30-Day Text Summary ─────────────────────────────────────

function fmtN(n: number) { return n % 1 === 0 ? String(Math.round(n)) : n.toFixed(1) }

export function generateSummaryText(groups: DayGroup[]): string {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
  const recent = groups.filter(g => new Date(g.dateKey).getTime() >= cutoff)

  if (recent.length === 0) return 'No meals logged in the last 30 days.'

  const today = new Date()
  const lines: string[] = [
    `KetoHelper — 30-Day Summary (generated ${today.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })})`,
    '',
  ]

  for (const g of recent) {
    const t   = dayTotals(g.meals)
    const avg = avgKetoScore(g.meals)
    const label = g.dateKey === new Date().toDateString()
      ? new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : new Date(g.dateKey).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

    lines.push(`────────────────────────────────`)
    lines.push(`${label}  •  ${g.meals.length} meal${g.meals.length !== 1 ? 's' : ''}`)
    lines.push(`────────────────────────────────`)

    for (const m of g.meals) {
      const v = m.per_quantity
      lines.push(`  • ${m.food_name} (${m.quantity_display}) — ${Math.round(v.calories)} kcal | Net carbs ${fmtN(v.net_carbs_g)}g | Protein ${fmtN(v.protein_g)}g | Fat ${fmtN(v.fat_g)}g`)
    }

    const scoreStr = avg >= 8 ? 'Keto' : avg >= 5 ? 'Borderline' : 'Non-Keto'
    lines.push(`  Day total: ${Math.round(t.calories)} kcal | Net carbs ${fmtN(t.net_carbs_g)}g | Protein ${fmtN(t.protein_g)}g | Fat ${fmtN(t.fat_g)}g | Avg score: ${avg.toFixed(1)}★ (${scoreStr})`)
    lines.push('')
  }

  return lines.join('\n')
}
