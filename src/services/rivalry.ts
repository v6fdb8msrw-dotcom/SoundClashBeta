import type { Rivalry } from '../core/types'
import { loadRivalryData, saveRivalryData } from './storage'

/** Ewige Rivalität: Kopf-an-Kopf über Abende hinweg, nur bei genau 2 Spielern (wie im Original). */

let RIVAL: Record<string, Rivalry> | null = null
const listeners = new Set<() => void>()
export function subscribeRivalry(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
let version = 0
export const rivalryVersion = () => version
const notify = () => {
  version++
  listeners.forEach((f) => f())
}

export function loadRivalry() {
  if (RIVAL) return RIVAL
  RIVAL = loadRivalryData()
  notify()
  return RIVAL
}
/** Nach einem Import neu einlesen. */
export function reloadRivalry() {
  RIVAL = null
  loadRivalry()
}
export const getRivalry = () => RIVAL

export function rivalKey(n1: string, n2: string) {
  return [n1.toLowerCase().trim(), n2.toLowerCase().trim()].sort().join('|')
}

export function recordRivalry(n1: string, n2: string, winnerName: string, draw: boolean, now: number) {
  if (!n1 || !n2 || n1.toLowerCase() === n2.toLowerCase()) return
  const R = loadRivalry()
  const k = rivalKey(n1, n2),
    [a, b] = k.split('|')
  const r = R[k] || { a, b, aw: 0, bw: 0, draws: 0, last: 0 }
  if (draw) r.draws++
  else {
    const wl = winnerName.toLowerCase().trim()
    if (wl === a) r.aw++
    else r.bw++
  }
  r.last = now
  R[k] = r
  try {
    saveRivalryData(R)
  } catch {
    // ignorieren
  }
  notify()
}
