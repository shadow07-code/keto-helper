'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  loadHistory, groupByDay, dayTotals, macroPct, generateTips,
  updateEntry, deleteEntry,
  type MealEntry, type MacroValues,
} from '../lib/history'

function fmt(n: number) { return n % 1 === 0 ? String(Math.round(n)) : n.toFixed(1) }

function scoreColor(s: number) {
  return s >= 8 ? '#4A7C59' : s >= 5 ? '#C9A84C' : '#D4714A'
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function MacroBar({ totals }: { totals: MacroValues }) {
  const pct = macroPct(totals)
  return (
    <div className="w-full">
      <div className="flex rounded-full overflow-hidden h-3 mb-2">
        <div style={{ width: `${pct.fat_pct}%`, background: '#C9A84C' }} title={`Fat ${pct.fat_pct}%`} />
        <div style={{ width: `${pct.protein_pct}%`, background: '#4A7C59' }} title={`Protein ${pct.protein_pct}%`} />
        <div style={{ width: `${pct.carbs_pct}%`, background: '#D4714A' }} title={`Carbs ${pct.carbs_pct}%`} />
      </div>
      <div className="flex gap-3 text-[0.68rem] font-bold">
        <span style={{ color: '#C9A84C' }}>FAT {pct.fat_pct}%</span>
        <span style={{ color: '#4A7C59' }}>PROTEIN {pct.protein_pct}%</span>
        <span style={{ color: '#D4714A' }}>CARBS {pct.carbs_pct}%</span>
      </div>
    </div>
  )
}

/* ─── MealCard with edit / delete ───────────────────────── */
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
  const [foodName, setFoodName]   = useState(meal.food_name)
  const [quantity, setQuantity]   = useState(meal.quantity_display)
  const [editError, setEditError] = useState('')

  const v = meal.per_quantity

  const handleSave = useCallback(async () => {
    if (!foodName.trim()) { setEditError('Food name is required.'); return }
    setMode('saving')
    setEditError('')
    try {
      const res  = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ food_input: `${foodName.trim()} ${quantity.trim()}` }),
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
      setFoodName(json.corrected_name)
      setQuantity(json.quantity_display)
      setMode('view')
    } catch {
      setEditError('Network error — please try again.')
      setMode('edit')
    }
  }, [foodName, quantity, meal, onUpdate])

  if (mode === 'confirm-delete') {
    return (
      <div className="flex items-center justify-between gap-3 p-4 bg-white rounded border border-[#E8DCC8]">
        <p className="text-sm text-[#2D4A3E] font-semibold">
          Remove <span className="italic">{meal.food_name}</span>?
        </p>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => onDelete(meal.id)}
            className="px-3 py-1.5 rounded text-xs font-bold bg-[#D4714A] text-white"
          >Yes, remove</button>
          <button
            onClick={() => setMode('view')}
            className="px-3 py-1.5 rounded text-xs font-bold bg-[#F0EBE0] text-[#4A5240]"
          >Cancel</button>
        </div>
      </div>
    )
  }

  if (mode === 'edit' || mode === 'saving') {
    return (
      <div className="p-4 bg-white rounded border border-[#C9A84C] space-y-3">
        <p className="text-[0.68rem] font-bold tracking-widest uppercase text-[#8A9280]">Edit meal</p>
        <div className="flex flex-col gap-2">
          <input
            value={foodName}
            onChange={e => setFoodName(e.target.value)}
            disabled={mode === 'saving'}
            placeholder="Food name"
            className="w-full border border-[#E8DCC8] rounded px-3 py-2 text-sm text-[#2D4A3E] bg-[#FAF6EF] focus:outline-none focus:border-[#C9A84C]"
          />
          <input
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            disabled={mode === 'saving'}
            placeholder="Quantity (e.g. 200g, 1 cup)"
            className="w-full border border-[#E8DCC8] rounded px-3 py-2 text-sm text-[#2D4A3E] bg-[#FAF6EF] focus:outline-none focus:border-[#C9A84C]"
          />
        </div>
        {editError && <p className="text-[0.78rem] text-[#D4714A]">⚠ {editError}</p>}
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={mode === 'saving'}
            className="flex-1 py-2 rounded text-xs font-bold uppercase tracking-wider bg-[#2D4A3E] text-[#FAF6EF] disabled:opacity-60"
          >
            {mode === 'saving' ? 'Updating…' : 'Save'}
          </button>
          <button
            onClick={() => {
              setMode('view')
              setEditError('')
              setFoodName(meal.food_name)
              setQuantity(meal.quantity_display)
            }}
            disabled={mode === 'saving'}
            className="px-4 py-2 rounded text-xs font-bold uppercase tracking-wider bg-[#F0EBE0] text-[#4A5240]"
          >Cancel</button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3 p-4 bg-white rounded border border-[#E8DCC8]">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-playfair font-bold text-[#2D4A3E] text-[1rem]">{meal.food_name}</span>
          <span className="text-[0.72rem] px-2 py-0.5 rounded-full bg-[#F5EDD0] text-[#7B5E3A] font-semibold border border-[#E8CC7A]">
            {meal.quantity_display}
          </span>
        </div>
        <div className="text-[0.72rem] text-[#8A9280] mt-0.5">{formatTime(meal.timestamp)}</div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2 text-[0.78rem] text-[#4A5240]">
          <span className="font-bold text-[#2D4A3E]">{Math.round(v.calories)} kcal</span>
          <span>C {fmt(v.net_carbs_g)}g</span>
          <span>P {fmt(v.protein_g)}g</span>
          <span>F {fmt(v.fat_g)}g</span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
          style={{ background: scoreColor(meal.keto_score) }}>
          {meal.keto_score}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setMode('edit')} title="Edit meal"
            className="text-[#8A9280] hover:text-[#2D4A3E] transition-colors">
            <EditIcon />
          </button>
          <button onClick={() => setMode('confirm-delete')} title="Delete meal"
            className="text-[#8A9280] hover:text-[#D4714A] transition-colors">
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

  return (
    <div className="min-h-screen bg-cream pb-24">
      {/* Header */}
      <div className="bg-green-rich text-cream px-5 pt-10 pb-6">
        <div className="max-w-2xl mx-auto">
          <p className="text-[0.65rem] font-bold tracking-[0.2em] uppercase text-green-light mb-1">Today</p>
          <h1 className="font-playfair font-bold text-2xl leading-tight">{todayLabel}</h1>

          {!isEmpty && (
            <div className="mt-5 grid grid-cols-3 gap-2">
              {[
                { v: Math.round(totals.calories) + ' kcal', k: 'Consumed' },
                { v: fmt(totals.net_carbs_g) + 'g',         k: 'Net Carbs' },
                { v: fmt(totals.fat_g) + 'g',               k: 'Fat' },
              ].map(({ v, k }) => (
                <div key={k} className="bg-white/10 rounded-lg px-3 py-2.5 text-center">
                  <span className="block font-playfair font-bold text-xl text-cream leading-none">{v}</span>
                  <span className="block text-[0.6rem] font-bold tracking-widest uppercase text-green-light mt-1">{k}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-5 space-y-6">
        {isEmpty ? (
          <div className="text-center py-16 text-[#8A9280]">
            <div className="text-5xl mb-4">🥗</div>
            <p className="font-playfair text-lg font-semibold text-[#4A5240]">No meals logged today</p>
            <p className="text-sm mt-1">Head to the Analyse tab and tap &ldquo;Log this Meal&rdquo; after analysing a food</p>
          </div>
        ) : (
          <>
            {/* Macro split bar */}
            <div className="bg-white rounded-xl border border-[#E8DCC8] p-4 shadow-sm">
              <p className="text-[0.68rem] font-bold tracking-widest uppercase text-[#8A9280] mb-3">Today&apos;s Macro Split</p>
              <MacroBar totals={totals} />
            </div>

            {/* Smart tips */}
            {tips.length > 0 && (
              <div className="space-y-2">
                <p className="text-[0.68rem] font-bold tracking-widest uppercase text-[#8A9280]">Smart Insights</p>
                {tips.map((tip, i) => (
                  <div key={i} className={`flex items-start gap-3 px-4 py-3 rounded-lg text-sm border ${
                    tip.level === 'ok'   ? 'bg-[#F0F7F2] border-[#A8C5A0] text-[#2D4A3E]' :
                    tip.level === 'warn' ? 'bg-[#FDF5EC] border-[#E8C875] text-[#7B4A1A]' :
                                          'bg-[#F5F0FF] border-[#C5B8E8] text-[#3A2D7B]'
                  }`}>
                    <span className="flex-shrink-0 text-base leading-none mt-0.5">{tip.icon}</span>
                    <span className="leading-snug">{tip.text}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Meal list */}
            <div className="space-y-2">
              <p className="text-[0.68rem] font-bold tracking-widest uppercase text-[#8A9280]">
                Meals ({meals.length})
              </p>
              {meals.map(meal => (
                <MealCard
                  key={meal.id}
                  meal={meal}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
