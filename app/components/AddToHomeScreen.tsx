'use client'

import { useState, useEffect } from 'react'

const DISMISSED_KEY = 'keto_a2hs_dismissed'

export default function AddToHomeScreen() {
  const [show, setShow]         = useState(false)
  const [isIOS, setIsIOS]       = useState(false)
  const [showTip, setShowTip]   = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  useEffect(() => {
    // Already installed (standalone mode) → never show
    if (window.matchMedia('(display-mode: standalone)').matches) return
    // User previously dismissed → never show
    if (localStorage.getItem(DISMISSED_KEY)) return

    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
    setIsIOS(ios)

    if (ios) {
      setShow(true)
      return
    }

    // Android / Chrome: wait for browser install prompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShow(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, '1')
    setShow(false)
    setShowTip(false)
  }

  async function handleClick() {
    if (isIOS) {
      setShowTip(t => !t)
      return
    }
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') dismiss()
    else setDeferredPrompt(null)
  }

  if (!show) return null

  return (
    <div className="relative">
      {/* CTA button */}
      <div className="flex items-center gap-1">
        <button
          onClick={handleClick}
          title="Add KetoHelper to your home screen"
          style={{
            display:        'flex',
            alignItems:     'center',
            gap:            '5px',
            fontSize:       '0.65rem',
            fontWeight:     700,
            letterSpacing:  '0.06em',
            textTransform:  'uppercase',
            color:          '#C9A84C',
            background:     'rgba(201,168,76,0.10)',
            border:         '1px solid rgba(201,168,76,0.35)',
            borderRadius:   '999px',
            padding:        '5px 10px',
            cursor:         'pointer',
            whiteSpace:     'nowrap',
          }}
        >
          <PhoneIcon />
          Add to Home Screen
        </button>
        <button
          onClick={dismiss}
          title="Dismiss"
          style={{
            background:   'none',
            border:       'none',
            color:        '#8A9280',
            cursor:       'pointer',
            fontSize:     '0.85rem',
            lineHeight:   1,
            padding:      '4px',
          }}
        >
          ×
        </button>
      </div>

      {/* iOS tooltip */}
      {isIOS && showTip && (
        <div style={{
          position:     'absolute',
          top:          'calc(100% + 8px)',
          right:        0,
          width:        '220px',
          background:   '#2D4A3E',
          color:        '#FAF6EF',
          borderRadius: '10px',
          padding:      '12px 14px',
          fontSize:     '0.75rem',
          lineHeight:   1.5,
          boxShadow:    '0 4px 20px rgba(0,0,0,0.35)',
          zIndex:       9998,
        }}>
          {/* Arrow */}
          <span style={{
            position:    'absolute',
            top:         '-6px',
            right:       '18px',
            width:       0,
            height:      0,
            borderLeft:  '6px solid transparent',
            borderRight: '6px solid transparent',
            borderBottom:'6px solid #2D4A3E',
          }} />
          Tap the <strong style={{ color: '#C9A84C' }}>Share</strong> button&nbsp;
          <ShareIcon /> in your browser, then choose{' '}
          <strong style={{ color: '#C9A84C' }}>&ldquo;Add to Home Screen&rdquo;</strong>.
        </div>
      )}
    </div>
  )
}

function PhoneIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <line x1="12" y1="18" x2="12" y2="18.01" />
    </svg>
  )
}

function ShareIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'inline', verticalAlign: 'middle' }}>
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  )
}
