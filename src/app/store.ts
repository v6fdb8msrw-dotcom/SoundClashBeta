import { useSyncExternalStore } from 'react'
import { defaultEnv, initialState, pname, reduce, savedSettings, type Action, type Env, type Fx } from '../core/game'
import type { State } from '../core/types'
import * as audio from '../services/audio'
import { GEN } from '../services/catalog'
import { famousPoolMulti, loadTops, loadTopsFor, timelinePool } from '../services/deezer'
import { recordRivalry } from '../services/rivalry'
import * as sfx from '../services/sfx'
import { saveSettings } from '../services/storage'
import { bus } from './bus'
import { loadGenre } from './artistList'
import { spinAnim } from './wheelAnim'

/**
 * Laufzeit: hält den Spielzustand, schickt Aktionen durch die reine Spiellogik (core/game.ts)
 * und führt danach die Effekte aus (Klang, Speichern, Deezer-Laden, Animationen …).
 */

export const env: Env = defaultEnv()

let state: State = initialState()
const listeners = new Set<() => void>()

export const getState = () => state
export function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function dispatch(action: Action) {
  const res = reduce(state, action, env, GEN)
  state = res.state
  listeners.forEach((fn) => fn())
  for (const f of res.fx) runFx(f)
}

export function useGame(): State {
  return useSyncExternalStore(subscribe, getState, getState)
}

const topsCtx = { genre: () => state.genre, eras: () => state.eras }

function runFx(f: Fx) {
  switch (f.t) {
    case 'sound':
      sfx.SOUNDS[f.n]()
      return
    case 'tone':
      sfx.tone(f.f, f.st, f.d, f.v, f.ty)
      return
    case 'vib':
      sfx.vib(f.p)
      return
    case 'confetti':
      if (!env.reduce) bus.emit('confetti', f.s)
      return
    case 'toast':
      bus.emit('toast', f.m)
      return
    case 'save':
      saveSettings(savedSettings(state))
      return
    case 'ac':
      sfx.ac()
      return
    case 'stopAudio':
      audio.stopAudio()
      return
    case 'gStop':
      audio.gStop()
      return
    case 'stopAmbience':
      audio.stopAmbience()
      return
    case 'startAmbienceIfPlaying':
      if (audio.playing) audio.startAmbience()
      return
    case 'bgSeed':
      bus.emit('bgSeed', Math.random())
      return
    case 'loadTopsFor':
      void loadTopsFor(f.names, topsCtx)
      return
    case 'loadTops': {
      const names: string[] = []
      for (let p = 1; p <= state.players; p++) (state.lineup[p] || []).forEach((a) => a && names.push(a))
      void loadTops(names, topsCtx)
      return
    }
    case 'later':
      setTimeout(() => dispatch(f.action), f.ms)
      return
    case 'loadPool':
      void loadPool(f.kind, f.genres, f.diff)
      return
    case 'preload':
      audio.preloadCard(f.card)
      return
    case 'rivalry':
      if (state.players !== 2) return
      recordRivalry(pname(state, 1), pname(state, 2), f.winner, f.draw, env.now())
      return
    case 'genreList':
      loadGenre(f.genre)
      return
    case 'spinAnim':
      spinAnim(f.target, f.n, env.reduce, () => dispatch({ type: 'land' }))
      return
  }
}

async function loadPool(kind: 'gs' | 'sb' | 'tl' | 'dd', genres: string[], diff?: string) {
  if (kind === 'gs' || kind === 'sb') {
    let pool: Awaited<ReturnType<typeof famousPoolMulti>> = []
    try {
      pool = await famousPoolMulti(genres, diff || 'easy')
    } catch {
      pool = []
    }
    dispatch(kind === 'gs' ? { type: 'gsPool', pool } : { type: 'sbPool', pool })
    return
  }
  let pool: Awaited<ReturnType<typeof timelinePool>> = []
  try {
    pool = await timelinePool(genres, env.rng)
  } catch {
    pool = []
  }
  dispatch(kind === 'tl' ? { type: 'tlPool', pool } : { type: 'ddPool', pool })
}
