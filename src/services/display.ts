import { PREFIX, getItem, setItem } from './storage'

/**
 * Bildschirm: „Laptop“ (normal) oder „Fernseher“. Fernseher vergrößert die ganze Oberfläche, sodass
 * sie wie ein Bild mit etwa 1280 × 760 Punkten wirkt – auf jedem Fernseher gut lesbar von der Couch,
 * auch wenn der Mac nur gespiegelt wird. Gemerkt wird das nur auf diesem Gerät (eigener Schlüssel,
 * nicht im Spielstand).
 */

export type Screen = 'laptop' | 'tv'
const KEY = PREFIX + 'display'

let mode: Screen = 'laptop'
const listeners = new Set<() => void>()

export const getScreen = () => mode
export const subscribeScreen = (f: () => void) => {
  listeners.add(f)
  return () => listeners.delete(f)
}

/** Aktueller Vergrößerungsfaktor (1 = Laptop). */
export function tvZoom(): number {
  if (mode !== 'tv' || typeof window === 'undefined') return 1
  const z = Math.min(window.innerWidth / 1280, window.innerHeight / 760)
  return Math.round(Math.min(3, Math.max(1.2, z)) * 100) / 100
}

/** Gezoomt wird der Inhalt (.wrap) per CSS, nicht die ganze Seite – so bleiben Hintergrund und Effekte bildschirmfüllend. */
function apply() {
  const el = document.documentElement
  el.dataset.screen = mode
  el.style.setProperty('--tvz', String(tvZoom()))
  window.dispatchEvent(new Event('resize'))
}

export function setScreen(m: Screen) {
  mode = m
  setItem(KEY, m)
  apply()
  listeners.forEach((f) => f())
}

export function initScreen() {
  mode = getItem(KEY) === 'tv' ? 'tv' : 'laptop'
  apply()
  let t: ReturnType<typeof setTimeout> | undefined
  window.addEventListener('resize', (e) => {
    if (!e.isTrusted || mode !== 'tv') return
    clearTimeout(t)
    t = setTimeout(apply, 150)
  })
}
