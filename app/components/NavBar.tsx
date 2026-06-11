'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/* ─── 4-slot nav with raised center Fuel button ────────────
   Layout: Journey · Today · ⊕ FUEL (raised) · Progress
   100% inline styles — Tailwind purging has broken this before.
   DO NOT convert any style to a CSS class.
──────────────────────────────────────────────────────────── */

const LEFT_TABS = [
  { href: '/',      label: 'Journey', icon: <JourneyIcon /> },
  { href: '/today', label: 'Today',   icon: <TodayIcon />   },
]

const RIGHT_TABS = [
  { href: '/past',  label: 'Progress', icon: <ProgressIcon /> },
]

export default function NavBar() {
  const path = usePathname()
  const fuelActive = path === '/analyse'

  return (
    <nav style={{
      position:      'fixed',
      bottom:        0,
      left:          0,
      right:         0,
      height:        'calc(64px + env(safe-area-inset-bottom))',
      paddingBottom: 'env(safe-area-inset-bottom)',
      background:    'rgba(30,46,38,0.94)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      borderTop:     '1px solid #2C4036',
      display:       'flex',
      alignItems:    'stretch',
      zIndex:        9999,
      boxShadow:     '0 -4px 24px rgba(0,0,0,0.35)',
    }}>
      {/* Left tabs */}
      {LEFT_TABS.map(({ href, label, icon }) => {
        const active = path === href
        return (
          <Link
            key={href}
            href={href}
            style={{
              flex:           1,
              display:        'flex',
              flexDirection:  'column',
              alignItems:     'center',
              justifyContent: 'center',
              gap:            '3px',
              color:          active ? '#E6C24A' : '#8FA396',
              textDecoration: 'none',
              borderTop:      `2.5px solid ${active ? '#E6C24A' : 'transparent'}`,
              transition:     'color 0.18s',
              fontFamily:     'var(--font-lato), sans-serif',
              fontSize:       '0.58rem',
              fontWeight:     700,
              letterSpacing:  '0.09em',
              textTransform:  'uppercase',
              background:     active ? 'rgba(230,194,74,0.06)' : 'transparent',
            }}
          >
            <span style={{ lineHeight: 1, color: active ? '#E6C24A' : '#8FA396' }}>{icon}</span>
            <span>{label}</span>
          </Link>
        )
      })}

      {/* Center: Raised Fuel button */}
      <div style={{
        flex:           1,
        display:        'flex',
        alignItems:     'flex-start',
        justifyContent: 'center',
        position:       'relative',
      }}>
        <Link
          href="/analyse"
          style={{
            width:          56,
            height:         56,
            borderRadius:   '50%',
            background:     fuelActive
              ? 'linear-gradient(135deg, #E6C24A, #C9A84C)'
              : 'linear-gradient(135deg, #C9A84C, #B8963C)',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            marginTop:      '-18px',
            boxShadow:      fuelActive
              ? '0 4px 20px rgba(230,194,74,0.5), 0 0 0 3px #1E2E26'
              : '0 4px 16px rgba(201,168,76,0.35), 0 0 0 3px #1E2E26',
            textDecoration: 'none',
            transition:     'box-shadow 0.2s, transform 0.15s',
          }}
        >
          <FuelIcon active={fuelActive} />
        </Link>
        {/* Fuel label below the circle */}
        <span style={{
          position:       'absolute',
          bottom:         6,
          left:           '50%',
          transform:      'translateX(-50%)',
          fontFamily:     'var(--font-lato), sans-serif',
          fontSize:       '0.5rem',
          fontWeight:     700,
          letterSpacing:  '0.09em',
          textTransform:  'uppercase',
          color:          fuelActive ? '#E6C24A' : '#8FA396',
          whiteSpace:     'nowrap',
        }}>
          Fuel
        </span>
      </div>

      {/* Right tabs */}
      {RIGHT_TABS.map(({ href, label, icon }) => {
        const active = path === href
        return (
          <Link
            key={href}
            href={href}
            style={{
              flex:           1,
              display:        'flex',
              flexDirection:  'column',
              alignItems:     'center',
              justifyContent: 'center',
              gap:            '3px',
              color:          active ? '#E6C24A' : '#8FA396',
              textDecoration: 'none',
              borderTop:      `2.5px solid ${active ? '#E6C24A' : 'transparent'}`,
              transition:     'color 0.18s',
              fontFamily:     'var(--font-lato), sans-serif',
              fontSize:       '0.58rem',
              fontWeight:     700,
              letterSpacing:  '0.09em',
              textTransform:  'uppercase',
              background:     active ? 'rgba(230,194,74,0.06)' : 'transparent',
            }}
          >
            <span style={{ lineHeight: 1, color: active ? '#E6C24A' : '#8FA396' }}>{icon}</span>
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

/* ─── Icons ──────────────────────────────────────────────── */

function JourneyIcon() {
  // Gauge / speedometer icon
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
      <path d="M12 6v6l4 2"/>
    </svg>
  )
}

function TodayIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  )
}

function FuelIcon({ active }: { active: boolean }) {
  // Plus + camera hybrid
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={active ? '#14201A' : '#14201A'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  )
}

function ProgressIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  )
}
