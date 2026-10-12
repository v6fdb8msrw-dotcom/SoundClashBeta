/**
 * Spielzustand – reine, serialisierbare Daten (JSON-fähig).
 * Feldnamen entsprechen dem Zustand `S` des Originals, damit die Logik 1:1 lesbar bleibt.
 */

export type Screen =
  | 'home' | 'setup' | 'bracket' | 'draft' | 'songs' | 'pick' | 'duel' | 'round' | 'final'
  | 'gssetup' | 'gsplay' | 'sbsetup' | 'sbplay' | 'tlsetup' | 'tlplay' | 'ddsetup' | 'ddplay' | 'soon'
  /** Handy-Modus: Songs laufen nacheinander auf dem Hauptgerät, bevor entschieden wird. */
  | 'listen'

/** Gewählter Song pro Platz. */
export interface Song {
  id: number | string
  title: string
  cover: string
  preview: string
  dur: string
  manual?: boolean
}

/** Deezer-Track (nur die Felder, die das Spiel nutzt). */
export interface Track {
  id: number
  title: string
  title_short?: string
  duration?: number
  preview?: string
  artist?: { id?: number; name: string; picture?: string; picture_medium?: string }
  album?: { id: number; cover_small?: string; cover_medium?: string; cover_big?: string }
}

/** Karte in Guess / Timeline / Jahrzehnt-Duell / Sing it Back. */
export interface PoolSong {
  title: string
  artist: string
  preview: string
  cover: string
  img?: string
  year?: number
  album?: number | null
}

export interface RosterEntry {
  name: string
  av: string
  col: string
}

export interface Tourney {
  roster: RosterEntry[]
  rounds: [number, number][][]
  results: number[][]
  r: number
  m: number
  champ: number | null
  /** Künstler-Topf beim Turnierstart – jedes Match zieht aus einem vollen Topf. */
  pool?: string[]
}

export interface WinnerRecord {
  pos: number
  p: number
  /** Künstler. Beim Sudden Death ist das im Original der Wert `true` (Auffälligkeit 8). */
  artist: string | boolean
  song: Partial<Song>
  sd?: boolean
}

export interface GuessState {
  genres: string[]
  players: number
  rounds: number
  diff: string
  scores?: Record<number, number>
  ridx?: number
  step?: number
  picked?: number | null
  correct?: boolean
  gained?: number
  loading?: boolean
  err?: string
  seq?: { player: number; song: PoolSong; opts: PoolSong[] }[] | null
}

export interface SingState {
  genres: string[]
  players: number
  rounds: number
  scores?: Record<number, number>
  ridx?: number
  stage?: number
  loading?: boolean
  err?: string
  seq?: { player: number; song: PoolSong }[] | null
}

export interface TimelineState {
  genres: string[]
  players: number
  target: number
  variant?: 'timeline' | 'decade'
  ddTarget?: number
  loading?: boolean
  err?: string
  stage?: 'listen' | 'reveal' | 'win'
  winner?: number | null
  deck?: PoolSong[]
  bag?: number[] | null
  turn?: number
  timelines?: PoolSong[][]
  current?: PoolSong
  result?: { ok: boolean; g: number } | null
  rotating?: boolean
}

export interface DecadeState {
  genres: string[]
  target: number
  loading?: boolean
  err?: string
  stage?: 'listen' | 'steal' | 'reveal' | 'win'
  winner?: number | null
  deck?: PoolSong[]
  bag?: number[] | null
  turn?: number
  scores?: [number, number]
  current?: PoolSong
  pick?: number | null
  stealPick?: number | null
}

export interface State {
  screen: Screen
  pendingMode: string | null
  pickSec: number
  players: number
  names: string[]
  avatar: Record<number, string>
  size: number
  series: 'single' | 'bo3' | 'bo5'
  muted: boolean
  ambience: boolean
  autoScroll: boolean
  theme: string
  bg: string
  genre: string
  pool: string[]
  custom: string[]
  songMode: 'upfront' | 'perduel'
  sameArtist: boolean
  pickIdx: number
  audience: boolean
  tally: Record<number, number>
  votePhase: null | 'tally' | 'result'
  voteWinner: number | null
  eras: 'off' | 'all' | 'some'
  /** Jahrzehnt-Auflage je Platz als ERAS-id (im Original immer leer). */
  eraMap: (string | null)[]
  setupTab: 'cfg' | 'players' | 'pool'
  mode: 'clash' | 't4' | 't8' | 't16'
  T: Tourney | null
  lineup: Record<number, (string | null)[]>
  songs: Record<number, (Song | null)[]>
  winners: (number | null)[]
  used: Record<string, unknown>
  pending: { player: number; artist: string } | null
  duel: number
  wins: Record<number, number>
  round: number
  sd: true | null
  sdArt: Record<number, string> | null
  regularWinners: WinnerRecord[] | null
  /** Stand der regulären Runde, bevor der Sudden Death begann (Punkte, Sieger, Songs). */
  regular: { winners: (number | null)[]; songs: Record<number, (Song | null)[]>; scores: Record<number, number> } | null
  warnOff: boolean
  colors: Record<number, string> | null
  /** Handy-Modus: Spieler wählen am Handy (gleichzeitig), das Hauptgerät zeigt und spielt ab. */
  phoneMode: boolean
  /** Handy-Modus: wer mit der Songwahl fertig ist (aktuelles Duell bzw. alle Songs). */
  ready: Record<number, boolean>
  /** Handy-Modus: Abspiel-Reihenfolge des aktuellen Duells und der gerade laufende Song. */
  listen: { order: number[]; idx: number } | null
  /** Laufende Raddrehung: Zielsegment (im Original die Variablen spinning/tg). */
  spin: { target: number; n: number } | null
  gs?: GuessState
  sb?: SingState
  tl?: TimelineState
  dd?: DecadeState
}

/** Was gespeichert wird – Feldreihenfolge und Inhalt wie `save()` im Original. */
export interface SavedSettings {
  players: number
  names: string[]
  avatar: Record<number, string>
  size: number
  series: string
  muted: boolean
  ambience: boolean
  theme: string
  bg: string
  genre: string
  pool: string[]
  warnOff: boolean
  songMode: string
  sameArtist: boolean
  custom: string[]
  audience: boolean
  mode: string
  roster: RosterEntry[] | null
  autoScroll?: boolean
  pickSec?: number
  phoneMode?: boolean
}

export interface Rivalry {
  a: string
  b: string
  aw: number
  bw: number
  draws: number
  last: number
}
