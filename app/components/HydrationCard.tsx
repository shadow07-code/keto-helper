'use client'

import { useState, useEffect } from 'react'
import { type BodyCue, type CueTone, getHydration, setHydration } from '../lib/ketosis'

interface Props {
  bodyCue: BodyCue
  dateKey: string
}

const GLASS_ML = 250  // 250ml per glass

export default function HydrationCard({ bodyCue, dateKey }: Props) {
  const { icon, headline, detail, hydrationMl, supplements, tone } = bodyCue
  const targetGlasses = Math.ceil(hydrationMl / GLASS_ML)

  const [glasses, setGlasses] = useState(0)

  useEffect(() => {
    setGlasses(getHydration(dateKey))
  }, [dateKey])

  const handleTap = () => {
    const next = glasses >= targetGlasses ? 0 : glasses + 1
    setGlasses(next)
    setHydration(dateKey, next)
  }

  const toneColors: Record<CueTone, { border: string; bg: string }> = {
    warn:      { border: '#D4714A', bg: 'rgba(212,113,74,0.06)' },
    celebrate: { border: '#4ADE80', bg: 'rgba(74,222,128,0.06)' },
    neutral:   { border: '#2C4036', bg: '#1E2E26' },
  }
  const tc = toneColors[tone]

  return (
    <div style={{
      background: tc.bg,
      borderRadius: 14,
      padding: '14px 18px',
      border: `1px solid ${tc.border}`,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: '1rem' }}>{icon}</span>
        <span style={{
          fontFamily: 'var(--font-playfair), serif',
          fontSize: '0.95rem',
          fontWeight: 700,
          color: '#F3EEE2',
          flex: 1,
        }}>
          {headline}
        </span>
      </div>

      {/* Detail */}
      <p style={{
        fontFamily: 'var(--font-lato), sans-serif',
        fontSize: '0.78rem',
        color: '#8FA396',
        margin: '0 0 12px 0',
        lineHeight: 1.5,
      }}>
        {detail}
      </p>

      {/* Hydration tracker */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: '#14201A',
        borderRadius: 10,
        padding: '10px 14px',
      }}>
        <span style={{ fontSize: '1.1rem' }}>💧</span>
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: 'var(--font-lato), sans-serif',
            fontSize: '0.72rem',
            fontWeight: 700,
            color: '#F3EEE2',
            marginBottom: 4,
          }}>
            {(hydrationMl / 1000).toFixed(1)}L target
          </div>
          {/* Glass icons */}
          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            {Array.from({ length: targetGlasses }).map((_, i) => (
              <span
                key={i}
                style={{
                  fontSize: '0.85rem',
                  opacity: i < glasses ? 1 : 0.25,
                  transition: 'opacity 0.2s',
                  cursor: 'pointer',
                }}
              >
                🥤
              </span>
            ))}
          </div>
        </div>
        <button
          onClick={handleTap}
          style={{
            background: glasses >= targetGlasses ? '#4ADE80' : '#2C4036',
            color: glasses >= targetGlasses ? '#14201A' : '#F3EEE2',
            border: 'none',
            borderRadius: 8,
            padding: '6px 12px',
            fontFamily: 'var(--font-lato), sans-serif',
            fontSize: '0.7rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'background 0.3s, color 0.3s',
          }}
        >
          {glasses >= targetGlasses ? '✓ Done' : `+1 Glass`}
        </button>
      </div>

      {/* Supplements */}
      {supplements.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
          {supplements.map((s, i) => (
            <span key={i} style={{
              fontFamily: 'var(--font-lato), sans-serif',
              fontSize: '0.62rem',
              fontWeight: 700,
              color: '#E6C24A',
              background: 'rgba(230,194,74,0.1)',
              padding: '3px 10px',
              borderRadius: 6,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}>
              {s}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
