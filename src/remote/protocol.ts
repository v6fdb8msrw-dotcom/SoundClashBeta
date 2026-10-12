import { drawer, N, parts, pcol, pickOrder, pname, pts, roundScore, target, wins } from '../core/game'
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
}

export function duelKey(S: State) {
  return S.round + '-' + (S.sd ? 'sd' : S.duel)
}

export interface ViewExtra {
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
    pool: S.screen === 'draft' ? S.pool.slice(0, 80) : [],
    nowPlaying: extra.nowPlaying,
    online: extra.online,
    voters: extra.voters,
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
