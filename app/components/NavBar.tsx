'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/',      label: 'Analyse',    icon: <AnalyseIcon /> },
  { href: '/today', label: 'Today',      icon: <TodayIcon />   },
  { href: '/past',  label: 'Past Meals', icon: <TrendsIcon />  },
]

export default function NavBar() {
  const path = usePathname()

  return (
    <nav style={{
      position:   'fixed',
      bottom:     0,
      left:       0,
      right:      0,
      height:     '64px',
      background: '#FAF6EF',
      borderTop:  '1.5px solid #E8DCC8',
      display:    'flex',
      alignItems: 'stretch',
      zIndex:     9999,
      boxShadow:  '0 -4px 20px rgba(37,61,49,0.12)',
    }}>
      {TABS.map(({ href, label, icon }) => {
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
              gap:            '4px',
              color:          active ? '#2D4A3E' : '#8A9280',
              textDecoration: 'none',
              borderTop:      `2.5px solid ${active ? '#C9A84C' : 'transparent'}`,
              transition:     'color 0.18s',
              fontFamily:     'var(--font-lato), sans-serif',
              fontSize:       '0.6rem',
              fontWeight:     700,
              letterSpacing:  '0.09em',
              textTransform:  'uppercase',
              background:     active ? 'rgba(201,168,76,0.06)' : 'transparent',
            }}
          >
            <span style={{ lineHeight: 1, color: active ? '#2D4A3E' : '#8A9280' }}>{icon}</span>
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

function AnalyseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
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

function TrendsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  )
}
