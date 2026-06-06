'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  buildGameState, loadJourney, markAchievementsSeen, resetJourney,
  type GameState,
} from './lib/ketosis'
import { loadHistory, groupByDay, dayTotals } from './lib/history'
import { dailyMission } from './lib/ketosis'
import KetoMeter from './components/KetoMeter'
import XpBar from './components/XpBar'
import MissionCard from './components/MissionCard'
import FluForecast from './components/FluForecast'
import HydrationCard from './components/HydrationCard'
import BadgeShelf from './components/BadgeShelf'
import StreakFlame from './components/StreakFlame'
import OnboardingHero from './components/OnboardingHero'
import AddToHomeScreen from './components/AddToHomeScreen'

export default function JourneyHub() {
  const [gs, setGs] = useState<GameState | null | 'loading'>('loading')
  const [confirmReset, setConfirmReset] = useState(false)

  const refresh = useCallback(() => {
    const state = buildGameState()
    setGs(state)
    // Auto-mark unseen achievements as seen after first render
    if (state) {
      const unseen = state.achievements
        .filter(a => a.unlocked && !state.journey.seenAchievements.includes(a.id))
        .map(a => a.id)
      if (unseen.length > 0) {
        // Delay so the NEW flash is visible first
        setTimeout(() => markAchievementsSeen(unseen), 4000)
      }
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  // Listen for storage events (e.g. meal logged from /analyse tab)
  useEffect(() => {
    const handler = () => refresh()
    window.addEventListener('storage', handler)
    window.addEventListener('focus', handler)
    return () => { window.removeEventListener('storage', handler); window.removeEventListener('focus', handler) }
  }, [refresh])

  if (gs === 'loading') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg className="keto-loading-icon" width="60" height="60" viewBox="0 0 512 512">
          <rect width="512" height="512" rx="112" fill="#2D4A3E"/>
          <text x="256" y="340" textAnchor="middle" fontFamily="Georgia, serif" fontSize="300" fontWeight="700" fill="#C9A84C">K</text>
        </svg>
      </div>
    )
  }

  // No journey started — show onboarding
  if (!gs) {
    return <OnboardingHero onStarted={refresh} />
  }

  // Build today's mission
  const allMeals = loadHistory()
  const todayKey = new Date().toDateString()
  const todayMeals = allMeals.filter(m => new Date(m.timestamp).toDateString() === todayKey)
  const todayMacros = todayMeals.length > 0 ? dayTotals(todayMeals) : { calories: 0, fat_g: 0, protein_g: 0, carbs_g: 0, net_carbs_g: 0, fiber_g: 0 }
  const mission = dailyMission(gs.model, todayMacros, todayMeals.length)

  const handleReset = () => {
    resetJourney()
    setGs(null)
    setConfirmReset(false)
  }

  return (
    <div style={{ minHeight: '100vh', padding: '20px 20px 32px' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{
          fontFamily: 'var(--font-playfair), serif',
          fontSize: '1.3rem',
          fontWeight: 700,
          color: '#F3EEE2',
        }}>
          Keto<span style={{ color: '#C9A84C' }}>Helper</span>
        </div>
        <AddToHomeScreen />
      </div>

      {/* Day counter */}
      <p style={{
        fontFamily: 'var(--font-lato), sans-serif',
        fontSize: '0.7rem',
        color: '#8FA396',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        marginBottom: 16,
      }}>
        Day {gs.model.daysSinceStart} of your ketosis journey
      </p>

      {/* ── Keto Meter (hero) ── */}
      <KetoMeter level={gs.model.level} phase={gs.model.phase} />

      {/* Streak + quick stats row */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 12, marginBottom: 20 }}>
        <StreakFlame streak={gs.model.streak} maxStreak={gs.model.maxStreak} />
      </div>

      {/* Component stack */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 500, margin: '0 auto' }}>
        {/* XP Bar */}
        <XpBar progress={gs.progress} />

        {/* Today's Mission */}
        <MissionCard mission={mission} />

        {/* Flu Forecast */}
        <FluForecast flu={gs.flu} />

        {/* Hydration / Body Cue */}
        <HydrationCard bodyCue={gs.bodyCue} dateKey={todayKey} />

        {/* Achievements */}
        <div>
          <h3 style={{
            fontFamily: 'var(--font-playfair), serif',
            fontSize: '1rem',
            fontWeight: 700,
            color: '#F3EEE2',
            marginBottom: 10,
          }}>
            Achievements
          </h3>
          <BadgeShelf
            achievements={gs.achievements}
            seenIds={gs.journey.seenAchievements}
          />
        </div>
      </div>

      {/* Reset journey link */}
      <div style={{ textAlign: 'center', marginTop: 32 }}>
        {!confirmReset ? (
          <button
            onClick={() => setConfirmReset(true)}
            style={{
              background: 'none',
              border: 'none',
              color: '#8FA396',
              fontFamily: 'var(--font-lato), sans-serif',
              fontSize: '0.65rem',
              cursor: 'pointer',
              textDecoration: 'underline',
              opacity: 0.6,
            }}
          >
            Reset journey
          </button>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: '#D4714A', fontFamily: 'var(--font-lato), sans-serif' }}>
              Are you sure? This can't be undone.
            </span>
            <button onClick={handleReset} style={{
              background: '#D4714A', color: '#fff', border: 'none', borderRadius: 6,
              padding: '4px 12px', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer',
              fontFamily: 'var(--font-lato), sans-serif',
            }}>
              Reset
            </button>
            <button onClick={() => setConfirmReset(false)} style={{
              background: '#2C4036', color: '#8FA396', border: 'none', borderRadius: 6,
              padding: '4px 12px', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer',
              fontFamily: 'var(--font-lato), sans-serif',
            }}>
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
