'use client'

import { useState, useEffect } from 'react'
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar, Cell,
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Legend,
} from 'recharts'
import {
  loadHistory, groupByDay, dayTotals, macroPct, avgKetoScore,
  generateObservations, type DayGroup,
} from '../lib/history'

function fmt(n: number) { return n % 1 === 0 ? String(Math.round(n)) : n.toFixed(1) }

function scoreColor(s: number) {
  return s >= 8 ? '#4A7C59' : s >= 5 ? '#C9A84C' : '#D4714A'
}

function scoreLabel(s: number) {
  return s >= 8 ? 'Keto' : s >= 5 ? 'Borderline' : 'Non-Keto'
}

/* ─── Build chart data (last 14 days) ─── */
function buildChartData(groups: DayGroup[]) {
  return groups
    .slice(0, 14)
    .reverse()
    .map(g => {
      const t   = dayTotals(g.meals)
      const pct = macroPct(t)
      const avg = avgKetoScore(g.meals)
      const shortDay = g.label === 'Today' || g.label === 'Yesterday'
        ? g.label
        : new Date(g.dateKey).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      return {
        day:        shortDay,
        netCarbs:   Math.round(t.net_carbs_g),
        totalCarbs: Math.round(t.carbs_g),
        protein:    Math.round(t.protein_g),
        fat:        Math.round(t.fat_g),
        calories:   Math.round(t.calories),
        fatPct:     pct.fat_pct,
        proteinPct: pct.protein_pct,
        carbsPct:   pct.carbs_pct,
        ketoScore:  parseFloat(avg.toFixed(1)),
      }
    })
}

const CHART_MARGIN = { top: 4, right: 8, left: -16, bottom: 0 }

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-[#E8DCC8] p-4 shadow-sm">
      <p className="text-[0.68rem] font-bold tracking-widest uppercase text-[#8A9280] mb-3">{title}</p>
      {children}
    </div>
  )
}

export default function PastPage() {
  const [groups, setGroups] = useState<DayGroup[]>([])

  useEffect(() => {
    const all = loadHistory()
    setGroups(groupByDay(all))
  }, [])

  const chartData    = buildChartData(groups)
  const observations = generateObservations(groups)
  const isEmpty      = groups.length === 0

  return (
    <div className="min-h-screen bg-cream pb-24">

      {/* Header */}
      <div className="bg-green-rich text-cream px-5 pt-10 pb-6">
        <div className="max-w-2xl mx-auto">
          <p className="text-[0.65rem] font-bold tracking-[0.2em] uppercase text-green-light mb-1">History</p>
          <h1 className="font-playfair font-bold text-2xl leading-tight">Your Trends</h1>
          {!isEmpty && (
            <p className="text-sm text-green-light mt-1">{groups.length} day{groups.length !== 1 ? 's' : ''} tracked</p>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-5 space-y-5">

        {isEmpty ? (
          <div className="text-center py-16 text-[#8A9280]">
            <div className="text-5xl mb-4">📈</div>
            <p className="font-playfair text-lg font-semibold text-[#4A5240]">No history yet</p>
            <p className="text-sm mt-1">Log a few meals and your trends will appear here</p>
          </div>
        ) : (
          <>
            {/* ── Charts (only when ≥ 2 days) ── */}
            {chartData.length >= 2 && (
              <>
                <ChartCard title="Net Carbs per Day (g)">
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={chartData} margin={CHART_MARGIN}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0EBE0" />
                      <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#8A9280' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#8A9280' }} />
                      <Tooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E8DCC8' }}
                        formatter={(v: number) => [`${v}g`, 'Net Carbs']}
                      />
                      <ReferenceLine y={20} stroke="#D4714A" strokeDasharray="5 3" strokeWidth={1.5}
                        label={{ value: 'Keto limit 20g', position: 'insideTopRight', fontSize: 9, fill: '#D4714A' }} />
                      <Line type="monotone" dataKey="netCarbs" stroke="#D4714A" strokeWidth={2}
                        dot={{ fill: '#D4714A', r: 3 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Calories per Day (kcal)">
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={chartData} margin={CHART_MARGIN}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0EBE0" />
                      <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#8A9280' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#8A9280' }} />
                      <Tooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E8DCC8' }}
                        formatter={(v: number) => [`${v} kcal`, 'Calories']}
                      />
                      <ReferenceLine y={1800} stroke="#C9A84C" strokeDasharray="5 3" strokeWidth={1.5}
                        label={{ value: '1800 kcal target', position: 'insideTopRight', fontSize: 9, fill: '#C9A84C' }} />
                      <Line type="monotone" dataKey="calories" stroke="#4A7C59" strokeWidth={2}
                        dot={{ fill: '#4A7C59', r: 3 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Daily Macro Split (%)">
                  <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={chartData} margin={CHART_MARGIN}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0EBE0" />
                      <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#8A9280' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#8A9280' }} domain={[0, 100]} />
                      <Tooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E8DCC8' }}
                        formatter={(v: number, name: string) => [`${v}%`, name]}
                      />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Area type="monotone" dataKey="fatPct"     stackId="1" name="Fat"     stroke="#C9A84C" fill="#C9A84C" fillOpacity={0.7} />
                      <Area type="monotone" dataKey="proteinPct" stackId="1" name="Protein" stroke="#4A7C59" fill="#4A7C59" fillOpacity={0.7} />
                      <Area type="monotone" dataKey="carbsPct"   stackId="1" name="Carbs"   stroke="#D4714A" fill="#D4714A" fillOpacity={0.7} />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Keto Score per Day">
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={chartData} margin={CHART_MARGIN}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0EBE0" />
                      <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#8A9280' }} />
                      <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: '#8A9280' }} />
                      <Tooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E8DCC8' }}
                        formatter={(v: number) => [v, 'Avg Keto Score']}
                      />
                      <ReferenceLine y={7} stroke="#4A7C59" strokeDasharray="5 3" strokeWidth={1.5}
                        label={{ value: 'Keto threshold', position: 'insideTopRight', fontSize: 9, fill: '#4A7C59' }} />
                      <Bar dataKey="ketoScore" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, i) => (
                          <Cell key={i} fill={scoreColor(entry.ketoScore)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Daily Macros — Grams">
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={chartData} margin={CHART_MARGIN}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0EBE0" />
                      <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#8A9280' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#8A9280' }} />
                      <Tooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E8DCC8' }}
                        formatter={(v: number, name: string) => [`${v}g`, name]}
                      />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Bar dataKey="fat"        name="Fat"     stackId="a" fill="#C9A84C" />
                      <Bar dataKey="protein"    name="Protein" stackId="a" fill="#4A7C59" />
                      <Bar dataKey="totalCarbs" name="Carbs"   stackId="a" fill="#D4714A" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              </>
            )}

            {/* ── Smart Observations ── */}
            {observations.length > 0 && (
              <div className="bg-white rounded-xl border border-[#E8DCC8] p-4 shadow-sm space-y-2">
                <p className="text-[0.68rem] font-bold tracking-widest uppercase text-[#8A9280] mb-1">Smart Observations</p>
                {observations.map((obs, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-sm text-[#2D4A3E]">
                    <span className="flex-shrink-0 text-base">{obs.icon}</span>
                    <span>{obs.text}</span>
                  </div>
                ))}
              </div>
            )}

            {/* ── Day-by-day summary rows ── */}
            <div className="space-y-2">
              <p className="text-[0.68rem] font-bold tracking-widest uppercase text-[#8A9280]">Day Summary</p>
              {groups.map(g => {
                const t   = dayTotals(g.meals)
                const avg = avgKetoScore(g.meals)
                return (
                  <div key={g.dateKey}
                    className="flex items-center gap-3 bg-white rounded-xl border border-[#E8DCC8] px-4 py-3 shadow-sm">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-[#2D4A3E] text-sm">{g.label}</span>
                        <span className="text-[0.68rem] text-[#8A9280]">{g.meals.length} meal{g.meals.length !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex gap-x-3 gap-y-0 flex-wrap mt-0.5 text-[0.75rem] text-[#4A5240]">
                        <span className="font-bold text-[#2D4A3E]">{Math.round(t.calories)} kcal</span>
                        <span>Net carbs {fmt(t.net_carbs_g)}g</span>
                        <span>Fat {fmt(t.fat_g)}g</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-center flex-shrink-0">
                      <span className="text-sm font-bold" style={{ color: scoreColor(avg) }}>
                        {avg.toFixed(1)}★
                      </span>
                      <span className="text-[0.6rem] font-bold" style={{ color: scoreColor(avg) }}>
                        {scoreLabel(avg)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
