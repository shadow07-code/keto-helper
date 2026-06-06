'use client'

import type { FluForecast as FluForecastType } from '../lib/ketosis'

interface Props {
  flu: FluForecastType
}

export default function FluForecast({ flu }: Props) {
  // Don't render at all when there's nothing interesting to show
  if (flu.minimalRisk && !flu.cleared) return null

  const isActive = flu.active
  const borderColor = flu.cleared ? '#4ADE80' : isActive ? '#D4714A' : '#2C4036'
  const bgColor     = flu.cleared ? 'rgba(74,222,128,0.06)' : isActive ? 'rgba(212,113,74,0.06)' : '#1E2E26'

  // Status pill
  let statusLabel = ''
  let statusColor = ''
  if (flu.peak) {
    statusLabel = 'PEAK'
    statusColor = '#D4714A'
  } else if (flu.active) {
    statusLabel = 'WATCH'
    statusColor = '#E08A4C'
  } else if (flu.cleared) {
    statusLabel = 'CLEARED'
    statusColor = '#4ADE80'
  }

  // Severity pill (only when active)
  const severityColors: Record<string, string> = {
    mild: '#E6C24A',
    moderate: '#E08A4C',
    strong: '#D4714A',
  }

  return (
    <div style={{
      background: bgColor,
      borderRadius: 14,
      padding: '14px 18px',
      border: `1px solid ${borderColor}`,
      transition: 'border-color 0.4s, background 0.4s',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: '1rem' }}>{isActive ? '🤒' : flu.cleared ? '🎉' : '🛡️'}</span>
        <span style={{
          fontFamily: 'var(--font-playfair), serif',
          fontSize: '0.95rem',
          fontWeight: 700,
          color: '#F3EEE2',
          flex: 1,
        }}>
          Keto Flu
        </span>

        {/* Status pill */}
        {statusLabel && (
          <span style={{
            fontSize: '0.6rem',
            fontWeight: 700,
            color: statusColor,
            background: `${statusColor}18`,
            padding: '2px 8px',
            borderRadius: 6,
            fontFamily: 'var(--font-lato), sans-serif',
            letterSpacing: '0.08em',
          }}>
            {statusLabel}
          </span>
        )}

        {/* Severity pill */}
        {flu.active && flu.severity && (
          <span style={{
            fontSize: '0.6rem',
            fontWeight: 700,
            color: severityColors[flu.severity] ?? '#8FA396',
            background: `${severityColors[flu.severity] ?? '#8FA396'}18`,
            padding: '2px 8px',
            borderRadius: 6,
            fontFamily: 'var(--font-lato), sans-serif',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}>
            {flu.severity}
          </span>
        )}
      </div>

      {/* Headline */}
      <p style={{
        fontFamily: 'var(--font-lato), sans-serif',
        fontSize: '0.78rem',
        color: isActive ? '#F3EEE2' : '#8FA396',
        margin: 0,
        lineHeight: 1.45,
      }}>
        {flu.headline}
      </p>

      {/* Tips (only when active) */}
      {isActive && flu.tips.length > 0 && (
        <ul style={{
          margin: '10px 0 0 0',
          padding: '0 0 0 16px',
          listStyle: 'disc',
        }}>
          {flu.tips.map((tip, i) => (
            <li key={i} style={{
              fontFamily: 'var(--font-lato), sans-serif',
              fontSize: '0.7rem',
              color: '#8FA396',
              lineHeight: 1.5,
              marginBottom: 2,
            }}>
              {tip}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
