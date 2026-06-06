'use client'

import { useState } from 'react'
import { startJourney } from '../lib/ketosis'

interface Props {
  onStarted: () => void  // callback after journey is created
}

const DURATIONS = [
  { label: '< 1 week',  days: 4   },
  { label: '1–2 weeks', days: 10  },
  { label: '2–4 weeks', days: 21  },
  { label: '1–3 months',days: 60  },
  { label: '3+ months', days: 120 },
]

export default function OnboardingHero({ onStarted }: Props) {
  const [mode, setMode] = useState<'choose' | 'duration'>('choose')

  const handleFresh = () => {
    startJourney(0)
    onStarted()
  }

  const handleBackdate = (days: number) => {
    startJourney(days)
    onStarted()
  }

  return (
    <div style={{
      minHeight: 'calc(100vh - 80px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
    }}>
      {/* Logo / Title */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{
          fontFamily: 'var(--font-playfair), serif',
          fontSize: '2.4rem',
          fontWeight: 700,
          color: '#F3EEE2',
          lineHeight: 1.1,
        }}>
          Keto<span style={{ color: '#C9A84C' }}>Helper</span>
        </div>
        <div style={{
          fontFamily: 'var(--font-lato), sans-serif',
          fontSize: '0.85rem',
          color: '#8FA396',
          marginTop: 8,
          lineHeight: 1.5,
          maxWidth: 280,
        }}>
          Track your body's transition into ketosis.
          Science-backed, day by day.
        </div>
      </div>

      {/* Dormant meter preview */}
      <div style={{ marginBottom: 36, opacity: 0.35 }}>
        <svg viewBox="0 0 200 110" width={200}>
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#2C4036"
            strokeWidth={14}
            strokeLinecap="round"
          />
          <text x={100} y={85} textAnchor="middle" fill="#8FA396"
            style={{ fontFamily: 'var(--font-playfair), serif', fontSize: '1.6rem', fontWeight: 700 }}>
            0%
          </text>
        </svg>
      </div>

      {mode === 'choose' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%', maxWidth: 300 }}>
          {/* Primary: Starting today */}
          <button
            onClick={handleFresh}
            style={{
              background: 'linear-gradient(135deg, #C9A84C, #E6C24A)',
              color: '#14201A',
              border: 'none',
              borderRadius: 14,
              padding: '16px 24px',
              fontFamily: 'var(--font-playfair), serif',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(201,168,76,0.35)',
              transition: 'transform 0.15s',
            }}
            onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.97)')}
            onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
          >
            I'm starting keto today
          </button>

          {/* Secondary: Already on keto */}
          <button
            onClick={() => setMode('duration')}
            style={{
              background: '#1E2E26',
              color: '#F3EEE2',
              border: '1px solid #2C4036',
              borderRadius: 14,
              padding: '14px 24px',
              fontFamily: 'var(--font-playfair), serif',
              fontSize: '0.95rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'border-color 0.2s',
            }}
          >
            I'm already on keto
          </button>
        </div>
      ) : (
        <div style={{ width: '100%', maxWidth: 300 }}>
          <div style={{
            fontFamily: 'var(--font-lato), sans-serif',
            fontSize: '0.8rem',
            color: '#8FA396',
            textAlign: 'center',
            marginBottom: 14,
          }}>
            How long have you been on keto?
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {DURATIONS.map(d => (
              <button
                key={d.days}
                onClick={() => handleBackdate(d.days)}
                style={{
                  background: '#1E2E26',
                  color: '#F3EEE2',
                  border: '1px solid #2C4036',
                  borderRadius: 10,
                  padding: '12px 20px',
                  fontFamily: 'var(--font-lato), sans-serif',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'border-color 0.2s',
                }}
              >
                {d.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setMode('choose')}
            style={{
              marginTop: 14,
              background: 'none',
              border: 'none',
              color: '#8FA396',
              fontFamily: 'var(--font-lato), sans-serif',
              fontSize: '0.72rem',
              cursor: 'pointer',
              textDecoration: 'underline',
              display: 'block',
              width: '100%',
              textAlign: 'center',
            }}
          >
            ← Back
          </button>
        </div>
      )}

      {/* Science note */}
      <p style={{
        marginTop: 40,
        fontFamily: 'var(--font-lato), sans-serif',
        fontSize: '0.68rem',
        color: '#8FA396',
        textAlign: 'center',
        maxWidth: 280,
        lineHeight: 1.5,
        opacity: 0.7,
      }}>
        Your meter is powered by real physiology — glycogen depletion,
        ketone production, and fat-adaptation curves backed by clinical data.
      </p>
    </div>
  )
}
