'use client'

import type { Achievement } from '../lib/ketosis'

interface Props {
  achievements: Achievement[]
  seenIds: string[]       // ids already flashed as NEW
  compact?: boolean       // true = smaller grid for today page
}

export default function BadgeShelf({ achievements, seenIds, compact = false }: Props) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: compact ? 'repeat(auto-fill, minmax(90px, 1fr))' : 'repeat(3, 1fr)',
      gap: compact ? 8 : 12,
    }}>
      {achievements.map(a => {
        const isNew = a.unlocked && !seenIds.includes(a.id)
        return (
          <div
            key={a.id}
            style={{
              background: a.unlocked ? '#1E2E26' : '#14201A',
              borderRadius: 12,
              padding: compact ? '10px 6px' : '14px 10px',
              border: `1px solid ${a.unlocked ? '#C9A84C' : '#2C4036'}`,
              textAlign: 'center',
              opacity: a.unlocked ? 1 : 0.45,
              position: 'relative',
              transition: 'opacity 0.4s, border-color 0.4s',
            }}
          >
            {/* NEW flash */}
            {isNew && (
              <span
                className="keto-loading-icon"
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 6,
                  fontSize: '0.5rem',
                  fontWeight: 700,
                  color: '#E6C24A',
                  fontFamily: 'var(--font-lato), sans-serif',
                  letterSpacing: '0.08em',
                }}
              >
                NEW
              </span>
            )}

            {/* Icon */}
            <div style={{
              fontSize: compact ? '1.4rem' : '1.8rem',
              marginBottom: 4,
              filter: a.unlocked ? 'none' : 'grayscale(1)',
            }}>
              {a.icon}
            </div>

            {/* Name */}
            <div style={{
              fontFamily: 'var(--font-lato), sans-serif',
              fontSize: compact ? '0.58rem' : '0.68rem',
              fontWeight: 700,
              color: a.unlocked ? '#F3EEE2' : '#8FA396',
              marginBottom: 2,
            }}>
              {a.name}
            </div>

            {/* Desc (full mode only) */}
            {!compact && (
              <div style={{
                fontFamily: 'var(--font-lato), sans-serif',
                fontSize: '0.56rem',
                color: '#8FA396',
                lineHeight: 1.3,
              }}>
                {a.desc}
              </div>
            )}

            {/* Bounty */}
            {a.unlocked && (
              <div style={{
                marginTop: 4,
                fontFamily: 'var(--font-lato), sans-serif',
                fontSize: '0.55rem',
                fontWeight: 700,
                color: '#E6C24A',
              }}>
                +{a.bounty} XP
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
