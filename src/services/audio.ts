/**
 * Wiedergabe der 30-Sekunden-Vorschauen von Deezer (wie play/playDeezer/stopAudio im Original)
 * plus Analyse für die Visualisierung.
 *
 * Visualisierung: Die Deezer-MP3s senden „Access-Control-Allow-Origin: *“. Auf dem Mac wird die
 * Vorschau deshalb über einen AnalyserNode geführt (echte Frequenzen). Auf iPhone/iPad bleibt die
 * Wiedergabe bewusst ohne Web Audio (Safari stummt sonst Elemente, sobald der AudioContext pausiert);
 * dort wird die Visualisierung simuliert. Schlägt das Laden mit CORS fehl, wird automatisch ohne
 * Analyse abgespielt.
 */

type Listener = () => void
const listeners = new Set<Listener>()
let version = 0
function notify() {
  version++
  listeners.forEach((l) => l())
}
export function subscribeAudio(l: Listener) {
  listeners.add(l)
  return () => listeners.delete(l)
}
export const audioVersion = () => version

let toastFn: (m: string) => void = () => undefined
let ambienceOn: () => boolean = () => true
export function configureAudio(opts: { toast: (m: string) => void; ambience: () => boolean }) {
  toastFn = opts.toast
  ambienceOn = opts.ambience
}

export const isIOS = () =>
  typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))

let fxEl: HTMLAudioElement | null = null
let plainEl: HTMLAudioElement | null = null
let useFx = !isIOS()
let audio: HTMLAudioElement | null = null
let vctx: AudioContext | null = null
let analyser: AnalyserNode | null = null

export let playing: string | null = null
export let lastCover = ''
/** Album-Wand pulsiert (startAmbience/stopAmbience). */
export let beat = false

function onEnded() {
  playing = null
  beat = false
  notify()
}

function element(): HTMLAudioElement {
  if (useFx) {
    if (!fxEl) {
      fxEl = new Audio()
      fxEl.crossOrigin = 'anonymous'
      fxEl.addEventListener('ended', onEnded)
    }
    return fxEl
  }
  if (!plainEl) {
    plainEl = new Audio()
    plainEl.addEventListener('ended', onEnded)
  }
  return plainEl
}

function connectAnalyser(el: HTMLAudioElement) {
  if (!useFx || analyser) {
    if (vctx && vctx.state === 'suspended') void vctx.resume()
    return
  }
  try {
    vctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const src = vctx.createMediaElementSource(el)
    analyser = vctx.createAnalyser()
    analyser.fftSize = 256
    analyser.smoothingTimeConstant = 0.78
    src.connect(analyser)
    analyser.connect(vctx.destination)
    if (vctx.state === 'suspended') void vctx.resume()
  } catch {
    analyser = null
  }
}

/** Echte Analysedaten, falls verfügbar – sonst null (Visualisierung simuliert). */
export function getAnalyser(): AnalyserNode | null {
  return useFx && analyser && audio === fxEl && vctx?.state === 'running' ? analyser : null
}

export function startAmbience() {
  if (!ambienceOn()) return
  beat = true
  notify()
}
export function stopAmbience() {
  beat = false
  notify()
}

export function stopAudio() {
  if (audio) {
    try {
      audio.pause()
    } catch {
      // ignorieren
    }
  }
  playing = null
  lastCover = ''
  beat = false
  notify()
}

export function play(url: string, key: string, cover?: string) {
  lastCover = cover || ''
  playDeezer(url, key)
}

function playDeezer(url: string, key: string) {
  if (!url) {
    toastFn("Für diesen Song gibt's keine Vorschau — nutz Spotify oder YouTube.")
    return
  }
  if (playing === key) {
    stopAudio()
    return
  }
  try {
    audio?.pause()
  } catch {
    // ignorieren
  }
  const el = element()
  audio = el
  el.src = url
  el.currentTime = 0
  if (el === fxEl) connectAnalyser(el)
  el.play().catch(() => {
    // CORS oder Format: einmal ohne Analyse versuchen, sonst Hinweis wie im Original
    if (el === fxEl && playing === key) {
      useFx = false
      const p = element()
      audio = p
      p.src = url
      p.currentTime = 0
      p.play().catch(() => toastFn('Vorschau konnte nicht starten.'))
      return
    }
    toastFn('Vorschau konnte nicht starten.')
  })
  playing = key
  startAmbience()
}

/**
 * Safari erlaubt Ton nur nach einer Berührung. Im Handy-Modus startet das Hauptgerät die
 * Vorschauen selbst – deshalb beim ersten Tippen/Klicken die Wiedergabe einmal „freischalten“.
 */
const SILENT = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='
let unlocked = false
export function unlockAudio() {
  if (unlocked) return
  unlocked = true
  const el = element()
  if (!audio) {
    try {
      el.src = SILENT
      void el.play().then(() => el.pause()).catch(() => undefined)
    } catch {
      // ignorieren
    }
  }
  if (el === fxEl) connectAnalyser(el)
}
if (typeof window !== 'undefined') {
  const once = () => {
    unlockAudio()
    window.removeEventListener('pointerdown', once)
    window.removeEventListener('keydown', once)
  }
  window.addEventListener('pointerdown', once)
  window.addEventListener('keydown', once)
}

export function currentTime(): { t: number; d: number } {
  return audio && playing ? { t: audio.currentTime || 0, d: audio.duration || 30 } : { t: 0, d: 30 }
}

/* ---- Snippets für Guess / Sing it Back (eigenes Element, stört die Battle-Wiedergabe nicht) ---- */
let gAudio: (HTMLAudioElement & { _url?: string }) | null = null
let gStopT: ReturnType<typeof setTimeout> | undefined
export let gPlaying = false
export function gPlayFrom(url: string, start: number, secs: number, onDone?: () => void) {
  if (!url) return
  if (!gAudio) gAudio = new Audio()
  const ga = gAudio
  clearTimeout(gStopT)
  const run = () => {
    try {
      ga.currentTime = start || 0
    } catch {
      // ignorieren
    }
    ga.play().catch(() => undefined)
    gPlaying = true
    notify()
    gStopT = setTimeout(() => {
      try {
        ga.pause()
      } catch {
        // ignorieren
      }
      gPlaying = false
      notify()
      if (typeof onDone === 'function') onDone()
    }, Math.round(secs * 1000))
  }
  if (ga._url === url && ga.readyState >= 2) {
    try {
      ga.pause()
    } catch {
      // ignorieren
    }
    run()
    return
  }
  try {
    ga.pause()
  } catch {
    // ignorieren
  }
  ga._url = url
  ga.src = url
  const on = () => {
    ga.removeEventListener('canplay', on)
    run()
  }
  ga.addEventListener('canplay', on)
  try {
    ga.load()
  } catch {
    // ignorieren
  }
}
export function gStop() {
  clearTimeout(gStopT)
  if (gAudio) {
    try {
      gAudio.pause()
    } catch {
      // ignorieren
    }
  }
  if (gPlaying) {
    gPlaying = false
    notify()
  }
}

export function preloadCard(c: { cover?: string; preview?: string } | null | undefined) {
  try {
    if (c && c.cover) {
      const im = new Image()
      im.src = c.cover
    }
    if (c && c.preview) {
      const a = new Audio()
      a.preload = 'auto'
      a.src = c.preview
    }
  } catch {
    // ignorieren
  }
}
