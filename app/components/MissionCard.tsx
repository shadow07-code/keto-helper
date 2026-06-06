'use client'

import type { Mission } from '../lib/ketosis'

interface Props {
  mission: Mission
}

export default function MissionCard({ mission }: Props) {
  const { title, detail, targetG, currentG, overBudget, done, hasMeals } = mission
  const pct = targetG > 0 ? Math.min((currentG / targetG) * 100, 100) : 0

  const barColor = done
    ? '#4ADE80'        // green — mission complete
    : overBudget
      ? '#D4714A'      // carbs-red — over budget
      : '#E6C24A'      // gold — in progress

  return (
    <div style={{
      background: '#1E2E26',
      borderRadius: 14,
      padding: '14px 18px',
      border: `1px solid ${done ? '#4ADE80' : '#2C4036'}`,
      transition: 'border-color 0.4s',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{
          fontFamily: 'var(--font-playfair), serif',
          fontSize: '0.95rem',
          fontWeight: 700,
          color: '#F3EEE2',
        }}>
          🎯 {title}
        </span>
        {done && (
          <span style={{
            fontSize: '0.65rem',
            fontWeight: 700,
            color: '#4ADE80',
            background: 'rgba(74,222,128,0.12)',
            padding: '2px 8px',
            borderRadius: 6,
            fontFamily: 'var(--font-lato), sans-serif',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}>
            DONE
          </span>
        )}
      </div>

      {/* Detail */}
      <p style={{
        fontFamily: 'var(--font-lato), sans-serif',
        fontSize: '0.78rem',
        color: '#8FA396',
        margin: '0 0 10px 0',
        lineHeight: 1.45,
      }}>
        {detail}
      </p>

      {/* Progress bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          flex: 1,
          height: 6,
          borderRadius: 3,
          background: '#2C4036',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${pct}%`,
            borderRadius: 3,
            background: barColor,
            transition: 'width 0.6s ease, background 0.3s',
          }} />
        </div>
        <span style={{
          fontFamily: 'var(--font-lato), sans-serif',
          fontSize: '0.7rem',
          fontWeight: 700,
          color: overBudget ? '#D4714A' : '#8FA396',
          minWidth: 60,
          textAlign: 'right',
        }}>
          {hasMeals ? `${Math.round(currentG)}g / ${targetG}g` : `— / ${targetG}g`}
        </span>
      </div>
    </div>
  )
}
