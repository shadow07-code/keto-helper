'use client'

interface Props {
  streak: number
  maxStreak: number
  size?: 'sm' | 'lg'
}

export default function StreakFlame({ streak, maxStreak, size = 'lg' }: Props) {
  const isLg = size === 'lg'

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: isLg ? 8 : 5,
      background: '#1E2E26',
      borderRadius: isLg ? 12 : 8,
      padding: isLg ? '10px 16px' : '5px 10px',
      border: '1px solid #2C4036',
    }}>
      {/* Flame icon — breathes while a streak is alive */}
      <span
        className={streak > 0 ? 'flame-live' : undefined}
        style={{
          fontSize: isLg ? '1.6rem' : '1rem',
          filter: streak > 0
            ? 'drop-shadow(0 0 6px rgba(230,194,74,0.5))'
            : 'grayscale(1)',
          transition: 'filter 0.3s',
        }}>
        🔥
      </span>

      {/* Numbers */}
      <div>
        <div style={{
          fontFamily: 'var(--font-playfair), serif',
          fontSize: isLg ? '1.3rem' : '0.9rem',
          fontWeight: 700,
          color: streak > 0 ? '#F3EEE2' : '#8FA396',
          lineHeight: 1,
        }}>
          {streak}
        </div>
        <div style={{
          fontFamily: 'var(--font-lato), sans-serif',
          fontSize: isLg ? '0.6rem' : '0.5rem',
          color: '#8FA396',
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          lineHeight: 1.2,
        }}>
          {streak === 1 ? 'day' : 'days'}
        </div>
      </div>

      {/* Best streak (large mode only) */}
      {isLg && maxStreak > streak && (
        <div style={{
          marginLeft: 6,
          borderLeft: '1px solid #2C4036',
          paddingLeft: 10,
        }}>
          <div style={{
            fontFamily: 'var(--font-playfair), serif',
            fontSize: '0.85rem',
            fontWeight: 700,
            color: '#8FA396',
            lineHeight: 1,
          }}>
            {maxStreak}
          </div>
          <div style={{
            fontFamily: 'var(--font-lato), sans-serif',
            fontSize: '0.5rem',
            color: '#8FA396',
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            lineHeight: 1.2,
          }}>
            best
          </div>
        </div>
      )}
    </div>
  )
}
