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
  generateObservations, generateSummaryText, type DayGroup,
} from '../lib/history'
import { buildGameState, PHASES, type GameState } from '../lib/ketosis'
import BadgeShelf from '../components/BadgeShelf'

function fmt(n: number) { return n % 1 === 0 ? String(Math.round(n)) : n.toFixed(1) }

function scoreColor(s: number) {
  return s >= 8 ? '#4ADE80' : s >= 5 ? '#E6C24A' : '#D4714A'
}

function scoreLabel(s: number) {
  return s >= 8 ? 'Keto' : s >= 5 ? 'Borderline' : 'Non-Keto'
}

/* ─── Dark chart tooltip ─── */
const DARK_TT = {
  fontSize: 12,
  borderRadius: 8,
  border: '1px solid #2C4036',
  background: '#1E2E26',
  color: '#F3EEE2',
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
        fatPct:     pct.fat_pct,
        proteinPct: pct.protein_pct,
        carbsPct:   pct.carbs_pct,
        ketoScore:  parseFloat(avg.toFixed(1)),
      }
    })
}

/* ─── Build ketosis level history for the journey chart ─── */
function buildLevelData(gs: GameState) {
  return gs.model.levelHistory.map(h => {
    const d = new Date(h.dateKey)
    return {
      day: `D${h.day}`,
      level: h.level,
      label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    }
  })
}

const CHART_MARGIN = { top: 4, right: 8, left: -16, bottom: 0 }

function CopyIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', verticalAlign: 'middle' }}>
      <rect x="9" y="9" width="13" height="13" rx="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: '#1E2E26',
      borderRadius: 14,
      border: '1px solid #2C4036',
      padding: 16,
    }}>
      <p style={{
        fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.16em',
        textTransform: 'uppercase', color: '#8FA396', marginBottom: 12,
        fontFamily: 'var(--font-lato), sans-serif',
      }}>{title}</p>
      {children}
    </div>
  )
}

export default function ProgressPage() {
  const [groups, setGroups]       = useState<DayGroup[]>([])
  const [gs, setGs]               = useState<GameState | null>(null)
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle')

  useEffect(() => {
    const all = loadHistory()
    setGroups(groupByDay(all))
    setGs(buildGameState())
  }, [])

  const chartData    = buildChartData(groups)
  const observations = generateObservations(groups)
  const isEmpty      = groups.length === 0
  const levelData    = gs ? buildLevelData(gs) : []

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 96 }}>

      {/* Header */}
      <div style={{
        background: '#1E2E26',
        padding: '40px 20px 24px',
        borderBottom: '1px solid #2C4036',
      }}>
        <div style={{ maxWidth: 540, margin: '0 auto' }}>
          <p style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#8FA396', marginBottom: 4, fontFamily: 'var(--font-lato), sans-serif' }}>Your Journey</p>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
            <h1 style={{ fontFamily: 'var(--font-playfair), serif', fontWeight: 700, fontSize: '1.5rem', lineHeight: 1.2, color: '#F3EEE2', margin: 0 }}>Progress</h1>
            {!isEmpty && (
              <button
                onClick={async () => {
                  const text = generateSummaryText(groups)
                  await navigator.clipboard.writeText(text)
                  setCopyState('copied')
                  setTimeout(() => setCopyState('idle'), 2000)
                }}
                style={{
                  flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5,
                  fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                  color: copyState === 'copied' ? '#4ADE80' : '#E6C24A',
                  background: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${copyState === 'copied' ? 'rgba(74,222,128,0.3)' : 'rgba(230,194,74,0.3)'}`,
                  borderRadius: 999, padding: '5px 12px', cursor: 'pointer',
                  transition: 'color 0.2s, border-color 0.2s', whiteSpace: 'nowrap',
                  fontFamily: 'var(--font-lato), sans-serif',
                }}
              >
                {copyState === 'copied' ? '✓ Copied!' : <><CopyIcon /> Copy 30-day summary</>}
              </button>
            )}
          </div>
          {!isEmpty && (
            <p style={{ fontSize: '0.85rem', color: '#8FA396', marginTop: 4, fontFamily: 'var(--font-lato), sans-serif' }}>
              {groups.length} day{groups.length !== 1 ? 's' : ''} tracked
            </p>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 540, margin: '0 auto', padding: '16px 16px 0' }}>

        {isEmpty ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: '#8FA396' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>📈</div>
            <p style={{ fontFamily: 'var(--font-playfair), serif', fontSize: '1.1rem', fontWeight: 600, color: '#F3EEE2' }}>No history yet</p>
            <p style={{ fontSize: '0.85rem', marginTop: 6, fontFamily: 'var(--font-lato), sans-serif' }}>Log a few meals and your trends will appear here</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* ── Journey at a glance ── */}
            {gs && (
              <div className="rise rise-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {[
                  { v: String(gs.model.daysSinceStart), k: 'Days in',      accent: '#F3EEE2' },
                  { v: `${gs.model.maxStreak}`,         k: 'Best streak',  accent: '#E6C24A' },
                  { v: `${gs.model.level}%`,            k: 'Ketosis now',  accent: gs.model.phase.color },
                  { v: gs.progress.xp.toLocaleString(), k: 'Total XP',     accent: '#C9A84C' },
                ].map(({ v, k, accent }) => (
                  <div key={k} style={{
                    background: '#1E2E26',
                    borderRadius: 12,
                    border: '1px solid #2C4036',
                    padding: '12px 6px',
                    textAlign: 'center',
                    minWidth: 0,
                  }}>
                    <span className="tnum" style={{
                      display: 'block', fontFamily: 'var(--font-playfair), serif', fontWeight: 700,
                      fontSize: 'clamp(0.95rem, 4.2vw, 1.25rem)', color: accent, lineHeight: 1,
                    }}>{v}</span>
                    <span style={{
                      display: 'block', fontSize: '0.54rem', fontWeight: 700, letterSpacing: '0.12em',
                      textTransform: 'uppercase', color: '#8FA396', marginTop: 5,
                      fontFamily: 'var(--font-lato), sans-serif', whiteSpace: 'nowrap',
                    }}>{k}</span>
                  </div>
                ))}
              </div>
            )}

            {/* ── Ketosis Level Journey (NEW hero chart) ── */}
            {levelData.length >= 2 && (
              <ChartCard title="Ketosis Level — Your Journey">
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={levelData} margin={CHART_MARGIN}>
                    <defs>
                      <linearGradient id="levelGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#E6C24A" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#E6C24A" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2C4036" />
                    <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#8FA396' }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#8FA396' }} />
                    <Tooltip
                      contentStyle={DARK_TT}
                      formatter={(v, _, entry) => {
                        const e = entry.payload as { label?: string }
                        return [`${v}%`, e?.label ?? 'Ketosis']
                      }}
                    />
                    {/* Zone reference bands */}
                    {PHASES.map(p => (
                      <ReferenceLine key={p.key} y={p.min} stroke={p.color} strokeDasharray="4 4" strokeWidth={1} strokeOpacity={0.5} />
                    ))}
                    <Area type="monotone" dataKey="level" stroke="#E6C24A" strokeWidth={2.5}
                      fill="url(#levelGrad)" dot={{ fill: '#E6C24A', r: 2.5 }} activeDot={{ r: 5, fill: '#E6C24A' }} />
                  </AreaChart>
                </ResponsiveContainer>
                {/* Zone legend */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8, justifyContent: 'center' }}>
                  {PHASES.map(p => (
                    <span key={p.key} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontSize: '0.55rem', fontWeight: 700, color: p.color,
                      fontFamily: 'var(--font-lato), sans-serif',
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
                      {p.label}
                    </span>
                  ))}
                </div>
              </ChartCard>
            )}

            {/* ── Remaining charts (dark themed) ── */}
            {chartData.length >= 2 && (
              <>
                <ChartCard title="Net Carbs per Day (g)">
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={chartData} margin={CHART_MARGIN}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2C4036" />
                      <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#8FA396' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#8FA396' }} />
                      <Tooltip contentStyle={DARK_TT} formatter={(v) => [`${v}g`, 'Net Carbs']} />
                      <ReferenceLine y={20} stroke="#D4714A" strokeDasharray="5 3" strokeWidth={1.5}
                        label={{ value: 'Keto limit 20g', position: 'insideTopRight', fontSize: 9, fill: '#D4714A' }} />
                      <Line type="monotone" dataKey="netCarbs" stroke="#D4714A" strokeWidth={2}
                        dot={{ fill: '#D4714A', r: 3 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Daily Macro Split (%)">
                  <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={chartData} margin={CHART_MARGIN}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2C4036" />
                      <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#8FA396' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#8FA396' }} domain={[0, 100]} />
                      <Tooltip contentStyle={DARK_TT} formatter={(v, name) => [`${v}%`, name]} />
                      <Legend wrapperStyle={{ fontSize: 10, color: '#8FA396' }} />
                      <Area type="monotone" dataKey="fatPct"     stackId="1" name="Fat"     stroke="#C9A84C" fill="#C9A84C" fillOpacity={0.6} />
                      <Area type="monotone" dataKey="proteinPct" stackId="1" name="Protein" stroke="#4ADE80" fill="#4ADE80" fillOpacity={0.6} />
                      <Area type="monotone" dataKey="carbsPct"   stackId="1" name="Carbs"   stroke="#D4714A" fill="#D4714A" fillOpacity={0.6} />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Keto Score per Day">
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={chartData} margin={CHART_MARGIN}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2C4036" />
                      <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#8FA396' }} />
                      <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: '#8FA396' }} />
                      <Tooltip contentStyle={DARK_TT} formatter={(v) => [v, 'Avg Keto Score']} />
                      <ReferenceLine y={7} stroke="#4ADE80" strokeDasharray="5 3" strokeWidth={1.5}
                        label={{ value: 'Keto threshold', position: 'insideTopRight', fontSize: 9, fill: '#4ADE80' }} />
                      <Bar dataKey="ketoScore" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, i) => (
                          <Cell key={i} fill={scoreColor(entry.ketoScore)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              </>
            )}

            {/* ── Smart Observations ── */}
            {observations.length > 0 && (
              <div style={{
                background: '#1E2E26', borderRadius: 14,
                border: '1px solid #2C4036', padding: 16,
              }}>
                <p style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8FA396', marginBottom: 10, fontFamily: 'var(--font-lato), sans-serif' }}>
                  Smart Observations
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {observations.map((obs, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: '0.85rem', color: '#F3EEE2', fontFamily: 'var(--font-lato), sans-serif' }}>
                      <span style={{ flexShrink: 0, fontSize: '1rem' }}>{obs.icon}</span>
                      <span>{obs.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Achievements ── */}
            {gs && (
              <div>
                <h3 style={{
                  fontFamily: 'var(--font-playfair), serif',
                  fontSize: '1rem', fontWeight: 700, color: '#F3EEE2', marginBottom: 10,
                }}>
                  Achievements
                </h3>
                <BadgeShelf
                  achievements={gs.achievements}
                  seenIds={gs.journey.seenAchievements}
                />
              </div>
            )}

            {/* ── Day-by-day summary rows ── */}
            <div>
              <p style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8FA396', marginBottom: 8, fontFamily: 'var(--font-lato), sans-serif' }}>
                Day Summary
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {groups.map(g => {
                  const t   = dayTotals(g.meals)
                  const avg = avgKetoScore(g.meals)
                  return (
                    <div key={g.dateKey} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      background: '#1E2E26', borderRadius: 12, border: '1px solid #2C4036',
                      padding: '12px 16px',
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, color: '#F3EEE2', fontSize: '0.85rem', fontFamily: 'var(--font-lato), sans-serif' }}>{g.label}</span>
                          <span style={{ fontSize: '0.68rem', color: '#8FA396', fontFamily: 'var(--font-lato), sans-serif' }}>{g.meals.length} meal{g.meals.length !== 1 ? 's' : ''}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '0 12px', flexWrap: 'wrap', marginTop: 3, fontSize: '0.75rem', color: '#8FA396', fontFamily: 'var(--font-lato), sans-serif' }}>
                          <span style={{ fontWeight: 700, color: '#F3EEE2' }}>{Math.round(t.calories)} kcal</span>
                          <span>Net carbs {fmt(t.net_carbs_g)}g</span>
                          <span>Fat {fmt(t.fat_g)}g</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: scoreColor(avg) }}>
                          {avg.toFixed(1)}★
                        </span>
                        <span style={{ fontSize: '0.6rem', fontWeight: 700, color: scoreColor(avg), fontFamily: 'var(--font-lato), sans-serif' }}>
                          {scoreLabel(avg)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
