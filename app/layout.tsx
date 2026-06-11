import type { Metadata, Viewport } from 'next'
import { Playfair_Display, Lato } from 'next/font/google'
import NavBar from './components/NavBar'
import './globals.css'

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-playfair',
  display: 'swap',
})

const lato = Lato({
  subsets: ['latin'],
  weight: ['300', '400', '700'],
  variable: '--font-lato',
  display: 'swap',
})

export const viewport: Viewport = {
  themeColor: '#14201A',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: 'KetoHelper — Your Ketosis Journey',
  description: 'Gamified keto tracking — AI-powered meal analysis, ketosis meter, daily missions, and science-backed body cues.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'KetoHelper',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${lato.variable}`}>
      {/* Inline padding (not a Tailwind class) so the nav clearance + iOS safe-area inset can never be purged away */}
      <body style={{ paddingBottom: 'calc(64px + env(safe-area-inset-bottom))' }}>
        {children}
        <NavBar />
      </body>
    </html>
  )
}
