import { produce } from 'immer'
import { AVATARS } from '../data/avatars'
import { resetColorCache, setBodyTheme, themeColors } from './colors'
import { AV, BGS, DIFF_CFG, ERAS, GUESS_STEPS, THEMES, decadeOf, eraOk } from './constants'
import type { PoolSong, SavedSettings, Song, State, Track, WinnerRecord } from './types'

/**
 * Spiellogik von Sound Clash – 1:1 aus dem Original übernommen.
 *
 * Aufbau: `reduce(state, action, env)` liefert den neuen Zustand und eine Liste von Effekten
 * (Klänge, Toasts, Speichern, Laden bei Deezer …), die die Oberfläche danach ausführt.
 * Die Funktionen unten heißen wie im Original und arbeiten auf einem Entwurf `S` (immer).
 * Zufall und Uhrzeit kommen aus `env`, damit die Abläufe testbar bleiben.
 *
 * WICHTIG: Regeln hier nicht „verbessern“. Jede Abweichung vom Original ist ein Fehler.
 */

export interface Env {
  /** Zufallszahl wie Math.random (Standard: Math.random). */
  rng: () => number
  /** Uhrzeit wie Date.now. */
  now: () => number
  /** prefers-reduced-motion aktiv. */
  reduce: boolean
}
export const defaultEnv = (): Env => ({
  rng: () => Math.random(),
  now: () => Date.now(),
  reduce: typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
})

export type SoundName = 'ding' | 'chime' | 'fanfare' | 'revealSound' | 'winSound' | 'voteSound'

export type Fx =
  | { t: 'sound'; n: SoundName }
  | { t: 'tone'; f: number; st: number; d: number; v: number; ty?: OscillatorType }
  | { t: 'vib'; p: number | number[] }
  | { t: 'confetti'; s: number }
  | { t: 'toast'; m: string }
  | { t: 'save' }
  | { t: 'ac' }
  | { t: 'stopAudio' }
  | { t: 'gStop' }
  | { t: 'stopAmbience' }
  | { t: 'startAmbienceIfPlaying' }
  | { t: 'bgSeed' }
  | { t: 'loadTopsFor'; names: string[] }
  | { t: 'loadTops' }
  | { t: 'later'; ms: number; action: Action }
  | { t: 'loadPool'; kind: 'gs' | 'sb' | 'tl' | 'dd'; genres: string[]; diff?: string }
  | { t: 'preload'; card: PoolSong }
  | { t: 'rivalry'; winner: string; loser: string; draw: boolean }
  | { t: 'genreList'; genre: string }
  | { t: 'spinAnim'; target: number; n: number }

export type PickId =
  | 'theme' | 'players' | 'size' | 'series' | 'genre' | 'songMode' | 'sameArtist' | 'mode' | '_x'
  | 'audience' | 'autoScroll' | 'pickSec' | 'ambience' | 'bg' | 'phoneMode'

export type Action =
  | { type: 'load'; saved: Partial<SavedSettings> | null }
  | { type: 'go'; to: string }
  | { type: 'brand' }
  | { type: 'pick'; id: PickId; v: string }
  | { type: 'warnOff' }
  | { type: 'name'; p: number; value: string }
  | { type: 'avatar'; p: number; i: number }
  | { type: 'uploadAvatar'; p: number; url: string }
  | { type: 'poolToggle'; name: string }
  | { type: 'poolRemove'; name: string }
  | { type: 'setupTab'; tab: State['setupTab'] }
  | { type: 'start' }
  | { type: 'tGo' }
  | { type: 'tAbort' }
  | { type: 'tName'; i: number; value: string }
  | { type: 'tAvatar'; i: number; j: number }
  | { type: 'spin' }
  | { type: 'land' }
  | { type: 'place'; pos: number }
  | { type: 'pickSong'; p: number; i: number; track: Track }
  | { type: 'manualSong'; p: number; i: number; text: string; id: string }
  | { type: 'clearSong'; p: number; i: number }
  | { type: 'toBattle' }
  | { type: 'skipSongs' }
  | { type: 'pickNext' }
  | { type: 'pickTimeUp'; track: Track | null }
  | { type: 'phoneReady'; p: number; on?: boolean }
  | { type: 'listenNext' }
  | { type: 'listenPlay' }
  | { type: 'win'; p: number }
  | { type: 'advance' }
  | { type: 'bump'; p: number; d: number }
  | { type: 'voteClose' }
  | { type: 'voteReset' }
  | { type: 'voteAgain' }
  | { type: 'vwin'; p: number }
  | { type: 'nextRound' }
  | { type: 'toFinal' }
  | { type: 'tNext' }
  | { type: 'newMatch' }
  | { type: 'lpBg' }
  | { type: 'toggleMute' }
  // Guess the Song
  | { type: 'gsGenre'; k: string }
  | { type: 'gsRounds'; n: number }
  | { type: 'gsDiff'; d: string }
  | { type: 'gsStart' }
  | { type: 'gsPool'; pool: PoolSong[] }
  | { type: 'gsGuess'; i: number; hit: { artist: string; title: string } }
  | { type: 'gsSkip' }
  | { type: 'gsNext' }
  // Sing it Back (im Original nicht erreichbar)
  | { type: 'sbGenre'; k: string }
  | { type: 'sbPlayers'; n: number }
  | { type: 'sbRounds'; n: number }
  | { type: 'sbStart' }
  | { type: 'sbPool'; pool: PoolSong[] }
  | { type: 'sbStage'; stage: number; onlyIfBelow?: number }
  | { type: 'sbRate'; pts: number }
  // Timeline Masters
  | { type: 'tlGenre'; k: string }
  | { type: 'tlPlayers'; n: number }
  | { type: 'tlTarget'; n: number }
  | { type: 'tlVariant'; v: 'timeline' | 'decade' }
  | { type: 'tlDdTarget'; n: number }
  | { type: 'tlStart' }
  | { type: 'tlPool'; pool: PoolSong[] }
  | { type: 'tlPlace'; g: number }
  | { type: 'tlNext' }
  | { type: 'tlRotate' }
  // Jahrzehnt-Duell
  | { type: 'ddGenre'; k: string }
  | { type: 'ddTarget'; n: number }
  | { type: 'ddStart' }
  | { type: 'ddPool'; pool: PoolSong[] }
  | { type: 'ddGuess'; d: number }
  | { type: 'ddNext' }

/* ------------------------------------------------------------------ */
/* Anfangszustand                                                      */
/* ------------------------------------------------------------------ */

export function initialState(): State {
  return {
    screen: 'home', pendingMode: null, pickSec: 0, players: 2, names: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'], avatar: {}, size: 5, series: 'single',
    muted: false, ambience: true, autoScroll: true, theme: 'silksonic', bg: 'mosaic', genre: 'rnb', pool: [], custom: [],
    songMode: 'perduel', sameArtist: false, pickIdx: 0, audience: true, tally: {}, votePhase: null, voteWinner: null, eras: 'off', eraMap: [],
    setupTab: 'cfg',
    mode: 'clash', T: null,
    lineup: {}, songs: {}, winners: [], used: {}, pending: null, duel: 0, wins: {}, round: 1, sd: null, sdArt: null, regularWinners: null, regular: null,
    warnOff: false, colors: null, spin: null, phoneMode: false, ready: {}, listen: null,
  }
}

/* ------------------------------------------------------------------ */
/* Ableitungen (lesen nur)                                             */
/* ------------------------------------------------------------------ */

export const ak = (s: unknown) => String(s).toLowerCase().trim()
export const N = (S: State) => S.size
export const sameArt = (S: State) => !!S.sameArtist
export const twoC = (S: State, n: number) => (sameArt(S) ? 2 : Math.max(1, Math.round(n / 5)))
export const pts = (S: State, p: number) => (p > N(S) - twoC(S, N(S)) ? 2 : 1)
export const totalPts = (S: State) => N(S) + twoC(S, N(S))
export const picks = (S: State) => S.players * N(S)
export const pname = (S: State, p: number) => S.names[p - 1] || 'P' + p
export const perDuel = (S: State) => S.songMode === 'perduel'
export const avatarPool = (S: State) => S.custom.concat(AVATARS)
export const pcol = (S: State, p: number) => (S.colors && S.colors[p]) || themeColors(S.theme)[(p - 1) % AV.length]
export const pav = (S: State, p: number) => S.avatar[p] || ''
export const filled = (S: State, p: number) => (S.lineup[p] || []).filter(Boolean).length
export function placedN(S: State) {
  let t = 0
  for (let p = 1; p <= S.players; p++) t += filled(S, p)
  return t
}
export const allFull = (S: State) => (sameArt(S) ? filled(S, 1) >= N(S) : placedN(S) === picks(S))
export const freeSlots = (S: State, p: number) => (S.lineup[p] || []).filter((x) => x === null).length
export const firstFree = (S: State, p: number) => (S.lineup[p] || []).findIndex((x) => x === null)
export function drawer(S: State): number {
  if (sameArt(S)) return (filled(S, 1) % S.players) + 1
  const m = placedN(S),
    P = S.players,
    r = Math.floor(m / P),
    k = m % P
  return r % 2 === 0 ? k + 1 : P - k
}
export const target = (S: State) => (S.series === 'bo5' ? 3 : S.series === 'bo3' ? 2 : 1)
export const wins = (S: State, p: number) => S.wins[p] || 0
export function leader(S: State): number {
  if (S.series === 'single') return 0
  for (let p = 1; p <= S.players; p++) if (wins(S, p) >= target(S)) return p
  return 0
}
export const isT = (S: State) => S.mode === 't4' || S.mode === 't8' || S.mode === 't16'
export const tSize = (S: State) => (S.mode === 't16' ? 16 : S.mode === 't8' ? 8 : 4)
export const tPairs = (S: State) => S.T!.rounds[S.T!.r]
export const tMatch = (S: State) => tPairs(S)[S.T!.m]
export function pickOrder(S: State, i: number) {
  const o = parts(S)
  return i % 2 === 0 ? o : o.slice().reverse()
}
export const sdArt = (S: State, p: number) => (S.sdArt && S.sdArt[p]) || null
export function parts(S: State) {
  const o: number[] = []
  for (let p = 1; p <= S.players; p++) if (!S.sd || sdArt(S, p)) o.push(p)
  return o
}
export function duelArtists(S: State, i: number): string[] {
  if (S.sd) {
    const o: string[] = []
    for (let p = 1; p <= S.players; p++) {
      const a = sdArt(S, p)
      if (a && !o.includes(a)) o.push(a)
    }
    return o
  }
  const out: string[] = []
  for (let p = 1; p <= S.players; p++) {
    const a = S.lineup[p][i]
    if (a && !out.includes(a)) out.push(a)
  }
  return out
}
export function score(S: State, p: number) {
  let s = 0
  for (let i = 0; i < S.winners.length; i++) if (S.winners[i] === p) s += S.sd ? 1 : pts(S, i + 1)
  return s
}
/** Punkte der ganzen Runde: reguläre Punkte plus Sudden-Death-Punkt (auf Tims Wunsch korrigiert). */
export function roundScore(S: State, p: number) {
  return S.sd && S.regular ? (S.regular.scores[p] || 0) + score(S, p) : score(S, p)
}
/** Erreichbare Punkte der Runde (mit Sudden Death +1). */
export const roundMax = (S: State) => N(S) + twoC(S, N(S)) + (S.sd ? 1 : 0)
export const voteTotal = (S: State) => Object.values(S.tally || {}).reduce((a, b) => a + b, 0)
export function ready(S: State) {
  const n = S.sd ? 1 : N(S)
  for (let p = 1; p <= S.players; p++) {
    if (S.sd && !sdArt(S, p)) continue
    for (let i = 0; i < n; i++) if (!(S.songs[p] || [])[i]) return false
  }
  return true
}
export const eraAt = (S: State, i: number) => {
  const id = (S.eraMap && S.eraMap[i]) || null
  return id ? ERAS.find((e) => e.id === id) || null : null
}
/** true = passt, false = passt nicht, null = Jahr unbekannt. */
export function eraCheck(S: State, i: number, year: number | null) {
  const e = eraAt(S, i)
  if (!e) return true
  if (!year) return null
  return eraOk(e.id, year)
}
/** Alle Songs, die ihr Duell gewonnen haben – in Spielreihenfolge. */
export function winnerRecords(S: State): WinnerRecord[] {
  const out: WinnerRecord[] = []
  if (!S.winners) return out
  if (S.sd) {
    if (S.regularWinners) S.regularWinners.forEach((r) => out.push(r))
    const p = S.winners[0]
    if (p) {
      const so = (S.songs[p] || [])[0] || {}
      out.push({ pos: out.length + 1, p, artist: sdArt(S, p) || '', song: so, sd: true })
    }
    return out
  }
  for (let i = 0; i < S.winners.length; i++) {
    const p = S.winners[i]
    if (!p) continue
    const a = (S.lineup[p] || [])[i]
    if (!a) continue
    const so = (S.songs[p] || [])[i] || {}
    out.push({ pos: i + 1, p, artist: a, song: so })
  }
  return out
}
export function genreRoster(GEN: Genres, g: string): string[] {
  const G = GEN[g]
  if (!G) return []
  return G.type === 'film' ? (G.films || []).map((f) => f.f) : G.artists || []
}

export interface Genre {
  label: string
  artists?: string[]
  films?: { f: string; y: number; q: string }[]
  type?: string
  keepOrder?: boolean
}
export type Genres = Record<string, Genre>

/* ------------------------------------------------------------------ */
/* Reducer                                                             */
/* ------------------------------------------------------------------ */

interface Ctx {
  fx: Fx[]
  env: Env
  GEN: Genres
}

export function reduce(state: State, action: Action, env: Env, GEN: Genres): { state: State; fx: Fx[] } {
  const fx: Fx[] = []
  const next = produce(state, (S) => {
    apply(S as State, action, { fx, env, GEN })
    normalize(S as State)
  })
  return { state: next, fx }
}

/** Was das Original beim Zeichnen am Zustand ändert (render/duelScreen/renderBG). */
function normalize(S: State) {
  if (!BGS.some((b) => b[0] === S.bg)) S.bg = 'mosaic'
  setBodyTheme(S.theme)
  if (S.screen === 'duel' && S.audience && !S.votePhase) {
    S.tally = {}
    for (let q = 1; q <= S.players; q++) S.tally[q] = 0
    S.votePhase = 'tally'
  }
}

const sound = (c: Ctx, n: SoundName) => c.fx.push({ t: 'sound', n })
const tone = (c: Ctx, f: number, st: number, d: number, v: number, ty?: OscillatorType) => c.fx.push({ t: 'tone', f, st, d, v, ty })
const vib = (c: Ctx, p: number | number[]) => c.fx.push({ t: 'vib', p })
const toast = (c: Ctx, m: string) => c.fx.push({ t: 'toast', m })
const save = (c: Ctx) => c.fx.push({ t: 'save' })
const stopAudio = (c: Ctx) => c.fx.push({ t: 'stopAudio' })
const confetti = (c: Ctx, s: number) => c.fx.push({ t: 'confetti', s })

function newTourney(S: State, keep: boolean) {
  const n = tSize(S)
  const old = (keep && S.T && S.T.roster) || []
  const roster = []
  for (let i = 0; i < n; i++) roster.push(old[i] || { name: 'Spieler ' + (i + 1), av: AVATARS[i % AVATARS.length], col: themeColors(S.theme)[i % AV.length] })
  const pairs: [number, number][] = []
  for (let i = 0; i < n; i += 2) pairs.push([i, i + 1])
  S.T = { roster, rounds: [pairs], results: [[]], r: 0, m: 0, champ: null }
}

function loadMatch(S: State, c: Ctx) {
  const [a, b] = tMatch(S),
    R = S.T!.roster
  S.players = 2
  S.names[0] = R[a].name
  S.names[1] = R[b].name
  S.avatar[1] = R[a].av
  S.avatar[2] = R[b].av
  S.colors = { 1: R[a].col, 2: R[b].col }
  S.wins = {}
  S.round = 1
  resetRound(S, c)
  // Jedes Match zieht aus dem vollen Turnier-Topf (vorher war der Topf nach dem 1. Match leer)
  if (S.T!.pool) S.pool = S.T!.pool.slice()
}

function matchDone(S: State, c: Ctx, winnerP: number) {
  const T = S.T!
  const [a, b] = tMatch(S)
  const w = winnerP === 1 ? a : b
  T.results[T.r].push(w)
  T.m++
  if (T.m < tPairs(S).length) {
    S.screen = 'bracket'
    return
  }
  const adv = T.results[T.r]
  if (adv.length === 1) {
    T.champ = adv[0]
    S.screen = 'final'
    confetti(c, 1.8)
    sound(c, 'winSound')
    return
  }
  const next: [number, number][] = []
  for (let i = 0; i < adv.length; i += 2) next.push([adv[i], adv[i + 1]])
  T.rounds.push(next)
  T.results.push([])
  T.r++
  T.m = 0
  S.screen = 'bracket'
}

function buildEras(S: State, c: Ctx) {
  const n = N(S)
  S.eraMap = new Array(n).fill(null)
  if (S.eras === 'off') return
  const idx: number[] = []
  for (let i = 0; i < n; i++) idx.push(i)
  const count = S.eras === 'all' ? n : Math.max(1, Math.round(n / 3))
  idx
    .sort(() => c.env.rng() - 0.5)
    .slice(0, count)
    .forEach((i) => {
      S.eraMap[i] = ERAS[Math.floor(c.env.rng() * ERAS.length)].id
    })
}

function resetRound(S: State, c: Ctx) {
  const n = N(S)
  S.lineup = {}
  S.songs = {}
  S.used = {}
  S.pending = null
  S.duel = 0
  S.sd = null
  S.sdArt = null
  S.regularWinners = null
  S.regular = null
  S.ready = {}
  S.listen = null
  for (let p = 1; p <= S.players; p++) {
    S.lineup[p] = new Array(n).fill(null)
    S.songs[p] = new Array(n).fill(null)
  }
  S.winners = new Array(n).fill(null)
  buildEras(S, c)
  stopAudio(c)
}

function resetAll(S: State, c: Ctx) {
  S.wins = {}
  S.round = 1
  resetRound(S, c)
}

function place(S: State, c: Ctx, pos: number) {
  if (!S.pending) return
  const p = S.pending.player
  if (sameArt(S)) {
    if ((S.lineup[1] || [])[pos] != null) return
    for (let q = 1; q <= S.players; q++) {
      if (!S.lineup[q]) S.lineup[q] = new Array(N(S)).fill(null)
      S.lineup[q][pos] = S.pending.artist
    }
  } else {
    if (S.lineup[p][pos] !== null) return
    S.lineup[p][pos] = S.pending.artist
  }
  S.pending = null
  sound(c, 'ding')
  save(c)
  if (allFull(S)) {
    S.duel = 0
    S.pickIdx = 0
    S.ready = {}
    if (perDuel(S)) {
      S.screen = 'pick'
      c.fx.push({ t: 'loadTopsFor', names: duelArtists(S, 0) })
    } else {
      S.screen = 'songs'
      c.fx.push({ t: 'loadTops' })
    }
  }
}

export const mmss = (s: unknown) => {
  const n = +(s as number) || 0
  return Math.floor(n / 60) + ':' + String(n % 60).padStart(2, '0')
}

/** Song-Datensatz aus einem Deezer-Track (wie wirePicks / pickTimeUp im Original). */
export function songFromTrack(t: Track): Song {
  return {
    id: t.id,
    title: (t.title_short || t.title) as string,
    cover: (t.album && (t.album.cover_medium || t.album.cover_small)) || '',
    preview: t.preview || '',
    dur: mmss(t.duration),
  }
}

function pickNext(S: State, c: Ctx) {
  stopAudio(c)
  S.pickIdx++
  if (S.pickIdx >= pickOrder(S, S.duel).length) {
    S.pickIdx = 0
    S.screen = 'duel'
  }
}

function vote(S: State, c: Ctx, p: number) {
  stopAudio(c)
  S.votePhase = null
  S.tally = {}
  S.voteWinner = null
  S.winners[S.duel] = p
  sound(c, 'ding')
  vib(c, 35)
  // Verlierer-Karten verblassen kurz (0,9 s), dann geht es weiter – bei reduzierter Bewegung sofort.
  if (c.env.reduce) advance(S, c)
  else c.fx.push({ t: 'later', ms: 900, action: { type: 'advance' } })
}

function advance(S: State, c: Ctx) {
  const last = S.sd ? 0 : N(S) - 1
  if (S.duel < last) {
    S.duel++
    S.pickIdx = 0
    S.ready = {}
    if (perDuel(S)) {
      S.screen = 'pick'
      c.fx.push({ t: 'loadTopsFor', names: duelArtists(S, S.duel) })
    } else if (S.phoneMode) startListen(S, c)
  } else finishRound(S, c)
}

/**
 * Handy-Modus: Spieler für Spieler deckt seinen Song auf (Play am Handy), er läuft auf dem Hauptgerät.
 * Wer anfängt, rückt jedes Duell eins weiter (1-2-3, 2-3-1, 3-1-2 …). Danach der Versus-Screen.
 */
function startListen(S: State, c: Ctx) {
  stopAudio(c)
  const ps = parts(S)
  const r = ps.length ? S.duel % ps.length : 0
  S.listen = { order: ps.slice(r).concat(ps.slice(0, r)), idx: 0, shown: false, paused: false }
  S.screen = 'listen'
}

function finishRound(S: State, c: Ctx) {
  const sc: { p: number; s: number }[] = []
  for (let p = 1; p <= S.players; p++) sc.push({ p, s: score(S, p) })
  const mx = Math.max(...sc.map((x) => x.s)),
    top = sc.filter((x) => x.s === mx).map((x) => x.p)
  if (top.length > 1 && !S.sd) {
    const gl = genreRoster(c.GEN, S.genre).slice()
    const used = new Set<string>()
    for (let p = 1; p <= S.players; p++)
      (S.lineup[p] || []).forEach((a) => {
        if (a) used.add(ak(a))
      })
    let cand = gl.filter((a) => !used.has(ak(a)))
    if (!cand.length) cand = S.pool.length ? S.pool.slice() : gl
    // Reguläre Sieger-Songs sichern, SOLANGE S.sd noch null ist
    S.regularWinners = winnerRecords(S)
    const regScores: Record<number, number> = {}
    for (let p = 1; p <= S.players; p++) regScores[p] = score(S, p)
    S.regular = { winners: S.winners.slice(), songs: JSON.parse(JSON.stringify(S.songs)), scores: regScores }
    S.sdArt = {}
    if (sameArt(S)) {
      const one = cand[Math.floor(c.env.rng() * cand.length)]
      top.forEach((p) => {
        S.sdArt![p] = one
      })
    } else {
      const bag = cand.slice()
      top.forEach((p) => {
        if (!bag.length) bag.push(...cand)
        const idx = Math.floor(c.env.rng() * bag.length)
        S.sdArt![p] = bag.splice(idx, 1)[0]
      })
    }
    S.sd = true
    S.winners = [null]
    S.duel = 0
    for (let p = 1; p <= S.players; p++) S.songs[p] = [null]
    S.pickIdx = 0
    S.ready = {}
    S.screen = perDuel(S) ? 'pick' : 'songs'
    const _sdn: string[] = []
    for (let p = 1; p <= S.players; p++) if (S.sdArt[p] && !_sdn.includes(S.sdArt[p])) _sdn.push(S.sdArt[p])
    toast(c, sameArt(S) ? 'Gleichstand! Sudden Death: alle bekommen ' + S.sdArt[1] : 'Gleichstand! Sudden Death: jeder kriegt einen Zufalls-Künstler')
    sound(c, 'ding')
    c.fx.push({ t: 'loadTopsFor', names: _sdn })
    return
  }
  const w = top[0]
  S.wins[w] = (S.wins[w] || 0) + 1
  S.screen = 'round'
  sound(c, 'fanfare')
  confetti(c, 1)
}

function closeVote(S: State, c: Ctx) {
  const t = S.tally || {},
    mx = Math.max(...Object.values(t))
  const top = Object.keys(t)
    .filter((k) => t[+k] === mx)
    .map(Number)
  S.voteWinner = top.length === 1 ? top[0] : null
  S.votePhase = 'result'
  if (S.voteWinner) sound(c, 'voteSound')
  else toast(c, 'Stimmengleichheit — entscheidet gemeinsam.')
}

function goTo(S: State, c: Ctx, g: string) {
  stopAudio(c)
  c.fx.push({ t: 'gStop' })
  if (g === 'setup') S.screen = 'setup'
  else if (g === 'home') S.screen = 'home'
  else if (g === 'guess') {
    S.gs = S.gs || { genres: [], players: 1, rounds: 5, diff: 'easy' }
    if (!S.gs.genres) S.gs.genres = []
    if (!S.gs.diff) S.gs.diff = 'easy'
    S.screen = 'gssetup'
  } else if (g === 'sing') {
    S.sb = S.sb || { genres: [], players: 2, rounds: 5 }
    if (!S.sb.genres) S.sb.genres = []
    S.screen = 'sbsetup'
  } else if (g === 'timeline') {
    S.tl = S.tl || { genres: [], players: 2, target: 10 }
    if (!S.tl.genres) S.tl.genres = []
    if (!S.tl.players) S.tl.players = 2
    if (!S.tl.target) S.tl.target = 10
    S.screen = 'tlsetup'
  }
}

function toggle(list: string[], k: string) {
  const i = list.indexOf(k)
  if (i >= 0) list.splice(i, 1)
  else list.push(k)
}

function pick(S: State, c: Ctx, id: PickId, v: string) {
  switch (id) {
    case 'theme': {
      S.theme = v
      resetColorCache()
      setBodyTheme(v)
      if (S.T && S.T.roster) {
        const col = themeColors(S.theme)
        S.T.roster.forEach((r, i) => {
          r.col = col[i % AV.length]
        })
        if (S.colors && isT(S) && S.T.rounds) {
          const m = tMatch(S)
          S.colors = { 1: S.T.roster[m[0]].col, 2: S.T.roster[m[1]].col }
        }
      }
      save(c)
      return
    }
    case 'players':
      S.players = +v
      resetAll(S, c)
      save(c)
      return
    case 'size':
      S.size = +v
      resetAll(S, c)
      save(c)
      return
    case 'series':
      S.series = v as State['series']
      resetAll(S, c)
      save(c)
      return
    case 'genre':
      S.genre = v
      save(c)
      c.fx.push({ t: 'genreList', genre: v })
      return
    case 'songMode':
      S.songMode = v as State['songMode']
      resetAll(S, c)
      save(c)
      return
    case 'sameArtist':
      S.sameArtist = v === '1'
      resetAll(S, c)
      save(c)
      return
    case 'mode':
      S.mode = v as State['mode']
      S.colors = null
      if (isT(S)) {
        newTourney(S, true)
        S.players = 2
        S.audience = false
      } else {
        S.T = null
        S.players = 2
      }
      resetAll(S, c)
      save(c)
      return
    case '_x':
      return
    case 'audience':
      S.audience = v === '1'
      save(c)
      return
    case 'autoScroll':
      S.autoScroll = v === '1'
      save(c)
      return
    case 'pickSec':
      S.pickSec = +v
      save(c)
      return
    case 'ambience':
      S.ambience = v === '1'
      c.fx.push(S.ambience ? { t: 'startAmbienceIfPlaying' } : { t: 'stopAmbience' })
      save(c)
      return
    case 'bg':
      S.bg = v
      c.fx.push({ t: 'bgSeed' })
      save(c)
      return
    case 'phoneMode':
      S.phoneMode = v === '1'
      resetAll(S, c)
      save(c)
      return
  }
}

function load(S: State, c: Ctx, d: Partial<SavedSettings> | null) {
  if (d) {
    try {
      if ((d.players as number) >= 2 && (d.players as number) <= 6) S.players = d.players as number
      if (Array.isArray(d.names))
        d.names.forEach((n, i) => {
          if (n) S.names[i] = n
        })
      if (d.avatar) S.avatar = d.avatar
      if ([5, 7, 10, 15].includes(d.size as number)) S.size = d.size as number
      if (['single', 'bo3', 'bo5'].includes(d.series as string)) S.series = d.series as State['series']
      S.muted = !!d.muted
      S.warnOff = !!d.warnOff
      if (typeof d.ambience === 'boolean') S.ambience = d.ambience
      if (BGS.some((b) => b[0] === d.bg)) S.bg = d.bg as string
      if (['upfront', 'perduel'].includes(d.songMode as string)) S.songMode = d.songMode as State['songMode']
      if (typeof d.sameArtist === 'boolean') S.sameArtist = d.sameArtist
      if (['clash', 't4', 't8', 't16'].includes(d.mode as string)) S.mode = d.mode as State['mode']
      if (typeof d.audience === 'boolean') S.audience = d.audience
      const anyD = d as Record<string, unknown>
      if (typeof anyD.autoScroll === 'boolean') S.autoScroll = anyD.autoScroll
      if (Array.isArray(d.custom)) S.custom = d.custom.filter((x) => typeof x === 'string').slice(0, 12)
      if (THEMES.some((t) => t[0] === d.theme)) S.theme = d.theme as string
      if (d.genre && c.GEN[d.genre]) S.genre = d.genre
      if (!BGS.some((b) => b[0] === S.bg)) S.bg = 'mosaic'
      if (!THEMES.some((t) => t[0] === S.theme)) S.theme = 'silksonic'
      if (Array.isArray(d.pool)) S.pool = d.pool
      if ([0, 30, 45, 60].includes(d.pickSec as number)) S.pickSec = d.pickSec as number
      if (typeof d.phoneMode === 'boolean') S.phoneMode = d.phoneMode
      if (isT(S)) {
        // Kaderfarben passend zum geladenen Theme berechnen
        setBodyTheme(S.theme)
        resetColorCache()
        newTourney(S, false)
        if (Array.isArray(d.roster) && d.roster.length === tSize(S)) S.T!.roster = d.roster
        S.players = 2
      }
    } catch {
      // wie im Original: fehlerhafte Daten werden ignoriert
    }
  }
  const pool = avatarPool(S)
  for (let p = 1; p <= 6; p++) if (!S.avatar[p]) S.avatar[p] = pool[S.custom.length + p - 1] || pool[p - 1]
  resetAll(S, c)
}

/** Zu speichernde Einstellungen (wie save() im Original). */
export function savedSettings(S: State): SavedSettings {
  return {
    players: S.players, names: S.names, avatar: S.avatar, size: S.size,
    series: S.series, muted: S.muted, ambience: S.ambience, theme: S.theme, bg: S.bg, genre: S.genre, pool: S.pool,
    warnOff: S.warnOff, songMode: S.songMode, sameArtist: S.sameArtist, custom: S.custom, audience: S.audience,
    mode: S.mode, roster: S.T ? S.T.roster : null,
    autoScroll: S.autoScroll, pickSec: S.pickSec, phoneMode: S.phoneMode,
  }
}

function apply(S: State, a: Action, c: Ctx) {
  switch (a.type) {
    case 'load':
      return load(S, c, a.saved)
    case 'go':
      return goTo(S, c, a.to)
    case 'brand':
      stopAudio(c)
      c.fx.push({ t: 'gStop' })
      S.screen = 'home'
      return
    case 'pick':
      return pick(S, c, a.id, a.v)
    case 'warnOff':
      S.warnOff = true
      save(c)
      return
    case 'name':
      S.names[a.p - 1] = a.value.trim() || 'P' + a.p
      save(c)
      return
    case 'avatar':
      S.avatar[a.p] = avatarPool(S)[a.i]
      save(c)
      return
    case 'uploadAvatar': {
      if (!S.custom.includes(a.url)) S.custom.unshift(a.url)
      if (S.custom.length > 12) S.custom.length = 12
      if (a.p < 0) S.T!.roster[-1 - a.p].av = a.url
      else S.avatar[a.p] = a.url
      save(c)
      toast(c, 'Bild übernommen.')
      return
    }
    case 'poolToggle': {
      const n = a.name
      if (S.pool.some((x) => ak(x) === ak(n))) S.pool = S.pool.filter((x) => ak(x) !== ak(n))
      else S.pool.push(n)
      save(c)
      return
    }
    case 'poolRemove':
      S.pool = S.pool.filter((x) => x !== a.name)
      save(c)
      return
    case 'setupTab':
      S.setupTab = a.tab
      return
    case 'start':
      c.fx.push({ t: 'ac' })
      if (isT(S)) {
        newTourney(S, true)
        S.T!.pool = S.pool.slice()
        S.screen = 'bracket'
      } else {
        resetRound(S, c)
        S.screen = 'draft'
      }
      return
    case 'tGo':
      loadMatch(S, c)
      S.screen = 'draft'
      return
    case 'tAbort':
      S.mode = 'clash'
      S.T = null
      S.colors = null
      S.players = 2
      resetAll(S, c)
      save(c)
      S.screen = 'setup'
      return
    case 'tName':
      S.T!.roster[a.i].name = a.value.trim() || 'Spieler ' + (a.i + 1)
      save(c)
      return
    case 'tAvatar':
      S.T!.roster[a.i].av = avatarPool(S)[a.j]
      save(c)
      return

    /* ---- Draft ---- */
    case 'spin': {
      // wie spin() im Original; die Drehung selbst animiert die Oberfläche (Effekt spinAnim)
      if (S.spin || S.screen !== 'draft' || S.pending || allFull(S) || !S.pool.length) return
      c.fx.push({ t: 'ac' })
      if (S.pool.length === 1) {
        const pl = drawer(S),
          artist = S.pool[0]
        S.pool = []
        S.pending = { player: pl, artist }
        sound(c, 'revealSound')
        vib(c, 45)
        save(c)
        return
      }
      const n = S.pool.length
      S.spin = { target: Math.floor(c.env.rng() * n), n }
      c.fx.push({ t: 'spinAnim', target: S.spin.target, n })
      return
    }
    case 'land': {
      // land() nach dem Ausrollen und der kurzen Pause: Künstler aus dem Topf, Spieler am Zug bekommt ihn
      if (!S.spin) return
      const i = S.spin.target
      const artist = S.pool[i],
        pl = drawer(S)
      S.pool.splice(i, 1)
      S.pending = { player: pl, artist }
      S.spin = null
      sound(c, 'revealSound')
      save(c)
      return
    }
    case 'place':
      return place(S, c, a.pos)

    /* ---- Songs ---- */
    case 'pickSong': {
      stopAudio(c)
      S.songs[a.p][a.i] = songFromTrack(a.track)
      sound(c, 'ding')
      return
    }
    case 'manualSong': {
      const title = (a.text || '').trim()
      if (!title) {
        toast(c, 'Erst einen Songtitel eintippen.')
        return
      }
      if (!S.songs[a.p]) S.songs[a.p] = new Array(N(S)).fill(null)
      stopAudio(c)
      S.songs[a.p][a.i] = { id: a.id, title, cover: '', preview: '', dur: '', manual: true }
      sound(c, 'ding')
      return
    }
    case 'clearSong':
      stopAudio(c)
      S.songs[a.p][a.i] = null
      return
    case 'toBattle':
    case 'skipSongs':
      stopAudio(c)
      S.duel = 0
      if (S.phoneMode) return startListen(S, c)
      S.screen = 'duel'
      return
    case 'phoneReady': {
      // Handy-Modus: Spieler meldet „fertig gewählt“ (am Handy oder am Hauptgerät)
      if (!S.phoneMode || (S.screen !== 'pick' && S.screen !== 'songs')) return
      if (!parts(S).includes(a.p)) return
      S.ready[a.p] = a.on !== false
      if (a.on === false) return
      tone(c, 880, 0, 0.12, 0.1)
      if (parts(S).every((q) => S.ready[q])) {
        sound(c, 'chime')
        if (S.screen === 'songs') S.duel = 0
        startListen(S, c)
      }
      return
    }
    case 'listenNext': {
      if (S.screen !== 'listen' || !S.listen) return
      stopAudio(c)
      S.listen.idx++
      S.listen.shown = false
      S.listen.paused = false
      if (S.listen.idx >= S.listen.order.length) S.screen = 'duel'
      return
    }
    case 'listenPlay': {
      // Aufdecken (erstes Play), danach Pause / weiter abspielen
      if (S.screen !== 'listen' || !S.listen) return
      if (!S.listen.shown) {
        S.listen.shown = true
        S.listen.paused = false
        return
      }
      S.listen.paused = !S.listen.paused
      return
    }
    case 'pickNext':
      return pickNext(S, c)
    case 'pickTimeUp': {
      if (S.screen !== 'pick') return
      const order = pickOrder(S, S.duel)
      const p = order[S.pickIdx],
        i = S.duel
      const ch = (S.songs[p] || [])[i]
      if (!ch && a.track) {
        if (!S.songs[p]) S.songs[p] = []
        S.songs[p][i] = songFromTrack(a.track)
        toast(c, '⏱ Zeit um — „' + S.songs[p][i]!.title + '“ automatisch übernommen.')
      }
      return pickNext(S, c)
    }

    /* ---- Duell ---- */
    case 'win':
      return vote(S, c, a.p)
    case 'advance':
      return advance(S, c)
    case 'bump': {
      if (!S.tally) S.tally = {}
      S.tally[a.p] = Math.max(0, (S.tally[a.p] || 0) + a.d)
      if (a.d > 0) {
        tone(c, 760, 0, 0.07, 0.1)
        vib(c, 12)
      } else tone(c, 320, 0, 0.06, 0.07)
      return
    }
    case 'voteClose':
      return closeVote(S, c)
    case 'voteReset':
      S.tally = {}
      for (let q = 1; q <= S.players; q++) S.tally[q] = 0
      return
    case 'voteAgain':
      S.tally = {}
      for (let q = 1; q <= S.players; q++) S.tally[q] = 0
      S.votePhase = 'tally'
      S.voteWinner = null
      return
    case 'vwin':
      S.votePhase = null
      return vote(S, c, a.p)

    /* ---- Runde / Endstand ---- */
    case 'nextRound': {
      if (isT(S) && S.T) {
        // Turnier mit Best of 3/5: gleiche Paarung spielt die nächste Runde direkt weiter
        S.round++
        S.pool = (S.T.pool || S.pool).slice()
        resetRound(S, c)
        save(c)
        S.screen = 'draft'
        toast(c, 'Neue Runde — gleiche Paarung, voller Topf.')
        return
      }
      S.round++
      for (let p = 1; p <= S.players; p++)
        (S.lineup[p] || []).forEach((x) => {
          if (x) S.pool.push(x)
        })
      const seen = new Set<string>()
      S.pool = S.pool.filter((x) => {
        const k = ak(x)
        if (seen.has(k)) return false
        seen.add(k)
        return true
      })
      resetRound(S, c)
      save(c)
      S.screen = 'setup'
      toast(c, 'Neue Runde — Topf prüfen und starten.')
      return
    }
    case 'toFinal': {
      S.screen = 'final'
      sound(c, 'winSound')
      if (!isT(S) && S.players === 2) {
        const rk: { p: number; w: number; s: number }[] = []
        for (let q = 1; q <= 2; q++) rk.push({ p: q, w: wins(S, q), s: roundScore(S, q) })
        rk.sort((x, y) => y.w - x.w || y.s - x.s)
        const draw = rk[0].w === rk[1].w && rk[0].s === rk[1].s
        c.fx.push({ t: 'rivalry', winner: pname(S, rk[0].p), loser: pname(S, rk[1].p), draw })
      }
      confetti(c, 1.6)
      sound(c, 'fanfare')
      return
    }
    case 'tNext': {
      const sc: { p: number; s: number }[] = []
      for (let q = 1; q <= S.players; q++) sc.push({ p: q, s: roundScore(S, q) })
      const mx = Math.max(...sc.map((x) => x.s))
      return matchDone(S, c, sc.find((x) => x.s === mx)!.p)
    }
    case 'newMatch':
      if (isT(S)) {
        newTourney(S, true)
        S.colors = null
      }
      resetAll(S, c)
      S.screen = 'setup'
      return
    case 'lpBg':
      if (S.bg !== 'deck' && S.bg !== 'walldeck') {
        S.bg = 'walldeck'
        save(c)
      }
      return
    case 'toggleMute':
      S.muted = !S.muted
      if (!S.muted) {
        c.fx.push({ t: 'ac' })
        sound(c, 'ding')
      }
      save(c)
      return

    /* ---- Guess the Song ---- */
    case 'gsGenre': {
      const g = (S.gs = S.gs || ({} as State['gs'])!)
      g.genres = g.genres || []
      toggle(g.genres, a.k)
      return
    }
    case 'gsRounds':
      ;(S.gs = S.gs || ({} as State['gs'])!).rounds = a.n
      return
    case 'gsDiff':
      ;(S.gs = S.gs || ({} as State['gs'])!).diff = a.d
      return
    case 'gsStart': {
      const g = S.gs
      if (!g || !(g.genres && g.genres.length)) return
      g.players = 1
      g.scores = { 1: 0, 2: 0 }
      g.ridx = 0
      g.step = 0
      g.picked = null
      g.correct = false
      g.gained = 0
      g.loading = true
      g.err = ''
      g.seq = null
      S.screen = 'gsplay'
      c.fx.push({ t: 'loadPool', kind: 'gs', genres: g.genres.slice(), diff: g.diff || 'easy' })
      return
    }
    case 'gsPool': {
      const g = S.gs!
      const pool = a.pool
      if (!pool || pool.length < 6) {
        g.loading = false
        g.err = 'Zu wenige Songs gefunden. Prüf die Internetverbindung – Deezer muss erreichbar sein.'
        return
      }
      const total = g.players * g.rounds
      const shuffled = pool.slice().sort(() => c.env.rng() - 0.5)
      const chosen = shuffled.slice(0, total)
      g.seq = chosen.map((song, i) => {
        const others = pool
          .filter((s) => ak(s.title) !== ak(song.title))
          .sort(() => c.env.rng() - 0.5)
          .slice(0, 3)
        const opts = others.concat([song]).sort(() => c.env.rng() - 0.5)
        return { player: g.players === 2 ? (i % 2) + 1 : 1, song, opts }
      })
      g.loading = false
      return
    }
    case 'gsGuess': {
      const g = S.gs!
      if (g.picked != null) return
      const q = g.seq![g.ridx!]
      const ha = ak(a.hit.artist),
        ht = ak(a.hit.title)
      const ta = ak(q.song.artist),
        tt = ak(q.song.title)
      const correct = ha === ta && (ht.includes(tt) || tt.includes(ht))
      c.fx.push({ t: 'gStop' })
      if (correct) {
        const p = GUESS_STEPS[g.step!][1]
        g.gained = p
        g.scores![q.player] += p
        g.correct = true
        g.picked = a.i
        sound(c, 'ding')
        return
      }
      if (g.step! < GUESS_STEPS.length - 1) {
        g.step!++
        tone(c, 196, 0, 0.12, 0.12)
        toast(c, 'Daneben — hör nochmal rein.')
        return
      }
      g.correct = false
      g.gained = 0
      g.picked = a.i
      return
    }
    case 'gsSkip': {
      const g = S.gs!
      if (g.picked != null) return
      c.fx.push({ t: 'gStop' })
      if (g.step! < GUESS_STEPS.length - 1) {
        g.step!++
        tone(c, 300, 0, 0.08, 0.08)
        return
      }
      g.correct = false
      g.gained = 0
      g.picked = -1
      return
    }
    case 'gsNext': {
      const g = S.gs!
      c.fx.push({ t: 'gStop' })
      g.ridx!++
      g.step = 0
      g.picked = null
      g.correct = false
      g.gained = 0
      if (g.ridx! >= g.seq!.length) {
        sound(c, 'winSound')
        confetti(c, 1.2)
      }
      return
    }

    /* ---- Sing it Back ---- */
    case 'sbGenre': {
      const s = (S.sb = S.sb || ({} as State['sb'])!)
      s.genres = s.genres || []
      toggle(s.genres, a.k)
      return
    }
    case 'sbPlayers':
      ;(S.sb = S.sb || ({} as State['sb'])!).players = a.n
      return
    case 'sbRounds':
      ;(S.sb = S.sb || ({} as State['sb'])!).rounds = a.n
      return
    case 'sbStart': {
      const s = S.sb
      if (!s || !(s.genres && s.genres.length)) return
      s.scores = { 1: 0, 2: 0 }
      s.ridx = 0
      s.stage = 0
      s.loading = true
      s.err = ''
      s.seq = null
      S.screen = 'sbplay'
      c.fx.push({ t: 'loadPool', kind: 'sb', genres: s.genres.slice(), diff: 'sing' })
      return
    }
    case 'sbPool': {
      const s = S.sb!
      const pool = a.pool
      if (!pool || pool.length < 3) {
        s.loading = false
        s.err = 'Zu wenige Songs gefunden. Prüf die Internetverbindung – Deezer muss erreichbar sein.'
        return
      }
      const total = s.players * s.rounds
      const shuffled = pool.slice().sort(() => c.env.rng() - 0.5)
      s.seq = shuffled.slice(0, total).map((song, i) => ({ player: s.players === 2 ? (i % 2) + 1 : 1, song }))
      s.loading = false
      return
    }
    case 'sbStage': {
      if (S.screen !== 'sbplay') return
      if (a.onlyIfBelow != null && !(S.sb!.stage! < a.onlyIfBelow)) return
      S.sb!.stage = a.stage
      return
    }
    case 'sbRate': {
      const s = S.sb!
      if (s.stage! < 2) return
      const q = s.seq![s.ridx!]
      s.scores![q.player] += a.pts
      sound(c, 'ding')
      c.fx.push({ t: 'gStop' })
      s.ridx!++
      s.stage = 0
      if (s.ridx! >= s.seq!.length) {
        sound(c, 'winSound')
        confetti(c, 1.2)
      }
      return
    }

    /* ---- Timeline Masters ---- */
    case 'tlGenre': {
      const t = (S.tl = S.tl || ({} as State['tl'])!)
      t.genres = t.genres || []
      toggle(t.genres, a.k)
      return
    }
    case 'tlPlayers':
      ;(S.tl = S.tl || ({} as State['tl'])!).players = a.n
      return
    case 'tlTarget':
      ;(S.tl = S.tl || ({} as State['tl'])!).target = a.n
      return
    case 'tlVariant':
      ;(S.tl = S.tl || ({} as State['tl'])!).variant = a.v
      return
    case 'tlDdTarget':
      ;(S.tl = S.tl || ({} as State['tl'])!).ddTarget = a.n
      return
    case 'tlStart': {
      const t = S.tl
      if (!t || !(t.genres && t.genres.length)) return
      if (t.variant === 'decade') {
        S.dd = { genres: t.genres.slice(), target: t.ddTarget || 7 }
        return ddStart(S, c)
      }
      t.loading = true
      t.err = ''
      t.stage = 'listen'
      t.winner = null
      S.screen = 'tlplay'
      c.fx.push({ t: 'loadPool', kind: 'tl', genres: t.genres.slice() })
      return
    }
    case 'tlPool': {
      const t = S.tl!
      const pool = a.pool
      if (!pool || pool.length < t.players + 3) {
        t.loading = false
        t.err = 'Zu wenige Songs mit bekanntem Jahr gefunden — probier andere/mehr Kategorien. (Deezer muss erreichbar sein.)'
        return
      }
      t.deck = pool
      t.bag = null
      t.turn = 0
      t.timelines = Array.from({ length: t.players }, () => [tlDraw(S, c)])
      t.current = tlDraw(S, c)
      t.stage = 'listen'
      t.result = null
      t.rotating = false
      t.loading = false
      return
    }
    case 'tlPlace': {
      const t = S.tl!
      if (t.stage !== 'listen') return
      stopAudio(c)
      const line = t.timelines![t.turn!],
        card = t.current!
      const left = line[a.g - 1],
        right = line[a.g]
      const ok = (!left || left.year! <= card.year!) && (!right || right.year! >= card.year!)
      if (ok) {
        line.splice(a.g, 0, card)
        vib(c, 30)
      } else vib(c, [40, 60, 40])
      t.result = { ok, g: a.g }
      t.stage = 'reveal'
      return
    }
    case 'tlNext': {
      const t = S.tl!
      stopAudio(c)
      if (t.result && t.result.ok && t.timelines![t.turn!].length >= t.target) {
        t.winner = t.turn
        t.stage = 'win'
        confetti(c, 1.4)
        sound(c, 'winSound')
        return
      }
      t.rotating = true
      c.fx.push({ t: 'later', ms: 520, action: { type: 'tlRotate' } })
      return
    }
    case 'tlRotate': {
      const t = S.tl!
      t.turn = (t.turn! + 1) % t.players
      t.current = tlDraw(S, c)
      t.stage = 'listen'
      t.result = null
      t.rotating = false
      return
    }

    /* ---- Jahrzehnt-Duell ---- */
    case 'ddGenre': {
      const t = (S.dd = S.dd || ({} as State['dd'])!)
      t.genres = t.genres || []
      toggle(t.genres, a.k)
      return
    }
    case 'ddTarget':
      ;(S.dd = S.dd || ({} as State['dd'])!).target = a.n
      return
    case 'ddStart':
      return ddStart(S, c)
    case 'ddPool': {
      const t = S.dd!
      const pool = a.pool
      if (!pool || pool.length < 4) {
        t.loading = false
        t.err = 'Zu wenige Songs mit Jahr gefunden — nimm mehr/andere Kategorien (Jahrzehnte-Kategorien geben die beste Streuung). Deezer muss erreichbar sein.'
        return
      }
      t.deck = pool
      t.bag = null
      t.turn = 0
      t.scores = [0, 0]
      t.current = ddDraw(S, c)
      t.stage = 'listen'
      t.pick = null
      t.stealPick = null
      t.loading = false
      return
    }
    case 'ddGuess': {
      const t = S.dd!
      const y = t.current!.year!,
        correct = decadeOf(y) === a.d
      if (t.stage === 'listen') {
        stopAudio(c)
        t.pick = a.d
        if (correct) {
          t.scores![t.turn!]++
          vib(c, 30)
          t.stage = 'reveal'
        } else {
          vib(c, [40, 50])
          t.stage = 'steal'
        }
      } else if (t.stage === 'steal') {
        stopAudio(c)
        t.stealPick = a.d
        if (correct) {
          t.scores![1 - t.turn!]++
          vib(c, 30)
        }
        t.stage = 'reveal'
      }
      return
    }
    case 'ddNext': {
      const t = S.dd!
      stopAudio(c)
      if (t.scores![0] >= t.target || t.scores![1] >= t.target) {
        t.winner = t.scores![0] >= t.scores![1] ? 0 : 1
        t.stage = 'win'
        confetti(c, 1.4)
        sound(c, 'winSound')
        return
      }
      t.turn = 1 - t.turn!
      t.current = ddDraw(S, c)
      t.stage = 'listen'
      t.pick = null
      t.stealPick = null
      return
    }
  }
}

function tlDraw(S: State, c: Ctx): PoolSong {
  const t = S.tl!
  if (!t.bag || !t.bag.length) t.bag = t.deck!.map((_, i) => i).sort(() => c.env.rng() - 0.5)
  const card = t.deck![t.bag.pop()!]
  if (t.bag.length) c.fx.push({ t: 'preload', card: t.deck![t.bag[t.bag.length - 1]] })
  return card
}

function ddDraw(S: State, c: Ctx): PoolSong {
  const t = S.dd!
  if (!t.bag || !t.bag.length) t.bag = t.deck!.map((_, i) => i).sort(() => c.env.rng() - 0.5)
  const card = t.deck![t.bag.pop()!]
  if (t.bag.length) c.fx.push({ t: 'preload', card: t.deck![t.bag[t.bag.length - 1]] })
  return card
}

function ddStart(S: State, c: Ctx) {
  const t = S.dd
  if (!t || !(t.genres && t.genres.length)) return
  t.loading = true
  t.err = ''
  t.stage = 'listen'
  t.winner = null
  S.screen = 'ddplay'
  c.fx.push({ t: 'loadPool', kind: 'dd', genres: t.genres.slice() })
}

/** Für die Oberfläche: Konfiguration der Schwierigkeit (Guess). */
export { DIFF_CFG }
