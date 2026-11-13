import { allFull, drawer, isT, leader, N, parts, pcol, pickOrder, picks, pname, pts, roundScore, target, voteTotal, wins } from '../core/game'
import type { State, Track } from '../core/types'
import { picOf } from '../services/catalog'

/**
 * Handy-Begleiter: Nachrichten zwischen Hauptgerät (Host) und Handys.
 * Das Spiel läuft komplett auf dem Hauptgerät. Handys bekommen eine Ansicht des Zustands und
 * schicken Wünsche, die der Host als ganz normale Spielaktionen ausführt (wie ein Tippen am Host).
 */

export const APP_ID = 'sound-clash-begleiter-v1'
/** Spielcode: 5 Zeichen ohne Verwechsler (0/O, 1/I/L). */
export function newCode(): string {
  const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const r = new Uint8Array(5)
  crypto.getRandomValues(r)
  return Array.from(r, (x) => A[x % A.length]).join('')
}

export type Role = 'audience' | number

export interface ViewSong {
  id?: number | string
  title: string
  cover: string
  dur: string
}

/** Was ein Handy vom Spiel sieht. */
export interface HostView {
  /** Favoriten-Modus im Setup: Handys wählen ihre Künstler selbst */
  favMode?: boolean
  favOwner?: Record<string, number>
  v: 1
  theme: string
  genre: string
  screen: State['screen']
  round: number
  players: number
  names: string[]
  colors: Record<number, string>
  size: number
  slotPts: number[]
  sameArtist: boolean
  songMode: State['songMode']
  audience: boolean
  lineup: Record<number, (string | null)[]>
  songs: Record<number, (ViewSong | null)[]>
  pics: Record<string, string>
  pending: State['pending']
  drawer: number
  spinning: boolean
  poolCount: number
  duel: number
  pickIdx: number
  pickOrder: number[]
  sd: boolean
  sdArt: Record<number, string> | null
  parts: number[]
  winners: (number | null)[]
  scores: Record<number, number>
  wins: Record<number, number>
  target: number
  votePhase: State['votePhase']
  tally: Record<number, number>
  voteWinner: number | null
  /** Schlüssel des aktuellen Duells (Stimmen gelten pro Duell). */
  duelKey: string
  phoneMode: boolean
  ready: Record<number, boolean>
  listen: State['listen']
  /** Drehung des Rads (Ziel-Segment), damit das Handy sie klein mitzeigt. */
  spin: { target: number; n: number } | null
  /** Künstler im Topf (nur beim Ziehen, für das kleine Rad am Handy). */
  pool: string[]
  /** Spieler, dessen Song gerade auf dem Hauptgerät läuft (oder null). */
  nowPlaying: number | null
  /** Spielerplätze, für die gerade ein Handy verbunden ist. */
  online: number[]
  /** Wer per Handy für welchen Song gestimmt hat (Spieler-Nr. oder Publikum). */
  voters: Record<number, Role[]>
  /** Spielleiter (Spieler 1): Knöpfe, die gerade auch am Hauptgerät stehen. */
  ctl: CtlButton[]
}

/** Ein Knopf der Spielleiter-Steuerung (Spieler 1 bedient das Hauptgerät vom Handy aus). */
export interface CtlButton {
  a: CtlAction
  p?: number
  label: string
  kind?: 'primary' | 'ghost' | 'play'
  on?: boolean
  color?: string
}
export type CtlAction = 'start' | 'spin' | 'play' | 'win' | 'voteClose' | 'voteReset' | 'vwin' | 'voteAgain' | 'pickNext' | 'toBattle' | 'listenPlay' | 'listenNext' | 'nextRound' | 'toFinal' | 'tNext' | 'tGo' | 'newMatch'

/**
 * Was der Spielleiter gerade am Handy drücken kann – genau die Hauptknöpfe des Bildschirms am Hauptgerät.
 * Der Host prüft jeden Wunsch gegen diese Liste, das Handy kann also nichts, was hier nicht steht.
 */
export function ctlButtons(S: State, playingKey: string | null = null): CtlButton[] {
  const out: CtlButton[] = []
  switch (S.screen) {
    case 'setup':
      if (S.pool.length >= picks(S)) out.push({ a: 'start', label: 'Match starten', kind: 'primary' })
      break
    case 'draft':
      if (!S.pending && !S.spin && !allFull(S) && S.pool.length) out.push({ a: 'spin', label: S.pool.length === 1 ? 'Letzten Künstler ziehen' : 'Rad drehen · ' + pname(S, drawer(S)), kind: 'primary', color: pcol(S, drawer(S)) })
      break
    case 'pick':
      if (!S.phoneMode) out.push({ a: 'pickNext', label: S.songs[pickOrder(S, S.duel)[S.pickIdx]]?.[S.duel] ? 'Song bestätigen' : 'Überspringen', kind: 'primary' })
      break
    case 'songs':
      out.push({ a: 'toBattle', label: S.phoneMode ? 'Nicht warten – zum Battle' : 'Zum Battle', kind: S.phoneMode ? 'ghost' : 'primary' })
      break
    case 'listen': {
      const L = S.listen
      if (!L) break
      const p = L.order[L.idx]
      out.push({ a: 'listenPlay', label: !L.shown ? pname(S, p) + ' aufdecken' : L.paused ? 'Weiter abspielen' : 'Pause', kind: 'play', on: L.shown && !L.paused, color: pcol(S, p) })
      if (L.shown) out.push({ a: 'listenNext', label: L.idx + 1 >= L.order.length ? 'Zum Versus' : 'Nächster Spieler', kind: 'primary' })
      break
    }
    case 'duel': {
      const ps = parts(S)
      if (!S.phoneMode)
        for (const p of ps) {
          const so = (S.songs[p] || [])[S.duel]
          if (so?.preview) out.push({ a: 'play', p, label: (playingKey === 'd' + p + '_' + S.duel ? 'Pause · ' : 'Abspielen · ') + pname(S, p), kind: 'play', on: playingKey === 'd' + p + '_' + S.duel, color: pcol(S, p) })
        }
      if (!S.audience) for (const p of ps) out.push({ a: 'win', p, label: pname(S, p) + ' gewinnt', kind: 'primary', color: pcol(S, p) })
      else if (S.votePhase === 'result') {
        if (S.voteWinner) out.push({ a: 'vwin', p: S.voteWinner, label: pname(S, S.voteWinner) + ' holt die Punkte', kind: 'primary', color: pcol(S, S.voteWinner) })
        else for (const p of ps) out.push({ a: 'vwin', p, label: pname(S, p) + ' gewinnt', kind: 'primary', color: pcol(S, p) })
        out.push({ a: 'voteAgain', label: 'Nochmal abstimmen', kind: 'ghost' })
      } else {
        const t = voteTotal(S)
        if (t) out.push({ a: 'voteClose', label: 'Abstimmung schließen · ' + t + (t === 1 ? ' Stimme' : ' Stimmen'), kind: 'primary' })
        out.push({ a: 'voteReset', label: 'Stimmen zurücksetzen', kind: 'ghost' })
      }
      break
    }
    case 'round': {
      const ld = leader(S)
      if (isT(S) && (ld || S.series === 'single')) out.push({ a: 'tNext', label: 'Weiter im Turnier', kind: 'primary' })
      else if (ld || S.series === 'single') out.push({ a: 'toFinal', label: 'Endstand ansehen', kind: 'primary' })
      else out.push({ a: 'nextRound', label: 'Nächste Runde', kind: 'primary' })
      break
    }
    case 'bracket':
      out.push({ a: 'tGo', label: 'Nächstes Duell starten', kind: 'primary' })
      break
    case 'final':
      out.push({ a: 'newMatch', label: 'Neues Match', kind: 'primary' })
      break
  }
  return out
}

export function duelKey(S: State) {
  return S.round + '-' + (S.sd ? 'sd' : S.duel)
}

export interface ViewExtra {
  playingKey?: string | null
  nowPlaying: number | null
  online: number[]
  voters: Record<number, Role[]>
}

export function buildView(S: State, extra: ViewExtra = { nowPlaying: null, online: [], voters: {} }): HostView {
  const players = Array.from({ length: S.players }, (_, j) => j + 1)
  const colors: Record<number, string> = {}
  const scores: Record<number, number> = {}
  const w: Record<number, number> = {}
  const songs: HostView['songs'] = {}
  const pics: Record<string, string> = {}
  for (const p of players) {
    colors[p] = pcol(S, p)
    scores[p] = roundScore(S, p)
    w[p] = wins(S, p)
    songs[p] = (S.songs[p] || []).map((so) => (so ? { id: so.id, title: so.title, cover: so.cover, dur: so.dur } : null))
    for (const a of S.lineup[p] || []) if (a) pics[a] = picOf(a)
  }
  if (S.sdArt) for (const a of Object.values(S.sdArt)) pics[a] = picOf(a)
  if (S.pending) pics[S.pending.artist] = picOf(S.pending.artist)
  return {
    v: 1,
    theme: S.theme,
    genre: S.genre,
    screen: S.screen,
    round: S.round,
    players: S.players,
    names: players.map((p) => pname(S, p)),
    colors,
    size: N(S),
    slotPts: Array.from({ length: N(S) }, (_, i) => pts(S, i + 1)),
    sameArtist: S.sameArtist,
    songMode: S.songMode,
    audience: S.audience,
    lineup: S.lineup,
    songs,
    pics,
    pending: S.pending,
    drawer: drawer(S),
    spinning: !!S.spin,
    poolCount: S.pool.length,
    duel: S.duel,
    pickIdx: S.pickIdx,
    pickOrder: S.screen === 'pick' ? pickOrder(S, S.duel) : [],
    sd: !!S.sd,
    sdArt: S.sdArt,
    parts: parts(S),
    winners: S.winners,
    scores,
    wins: w,
    target: target(S),
    votePhase: S.votePhase,
    tally: S.tally,
    voteWinner: S.voteWinner,
    duelKey: duelKey(S),
    phoneMode: S.phoneMode,
    ready: S.ready,
    listen: S.listen,
    spin: S.spin ? { target: S.spin.target, n: S.spin.n } : null,
    pool: S.screen === 'draft' || (S.screen === 'setup' && S.favMode) ? S.pool.slice(0, 120) : [],
    favMode: S.screen === 'setup' && S.favMode && !isT(S),
    favOwner: S.screen === 'setup' && S.favMode ? S.favOwner : {},
    nowPlaying: extra.nowPlaying,
    online: extra.online,
    voters: extra.voters,
    ctl: ctlButtons(S, extra.playingKey ?? null),
  }
}

/** Künstler eines Spielers auf Platz i (im Sudden Death der SD-Künstler). */
export const viewArtist = (V: HostView, p: number, i: number) => (V.sd ? V.sdArt?.[p] || null : (V.lineup[p] || [])[i] || null)

/** Wünsche vom Handy an den Host. */
export type PhoneMsg =
  | { t: 'hello'; role: Role }
  | { t: 'vote'; p: number; key: string }
  | { t: 'spin' }
  | { t: 'place'; pos: number }
  | { t: 'pickSong'; i: number; track: Track }
  | { t: 'manualSong'; i: number; text: string }
  | { t: 'pickNext' }
  | { t: 'pickDone'; on?: boolean }
  | { t: 'reveal' }
  | { t: 'listenNext' }
  | { t: 'favToggle'; name: string }
  | { t: 'ctl'; a: CtlAction; p?: number }

/** Antwort des Hosts an ein Handy (z. B. eigene Stimme). */
export interface PhoneState {
  vote: number | null
  key: string
}

/** Track auf die Felder reduzieren, die das Spiel braucht (wie songFromTrack). */
export function slimTrack(t: Track): Track {
  return {
    id: t.id,
    title: String(t.title || ''),
    title_short: t.title_short ? String(t.title_short) : undefined,
    duration: Number(t.duration) || 0,
    preview: typeof t.preview === 'string' && /^https:\/\/[^/]*dzcdn\.net\//.test(t.preview) ? t.preview : '',
    artist: t.artist ? { name: String(t.artist.name || '') } : undefined,
    album: t.album ? { id: Number(t.album.id) || 0, cover_small: safeImg(t.album.cover_small), cover_medium: safeImg(t.album.cover_medium) } : undefined,
  }
}
function safeImg(u: unknown): string | undefined {
  return typeof u === 'string' && /^https:\/\/[^/]*dzcdn\.net\//.test(u) ? u : undefined
}
