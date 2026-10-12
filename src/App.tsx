import { MotionConfig, motion } from 'motion/react'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { bus } from './app/bus'
import { dispatch, env, getState, useGame } from './app/store'
import type { State } from './core/types'
import { Bracket } from './screens/Bracket'
import { Draft } from './screens/Draft'
import { Duel } from './screens/Duel'
import { Final } from './screens/Final'
import { Pick } from './screens/Pick'
import { Listen, PhonePick, PhoneSongs } from './screens/PhoneMode'
import { Round } from './screens/Round'
import { Setup } from './screens/Setup'
import { Songs } from './screens/Songs'
import { configureAudio } from './services/audio'
import { dz } from './services/deezer'
import { onlineRoles, resumeHost } from './remote/host'
import { drawer } from './core/game'
import { loadRivalry } from './services/rivalry'
import { configureSfx } from './services/sfx'
import { loadSettings, migrateLegacy } from './services/storage'
import { Background } from './ui/Background'
import { Fx } from './ui/Fx'
import { Presence, setOpenSel } from './ui/primitives'
import { SceneCut } from './ui/SceneCut'
import { Splash } from './ui/Splash'
import { Toast } from './ui/Toast'
import { TopBar } from './ui/TopBar'
import { UpdatePrompt } from './ui/UpdatePrompt'

/* ---- Start: Speicher übernehmen, Einstellungen laden (wie init() im Original) ---- */
let booted = false
function boot() {
  if (booted) return
  booted = true
  configureSfx(() => getState().muted, env.reduce)
  configureAudio({ toast: (m) => bus.emit('toast', m), ambience: () => getState().ambience })
  migrateLegacy()
  dispatch({ type: 'load', saved: loadSettings() })
  // Nur Sound Clash: direkt in den Sound-Clash-Start (Guess the Song und Timeline sind vorerst ausgeblendet)
  dispatch({ type: 'go', to: 'setup' })
  loadRivalry()
  // Deezer einmal antesten (bestimmt die Warnung)
  dz('search/artist', { q: 'drake', limit: 1 }).catch(() => undefined)
  // Handy-Kopplung nach einem Neuladen fortsetzen (nur wenn sie vorher aktiv war)
  resumeHost()
}
boot()

function screenKey(S: State): string {
  if (S.screen === 'pick') return `pick-${S.round}-${S.sd ? 'sd' : S.duel}-${S.phoneMode ? 'p' : S.pickIdx}`
  if (S.screen === 'listen') return `listen-${S.round}-${S.sd ? 'sd' : S.duel}`
  if (S.screen === 'duel') return `duel-${S.round}-${S.sd ? 'sd' : S.duel}`
  if (S.screen === 'draft') return `draft-${S.round}-${S.T ? S.T.r + '-' + S.T.m : ''}`
  if (S.screen === 'bracket') return `bracket-${S.T ? S.T.r + '-' + S.T.m : ''}`
  if (S.screen === 'gsplay') return `gs-${S.gs?.ridx ?? 0}-${S.gs?.loading ? 'l' : ''}`
  return S.screen
}

function ScreenView({ S }: { S: State }): ReactNode {
  switch (S.screen) {
    case 'bracket':
      return <Bracket S={S} />
    case 'draft':
      return <Draft S={S} />
    case 'songs':
      return S.phoneMode ? <PhoneSongs S={S} /> : <Songs S={S} />
    case 'pick':
      return S.phoneMode ? <PhonePick S={S} /> : <Pick S={S} />
    case 'listen':
      return <Listen S={S} />
    case 'duel':
      return <Duel S={S} />
    case 'round':
      return <Round S={S} />
    case 'final':
      return <Final S={S} />
    // Start und alles andere: Sound-Clash-Einrichtung
    default:
      return <Setup S={S} />
  }
}

export default function App() {
  const S = useGame()
  const [shrink, setShrink] = useState(false)
  const scroller = useRef(0)

  useLayoutEffect(() => {
    document.body.setAttribute('data-theme', S.theme)
  }, [S.theme])

  useEffect(() => {
    const close = () => setOpenSel(null)
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenSel(null)
      if (e.code !== 'Space' && e.key !== ' ') return
      const t = e.target as HTMLElement | null,
        tag = ((t && t.tagName) || '').toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'button' || (t && t.isContentEditable)) return
      if (getState().screen !== 'draft') return
      // Handy-Modus: dreht der Spieler am Handy, nicht per Leertaste am Hauptgerät
      if (getState().phoneMode && onlineRoles().includes(drawer(getState()))) return
      e.preventDefault()
      dispatch({ type: 'spin' })
    }
    const scroll = () => {
      const y = window.pageYOffset || document.documentElement.scrollTop || 0
      if (scroller.current === 0 && y > 80) {
        scroller.current = 1
        setShrink(true)
      } else if (scroller.current === 1 && y < 20) {
        scroller.current = 0
        setShrink(false)
      }
    }
    document.addEventListener('click', close)
    document.addEventListener('keydown', key)
    window.addEventListener('scroll', scroll, { passive: true })
    return () => {
      document.removeEventListener('click', close)
      document.removeEventListener('keydown', key)
      window.removeEventListener('scroll', scroll)
    }
  }, [])

  // Neuer Bildschirm: nach oben scrollen (das Original baute die Seite komplett neu)
  const key = screenKey(S)
  const lastScreen = useRef(S.screen)
  useEffect(() => {
    if (lastScreen.current !== S.screen) {
      lastScreen.current = S.screen
      if (S.screen !== 'draft' || S.phoneMode) window.scrollTo({ top: 0, behavior: env.reduce ? 'auto' : 'smooth' })
    }
  }, [S.screen])

  return (
    <MotionConfig reducedMotion="user">
      <Background S={S} />
      {S.phoneMode && S.screen !== 'setup' ? <div className="cine-vignette" aria-hidden /> : null}
      <Fx />
      <Toast />
      <SceneCut S={S} />
      <Splash />
      <div className="wrap">
        <TopBar S={S} shrink={shrink} />
        <Presence mode="wait">
          <motion.main
            id="app"
            key={key}
            data-screen={S.screen}
            className={'screen screen-' + S.screen}
            initial={env.reduce ? false : { opacity: 0, y: 26, scale: 0.985, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', transitionEnd: { filter: 'none' }, transition: { type: 'spring', stiffness: 260, damping: 30, mass: 0.9 } }}
            exit={env.reduce ? { opacity: 1, transition: { duration: 0 } } : { opacity: 0, y: -14, scale: 0.99, filter: 'blur(8px)', transition: { duration: 0.16, ease: 'easeIn' } }}
          >
            <ScreenView S={S} />
          </motion.main>
        </Presence>
      </div>
      <UpdatePrompt />
    </MotionConfig>
  )
}
