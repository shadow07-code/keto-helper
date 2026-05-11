import type { Metadata } from 'next'
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

export const metadata: Metadata = {
  title: 'KetoHelper — Is it Keto?',
  description: 'AI-powered keto compliance checker with macro analysis.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${lato.variable}`}>
      <body className="pb-[64px]">
        {children}
        <NavBar />
      </body>
    </html>
  )
}
