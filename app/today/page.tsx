'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  loadHistory, groupByDay, dayTotals, macroPct, generateTips,
  updateEntry, deleteEntry,
  type MealEntry, type MacroValues,
} from '../lib/history'
import { buildGameState, dailyMission, KETO_CARB_LIMIT } from '../lib/ketosis'
import MissionCard from '../components/MissionCard'
import FluForecast from '../components/FluForecast'
import HydrationCard from '../components/HydrationCard'
import StreakFlame from '../components/StreakFlame'

function fmt(n: number) { return n % 1 === 0 ? String(Math.round(n)) : n.toFixed(1) }

function scoreColor(s: number) {
  return s >= 8 ? '#4ADE80' : s >= 5 ? '#E6C24A' : '#D4714A'
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function MacroBar({ totals }: { totals: MacroValues }) {
  const pct = macroPct(totals)
  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', borderRadius: 999, overflow: 'hidden', height: 10, marginBottom: 8 }}>
        <div style={{ width: `${pct.fat_pct}%`, background: '#C9A84C' }} />
        <div style={{ width: `${pct.protein_pct}%`, background: '#4ADE80' }} />
        <div style={{ width: `${pct.carbs_pct}%`, background: '#D4714A' }} />
      </div>
      <div style={{ display: 'flex', gap: 12, fontSize: '0.68rem', fontWeight: 700, fontFamily: 'var(--font-lato), sans-serif' }}>
        <span style={{ color: '#C9A84C' }}>FAT {pct.fat_pct}%</span>
        <span style={{ color: '#4ADE80' }}>PROTEIN {pct.protein_pct}%</span>
        <span style={{ color: '#D4714A' }}>CARBS {pct.carbs_pct}%</span>
      </div>
    </div>
  )
}

/* ─── MealCard with edit / delete (dark-restyled) ─────────── */
function MealCard({
  meal,
  onUpdate,
  onDelete,
}: {
  meal: MealEntry
  onUpdate: (updated: MealEntry) => void
  onDelete: (id: string) => void
}) {
  const [mode, setMode]           = useState<'view' | 'edit' | 'saving' | 'confirm-delete'>('view')
  const [editInput, setEditInput] = useState(`${meal.food_name} ${meal.quantity_display}`)
  const [editError, setEditError] = useState('')

  const v = meal.per_quantity

  const handleSave = useCallback(async () => {
    if (!editInput.trim()) { setEditError('Please enter a food and quantity.'); return }
    setMode('saving')
    setEditError('')
    try {
      const res  = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ food_input: editInput.trim() }),
      })
      const json = await res.json()
      if (!res.ok || json.error) { setEditError(json.error ?? 'Something went wrong.'); setMode('edit'); return }

      const updated: MealEntry = {
        ...meal,
        food_name:        json.corrected_name,
        quantity_display: json.quantity_display,
        keto_score:       json.keto_score,
        per_quantity:     json.per_quantity,
      }
      onUpdate(updated)
      setEditInput(`${json.corrected_name} ${json.quantity_display}`)
      setMode('view')
    } catch {
      setEditError('Network error — please try again.')
      setMode('edit')
    }
  }, [editInput, meal, onUpdate])

  if (mode === 'confirm-delete') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        padding: 16, background: '#1E2E26', borderRadius: 10, border: '1px solid #D4714A',
      }}>
        <p style={{ fontSize: '0.85rem', color: '#F3EEE2', fontWeight: 600, fontFamily: 'var(--font-lato), sans-serif', margin: 0 }}>
          Remove <span style={{ fontStyle: 'italic' }}>{meal.food_name}</span>?
        </p>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button onClick={() => onDelete(meal.id)} style={{
            padding: '6px 12px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700,
            background: '#D4714A', color: '#fff', border: 'none', cursor: 'pointer',
          }}>Yes, remove</button>
          <button onClick={() => setMode('view')} style={{
            padding: '6px 12px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700,
            background: '#2C4036', color: '#8FA396', border: 'none', cursor: 'pointer',
          }}>Cancel</button>
        </div>
      </div>
    )
  }

  if (mode === 'edit' || mode === 'saving') {
    return (
      <div style={{
        padding: 16, background: '#1E2E26', borderRadius: 10,
        border: '1px solid #C9A84C',
      }}>
        <p style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8FA396', marginBottom: 10, fontFamily: 'var(--font-lato), sans-serif' }}>Edit meal</p>
        <input
          value={editInput}
          onChange={e => setEditInput(e.target.value)}
          disabled={mode === 'saving'}
          placeholder="e.g. avocado 400g · grilled chicken 200g"
          style={{
            width: '100%', padding: '8px 12px', border: '1px solid #2C4036', borderRadius: 6,
            fontSize: '0.85rem', color: '#F3EEE2', background: '#14201A',
            fontFamily: 'var(--font-lato), sans-serif', outline: 'none',
          }}
        />
        {editError && <p style={{ fontSize: '0.78rem', color: '#D4714A', marginTop: 6 }}>⚠ {editError}</p>}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button onClick={handleSave} disabled={mode === 'saving'} style={{
            flex: 1, padding: '8px 0', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.12em',
            background: '#2D4A3E', color: '#F3EEE2', border: 'none', cursor: 'pointer',
            opacity: mode === 'saving' ? 0.6 : 1,
            fontFamily: 'var(--font-lato), sans-serif',
          }}>
            {mode === 'saving' ? 'Updating…' : 'Save'}
          </button>
          <button
            onClick={() => { setMode('view'); setEditError(''); setEditInput(`${meal.food_name} ${meal.quantity_display}`) }}
            disabled={mode === 'saving'} style={{
            padding: '8px 16px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.12em',
            background: '#2C4036', color: '#8FA396', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-lato), sans-serif',
          }}>Cancel</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      padding: 16, background: '#1E2E26', borderRadius: 10, border: '1px solid #2C4036',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-playfair), serif', fontWeight: 700, color: '#F3EEE2', fontSize: '1rem' }}>{meal.food_name}</span>
          <span style={{
            fontSize: '0.72rem', padding: '2px 8px', borderRadius: 999,
            background: 'rgba(230,194,74,0.1)', color: '#E6C24A', fontWeight: 600,
            border: '1px solid rgba(230,194,74,0.2)',
          }}>
            {meal.quantity_display}
          </span>
        </div>
        <div style={{ fontSize: '0.72rem', color: '#8FA396', marginTop: 3, fontFamily: 'var(--font-lato), sans-serif' }}>{formatTime(meal.timestamp)}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 12px', marginTop: 8, fontSize: '0.78rem', color: '#8FA396', fontFamily: 'var(--font-lato), sans-serif' }}>
          <span style={{ fontWeight: 700, color: '#F3EEE2' }}>{Math.round(v.calories)} kcal</span>
          <span>C {fmt(v.net_carbs_g)}g</span>
          <span>P {fmt(v.protein_g)}g</span>
          <span>F {fmt(v.fat_g)}g</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: '0.85rem', fontWeight: 700,
          background: scoreColor(meal.keto_score),
        }}>
          {meal.keto_score}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setMode('edit')} title="Edit meal"
            style={{ color: '#8FA396', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.2s' }}>
            <EditIcon />
          </button>
          <button onClick={() => setMode('confirm-delete')} title="Delete meal"
            style={{ color: '#8FA396', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.2s' }}>
            <DeleteIcon />
          </button>
        </div>
      </div>
    </div>
  )
}

function EditIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  )
}

function DeleteIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  )
}

/* ─── Page ───────────────────────────────────────────────── */
export default function TodayPage() {
  const [meals, setMeals] = useState<MealEntry[]>([])

  const loadToday = useCallback(() => {
    const all    = loadHistory()
    const groups = groupByDay(all)
    const today  = groups.find(g => g.dateKey === new Date().toDateString())
    setMeals(today?.meals ?? [])
  }, [])

  useEffect(() => { loadToday() }, [loadToday])

  // Refresh when tab gains focus
  useEffect(() => {
    const handler = () => loadToday()
    window.addEventListener('focus', handler)
    return () => window.removeEventListener('focus', handler)
  }, [loadToday])

  const handleUpdate = useCallback((updated: MealEntry) => {
    const next   = updateEntry(updated.id, updated)
    const groups = groupByDay(next)
    const today  = groups.find(g => g.dateKey === new Date().toDateString())
    setMeals(today?.meals ?? [])
  }, [])

  const handleDelete = useCallback((id: string) => {
    const next   = deleteEntry(id)
    const groups = groupByDay(next)
    const today  = groups.find(g => g.dateKey === new Date().toDateString())
    setMeals(today?.meals ?? [])
  }, [])

  const totals = dayTotals(meals)
  const tips   = generateTips(totals, meals)

  const todayLabel = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long'
  })

  const isEmpty = meals.length === 0

  // Game state for mission + flu + body cue
  const gs = buildGameState()
  const mission = gs ? dailyMission(gs.model, totals, meals.length) : null
  const compliant = totals.net_carbs_g <= KETO_CARB_LIMIT && meals.length > 0

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 96 }}>
      {/* Header */}
      <div style={{
        background: '#1E2E26',
        padding: '40px 20px 24px',
        borderBottom: '1px solid #2C4036',
      }}>
        <div style={{ maxWidth: 540, margin: '0 auto' }}>
          <p style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#D44866', marginBottom: 4, fontFamily: 'var(--font-lato), sans-serif' }}>Today</p>
          <h1 style={{ fontFamily: 'var(--font-playfair), serif', fontWeight: 700, fontSize: '1.5rem', lineHeight: 1.2, color: '#F3EEE2', margin: 0 }}>{todayLabel}</h1>

          {!isEmpty && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 20 }}>
              {[
                { v: Math.round(totals.calories) + ' kcal', k: 'Consumed' },
                { v: fmt(totals.net_carbs_g) + 'g',         k: 'Net Carbs' },
                { v: fmt(totals.fat_g) + 'g',               k: 'Fat' },
              ].map(({ v, k }) => (
                <div key={k} style={{
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: 10,
                  padding: '10px 12px',
                  textAlign: 'center',
                }}>
                  <span style={{ display: 'block', fontFamily: 'var(--font-playfair), serif', fontWeight: 700, fontSize: '1.15rem', color: '#F3EEE2', lineHeight: 1 }}>{v}</span>
                  <span style={{ display: 'block', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8FA396', marginTop: 4, fontFamily: 'var(--font-lato), sans-serif' }}>{k}</span>
                </div>
              ))}
            </div>
          )}

          {/* Compliance indicator */}
          {!isEmpty && (
            <div style={{
              marginTop: 12,
              fontSize: '0.72rem',
              fontWeight: 700,
              fontFamily: 'var(--font-lato), sans-serif',
              color: compliant ? '#4ADE80' : '#D4714A',
            }}>
              {compliant
                ? `Under ${KETO_CARB_LIMIT}g net carbs ✓ — counts toward your streak`
                : `Over ${KETO_CARB_LIMIT}g net carbs — aim lower to stay in ketosis`}
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 540, margin: '0 auto', padding: '16px 16px 0' }}>
        {/* Game strip: mission + flu + hydration */}
        {gs && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
            {mission && <MissionCard mission={mission} />}
            <FluForecast flu={gs.flu} />
            <HydrationCard bodyCue={gs.bodyCue} dateKey={new Date().toDateString()} />
            {/* Streak */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <StreakFlame streak={gs.model.streak} maxStreak={gs.model.maxStreak} size="sm" />
            </div>
          </div>
        )}

        {isEmpty ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: '#8FA396' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>🥗</div>
            <p style={{ fontFamily: 'var(--font-playfair), serif', fontSize: '1.1rem', fontWeight: 600, color: '#F3EEE2' }}>No meals logged today</p>
            <p style={{ fontSize: '0.85rem', marginTop: 6, fontFamily: 'var(--font-lato), sans-serif' }}>Tap the <span style={{ color: '#E6C24A', fontWeight: 700 }}>⊕ Fuel</span> button to log a meal</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Macro split bar */}
            <div style={{
              background: '#1E2E26',
              borderRadius: 14,
              border: '1px solid #2C4036',
              padding: 16,
            }}>
              <p style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#D44866', marginBottom: 12, fontFamily: 'var(--font-lato), sans-serif' }}>Today&apos;s Macro Split</p>
              <MacroBar totals={totals} />
            </div>

            {/* Smart tips */}
            {tips.length > 0 && (
              <div>
                <p style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#D44866', marginBottom: 8, fontFamily: 'var(--font-lato), sans-serif' }}>Smart Insights</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {tips.map((tip, i) => {
                    const colors = tip.level === 'ok'
                      ? { bg: 'rgba(74,222,128,0.06)', border: '#4ADE80', text: '#4ADE80' }
                      : tip.level === 'warn'
                        ? { bg: 'rgba(230,194,74,0.06)', border: '#E6C24A', text: '#E6C24A' }
                        : { bg: 'rgba(143,163,150,0.06)', border: '#8FA396', text: '#8FA396' }
                    return (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'flex-start', gap: 10,
                        padding: '10px 14px', borderRadius: 8,
                        fontSize: '0.82rem', lineHeight: 1.5,
                        background: colors.bg, border: `1px solid ${colors.border}`,
                        color: colors.text, fontFamily: 'var(--font-lato), sans-serif',
                      }}>
                        <span style={{ flexShrink: 0, lineHeight: 1, marginTop: 2 }}>{tip.icon}</span>
                        <span>{tip.text}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Meal list */}
            <div>
              <p style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#D44866', marginBottom: 8, fontFamily: 'var(--font-lato), sans-serif' }}>
                Meals ({meals.length})
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {meals.map(meal => (
                  <MealCard key={meal.id} meal={meal} onUpdate={handleUpdate} onDelete={handleDelete} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
