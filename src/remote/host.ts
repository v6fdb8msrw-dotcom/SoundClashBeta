import { joinRoom, type Room } from 'trystero'
import { dispatch, getState, subscribe } from '../app/store'
import { playing, subscribeAudio } from '../services/audio'
import { allFull, drawer, parts, pickOrder, voteTotal } from '../core/game'
import type { State } from '../core/types'
import { APP_ID, buildView, duelKey, newCode, slimTrack, type PhoneMsg, type PhoneState, type Role } from './protocol'

/**
 * Hauptgerät: öffnet einen Raum mit Spielcode, schickt den Spielstand an gekoppelte Handys
 * und führt deren Wünsche als normale Spielaktionen aus – nur wenn sie gerade erlaubt sind.
 * Verbindung: WebRTC direkt zwischen den Geräten (Trystero). Für den Verbindungsaufbau dienen
 * kostenlose öffentliche Nostr-Relays; Spieldaten werden nirgends gespeichert.
 */

const SS_KEY = 'soundclash.app.pair'

interface Phone {
  role: Role | null
}

let room: Room | null = null
let code: string | null = null
const phones = new Map<string, Phone>()
/** Stimme je Handy für das aktuelle Duell. */
const votes = new Map<string, number>()
let votesKey = ''
let sendView: ((v: unknown, o?: { target?: string | string[] }) => void) | null = null
let sendAvatars: ((v: unknown, o?: { target?: string | string[] }) => void) | null = null
let sendMine: ((v: unknown, o?: { target?: string | string[] }) => void) | null = null
let unsub: (() => void) | null = null
let viewT: ReturnType<typeof setTimeout> | undefined
let lastAvatars = ''

const listeners = new Set<() => void>()
let version = 0
const notify = () => {
  version++
  listeners.forEach((f) => f())
}
export const subscribeHost = (f: () => void) => {
  listeners.add(f)
  return () => listeners.delete(f)
}
export const hostVersion = () => version
export const hostInfo = () => ({ code, phones: [...phones.values()] })

export function joinUrl(c: string) {
  return location.origin + location.pathname + '?join=' + c
}

function avatarsOf(S: State) {
  const out: Record<number, string> = {}
  for (let p = 1; p <= S.players; p++) out[p] = S.avatar[p] || ''
  return out
}

/** Spieler, dessen Song gerade auf dem Hauptgerät läuft (Schlüssel d1_0, l2_3, s1_0 …). */
function nowPlayingPlayer(): number | null {
  const m = playing ? /^(?:d|v|l|s)(\d+)_/.exec(playing) : null
  return m ? +m[1] : null
}
/** Spielerplätze mit verbundenem Handy. */
export function onlineRoles(): number[] {
  const out = new Set<number>()
  phones.forEach((p) => typeof p.role === 'number' && out.add(p.role))
  return [...out].sort()
}

/** Wer per Handy wofür gestimmt hat: Song (Spieler-Nr.) → Rollen der Handys. */
export function voterRoles(): Record<number, Role[]> {
  const out: Record<number, Role[]> = {}
  if (votesKey !== duelKey(getState())) return out
  votes.forEach((p, peerId) => {
    const r = phones.get(peerId)?.role
    if (r == null) return
    ;(out[p] = out[p] || []).push(r)
  })
  for (const k in out) out[k].sort((a, b) => (a === 'audience' ? 99 : a) - (b === 'audience' ? 99 : b))
  return out
}

function pushView(target?: string) {
  if (!room || !sendView) return
  const S = getState()
  sendView(buildView(S, { nowPlaying: nowPlayingPlayer(), online: onlineRoles(), voters: voterRoles() }), target ? { target } : undefined)
  const av = avatarsOf(S)
  const sig = JSON.stringify(av).length + ':' + Object.values(av).map((x) => x.slice(-24)).join('|')
  if (target || sig !== lastAvatars) {
    lastAvatars = sig
    sendAvatars?.(av, target ? { target } : undefined)
  }
}

function pushMine(peerId: string) {
  const S = getState()
  const st: PhoneState = { vote: votesKey === duelKey(S) ? (votes.get(peerId) ?? null) : null, key: duelKey(S) }
  sendMine?.(st, { target: peerId })
}

function onState() {
  const S = getState()
  // Stimmen gelten pro Duell; nach „Zurücksetzen“/„Nochmal abstimmen“ am Host wieder frei
  const k = duelKey(S)
  if (k !== votesKey || (S.votePhase === 'tally' && voteTotal(S) === 0 && votes.size)) {
    votesKey = k
    votes.clear()
    phones.forEach((_, id) => pushMine(id))
    notify()
  }
  clearTimeout(viewT)
  viewT = setTimeout(() => pushView(), 120)
}

function canAct(S: State, role: Role | null, m: PhoneMsg): boolean {
  if (role === null) return false
  switch (m.t) {
    case 'vote':
      // Handy-Modus: abgestimmt wird erst im Versus-Screen, wenn alle Songs aufgedeckt sind
      // Für den eigenen Song kann man nicht stimmen (Tims Vorgabe, MECHANIK §11)
      if (m.p === role) return false
      return S.screen === 'duel' && S.audience && S.votePhase === 'tally' && m.key === duelKey(S) && (S.sd ? !!(S.sdArt && S.sdArt[m.p]) : m.p >= 1 && m.p <= S.players)
    case 'spin':
      return role !== 'audience' && S.screen === 'draft' && !S.pending && !S.spin && !allFull(S) && drawer(S) === role
    case 'place':
      return role !== 'audience' && S.screen === 'draft' && !!S.pending && S.pending.player === role
    case 'pickSong':
    case 'manualSong':
      if (role === 'audience') return false
      // Handy-Modus: alle Teilnehmer wählen gleichzeitig
      if (S.screen === 'pick' && S.phoneMode) return parts(S).includes(role) && m.i === S.duel
      if (S.screen === 'pick') return pickOrder(S, S.duel)[S.pickIdx] === role && m.i === S.duel
      if (S.screen === 'songs') return !!(S.songs[role] && m.i >= 0 && m.i < S.songs[role].length) && !(S.sd && !S.sdArt?.[role])
      return false
    case 'pickNext':
      return role !== 'audience' && !S.phoneMode && S.screen === 'pick' && pickOrder(S, S.duel)[S.pickIdx] === role
    case 'pickDone':
      return role !== 'audience' && S.phoneMode && (S.screen === 'pick' || S.screen === 'songs') && parts(S).includes(role)
    case 'reveal':
      return S.screen === 'listen' && !!S.listen && S.listen.order[S.listen.idx] === role
    case 'listenNext':
      return S.screen === 'listen' && !!S.listen && S.listen.shown && S.listen.order[S.listen.idx] === role
  }
  return false
}

function onPhone(m: PhoneMsg, peerId: string) {
  const ph = phones.get(peerId) || { role: null }
  phones.set(peerId, ph)
  if (m.t === 'hello') {
    ph.role = m.role === 'audience' || (typeof m.role === 'number' && m.role >= 1 && m.role <= 6) ? m.role : null
    notify()
    pushView()
    pushMine(peerId)
    return
  }
  const S = getState()
  if (!canAct(S, ph.role, m)) return
  switch (m.t) {
    case 'vote': {
      // Eine Stimme pro Handy und Duell; Wechsel = alte Stimme zurück, neue dazu (wie − und +1 am Host)
      const prev = votes.get(peerId)
      if (prev === m.p) return
      if (prev != null && (S.tally[prev] || 0) > 0) dispatch({ type: 'bump', p: prev, d: -1 })
      dispatch({ type: 'bump', p: m.p, d: 1 })
      votes.set(peerId, m.p)
      votesKey = duelKey(getState())
      pushMine(peerId)
      notify()
      return
    }
    case 'spin':
      return dispatch({ type: 'spin' })
    case 'place':
      return dispatch({ type: 'place', pos: m.pos })
    case 'pickSong':
      return dispatch({ type: 'pickSong', p: ph.role as number, i: m.i, track: slimTrack(m.track) })
    case 'manualSong':
      return dispatch({ type: 'manualSong', p: ph.role as number, i: m.i, text: String(m.text || '').slice(0, 120), id: 'm' + Date.now() })
    case 'pickNext':
      return dispatch({ type: 'pickNext' })
    case 'pickDone':
      return dispatch({ type: 'phoneReady', p: ph.role as number, on: m.on !== false })
    case 'reveal':
      return dispatch({ type: 'listenPlay' })
    case 'listenNext':
      return dispatch({ type: 'listenNext' })
  }
}

/** Kopplung starten (oder mit gespeichertem Code wieder aufnehmen). */
export function startHost(): string {
  if (room && code) return code
  try {
    code = sessionStorage.getItem(SS_KEY) || newCode()
    sessionStorage.setItem(SS_KEY, code)
  } catch {
    code = code || newCode()
  }
  room = joinRoom({ appId: APP_ID, password: 'sc-' + code }, 'room-' + code)
  const view = room.makeAction('view')
  const avatars = room.makeAction('avatars')
  const mine = room.makeAction('mine')
  const msg = room.makeAction('msg')
  sendView = (v, o) => void view.send(v as never, o as never)
  sendAvatars = (v, o) => void avatars.send(v as never, o as never)
  sendMine = (v, o) => void mine.send(v as never, o as never)
  msg.onMessage = (data: unknown, meta: { peerId: string }) => onPhone(data as PhoneMsg, meta.peerId)
  room.onPeerJoin = (peerId: string) => {
    phones.set(peerId, phones.get(peerId) || { role: null })
    notify()
    pushView(peerId)
  }
  room.onPeerLeave = (peerId: string) => {
    phones.delete(peerId)
    // Stimme bleibt im Ergebnis (wie am Host gezählt), nur die Zuordnung zum Handy entfällt
    votes.delete(peerId)
    notify()
    pushView()
  }
  const u1 = subscribe(onState)
  const u2 = subscribeAudio(() => {
    clearTimeout(viewT)
    viewT = setTimeout(() => pushView(), 120)
  })
  unsub = () => (u1(), u2())
  votesKey = duelKey(getState())
  notify()
  return code
}

export function stopHost() {
  unsub?.()
  unsub = null
  void room?.leave()
  room = null
  code = null
  phones.clear()
  votes.clear()
  sendView = sendAvatars = sendMine = null
  try {
    sessionStorage.removeItem(SS_KEY)
  } catch {
    // ignorieren
  }
  notify()
}

/** Nach einem Neuladen des Hauptgeräts die Kopplung automatisch fortsetzen. */
export function resumeHost() {
  try {
    if (sessionStorage.getItem(SS_KEY)) startHost()
  } catch {
    // ignorieren
  }
}
