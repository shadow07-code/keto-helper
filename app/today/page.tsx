'use client'

import { useState, useEffect } from 'react'
import {
  loadHistory, groupByDay, dayTotals, macroPct, generateTips,
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

function MealCard({ meal }: { meal: MealEntry }) {
  const v = meal.per_quantity
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
      <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
        style={{ background: scoreColor(meal.keto_score) }}>
        {meal.keto_score}
      </div>
    </div>
  )
}

export default function TodayPage() {
  const [meals, setMeals] = useState<MealEntry[]>([])

  useEffect(() => {
    const all    = loadHistory()
    const groups = groupByDay(all)
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
            <p className="text-sm mt-1">Head to the Analyse tab to log your first meal</p>
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
              {meals.map(meal => <MealCard key={meal.id} meal={meal} />)}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
