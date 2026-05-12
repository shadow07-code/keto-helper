'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { PieChart, Pie, Cell, Tooltip, Label, ResponsiveContainer } from 'recharts'
import { type MacroValues, saveEntry } from './lib/history'
import AddToHomeScreen from './components/AddToHomeScreen'

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
const FOODS      = ['🥑','🥩','🥚','🍗','🧀','🥦','🐟','🫒']
const SIDE_FOODS = [...FOODS, '🥑', '🥩']

/* ─── Helpers ────────────────────────────────────────────── */
function fmt(n: number | undefined) {
  if (n == null || isNaN(n)) return '—'
  return n % 1 === 0 ? String(n) : n.toFixed(1)
}
function scoreColor(s: number) {
  return s >= 8 ? '#4A7C59' : s >= 5 ? '#C9A84C' : '#D4714A'
}
function scoreLabel(s: number) {
  return s >= 8 ? 'Keto Friendly' : s >= 5 ? 'Borderline' : 'Avoid on Keto'
}

/* ─── Sub-components ─────────────────────────────────────── */
const MACRO_SLICES = [
  { key: 'fat',     label: 'Fat',     color: '#C9A84C' },
  { key: 'protein', label: 'Protein', color: '#4A7C59' },
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
    <div className="mb-7">
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
                const vb = viewBox as { cx: number; cy: number }
                return (
                  <g>
                    <text x={vb.cx} y={vb.cy - 8} textAnchor="middle"
                      fill="#2D4A3E" fontSize={26} fontWeight={700}
                      fontFamily="var(--font-playfair), serif">
                      {kcal}
                    </text>
                    <text x={vb.cx} y={vb.cy + 12} textAnchor="middle"
                      fill="#8A9280" fontSize={9} fontWeight={700} letterSpacing={2}>
                      KCAL
                    </text>
                  </g>
                )
              }}
              position="center"
            />
          </Pie>
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E8DCC8', background: '#FAF6EF' }}
            formatter={(v, _, entry) => {
              const pl = (entry as { payload?: { label: string; grams: number } }).payload
              return pl ? [`${v}%  ·  ${fmt(pl.grams)} g`, pl.label] : [`${v}%`, '']
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend row */}
      <div className="flex justify-center gap-8 -mt-1">
        {sliceData.map(({ label, color, value, grams }) => (
          <div key={label} className="text-center">
            <div className="w-2.5 h-2.5 rounded-full mx-auto mb-1" style={{ background: color }} />
            <span className="block text-[0.65rem] font-bold tracking-widest uppercase" style={{ color }}>
              {label}
            </span>
            <span className="block text-[0.95rem] font-bold text-[#2D4A3E]">{fmt(grams)} g</span>
            <span className="block text-[0.72rem] text-[#8A9280]">{Math.round(value)}%</span>
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
    <div className="relative w-[100px] h-[100px] sm:w-[110px] sm:h-[110px] flex-shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="42" className="score-track" />
        <circle cx="50" cy="50" r="42" className="score-arc"
          style={{ '--offset': String(offset), stroke: color } as React.CSSProperties} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-playfair text-[1.9rem] sm:text-[2rem] font-bold leading-none text-[#2D4A3E]">{score}</span>
        <span className="text-[0.6rem] text-[#8A9280] font-bold tracking-wide">/ 10</span>
        <span className="text-[0.55rem] font-bold tracking-widest uppercase text-[#8A9280] mt-1">Keto Score</span>
      </div>
    </div>
  )
}

function AltCard({ alt }: { alt: KetoAlt }) {
  return (
    <div className="bg-white rounded border border-[#E8DCC8] p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="font-playfair font-bold text-[#2D4A3E] text-base leading-tight">{alt.name}</span>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white flex-shrink-0"
          style={{ background: scoreColor(alt.keto_score) }}>
          {alt.keto_score}/10
        </span>
      </div>
      <p className="text-[0.82rem] text-[#4A5240] leading-snug">{alt.reason}</p>
    </div>
  )
}

/* ─── Main Page ──────────────────────────────────────────── */
export default function Home() {
  const [input, setInput]             = useState('')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [data, setData]               = useState<NutritionData | null>(null)
  const [tab, setTab]                 = useState<'quantity' | '100g'>('quantity')
  const [photoLoading, setPhotoLoading] = useState(false)
  const [detectedChip, setDetectedChip] = useState('')
  const [logState, setLogState]         = useState<'idle' | 'logged'>('idle')

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

    } catch {
      setError('Network error — check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }, [input])

  /* ── Photo upload ── */
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = '' // allow re-selecting same file

    if (file.size > 10 * 1024 * 1024) {
      setError('Photo is too large — please use an image under 10 MB.')
      e.target.value = ''
      return
    }

    setPhotoLoading(true)
    setError('')

    try {
      const reader = new FileReader()
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string
          // data:image/jpeg;base64,XXXX → extract parts
          resolve(result.split(',')[1])
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const media_type = file.type || 'image/jpeg'

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
      setDetectedChip(`📷 Detected: ${detected_food} ~${estimated_weight_g}g`)

    } catch {
      setError('Photo upload failed — please try again.')
    } finally {
      setPhotoLoading(false)
    }
  }, [])

  const pct  = data ? (tab === 'quantity' ? data.macro_percentages_per_quantity : data.macro_percentages_per_100g) : null
  const vals = data ? (tab === 'quantity' ? data.per_quantity : data.per_100g) : null

  return (
    <div className="relative min-h-screen" style={{
      background: 'radial-gradient(ellipse at 20% 20%, #3B6B4E 0%, transparent 55%), radial-gradient(ellipse at 80% 80%, #1E3A2E 0%, transparent 55%), linear-gradient(160deg, #2E5240 0%, #1E3228 50%, #253D31 100%)',
      padding: 'clamp(40px, 6vw, 88px)',
    }}>
      {/* Gold corners */}
      <span className="absolute top-0 left-0 w-16 h-16 sm:w-20 sm:h-20 border-t-2 border-l-2 border-gold opacity-50 pointer-events-none z-10" />
      <span className="absolute bottom-0 right-0 w-16 h-16 sm:w-20 sm:h-20 border-b-2 border-r-2 border-gold opacity-50 pointer-events-none z-10" />

      {/* Left border */}
      <div className="border-strip left-0 top-0 bottom-0 flex-col hidden sm:flex"
        style={{ width: 'clamp(40px, 6vw, 88px)', paddingBlock: 'clamp(40px, 6vw, 88px)', gap: '4px' }}>
        {SIDE_FOODS.map((f, i) => <span key={i} style={{ fontSize: 'clamp(1rem, 2vw, 1.9rem)' }}>{f}</span>)}
      </div>

      {/* Right border */}
      <div className="border-strip right-0 top-0 bottom-0 flex-col hidden sm:flex"
        style={{ width: 'clamp(40px, 6vw, 88px)', paddingBlock: 'clamp(40px, 6vw, 88px)', gap: '4px' }}>
        {[...SIDE_FOODS].reverse().map((f, i) => <span key={i} style={{ fontSize: 'clamp(1rem, 2vw, 1.9rem)' }}>{f}</span>)}
      </div>

      {/* ── Inner cream card ── */}
      <main className="relative bg-cream rounded-sm" style={{
        minHeight: 'calc(100vh - 2 * clamp(40px, 6vw, 88px))',
        padding: 'clamp(24px, 5vw, 56px)',
        boxShadow: 'inset 0 0 0 1px rgba(201,168,76,0.30), inset 0 0 0 3px rgba(201,168,76,0.07), 0 8px 48px rgba(0,0,0,0.38)',
      }}>
        <div className="absolute top-0 left-[6%] right-[6%] h-[1.5px] opacity-60"
          style={{ background: 'linear-gradient(to right, transparent, #C9A84C, transparent)' }} />

        {/* Add to Home Screen CTA */}
        <div className="flex justify-end mb-2 pt-1">
          <AddToHomeScreen />
        </div>

        {/* Header */}
        <header className="text-center mb-8 sm:mb-10 pt-2">
          <div className="text-gold text-[0.65rem] tracking-[18px] mb-3 opacity-80">✦ ✦ ✦</div>
          <h1 className="font-playfair font-bold text-green-rich leading-none tracking-tight"
            style={{ fontSize: 'clamp(2.2rem, 6vw, 3.8rem)' }}>
            Keto<span className="text-gold">Helper</span>
          </h1>
          <p className="text-[#8A9280] text-[0.72rem] font-light tracking-[0.22em] uppercase mt-3">
            Intelligent nutrition analysis for your ketogenic journey
          </p>
          <div className="w-14 h-[1.5px] mx-auto mt-5 opacity-70"
            style={{ background: 'linear-gradient(to right, transparent, #C9A84C, transparent)' }} />
        </header>

        {/* Input section */}
        <section className="max-w-2xl mx-auto mb-7">
          <label htmlFor="food-input" className="block font-playfair font-semibold text-green-rich text-[1.05rem] mb-2.5">
            What are you eating?
          </label>

          {/* Input row */}
          <div className="flex gap-2 flex-col sm:flex-row">
            <input
              id="food-input"
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => { setInput(e.target.value); if (detectedChip) setDetectedChip(''); if (error) setError(''); if (logState === 'logged') setLogState('idle') }}
              onKeyDown={e => e.key === 'Enter' && analyse()}
              placeholder="e.g. avocado 400g · 2 scrambled eggs · mangoes"
              autoComplete="off"
              spellCheck={false}
              className="flex-1 min-w-0 px-5 py-3.5 bg-white border border-cream-dark rounded text-[0.95rem] text-[#1C2B20] placeholder:text-[#8A9280] placeholder:italic placeholder:text-[0.87rem] outline-none transition focus:border-green-mid focus:ring-2 focus:ring-green-mid/15"
            />
            <div className="flex gap-2">
              <button onClick={analyse} disabled={loading}
                className="flex-1 sm:flex-none px-7 py-3.5 bg-green-rich text-cream rounded text-[0.8rem] font-bold tracking-widest uppercase transition hover:bg-green-mid active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-md whitespace-nowrap">
                {loading ? <span className="spinner">⟳</span> : 'Analyse'}
              </button>
              {/* Photo upload button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={photoLoading || loading}
                title="Upload a food photo"
                className="px-4 py-3.5 bg-cream-dark text-green-rich rounded text-lg transition hover:bg-cream-mid active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed border border-[#E8DCC8]"
              >
                {photoLoading ? <span className="spinner text-sm">⟳</span> : '📷'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Detection chip */}
          {detectedChip && (
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#F5EDD0] border border-[#E8CC7A] rounded-full text-[0.78rem] text-brown font-semibold">
                {detectedChip}
              </span>
              <button onClick={() => setDetectedChip('')} className="text-[#8A9280] hover:text-[#4A5240] text-xs">✕</button>
            </div>
          )}

          {/* Inline error */}
          {error && (
            <p className="mt-2 text-[0.82rem] text-[#C05A30] flex items-center gap-1.5">
              <span>⚠</span> {error}
            </p>
          )}
          <p className="mt-2 text-[0.74rem] text-[#8A9280] italic">
            Type a food name, include quantity — or 📷 upload a photo to auto-detect
          </p>
        </section>

        {/* Results */}
        {data && (
          <section className="max-w-3xl mx-auto animate-fade-up">

            {/* Food name + score */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 pb-6 mb-6 border-b border-cream-dark">
              <div className="flex-1 min-w-0">
                <span className="block text-[0.66rem] font-bold tracking-[0.22em] uppercase text-[#8A9280] mb-1.5">Analysed Food</span>
                <h2 className="font-playfair font-bold text-green-rich leading-snug"
                  style={{ fontSize: 'clamp(1.5rem, 4vw, 2.2rem)' }}>
                  {data.corrected_name}
                </h2>
                <span className="inline-block mt-2 px-3 py-0.5 rounded-full text-[0.78rem] font-bold text-brown bg-gold-pale border border-cream-dark">
                  {data.quantity_display}
                </span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <ScoreRing score={data.keto_score} />
                <span className="text-[0.68rem] font-bold tracking-wider uppercase"
                  style={{ color: scoreColor(data.keto_score) }}>
                  {scoreLabel(data.keto_score)}
                </span>
              </div>
            </div>

            {/* Tab switch */}
            <div className="flex border-b border-cream-dark mb-7">
              {(['quantity', '100g'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-5 sm:px-7 py-2.5 text-[0.74rem] font-bold tracking-widest uppercase border-b-2 -mb-px transition ${tab === t ? 'text-green-rich border-green-rich' : 'text-[#8A9280] border-transparent hover:text-[#4A5240]'}`}>
                  {t === 'quantity' ? 'Per Quantity' : 'Per 100 g'}
                </button>
              ))}
            </div>

            {/* Single macro donut */}
            {pct && vals && <MacroDonut pct={pct} vals={vals} />}

            {/* Summary strip */}
            {vals && (
              <div className="flex items-center justify-around bg-green-rich rounded px-4 sm:px-10 py-5 mb-7 shadow-md">
                {[
                  { v: Math.round(vals.calories) + ' kcal', k: 'Calories'  },
                  { v: fmt(vals.net_carbs_g) + ' g',        k: 'Net Carbs' },
                  { v: fmt(vals.fiber_g)     + ' g',        k: 'Fiber'     },
                ].map(({ v, k }, i, arr) => (
                  <div key={k} className="flex items-center flex-1">
                    <div className="flex-1 text-center">
                      <span className="block font-playfair font-bold text-cream text-xl sm:text-2xl leading-none">{v}</span>
                      <span className="block text-[0.62rem] font-bold tracking-[0.18em] uppercase text-green-light mt-1.5">{k}</span>
                    </div>
                    {i < arr.length - 1 && <div className="w-px h-10 bg-white/10 flex-shrink-0" />}
                  </div>
                ))}
              </div>
            )}

            {/* Recommendation */}
            <div className="flex gap-4 p-5 border border-cream-dark border-l-4 rounded bg-[rgba(201,168,76,0.05)] mb-7"
              style={{ borderLeftColor: '#C9A84C' }}>
              <span className="text-gold mt-0.5 flex-shrink-0 text-sm">◆</span>
              <p className="font-playfair italic text-[#4A5240] text-[0.95rem] leading-relaxed">{data.recommendation}</p>
            </div>

            {/* Keto Alternatives */}
            {data.keto_alternatives?.length > 0 && (
              <div className="mt-2">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-px bg-cream-dark" />
                  <h3 className="font-playfair font-bold text-green-rich text-base sm:text-lg whitespace-nowrap">
                    🥗 Try These Keto Alternatives
                  </h3>
                  <div className="flex-1 h-px bg-cream-dark" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {data.keto_alternatives.map((alt, i) => <AltCard key={i} alt={alt} />)}
                </div>
              </div>
            )}

            {/* Log this Meal */}
            <div className="mt-8 max-w-2xl mx-auto">
              <button
                onClick={() => {
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
                }}
                disabled={logState === 'logged'}
                style={{
                  width:          '100%',
                  padding:        '14px 24px',
                  borderRadius:   '6px',
                  border:         'none',
                  background:     logState === 'logged' ? '#A8883C' : '#C9A84C',
                  color:          '#2D4A3E',
                  fontFamily:     'var(--font-lato), sans-serif',
                  fontSize:       '0.8rem',
                  fontWeight:     700,
                  letterSpacing:  '0.14em',
                  textTransform:  'uppercase',
                  cursor:         logState === 'logged' ? 'default' : 'pointer',
                  opacity:        logState === 'logged' ? 0.85 : 1,
                  transition:     'background 0.2s, opacity 0.2s',
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  gap:            '8px',
                }}
              >
                {logState === 'logged' ? '✓ Logged to Today' : '＋ Log this Meal'}
              </button>
            </div>

          </section>
        )}
      </main>
    </div>
  )
}
