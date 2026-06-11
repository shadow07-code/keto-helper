'use client'

import { useState } from 'react'
import {
  saveProfile, AGE_BRACKETS,
  type Profile, type AgeBracket, type Sex,
} from '../lib/profile'

interface Props {
  initial?: Profile | null
  onComplete: () => void
  onSkip?: () => void          // present when shown as an optional gate
  heading?: string
  sub?: string
}

const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: 'male',    label: 'Male' },
  { value: 'female',  label: 'Female' },
  { value: 'neutral', label: 'Prefer not to say' },
]

export default function ProfileSetup({ initial, onComplete, onSkip, heading, sub }: Props) {
  const [name, setName]         = useState(initial?.name ?? '')
  const [ageBracket, setAge]    = useState<AgeBracket | null>(initial?.ageBracket ?? null)
  const [height, setHeight]     = useState(initial?.heightCm ? String(initial.heightCm) : '')
  const [weight, setWeight]     = useState(initial?.weightKg ? String(initial.weightKg) : '')
  const [sex, setSex]           = useState<Sex>(initial?.sex ?? 'neutral')
  const [error, setError]       = useState('')

  const handleSave = () => {
    if (!name.trim()) { setError('Please tell me what to call you.'); return }
    const h = parseFloat(height)
    const w = parseFloat(weight)
    const profile: Profile = {
      name:       name.trim(),
      heightCm:   isFinite(h) && h > 0 ? Math.round(h) : null,
      weightKg:   isFinite(w) && w > 0 ? Math.round(w) : null,
      ageBracket,
      sex,
    }
    saveProfile(profile)
    onComplete()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px', background: '#14201A',
    border: '1px solid #2C4036', borderRadius: 10, color: '#F3EEE2',
    fontSize: '1rem', fontFamily: 'var(--font-lato), sans-serif', outline: 'none',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em',
    textTransform: 'uppercase', color: '#8FA396', marginBottom: 6,
    fontFamily: 'var(--font-lato), sans-serif',
  }

  return (
    <div style={{ width: '100%', maxWidth: 360, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'var(--font-playfair), serif', fontSize: '1.5rem', fontWeight: 700, color: '#F3EEE2', margin: 0 }}>
          {heading ?? 'Tell me about you'}
        </h2>
        <p style={{ fontFamily: 'var(--font-lato), sans-serif', fontSize: '0.8rem', color: '#8FA396', marginTop: 8, lineHeight: 1.5 }}>
          {sub ?? 'This powers your personalised ketosis estimate and AI coaching. Body stats are optional but make the science far more accurate.'}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Name */}
        <div>
          <label style={labelStyle}>What should I call you?</label>
          <input
            value={name}
            onChange={e => { setName(e.target.value); if (error) setError('') }}
            placeholder="e.g. Antony"
            autoComplete="given-name"
            style={inputStyle}
          />
        </div>

        {/* Age bracket */}
        <div>
          <label style={labelStyle}>Age</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {AGE_BRACKETS.map(b => {
              const active = ageBracket === b
              return (
                <button key={b} onClick={() => setAge(b)} style={{
                  padding: '9px 0', borderRadius: 8, cursor: 'pointer',
                  fontSize: '0.8rem', fontWeight: 700, fontFamily: 'var(--font-lato), sans-serif',
                  background: active ? 'rgba(201,168,76,0.14)' : '#14201A',
                  border: `1px solid ${active ? '#C9A84C' : '#2C4036'}`,
                  color: active ? '#E6C24A' : '#8FA396',
                  transition: 'all 0.15s',
                }}>{b}</button>
              )
            })}
          </div>
        </div>

        {/* Height + Weight */}
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Height (cm)</label>
            <input value={height} onChange={e => setHeight(e.target.value)}
              inputMode="numeric" placeholder="178" style={inputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Weight (kg)</label>
            <input value={weight} onChange={e => setWeight(e.target.value)}
              inputMode="numeric" placeholder="75" style={inputStyle} />
          </div>
        </div>

        {/* Sex */}
        <div>
          <label style={labelStyle}>Sex <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>(for accurate BMR)</span></label>
          <div style={{ display: 'flex', gap: 8 }}>
            {SEX_OPTIONS.map(o => {
              const active = sex === o.value
              return (
                <button key={o.value} onClick={() => setSex(o.value)} style={{
                  flex: 1, padding: '9px 0', borderRadius: 8, cursor: 'pointer',
                  fontSize: '0.72rem', fontWeight: 700, fontFamily: 'var(--font-lato), sans-serif',
                  background: active ? 'rgba(201,168,76,0.14)' : '#14201A',
                  border: `1px solid ${active ? '#C9A84C' : '#2C4036'}`,
                  color: active ? '#E6C24A' : '#8FA396',
                  transition: 'all 0.15s', lineHeight: 1.2,
                }}>{o.label}</button>
              )
            })}
          </div>
        </div>

        {error && <p style={{ fontSize: '0.8rem', color: '#D4714A', margin: 0 }}>⚠ {error}</p>}

        {/* Save */}
        <button onClick={handleSave} style={{
          marginTop: 4, padding: '15px 24px', borderRadius: 12, border: 'none',
          background: 'linear-gradient(135deg, #C9A84C, #E6C24A)', color: '#14201A',
          fontFamily: 'var(--font-playfair), serif', fontSize: '1rem', fontWeight: 700,
          cursor: 'pointer', boxShadow: '0 4px 20px rgba(201,168,76,0.35)',
        }}>
          {onSkip ? 'Save & personalise' : 'Continue'}
        </button>

        {onSkip && (
          <button onClick={onSkip} style={{
            background: 'none', border: 'none', color: '#8FA396',
            fontFamily: 'var(--font-lato), sans-serif', fontSize: '0.72rem',
            cursor: 'pointer', textDecoration: 'underline',
          }}>
            Maybe later
          </button>
        )}
      </div>
    </div>
  )
}
