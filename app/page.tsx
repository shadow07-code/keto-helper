'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  buildGameState, markAchievementsSeen, resetJourney,
  dailyMission, type GameState,
} from './lib/ketosis'
import { loadHistory, dayTotals } from './lib/history'
import KetoMeter from './components/KetoMeter'
import XpBar from './components/XpBar'
import MissionCard from './components/MissionCard'
import FluForecast from './components/FluForecast'
import HydrationCard from './components/HydrationCard'
import BadgeShelf from './components/BadgeShelf'
import StreakFlame from './components/StreakFlame'
import WeekStrip from './components/WeekStrip'
import OnboardingHero from './components/OnboardingHero'
import CoachCard from './components/CoachCard'
import ProfileSetup from './components/ProfileSetup'
import AddToHomeScreen from './components/AddToHomeScreen'

function greetingFor(name?: string | null) {
  const h = new Date().getHours()
  const tod = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
  return name ? `${tod}, ${name}` : 'KetoHelper'
}

export default function JourneyHub() {
  const [gs, setGs] = useState<GameState | null | 'loading'>('loading')
  const [confirmReset, setConfirmReset] = useState(false)
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileDismissed, setProfileDismissed] = useState(false)

  const refresh = useCallback(() => {
    const state = buildGameState()
    setGs(state)
    if (state) {
      const unseen = state.achievements
        .filter(a => a.unlocked && !state.journey.seenAchievements.includes(a.id))
        .map(a => a.id)
      if (unseen.length > 0) setTimeout(() => markAchievementsSeen(unseen), 4000)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

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

  // No journey started — full onboarding (collects profile, then path)
  if (!gs) {
    return <OnboardingHero onStarted={refresh} />
  }

  // Editing / completing profile takes over the screen
  if (editingProfile) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', padding: '40px 20px' }}>
        <ProfileSetup
          initial={gs.profile}
          heading={gs.profile ? 'Edit your profile' : 'Tell me about you'}
          onComplete={() => { setEditingProfile(false); refresh() }}
          onSkip={() => setEditingProfile(false)}
        />
      </div>
    )
  }

  const profile = gs.profile

  // Today's mission
  const allMeals = loadHistory()
  const todayKey = new Date().toDateString()
  const todayMeals = allMeals.filter(m => new Date(m.timestamp).toDateString() === todayKey)
  const todayMacros = todayMeals.length > 0 ? dayTotals(todayMeals) : { calories: 0, fat_g: 0, protein_g: 0, carbs_g: 0, net_carbs_g: 0, fiber_g: 0 }
  const mission = dailyMission(gs.model, todayMacros, todayMeals.length)

  const handleReset = () => { resetJourney(); setGs(null); setConfirmReset(false) }

  const showProfileNudge = !profile && !profileDismissed

  return (
    <div style={{ minHeight: '100vh', padding: '20px 20px 32px' }}>
      {/* Top bar */}
      <div className="rise rise-1" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{
          fontFamily: 'var(--font-playfair), serif', fontSize: '1.45rem', fontWeight: 700, color: '#F3EEE2',
        }}>
          {profile?.name
            ? <>{greetingFor(profile.name).split(', ')[0]}, <span style={{ color: '#C9A84C' }}>{profile.name}</span></>
            : <>Keto<span style={{ color: '#C9A84C' }}>Helper</span></>}
        </div>
        <AddToHomeScreen />
      </div>

      <div className="rise rise-1" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
        <span className="tnum" style={{
          fontFamily: 'var(--font-lato), sans-serif', fontSize: '0.62rem', fontWeight: 700,
          letterSpacing: '0.1em', textTransform: 'uppercase', color: '#E6C24A',
          background: 'rgba(230,194,74,0.1)', border: '1px solid rgba(230,194,74,0.25)',
          borderRadius: 999, padding: '3px 10px',
        }}>
          Day {gs.model.daysSinceStart}
        </span>
        <span style={{
          fontFamily: 'var(--font-lato), sans-serif', fontSize: '0.62rem', fontWeight: 700,
          letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8FA396',
        }}>
          {gs.model.personalized ? 'Personalised' : 'Estimated'} ketosis journey
        </span>
      </div>

      {/* Keto Meter (hero) */}
      <div className="rise rise-2">
        <KetoMeter level={gs.model.level} phase={gs.model.phase} />
      </div>

      {/* Streak row */}
      <div className="rise rise-3" style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 14, marginBottom: 20 }}>
        <StreakFlame streak={gs.model.streak} maxStreak={gs.model.maxStreak} />
      </div>

      {/* Component stack */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 500, margin: '0 auto' }}>

        {/* The chain — last 7 days at a glance */}
        <div className="rise rise-3">
          <WeekStrip dayStates={gs.model.dayStates} />
        </div>

        {/* Profile nudge for users without body data */}
        {showProfileNudge && (
          <div style={{
            background: 'rgba(201,168,76,0.07)', border: '1px dashed rgba(201,168,76,0.4)',
            borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ fontSize: '1.3rem' }}>🧬</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-lato), sans-serif', fontSize: '0.82rem', fontWeight: 700, color: '#F3EEE2' }}>
                Unlock personalised coaching
              </div>
              <div style={{ fontFamily: 'var(--font-lato), sans-serif', fontSize: '0.72rem', color: '#8FA396', marginTop: 2 }}>
                Add your body stats for a metabolism-accurate meter.
              </div>
            </div>
            <button onClick={() => setEditingProfile(true)} style={{
              background: 'linear-gradient(135deg, #C9A84C, #E6C24A)', color: '#14201A', border: 'none',
              borderRadius: 8, padding: '7px 12px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
              fontFamily: 'var(--font-lato), sans-serif', whiteSpace: 'nowrap',
            }}>Set up</button>
            <button onClick={() => setProfileDismissed(true)} style={{
              background: 'none', border: 'none', color: '#8FA396', cursor: 'pointer', fontSize: '0.85rem', padding: 0,
            }}>✕</button>
          </div>
        )}

        {/* AI Coach — the intelligent centrepiece */}
        <div className="rise rise-4">
          <CoachCard />
        </div>

        {/* XP Bar */}
        <div className="rise rise-5">
          <XpBar progress={gs.progress} />
        </div>

        {/* Today's Mission */}
        <div className="rise rise-5">
          <MissionCard mission={mission} />
        </div>

        {/* Flu Forecast */}
        <div className="rise rise-6">
          <FluForecast flu={gs.flu} />
        </div>

        {/* Hydration / Body Cue */}
        <div className="rise rise-6">
          <HydrationCard bodyCue={gs.bodyCue} dateKey={todayKey} />
        </div>

        {/* Achievements */}
        <div className="rise rise-7">
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
            <h3 style={{ fontFamily: 'var(--font-playfair), serif', fontSize: '1rem', fontWeight: 700, color: '#F3EEE2', margin: 0 }}>
              Achievements
            </h3>
            <span className="tnum" style={{
              fontFamily: 'var(--font-lato), sans-serif', fontSize: '0.7rem', fontWeight: 700, color: '#8FA396',
            }}>
              {gs.achievements.filter(a => a.unlocked).length}/{gs.achievements.length} unlocked
            </span>
          </div>
          <BadgeShelf achievements={gs.achievements} seenIds={gs.journey.seenAchievements} />
        </div>
      </div>

      {/* Footer actions */}
      <div style={{ textAlign: 'center', marginTop: 32, display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
        <button onClick={() => setEditingProfile(true)} style={{
          background: 'none', border: 'none', color: '#8FA396', fontFamily: 'var(--font-lato), sans-serif',
          fontSize: '0.7rem', cursor: 'pointer', textDecoration: 'underline', opacity: 0.8,
        }}>
          {profile ? 'Edit profile' : 'Add your profile'}
        </button>

        {!confirmReset ? (
          <button onClick={() => setConfirmReset(true)} style={{
            background: 'none', border: 'none', color: '#8FA396', fontFamily: 'var(--font-lato), sans-serif',
            fontSize: '0.65rem', cursor: 'pointer', textDecoration: 'underline', opacity: 0.6,
          }}>
            Reset journey
          </button>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: '#D4714A', fontFamily: 'var(--font-lato), sans-serif' }}>
              Are you sure? This can&apos;t be undone.
            </span>
            <button onClick={handleReset} style={{
              background: '#D4714A', color: '#fff', border: 'none', borderRadius: 6,
              padding: '4px 12px', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-lato), sans-serif',
            }}>Reset</button>
            <button onClick={() => setConfirmReset(false)} style={{
              background: '#2C4036', color: '#8FA396', border: 'none', borderRadius: 6,
              padding: '4px 12px', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-lato), sans-serif',
            }}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  )
}
