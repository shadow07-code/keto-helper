'use client'

import { useState } from 'react'
import { startJourney } from '../lib/ketosis'
import { loadProfile } from '../lib/profile'
import ProfileSetup from './ProfileSetup'

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

const WRAP: React.CSSProperties = {
  minHeight: 'calc(100vh - 80px)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '40px 24px',
}

function MeterPreview() {
  return (
    <svg viewBox="0 0 200 110" width={200}>
      <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#2C4036" strokeWidth={14} strokeLinecap="round" />
      <text x={100} y={85} textAnchor="middle" fill="#8FA396"
        style={{ fontFamily: 'var(--font-playfair), serif', fontSize: '1.6rem', fontWeight: 700 }}>0%</text>
    </svg>
  )
}

export default function OnboardingHero({ onStarted }: Props) {
  const [step, setStep]         = useState<'welcome' | 'profile' | 'path'>('welcome')
  const [pathMode, setPathMode] = useState<'choose' | 'duration'>('choose')
  const name = loadProfile()?.name ?? ''

  const handleFresh    = () => { startJourney(0); onStarted() }
  const handleBackdate = (days: number) => { startJourney(days); onStarted() }

  // ── Step: profile ──────────────────────────────────────────────
  if (step === 'profile') {
    return (
      <div style={WRAP}>
        <ProfileSetup
          heading="First, tell me about you"
          sub="Your name and body stats let me model your metabolism — BMR, glycogen stores, and how fast you'll enter ketosis. The more I know, the smarter your coaching."
          onComplete={() => setStep('path')}
        />
      </div>
    )
  }

  // ── Step: path choice ──────────────────────────────────────────
  if (step === 'path') {
    return (
      <div style={WRAP}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontFamily: 'var(--font-playfair), serif', fontSize: '1.8rem', fontWeight: 700, color: '#F3EEE2', lineHeight: 1.15 }}>
            {name ? <>Welcome, <span style={{ color: '#C9A84C' }}>{name}</span></> : 'Your journey'}
          </div>
          <div style={{ fontFamily: 'var(--font-lato), sans-serif', fontSize: '0.85rem', color: '#8FA396', marginTop: 8 }}>
            When did your keto journey begin?
          </div>
        </div>

        <div style={{ marginBottom: 32, opacity: 0.4 }}><MeterPreview /></div>

        {pathMode === 'choose' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%', maxWidth: 300 }}>
            <button
              onClick={handleFresh}
              style={{
                background: 'linear-gradient(135deg, #C9A84C, #E6C24A)', color: '#14201A',
                border: 'none', borderRadius: 14, padding: '16px 24px',
                fontFamily: 'var(--font-playfair), serif', fontSize: '1rem', fontWeight: 700,
                cursor: 'pointer', boxShadow: '0 4px 20px rgba(201,168,76,0.35)', transition: 'transform 0.15s',
              }}
              onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.97)')}
              onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              I&apos;m starting keto today
            </button>
            <button
              onClick={() => setPathMode('duration')}
              style={{
                background: '#1E2E26', color: '#F3EEE2', border: '1px solid #2C4036', borderRadius: 14,
                padding: '14px 24px', fontFamily: 'var(--font-playfair), serif', fontSize: '0.95rem',
                fontWeight: 700, cursor: 'pointer',
              }}
            >
              I&apos;m already on keto
            </button>
          </div>
        ) : (
          <div style={{ width: '100%', maxWidth: 300 }}>
            <div style={{ fontFamily: 'var(--font-lato), sans-serif', fontSize: '0.8rem', color: '#8FA396', textAlign: 'center', marginBottom: 14 }}>
              How long have you been on keto?
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {DURATIONS.map(d => (
                <button key={d.days} onClick={() => handleBackdate(d.days)} style={{
                  background: '#1E2E26', color: '#F3EEE2', border: '1px solid #2C4036', borderRadius: 10,
                  padding: '12px 20px', fontFamily: 'var(--font-lato), sans-serif', fontSize: '0.85rem',
                  fontWeight: 700, cursor: 'pointer', textAlign: 'left',
                }}>{d.label}</button>
              ))}
            </div>
            <button onClick={() => setPathMode('choose')} style={{
              marginTop: 14, background: 'none', border: 'none', color: '#8FA396',
              fontFamily: 'var(--font-lato), sans-serif', fontSize: '0.72rem', cursor: 'pointer',
              textDecoration: 'underline', display: 'block', width: '100%', textAlign: 'center',
            }}>← Back</button>
          </div>
        )}
      </div>
    )
  }

  // ── Step: welcome ──────────────────────────────────────────────
  return (
    <div style={WRAP}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontFamily: 'var(--font-playfair), serif', fontSize: '2.4rem', fontWeight: 700, color: '#F3EEE2', lineHeight: 1.1 }}>
          Keto<span style={{ color: '#C9A84C' }}>Helper</span>
        </div>
        <div style={{ fontFamily: 'var(--font-lato), sans-serif', fontSize: '0.85rem', color: '#8FA396', marginTop: 8, lineHeight: 1.5, maxWidth: 300 }}>
          Your intelligent guide into ketosis — a personalised metabolic meter and an AI coach that reads your body and your plate.
        </div>
      </div>

      <div style={{ marginBottom: 36, opacity: 0.35 }}><MeterPreview /></div>

      <button
        onClick={() => setStep('profile')}
        style={{
          background: 'linear-gradient(135deg, #C9A84C, #E6C24A)', color: '#14201A',
          border: 'none', borderRadius: 14, padding: '16px 40px',
          fontFamily: 'var(--font-playfair), serif', fontSize: '1.05rem', fontWeight: 700,
          cursor: 'pointer', boxShadow: '0 4px 20px rgba(201,168,76,0.35)', transition: 'transform 0.15s',
        }}
        onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.97)')}
        onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        Get started
      </button>

      <p style={{
        marginTop: 40, fontFamily: 'var(--font-lato), sans-serif', fontSize: '0.68rem',
        color: '#8FA396', textAlign: 'center', maxWidth: 280, lineHeight: 1.5, opacity: 0.7,
      }}>
        Powered by real physiology — glycogen depletion, ketone production, and fat-adaptation
        curves backed by clinical data.
      </p>
    </div>
  )
}
