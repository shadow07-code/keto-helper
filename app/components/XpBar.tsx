'use client'

import type { Progress } from '../lib/ketosis'

interface Props {
  progress: Progress
}

export default function XpBar({ progress }: Props) {
  const { title, nextTitle, xp, progressPct, xpIntoLevel, xpForLevel } = progress

  return (
    <div style={{
      background: '#1E2E26',
      borderRadius: 14,
      padding: '14px 18px',
      border: '1px solid #2C4036',
    }}>
      {/* Title row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <span style={{
          fontFamily: 'var(--font-playfair), serif',
          fontSize: '1.1rem',
          fontWeight: 700,
          color: '#F3EEE2',
        }}>
          {title}
        </span>
        <span style={{
          fontFamily: 'var(--font-lato), sans-serif',
          fontSize: '0.75rem',
          color: '#8FA396',
        }}>
          {xp} XP
        </span>
      </div>

      {/* Bar */}
      <div style={{
        height: 8,
        borderRadius: 4,
        background: '#2C4036',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${progressPct}%`,
          borderRadius: 4,
          background: 'linear-gradient(90deg, #C9A84C, #E6C24A)',
          transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: '0 0 8px rgba(201,168,76,0.4)',
        }} />
      </div>

      {/* Next level hint */}
      {nextTitle && (
        <div style={{
          marginTop: 6,
          fontFamily: 'var(--font-lato), sans-serif',
          fontSize: '0.7rem',
          color: '#8FA396',
          textAlign: 'right',
        }}>
          {xpForLevel - xpIntoLevel} XP to <span style={{ color: '#E6C24A' }}>{nextTitle}</span>
        </div>
      )}
    </div>
  )
}
