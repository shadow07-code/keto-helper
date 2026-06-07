'use client'

import { useState, useEffect, useCallback } from 'react'
import { getCoaching, loadCachedCoaching, type Coaching } from '../lib/coach'

const CONF_COLORS: Record<string, string> = {
  high:     '#4ADE80',
  moderate: '#E6C24A',
  low:      '#8FA396',
}

export default function CoachCard() {
  const [data, setData]       = useState<Coaching | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  const fetchCoaching = useCallback(async (force = false) => {
    setLoading(true)
    setError('')
    const res = await getCoaching({ force })
    if (res.data) setData(res.data)
    if (res.error && !res.data) setError(res.error)
    setLoading(false)
  }, [])

  useEffect(() => {
    // Paint any cached coaching instantly, then refresh in the background.
    const cached = loadCachedCoaching()
    if (cached) { setData(cached); setLoading(false) }
    fetchCoaching(false)
  }, [fetchCoaching])

  return (
    <div style={{
      background: 'linear-gradient(160deg, #20322A 0%, #1A2820 100%)',
      borderRadius: 16,
      padding: '16px 18px',
      border: '1px solid rgba(201,168,76,0.35)',
      boxShadow: '0 0 28px rgba(201,168,76,0.08)',
      position: 'relative',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: '1rem' }}>✨</span>
        <span style={{
          fontFamily: 'var(--font-lato), sans-serif', fontSize: '0.62rem', fontWeight: 700,
          letterSpacing: '0.16em', textTransform: 'uppercase', color: '#E6C24A', flex: 1,
        }}>
          AI Keto Coach
        </span>
        <button
          onClick={() => fetchCoaching(true)}
          disabled={loading}
          title="Refresh coaching"
          style={{
            background: 'none', border: 'none', cursor: loading ? 'default' : 'pointer',
            color: '#8FA396', fontSize: '0.9rem', padding: 2, lineHeight: 1,
            opacity: loading ? 0.4 : 1,
          }}
        >
          <span className={loading ? 'spinner' : ''} style={{ display: 'inline-block' }}>↻</span>
        </button>
      </div>

      {loading && !data ? (
        <CoachSkeleton />
      ) : data ? (
        <>
          {/* Focus headline */}
          <h3 style={{
            fontFamily: 'var(--font-playfair), serif', fontSize: '1.15rem', fontWeight: 700,
            color: '#F3EEE2', margin: '0 0 10px 0', lineHeight: 1.25,
          }}>
            {data.focus}
          </h3>

          {/* State estimate + confidence */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
            padding: '10px 12px', background: 'rgba(20,32,26,0.6)', borderRadius: 10,
            border: '1px solid #2C4036', marginBottom: 12,
          }}>
            <span style={{ fontSize: '0.82rem', color: '#F3EEE2', fontWeight: 600, fontFamily: 'var(--font-lato), sans-serif', flex: 1, lineHeight: 1.4 }}>
              {data.state_estimate}
            </span>
            <span style={{
              fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
              color: CONF_COLORS[data.confidence] ?? '#8FA396',
              background: `${CONF_COLORS[data.confidence] ?? '#8FA396'}1A`,
              padding: '3px 8px', borderRadius: 6, whiteSpace: 'nowrap',
              fontFamily: 'var(--font-lato), sans-serif',
            }}>
              {data.confidence} confidence
            </span>
          </div>

          {/* Assessment */}
          {data.assessment && (
            <p style={{
              fontFamily: 'var(--font-lato), sans-serif', fontSize: '0.85rem', color: '#F3EEE2',
              lineHeight: 1.55, margin: '0 0 10px 0',
            }}>
              {data.assessment}
            </p>
          )}

          {/* Reasoning */}
          {data.reasoning && (
            <p style={{
              fontFamily: 'var(--font-lato), sans-serif', fontSize: '0.76rem', color: '#8FA396',
              lineHeight: 1.5, margin: '0 0 12px 0', fontStyle: 'italic',
            }}>
              {data.reasoning}
            </p>
          )}

          {/* Guidance */}
          {data.guidance.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 10 }}>
              {data.guidance.map((g, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ color: '#E6C24A', fontSize: '0.8rem', lineHeight: 1.5, flexShrink: 0 }}>▸</span>
                  <span style={{ fontFamily: 'var(--font-lato), sans-serif', fontSize: '0.8rem', color: '#F3EEE2', lineHeight: 1.5 }}>{g}</span>
                </div>
              ))}
            </div>
          )}

          {/* Honesty footnote */}
          <p style={{
            fontFamily: 'var(--font-lato), sans-serif', fontSize: '0.62rem', color: '#8FA396',
            margin: 0, paddingTop: 8, borderTop: '1px solid #2C4036', opacity: 0.8, lineHeight: 1.4,
          }}>
            Estimated from your diet &amp; physiology — a blood or breath ketone meter is the only way to confirm.
          </p>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <p style={{ fontFamily: 'var(--font-lato), sans-serif', fontSize: '0.82rem', color: '#8FA396', margin: '0 0 10px 0' }}>
            {error || 'Coaching unavailable right now.'}
          </p>
          <button onClick={() => fetchCoaching(true)} style={{
            background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)',
            color: '#E6C24A', borderRadius: 8, padding: '6px 16px', cursor: 'pointer',
            fontSize: '0.75rem', fontWeight: 700, fontFamily: 'var(--font-lato), sans-serif',
          }}>
            Try again
          </button>
        </div>
      )}
    </div>
  )
}

function CoachSkeleton() {
  const bar = (w: string, h = 12): React.CSSProperties => ({
    width: w, height: h, borderRadius: 6, background: '#2C4036', marginBottom: 9,
  })
  return (
    <div className="keto-loading-icon" style={{ opacity: 0.6 }}>
      <div style={bar('60%', 18)} />
      <div style={bar('100%', 34)} />
      <div style={bar('95%')} />
      <div style={bar('88%')} />
      <div style={bar('70%')} />
    </div>
  )
}
