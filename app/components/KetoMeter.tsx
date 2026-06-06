'use client'

import { useEffect, useState } from 'react'
import { PHASES, type Phase } from '../lib/ketosis'

// ─── SVG arc helper ────────────────────────────────────────────────────
function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const start = polarToCartesian(cx, cy, r, endDeg)
  const end   = polarToCartesian(cx, cy, r, startDeg)
  const large = endDeg - startDeg <= 180 ? '0' : '1'
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y}`
}

// Maps level 0–100 → angle 180° (left) → 0° (right)  (top-half semicircle)
function levelToAngle(level: number) {
  return 180 - (level / 100) * 180
}

interface Props {
  level: number        // 0–100
  phase: Phase
  animated?: boolean   // default true
}

export default function KetoMeter({ level, phase, animated = true }: Props) {
  const [displayLevel, setDisplayLevel] = useState(animated ? 0 : level)

  useEffect(() => {
    if (!animated) { setDisplayLevel(level); return }
    // Animate from current to target
    const start = displayLevel
    const diff  = level - start
    if (diff === 0) return
    const duration = 900
    const t0 = performance.now()
    let raf: number
    const step = (now: number) => {
      const elapsed = now - t0
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const ease = 1 - Math.pow(1 - progress, 3)
      setDisplayLevel(Math.round(start + diff * ease))
      if (progress < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, animated])

  const cx = 140, cy = 130, r = 110
  const needleAngle = levelToAngle(displayLevel)
  const needleRad   = (needleAngle * Math.PI) / 180
  const needleTipX  = cx + (r - 12) * Math.cos(needleRad)
  const needleTipY  = cy + (r - 12) * Math.sin(needleRad)

  return (
    <div style={{ width: '100%', maxWidth: 300, margin: '0 auto', position: 'relative' }}>
      <svg viewBox="0 0 280 160" style={{ width: '100%', overflow: 'visible' }}>
        {/* Zone arcs */}
        {PHASES.map((p) => {
          const startAngle = 180 - (p.max > 100 ? 100 : p.max) / 100 * 180
          const endAngle   = 180 - p.min / 100 * 180
          return (
            <path
              key={p.key}
              d={describeArc(cx, cy, r, startAngle, endAngle)}
              fill="none"
              stroke={p.color}
              strokeWidth={18}
              strokeLinecap="butt"
              opacity={phase.key === p.key ? 1 : 0.3}
              style={{ transition: 'opacity 0.5s' }}
            />
          )
        })}

        {/* Tick marks at zone boundaries */}
        {[0, 20, 40, 60, 80, 100].map(lv => {
          const angle = levelToAngle(lv)
          const inner = polarToCartesian(cx, cy, r - 14, angle)
          const outer = polarToCartesian(cx, cy, r + 14, angle)
          return (
            <line
              key={lv}
              x1={inner.x} y1={inner.y}
              x2={outer.x} y2={outer.y}
              stroke="#2C4036"
              strokeWidth={2}
            />
          )
        })}

        {/* Needle */}
        <line
          x1={cx} y1={cy}
          x2={needleTipX} y2={needleTipY}
          stroke="#E6C24A"
          strokeWidth={3}
          strokeLinecap="round"
          style={{ filter: 'drop-shadow(0 0 6px rgba(230,194,74,0.6))' }}
        />
        {/* Needle hub */}
        <circle cx={cx} cy={cy} r={8} fill="#1E2E26" stroke="#E6C24A" strokeWidth={2} />

        {/* Center label: level % */}
        <text
          x={cx} y={cy - 28}
          textAnchor="middle"
          fill="#F3EEE2"
          style={{ fontFamily: 'var(--font-playfair), serif', fontSize: '2.2rem', fontWeight: 700 }}
        >
          {displayLevel}%
        </text>

        {/* Phase name */}
        <text
          x={cx} y={cy - 6}
          textAnchor="middle"
          fill={phase.color}
          style={{ fontFamily: 'var(--font-lato), sans-serif', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const }}
        >
          {phase.label}
        </text>
      </svg>
    </div>
  )
}
