'use client'

import { useEffect, useRef, useState } from 'react'
import { PHASES, type Phase } from '../lib/ketosis'

// ─── Geometry ──────────────────────────────────────────────────────────
// Angle convention: 180° = far left, 0° = far right, arcs sweep over the
// TOP half (y is flipped so positive angles point up in SVG space).

const CX = 140
const CY = 132
const R  = 104

function pt(r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180
  return { x: CX + r * Math.cos(rad), y: CY - r * Math.sin(rad) }
}

/** Arc over the top from a1 (left, larger angle) to a2 (right, smaller). */
function arc(r: number, a1: number, a2: number) {
  const s = pt(r, a1)
  const e = pt(r, a2)
  const large = a1 - a2 > 180 ? 1 : 0
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`
}

function levelToAngle(level: number) {
  return 180 - (level / 100) * 180
}

// Ease-out with a slight overshoot, so the needle "lands" like a real gauge.
function easeOutBack(p: number) {
  const c = 1.25
  return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2)
}

interface Props {
  level: number        // 0–100
  phase: Phase
  animated?: boolean   // default true
}

export default function KetoMeter({ level, phase, animated = true }: Props) {
  const [displayLevel, setDisplayLevel] = useState(animated ? 0 : level)
  const displayRef = useRef(displayLevel)
  displayRef.current = displayLevel

  useEffect(() => {
    if (!animated) { setDisplayLevel(level); return }
    if (typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayLevel(level)
      return
    }
    const start = displayRef.current
    const diff  = level - start
    if (diff === 0) return
    const duration = 1100
    const t0 = performance.now()
    let raf: number
    const step = (now: number) => {
      const progress = Math.min((now - t0) / duration, 1)
      const v = start + diff * easeOutBack(progress)
      setDisplayLevel(Math.max(0, Math.min(100, v)))
      if (progress < 1) raf = requestAnimationFrame(step)
      else setDisplayLevel(level)
    }
    raf = requestAnimationFrame(step)
    // rAF is paused in throttled/background tabs — guarantee the needle settles.
    const settle = setTimeout(() => setDisplayLevel(level), duration + 250)
    return () => { cancelAnimationFrame(raf); clearTimeout(settle) }
  }, [level, animated])

  const needleAngle = levelToAngle(displayLevel)
  const tip   = pt(R - 26, needleAngle)
  const tail  = pt(16, needleAngle - 180)
  const deep  = level >= 60   // genuinely in ketosis → hub glow breathes

  return (
    <div style={{ width: '100%', maxWidth: 320, margin: '0 auto', position: 'relative' }}>
      {/* Phase-reactive ambient glow behind the gauge */}
      <div style={{
        position: 'absolute',
        left: '50%',
        top: '54%',
        transform: 'translate(-50%, -50%)',
        width: 250,
        height: 160,
        borderRadius: '50%',
        background: `radial-gradient(closest-side, ${phase.color}, transparent 72%)`,
        opacity: 0.16,
        filter: 'blur(28px)',
        pointerEvents: 'none',
        transition: 'background 1s ease',
      }} />

      <svg viewBox="0 0 280 170" style={{ width: '100%', overflow: 'visible', position: 'relative' }}>
        <defs>
          <linearGradient id="meterProg" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"  stopColor="#C9A84C" />
            <stop offset="100%" stopColor="#E6C24A" />
          </linearGradient>
        </defs>

        {/* Recessed track behind the zones */}
        <path d={arc(R, 180, 0)} fill="none" stroke="#1B2A22" strokeWidth={22} strokeLinecap="round" />

        {/* Zone arcs */}
        {PHASES.map((p) => {
          const a1 = levelToAngle(p.min)
          const a2 = levelToAngle(Math.min(p.max, 100))
          const active = phase.key === p.key
          return (
            <path
              key={p.key}
              d={arc(R, a1, a2)}
              fill="none"
              stroke={p.color}
              strokeWidth={16}
              strokeLinecap="butt"
              opacity={active ? 1 : 0.18}
              style={{
                transition: 'opacity 0.6s',
                filter: active ? `drop-shadow(0 0 7px ${p.color})` : 'none',
              }}
            />
          )
        })}

        {/* Minor ticks every 10 */}
        {Array.from({ length: 11 }, (_, i) => i * 10).map(lv => {
          const a = levelToAngle(lv)
          const major = lv % 20 === 0
          const o = pt(R - 13, a)
          const inn = pt(R - (major ? 22 : 18), a)
          return (
            <line
              key={lv}
              x1={inn.x} y1={inn.y} x2={o.x} y2={o.y}
              stroke={major ? '#3A5246' : '#273B30'}
              strokeWidth={major ? 2 : 1.2}
            />
          )
        })}

        {/* Scale end labels */}
        <text x={32} y={CY + 18} textAnchor="middle" fill="#5E7066"
          style={{ fontFamily: 'var(--font-lato), sans-serif', fontSize: '0.55rem', fontWeight: 700 }}>0</text>
        <text x={248} y={CY + 18} textAnchor="middle" fill="#5E7066"
          style={{ fontFamily: 'var(--font-lato), sans-serif', fontSize: '0.55rem', fontWeight: 700 }}>100</text>

        {/* Inner progress arc — fills with the needle */}
        {displayLevel > 1.5 && (
          <path
            d={arc(R - 30, 180, needleAngle)}
            fill="none"
            stroke="url(#meterProg)"
            strokeWidth={5}
            strokeLinecap="round"
            style={{ filter: 'drop-shadow(0 0 5px rgba(230,194,74,0.55))' }}
          />
        )}

        {/* Needle (with counterweight tail) */}
        <line
          x1={tail.x} y1={tail.y} x2={tip.x} y2={tip.y}
          stroke="#E6C24A"
          strokeWidth={3.5}
          strokeLinecap="round"
          style={{ filter: 'drop-shadow(0 0 6px rgba(230,194,74,0.6))' }}
        />

        {/* Hub: breathing aura when genuinely in ketosis */}
        {deep && (
          <circle className="hub-pulse" cx={CX} cy={CY} r={15} fill="none"
            stroke={phase.color} strokeWidth={1.5} />
        )}
        <circle cx={CX} cy={CY} r={9} fill="#1E2E26" stroke="#E6C24A" strokeWidth={2} />
        <circle cx={CX} cy={CY} r={3} fill="#E6C24A" />

        {/* Center label: level % */}
        <text
          x={CX} y={CY - 42}
          textAnchor="middle"
          fill="#F3EEE2"
          className="tnum"
          style={{ fontFamily: 'var(--font-playfair), serif', fontSize: '2.4rem', fontWeight: 700 }}
        >
          {Math.round(displayLevel)}%
        </text>
        <text
          x={CX} y={CY - 24}
          textAnchor="middle"
          fill="#8FA396"
          style={{ fontFamily: 'var(--font-lato), sans-serif', fontSize: '0.52rem', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase' as const }}
        >
          est. ketosis
        </text>
      </svg>

      {/* Phase chip */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 2 }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          padding: '5px 14px',
          borderRadius: 999,
          background: `${phase.color}14`,
          border: `1px solid ${phase.color}55`,
          color: phase.color,
          fontFamily: 'var(--font-lato), sans-serif',
          fontSize: '0.66rem',
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          transition: 'color 0.6s, background 0.6s, border-color 0.6s',
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%', background: phase.color,
            boxShadow: `0 0 6px ${phase.color}`, transition: 'background 0.6s',
          }} />
          {phase.label}
        </span>
      </div>
    </div>
  )
}
