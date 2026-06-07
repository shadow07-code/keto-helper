'use client'

import { useState, useRef, useCallback } from 'react'
import { PieChart, Pie, Cell, Tooltip, Label, ResponsiveContainer } from 'recharts'
import { type MacroValues, saveEntry } from '../lib/history'
import { buildGameState } from '../lib/ketosis'

/* ─── Types ──────────────────────────────────────────────── */
interface MacroPct { carbs_pct: number; protein_pct: number; fat_pct: number }
interface KetoAlt  { name: string; reason: string; keto_score: number }

interface NutritionData {
  corrected_name: string
  parsed_quantity_g: number
  quantity_display: string
  per_100g: MacroValues
  per_quantity: MacroValues
  macro_percentages_per_100g: MacroPct
  macro_percentages_per_quantity: MacroPct
  keto_score: number
  recommendation: string
  keto_alternatives: KetoAlt[]
}

/* ─── Constants ──────────────────────────────────────────── */
const SCORE_CIRC = 263.9

/* ─── Helpers ────────────────────────────────────────────── */
function fmt(n: number | undefined) {
  if (n == null || isNaN(n)) return '—'
  return n % 1 === 0 ? String(n) : n.toFixed(1)
}
function scoreColor(s: number) {
  return s >= 8 ? '#4ADE80' : s >= 5 ? '#E6C24A' : '#D4714A'
}
function scoreLabel(s: number) {
  return s >= 8 ? 'Keto Friendly' : s >= 5 ? 'Borderline' : 'Avoid on Keto'
}

/* ─── Sub-components ─────────────────────────────────────── */
const MACRO_SLICES = [
  { key: 'fat',     label: 'Fat',     color: '#C9A84C' },
  { key: 'protein', label: 'Protein', color: '#4ADE80' },
  { key: 'carbs',   label: 'Carbs',   color: '#D4714A' },
] as const

function MacroDonut({ pct, vals }: {
  pct: { carbs_pct: number; protein_pct: number; fat_pct: number }
  vals: MacroValues
}) {
  const sliceData = [
    { ...MACRO_SLICES[0], value: pct.fat_pct,     grams: vals.fat_g     },
    { ...MACRO_SLICES[1], value: pct.protein_pct, grams: vals.protein_g },
    { ...MACRO_SLICES[2], value: pct.carbs_pct,   grams: vals.carbs_g   },
  ]
  const kcal = Math.round(vals.calories)

  return (
    <div style={{ marginBottom: 28 }}>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={sliceData}
            cx="50%" cy="50%"
            innerRadius="52%" outerRadius="74%"
            paddingAngle={2}
            dataKey="value"
            startAngle={90}
            endAngle={-270}
            strokeWidth={0}
          >
            {sliceData.map((s, i) => <Cell key={i} fill={s.color} />)}
            <Label
              content={({ viewBox }) => {
                const vb = viewBox as { cx?: number; cy?: number }
                const cx = vb?.cx ?? 0
                const cy = vb?.cy ?? 0
                if (!cx || !cy) return <g />
                return (
                  <g>
                    <text x={cx} y={cy - 8} textAnchor="middle"
                      fill="#F3EEE2" fontSize={26} fontWeight={700}
                      fontFamily="var(--font-playfair), serif">
                      {kcal}
                    </text>
                    <text x={cx} y={cy + 12} textAnchor="middle"
                      fill="#8FA396" fontSize={9} fontWeight={700} letterSpacing={2}>
                      KCAL
                    </text>
                  </g>
                )
              }}
              position="center"
            />
          </Pie>
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #2C4036', background: '#1E2E26', color: '#F3EEE2' }}
            formatter={(v, _, entry) => {
              const pl = (entry as { payload?: { label: string; grams: number } }).payload
              return pl ? [`${v}%  ·  ${fmt(pl.grams)} g`, pl.label] : [`${v}%`, '']
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend row */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginTop: -4 }}>
        {sliceData.map(({ label, color, value, grams }) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', margin: '0 auto 4px', background: color }} />
            <span style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color }}>
              {label}
            </span>
            <span style={{ display: 'block', fontSize: '0.95rem', fontWeight: 700, color: '#F3EEE2' }}>{fmt(grams)} g</span>
            <span style={{ display: 'block', fontSize: '0.72rem', color: '#8FA396' }}>{Math.round(value)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ScoreRing({ score }: { score: number }) {
  const offset = SCORE_CIRC * (1 - score / 10)
  const color  = scoreColor(score)
  return (
    <div style={{ position: 'relative', width: 100, height: 100, flexShrink: 0 }}>
      <svg style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="42" fill="none" stroke="#2C4036" strokeWidth={8} />
        <circle cx="50" cy="50" r="42" fill="none" strokeWidth={8} strokeLinecap="round"
          style={{ strokeDasharray: SCORE_CIRC, strokeDashoffset: offset, stroke: color, transition: 'stroke-dashoffset 0.9s cubic-bezier(0.4,0,0.2,1), stroke 0.4s' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: 'var(--font-playfair), serif', fontSize: '1.9rem', fontWeight: 700, lineHeight: 1, color: '#F3EEE2' }}>{score}</span>
        <span style={{ fontSize: '0.6rem', color: '#8FA396', fontWeight: 700, letterSpacing: '0.08em' }}>/ 10</span>
        <span style={{ fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8FA396', marginTop: 3 }}>Keto Score</span>
      </div>
    </div>
  )
}

function AltCard({ alt }: { alt: KetoAlt }) {
  return (
    <div style={{
      background: '#1E2E26',
      borderRadius: 8,
      border: '1px solid #2C4036',
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontFamily: 'var(--font-playfair), serif', fontWeight: 700, color: '#F3EEE2', fontSize: '1rem', lineHeight: 1.25 }}>{alt.name}</span>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: 999, color: '#fff', flexShrink: 0, background: scoreColor(alt.keto_score) }}>
          {alt.keto_score}/10
        </span>
      </div>
      <p style={{ fontSize: '0.82rem', color: '#8FA396', lineHeight: 1.5 }}>{alt.reason}</p>
    </div>
  )
}

/* ─── Main Page ──────────────────────────────────────────── */
export default function AnalysePage() {
  const [input, setInput]             = useState('')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [data, setData]               = useState<NutritionData | null>(null)
  const [tab, setTab]                 = useState<'quantity' | '100g'>('quantity')
  const [photoLoading, setPhotoLoading] = useState(false)
  const [detectedChip, setDetectedChip] = useState('')
  const [logState, setLogState]         = useState<'idle' | 'logged'>('idle')
  const [xpFlash, setXpFlash]           = useState<number | null>(null)

  const inputRef    = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  /* ── Analyse ── */
  const analyse = useCallback(async () => {
    const q = input.trim()
    if (!q) { setError('Enter a food item to analyse.'); inputRef.current?.focus(); return }
    setLoading(true); setError(''); setData(null)
    try {
      const res  = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ food_input: q }),
      })
      const json = await res.json()
      if (!res.ok || json.error) { setError(json.error ?? 'Something went wrong.'); return }

      setData(json)
      setTab('quantity')
      setDetectedChip('')
      setLogState('idle')
      setXpFlash(null)

    } catch {
      setError('Network error — check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }, [input])

  /* ── Image compression helper ── */
  const compressImage = useCallback((file: File, maxBytes: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const objectUrl = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(objectUrl)
        const canvas = document.createElement('canvas')
        const scale = Math.min(1, Math.sqrt(maxBytes / file.size))
        canvas.width  = Math.round(img.width  * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext('2d')
        if (!ctx) { reject(new Error('Canvas unavailable')); return }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

        let quality = 0.85
        const tryNext = () => {
          canvas.toBlob(blob => {
            if (!blob) { reject(new Error('Compression failed')); return }
            if (blob.size <= maxBytes || quality <= 0.1) {
              const reader = new FileReader()
              reader.onload = () => resolve((reader.result as string).split(',')[1])
              reader.onerror = reject
              reader.readAsDataURL(blob)
            } else {
              quality = parseFloat((quality - 0.1).toFixed(1))
              tryNext()
            }
          }, 'image/jpeg', quality)
        }
        tryNext()
      }
      img.onerror = reject
      img.src = objectUrl
    })
  }, [])

  /* ── Photo upload ── */
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    if (file.size > 20 * 1024 * 1024) {
      setError('Photo is too large — please use an image under 20 MB.')
      return
    }

    setPhotoLoading(true)
    setError('')

    try {
      const TARGET = 2.5 * 1024 * 1024
      const base64 = file.size <= TARGET
        ? await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve((reader.result as string).split(',')[1])
            reader.onerror = reject
            reader.readAsDataURL(file)
          })
        : await compressImage(file, TARGET)

      const media_type = file.size <= TARGET ? (file.type || 'image/jpeg') : 'image/jpeg'

      const res  = await fetch('/api/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_data: base64, media_type }),
      })
      const json = await res.json()

      if (!res.ok || json.error) {
        setError(json.error ?? 'Could not identify food from photo.')
        return
      }

      const { detected_food, estimated_weight_g } = json
      const filled = `${detected_food} ${estimated_weight_g}g`
      setInput(filled)
      setDetectedChip(`Detected: ${detected_food} ~${estimated_weight_g}g`)

    } catch {
      setError('Photo upload failed — please try again.')
    } finally {
      setPhotoLoading(false)
    }
  }, [compressImage])

  /* ── Log + XP flash ── */
  const handleLog = () => {
    if (logState === 'logged' || !data) return
    saveEntry({
      id:               Date.now().toString(),
      timestamp:        Date.now(),
      food_name:        data.corrected_name,
      quantity_display: data.quantity_display,
      keto_score:       data.keto_score,
      per_quantity:     data.per_quantity,
    })
    setLogState('logged')

    // Flash XP earned
    const gs = buildGameState()
    if (gs) setXpFlash(10) // base meal XP
    setTimeout(() => setXpFlash(null), 2500)
  }

  const pct  = data ? (tab === 'quantity' ? data.macro_percentages_per_quantity : data.macro_percentages_per_100g) : null
  const vals = data ? (tab === 'quantity' ? data.per_quantity : data.per_100g) : null

  return (
    <div style={{
      minHeight: '100vh',
      padding: '24px 20px 32px',
    }}>
      {/* Header */}
      <header style={{ textAlign: 'center', marginBottom: 28, paddingTop: 8 }}>
        <h1 style={{
          fontFamily: 'var(--font-playfair), serif',
          fontSize: '1.6rem',
          fontWeight: 700,
          color: '#F3EEE2',
          lineHeight: 1.1,
        }}>
          Fuel your <span style={{ color: '#E6C24A' }}>journey</span>
        </h1>
        <p style={{
          fontFamily: 'var(--font-lato), sans-serif',
          fontSize: '0.72rem',
          color: '#D44866',
          marginTop: 6,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          fontWeight: 700,
        }}>
          Log a meal — earn XP, move your meter
        </p>
      </header>

      {/* Input section */}
      <section style={{ maxWidth: 540, margin: '0 auto 24px' }}>
        <label htmlFor="food-input" style={{
          display: 'block',
          fontFamily: 'var(--font-playfair), serif',
          fontWeight: 600,
          color: '#F3EEE2',
          fontSize: '1.1rem',
          marginBottom: 10,
          textAlign: 'center',
        }}>
          What are you eating?
        </label>

        {/* Input + camera row */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
          <input
            id="food-input"
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => { setInput(e.target.value); if (detectedChip) setDetectedChip(''); if (error) setError(''); if (logState === 'logged') setLogState('idle') }}
            onKeyDown={e => e.key === 'Enter' && analyse()}
            placeholder="e.g. avocado 400g · 2 eggs"
            autoComplete="off"
            spellCheck={false}
            style={{
              flex: '2 1 0%',
              minWidth: 0,
              padding: '10px 16px',
              background: '#1E2E26',
              border: '1px solid #2C4036',
              borderRadius: 8,
              color: '#F3EEE2',
              fontSize: '0.92rem',
              fontFamily: 'var(--font-lato), sans-serif',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={photoLoading || loading}
            title="Upload a food photo"
            style={{
              flex: '1 1 0%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#C9A84C',
              color: '#14201A',
              border: 'none',
              borderRadius: 8,
              cursor: photoLoading || loading ? 'not-allowed' : 'pointer',
              opacity: photoLoading || loading ? 0.5 : 1,
              transition: 'opacity 0.2s',
            }}
          >
            {photoLoading ? (
              <span className="spinner" style={{ fontSize: '1rem' }}>&#x27F3;</span>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            )}
          </button>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />

        {/* Subtitles */}
        <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
          <p style={{ flex: '2 1 0%', fontSize: '0.72rem', color: '#8FA396', textAlign: 'center', margin: 0 }}>Describe your meal and quantity</p>
          <p style={{ flex: '1 1 0%', fontSize: '0.72rem', color: '#8FA396', textAlign: 'right', whiteSpace: 'nowrap', margin: 0 }}>Snap your meal</p>
        </div>

        {/* Analyse button */}
        <button
          onClick={analyse}
          disabled={loading}
          style={{
            width: '100%',
            marginTop: 12,
            padding: '14px 28px',
            background: 'linear-gradient(135deg, #B8344C, #8B2238)',
            color: '#F3EEE2',
            border: 'none',
            borderRadius: 8,
            fontSize: '0.8rem',
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            fontFamily: 'var(--font-lato), sans-serif',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.5 : 1,
            transition: 'opacity 0.2s',
            boxShadow: '0 4px 16px rgba(184,52,76,0.3)',
          }}
        >
          {loading ? <span className="spinner">&#x27F3;</span> : 'Analyse'}
        </button>

        {/* Detection chip */}
        {detectedChip && (
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 12px', background: 'rgba(230,194,74,0.12)', border: '1px solid rgba(230,194,74,0.3)',
              borderRadius: 999, fontSize: '0.78rem', color: '#E6C24A', fontWeight: 600,
            }}>
              📷 {detectedChip}
            </span>
            <button onClick={() => setDetectedChip('')} style={{ color: '#8FA396', background: 'none', border: 'none', fontSize: '0.75rem', cursor: 'pointer' }}>✕</button>
          </div>
        )}

        {/* Error */}
        {error && (
          <p style={{ marginTop: 8, fontSize: '0.82rem', color: '#D4714A', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>⚠</span> {error}
          </p>
        )}
      </section>

      {/* K icon loading animation */}
      {(loading || photoLoading) && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', maxWidth: 540, margin: '0 auto' }}>
          <svg className="keto-loading-icon" width="80" height="80" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
            <rect width="512" height="512" rx="112" fill="#2D4A3E"/>
            <text x="256" y="340" textAnchor="middle" fontFamily="Georgia, serif" fontSize="300" fontWeight="700" fill="#C9A84C">K</text>
          </svg>
          <p style={{ marginTop: 20, fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#C9A84C', opacity: 0.8 }}>
            {photoLoading ? 'Detecting food…' : 'Analysing…'}
          </p>
        </div>
      )}

      {/* Results */}
      {data && (
        <section className="animate-fade-up" style={{ maxWidth: 600, margin: '0 auto' }}>

          {/* Log & Earn XP button */}
          <div style={{ marginBottom: 24 }}>
            <button
              onClick={handleLog}
              disabled={logState === 'logged'}
              style={{
                width: '100%',
                padding: '14px 24px',
                borderRadius: 10,
                border: 'none',
                background: logState === 'logged'
                  ? 'rgba(74,222,128,0.15)'
                  : 'linear-gradient(135deg, #C9A84C, #E6C24A)',
                color: logState === 'logged' ? '#4ADE80' : '#14201A',
                fontFamily: 'var(--font-lato), sans-serif',
                fontSize: '0.85rem',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                cursor: logState === 'logged' ? 'default' : 'pointer',
                transition: 'background 0.3s, color 0.3s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: logState === 'logged' ? 'none' : '0 4px 16px rgba(201,168,76,0.3)',
              }}
            >
              {logState === 'logged' ? '✓ Logged' : '＋ Log & Earn XP'}
            </button>

            {/* XP flash */}
            {xpFlash != null && (
              <div style={{
                textAlign: 'center',
                marginTop: 8,
                fontFamily: 'var(--font-lato), sans-serif',
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#E6C24A',
              }}
                className="animate-fade-up"
              >
                +{xpFlash} XP earned!
              </div>
            )}
          </div>

          {/* Food name + score */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 20,
            paddingBottom: 24,
            marginBottom: 24,
            borderBottom: '1px solid #2C4036',
          }}>
            <div style={{ flex: '1 1 200px', minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#D44866', marginBottom: 6 }}>Analysed Food</span>
              <h2 style={{ fontFamily: 'var(--font-playfair), serif', fontWeight: 700, color: '#F3EEE2', lineHeight: 1.2, fontSize: 'clamp(1.4rem, 4vw, 2rem)', margin: 0 }}>
                {data.corrected_name}
              </h2>
              <span style={{
                display: 'inline-block', marginTop: 8, padding: '2px 12px',
                borderRadius: 999, fontSize: '0.78rem', fontWeight: 700,
                color: '#E6C24A', background: 'rgba(230,194,74,0.1)', border: '1px solid rgba(230,194,74,0.2)',
              }}>
                {data.quantity_display}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <ScoreRing score={data.keto_score} />
              <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: scoreColor(data.keto_score) }}>
                {scoreLabel(data.keto_score)}
              </span>
            </div>
          </div>

          {/* Tab switch */}
          <div style={{ display: 'flex', borderBottom: '1px solid #2C4036', marginBottom: 24 }}>
            {(['quantity', '100g'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{
                  padding: '10px 20px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-lato), sans-serif',
                  borderBottom: `2px solid ${tab === t ? '#D44866' : 'transparent'}`,
                  marginBottom: -1,
                  background: 'none',
                  border: 'none',
                  borderBottomWidth: 2,
                  borderBottomStyle: 'solid',
                  borderBottomColor: tab === t ? '#D44866' : 'transparent',
                  color: tab === t ? '#F3EEE2' : '#8FA396',
                  cursor: 'pointer',
                  transition: 'color 0.2s, border-color 0.2s',
                }}>
                {t === 'quantity' ? 'Per Quantity' : 'Per 100 g'}
              </button>
            ))}
          </div>

          {/* Macro donut */}
          {pct && vals && <MacroDonut pct={pct} vals={vals} />}

          {/* Summary strip */}
          {vals && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-around',
              background: '#1E2E26',
              borderRadius: 10,
              padding: '20px 16px',
              marginBottom: 24,
              border: '1px solid #2C4036',
            }}>
              {[
                { v: Math.round(vals.calories) + ' kcal', k: 'Calories'  },
                { v: fmt(vals.net_carbs_g) + ' g',        k: 'Net Carbs' },
                { v: fmt(vals.fiber_g)     + ' g',        k: 'Fiber'     },
              ].map(({ v, k }, i, arr) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <span style={{ display: 'block', fontFamily: 'var(--font-playfair), serif', fontWeight: 700, color: '#F3EEE2', fontSize: '1.25rem', lineHeight: 1 }}>{v}</span>
                    <span style={{ display: 'block', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#8FA396', marginTop: 6 }}>{k}</span>
                  </div>
                  {i < arr.length - 1 && <div style={{ width: 1, height: 40, background: '#2C4036', flexShrink: 0 }} />}
                </div>
              ))}
            </div>
          )}

          {/* Recommendation */}
          <div style={{
            display: 'flex', gap: 16, padding: 20,
            border: '1px solid #2C4036', borderLeftWidth: 4, borderLeftColor: '#C9A84C',
            borderRadius: 8, background: 'rgba(201,168,76,0.04)', marginBottom: 24,
          }}>
            <span style={{ color: '#C9A84C', marginTop: 2, flexShrink: 0, fontSize: '0.85rem' }}>◆</span>
            <p style={{ fontFamily: 'var(--font-playfair), serif', fontStyle: 'italic', color: '#8FA396', fontSize: '0.95rem', lineHeight: 1.6, margin: 0 }}>{data.recommendation}</p>
          </div>

          {/* Keto Alternatives */}
          {data.keto_alternatives?.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ flex: 1, height: 1, background: '#2C4036' }} />
                <h3 style={{ fontFamily: 'var(--font-playfair), serif', fontWeight: 700, color: '#F3EEE2', fontSize: '1rem', whiteSpace: 'nowrap', margin: 0 }}>
                  Try These Keto Alternatives
                </h3>
                <div style={{ flex: 1, height: 1, background: '#2C4036' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                {data.keto_alternatives.map((alt, i) => <AltCard key={i} alt={alt} />)}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
