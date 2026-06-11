'use client'

import type { DayState } from '../lib/ketosis'

/* ─── Last-7-days chain ─────────────────────────────────────
   Habit-tracker strip: one cell per calendar day ending today.
   Filled = compliant, red = carb-over, hollow = unlogged.
   The visible chain exploits loss aversion — you can *see*
   what you'd break.
──────────────────────────────────────────────────────────── */

interface Props {
  dayStates: DayState[]
}

const STATUS_COLOR: Record<string, string> = {
  compliant: '#4ADE80',
  broken:    '#D4714A',
  unlogged:  '#2C4036',
}

export default function WeekStrip({ dayStates }: Props) {
  const last = dayStates.slice(-7)
  const pad  = 7 - last.length
  const cells: (DayState | null)[] = [...Array<null>(pad).fill(null), ...last]
  const clean = last.filter(d => d.status === 'compliant').length
  const todayIdx = cells.length - 1

  return (
    <div style={{
      background: '#1E2E26',
      borderRadius: 14,
      padding: '12px 16px 14px',
      border: '1px solid #2C4036',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <span style={{
          fontFamily: 'var(--font-lato), sans-serif', fontSize: '0.62rem', fontWeight: 700,
          letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8FA396',
        }}>
          Last 7 days
        </span>
        <span className="tnum" style={{
          fontFamily: 'var(--font-lato), sans-serif', fontSize: '0.68rem', fontWeight: 700,
          color: clean >= 5 ? '#4ADE80' : '#E6C24A',
        }}>
          {clean}/7 clean
        </span>
      </div>

      {/* Cells */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4 }}>
        {cells.map((d, i) => {
          const isToday = i === todayIdx && d != null
          // Letter for the weekday — derive even for pre-journey padding cells
          const date = d
            ? new Date(d.dateKey)
            : new Date(Date.now() - (cells.length - 1 - i) * 86_400_000)
          const letter = date.toLocaleDateString('en-GB', { weekday: 'narrow' })
          const color = d ? STATUS_COLOR[d.status] : '#22332A'
          const logged = d != null && d.status !== 'unlogged'

          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, flex: 1 }}>
              <span style={{
                fontFamily: 'var(--font-lato), sans-serif', fontSize: '0.56rem', fontWeight: 700,
                color: isToday ? '#E6C24A' : '#5E7066', textTransform: 'uppercase',
              }}>
                {letter}
              </span>
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `1.5px solid ${isToday ? '#E6C24A' : d ? color : '#22332A'}`,
                background: logged ? `${color}1F` : 'transparent',
                boxShadow: isToday ? '0 0 8px rgba(230,194,74,0.35)' : 'none',
                transition: 'all 0.3s',
              }}>
                {logged ? (
                  d!.status === 'compliant' ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                  )
                ) : (
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: d ? '#3A5246' : 'transparent' }} />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
