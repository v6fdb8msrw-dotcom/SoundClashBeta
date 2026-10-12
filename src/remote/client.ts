import { joinRoom, type Room } from 'trystero'
import { APP_ID, type HostView, type PhoneMsg, type PhoneState, type Role } from './protocol'

/** Handy-Seite: mit Spielcode beitreten, Ansicht empfangen, Wünsche senden. */

export interface ClientState {
  status: 'connecting' | 'online' | 'lost'
  view: HostView | null
  avatars: Record<number, string>
  mine: PhoneState | null
  role: Role | null
  since: number
}

let room: Room | null = null
let send: ((m: PhoneMsg) => void) | null = null
let hostPeer: string | null = null
let state: ClientState = { status: 'connecting', view: null, avatars: {}, mine: null, role: null, since: Date.now() }
const listeners = new Set<() => void>()
const set = (patch: Partial<ClientState>) => {
  state = { ...state, ...patch }
  listeners.forEach((f) => f())
}
export const subscribeClient = (f: () => void) => {
  listeners.add(f)
  return () => listeners.delete(f)
}
export const getClient = () => state

const roleKey = (code: string) => 'soundclash.app.role.' + code

export function connect(code: string) {
  if (room) return
  let saved: Role | null = null
  try {
    const r = sessionStorage.getItem(roleKey(code))
    saved = r === 'audience' ? 'audience' : r ? Number(r) : null
  } catch {
    // ignorieren
  }
  set({ role: saved, since: Date.now() })
  room = joinRoom({ appId: APP_ID, password: 'sc-' + code }, 'room-' + code)
  const view = room.makeAction('view')
  const avatars = room.makeAction('avatars')
  const mine = room.makeAction('mine')
  const msg = room.makeAction('msg')
  send = (m) => {
    if (hostPeer) void msg.send(m as never, { target: hostPeer } as never)
    else void msg.send(m as never)
  }
  view.onMessage = (v: unknown, meta: { peerId: string }) => {
    hostPeer = meta.peerId
    set({ view: v as HostView, status: 'online' })
    if (state.role !== null && !helloSent) {
      helloSent = true
      send?.({ t: 'hello', role: state.role })
    }
  }
  avatars.onMessage = (a: unknown) => set({ avatars: a as Record<number, string> })
  mine.onMessage = (m: unknown) => set({ mine: m as PhoneState })
  room.onPeerJoin = () => {
    helloSent = false
    if (state.role !== null) send?.({ t: 'hello', role: state.role })
  }
  room.onPeerLeave = (peerId: string) => {
    if (peerId === hostPeer) {
      hostPeer = null
      helloSent = false
      set({ status: 'lost' })
    }
  }
}
let helloSent = false

export function chooseRole(code: string, role: Role) {
  try {
    sessionStorage.setItem(roleKey(code), String(role))
  } catch {
    // ignorieren
  }
  set({ role, mine: null })
  helloSent = true
  send?.({ t: 'hello', role })
}

export function ask(m: PhoneMsg) {
  send?.(m)
}
