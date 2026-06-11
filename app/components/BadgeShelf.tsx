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
        const nearly = !a.unlocked && a.progress >= 0.5
        return (
          <div
            key={a.id}
            style={{
              background: a.unlocked ? 'linear-gradient(160deg, #233A2E, #1E2E26)' : '#17241D',
              borderRadius: 12,
              padding: compact ? '10px 6px' : '14px 10px 12px',
              border: `1px solid ${a.unlocked ? '#C9A84C' : nearly ? '#3A5246' : '#2C4036'}`,
              boxShadow: a.unlocked ? '0 0 14px rgba(201,168,76,0.12)' : 'none',
              textAlign: 'center',
              opacity: a.unlocked ? 1 : 0.75,
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
              filter: a.unlocked ? 'drop-shadow(0 0 6px rgba(201,168,76,0.35))' : 'grayscale(1) opacity(0.55)',
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

            {/* Unlocked → bounty · Locked → progress toward it */}
            {a.unlocked ? (
              <div style={{
                marginTop: 5,
                fontFamily: 'var(--font-lato), sans-serif',
                fontSize: '0.55rem',
                fontWeight: 700,
                color: '#E6C24A',
              }}>
                +{a.bounty} XP
              </div>
            ) : (
              <div style={{ marginTop: 7 }}>
                <div style={{ height: 3, borderRadius: 2, background: '#2C4036', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.round(a.progress * 100)}%`,
                    borderRadius: 2,
                    background: nearly
                      ? 'linear-gradient(90deg, #C9A84C, #E6C24A)'
                      : '#3A5246',
                    transition: 'width 0.6s ease',
                  }} />
                </div>
                <div className="tnum" style={{
                  marginTop: 3,
                  fontFamily: 'var(--font-lato), sans-serif',
                  fontSize: '0.52rem',
                  fontWeight: 700,
                  color: nearly ? '#E6C24A' : '#5E7066',
                }}>
                  {a.progressLabel}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
