/**
 * Klänge per Web Audio – unverändert aus dem Original (Frequenzen, Längen, Lautstärken).
 * Stumm, wenn der Ton-Schalter aus ist. Die Song-Vorschau ist davon unabhängig.
 */

let isMuted = () => false
let reduce = false
export function configureSfx(muted: () => boolean, reducedMotion: boolean) {
  isMuted = muted
  reduce = reducedMotion
}

let actx: AudioContext | null = null
export function ac(): AudioContext | null {
  if (isMuted()) return null
  try {
    if (!actx) actx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    if (actx.state === 'suspended') void actx.resume()
    return actx
  } catch {
    return null
  }
}

export function tone(f: number, st: number, d: number, v?: number, ty?: OscillatorType) {
  const c = ac()
  if (!c) return
  const o = c.createOscillator(),
    g = c.createGain()
  o.type = ty || 'triangle'
  o.frequency.value = f
  const t = c.currentTime + st
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(v || 0.16, t + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, t + d)
  o.connect(g).connect(c.destination)
  o.start(t)
  o.stop(t + d + 0.03)
}

let lastTick = 0
export function tick() {
  const now = performance.now()
  if (now - lastTick <= 16) return
  lastTick = now
  const c = ac()
  if (!c) return
  const t = c.currentTime,
    sr = c.sampleRate,
    len = Math.ceil(sr * 0.05)
  const b = c.createBuffer(1, len, sr),
    d = b.getChannelData(0)
  for (let i = 0; i < len; i++) {
    const x = i / len
    d[i] = (Math.random() * 2 - 1) * Math.pow(1 - x, 8)
  }
  const s = c.createBufferSource()
  s.buffer = b
  const hp = c.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 560
  const bp = c.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 1500 + Math.random() * 1100
  bp.Q.value = 6
  const g = c.createGain()
  g.gain.value = 0.1 + Math.random() * 0.06
  s.connect(hp)
  hp.connect(bp)
  bp.connect(g)
  g.connect(c.destination)
  s.start(t)
  const o = c.createOscillator(),
    og = c.createGain()
  o.type = 'triangle'
  o.frequency.value = 150 + Math.random() * 45
  og.gain.setValueAtTime(0.0001, t)
  og.gain.exponentialRampToValueAtTime(0.045, t + 0.002)
  og.gain.exponentialRampToValueAtTime(0.0001, t + 0.05)
  o.connect(og).connect(c.destination)
  o.start(t)
  o.stop(t + 0.06)
}

let wh: { s: AudioBufferSourceNode; g: GainNode } | null = null
export function whoosh(ms: number) {
  const c = ac()
  if (!c || reduce) return
  const sr = c.sampleRate,
    len = Math.ceil(sr * 1.2)
  const b = c.createBuffer(1, len, sr),
    d = b.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  const s = c.createBufferSource()
  s.buffer = b
  s.loop = true
  const bp = c.createBiquadFilter()
  bp.type = 'bandpass'
  bp.Q.value = 0.7
  const g = c.createGain()
  const t = c.currentTime,
    e = t + ms / 1000
  bp.frequency.setValueAtTime(280, t)
  bp.frequency.exponentialRampToValueAtTime(1500, e)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(0.012, t + 0.3)
  g.gain.linearRampToValueAtTime(0.04, e)
  s.connect(bp).connect(g).connect(c.destination)
  s.start()
  wh = { s, g }
}
export function stopWhoosh() {
  if (!wh || !actx) return
  const c = actx,
    n = wh
  wh = null
  try {
    const t = c.currentTime
    n.g.gain.cancelScheduledValues(t)
    n.g.gain.setValueAtTime(Math.max(0.0001, n.g.gain.value), t)
    n.g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18)
    n.s.stop(t + 0.22)
  } catch {
    // ignorieren
  }
}

export const ding = () => {
  tone(880, 0, 0.18, 0.16)
  tone(1320, 0.07, 0.24, 0.12)
}
export const chime = () => {
  tone(784, 0, 0.12, 0.16)
  tone(1175, 0.09, 0.32, 0.15)
  tone(1568, 0.2, 0.45, 0.1)
}
export const fanfare = () =>
  [
    [523, 0, 0.18],
    [659, 0.1, 0.18],
    [784, 0.2, 0.2],
    [1047, 0.32, 0.5],
  ].forEach((a) => tone(a[0], a[1], a[2], 0.18))
export function revealSound() {
  const c = ac()
  if (!c) return
  tone(587, 0, 0.16, 0.13)
  tone(880, 0.07, 0.3, 0.15)
  tone(1175, 0.15, 0.4, 0.1)
}
export function winSound() {
  ;[
    [523, 0, 0.16],
    [659, 0.09, 0.16],
    [784, 0.18, 0.18],
    [1047, 0.28, 0.3],
    [1319, 0.4, 0.45],
  ].forEach((a) => tone(a[0], a[1], a[2], 0.17, 'triangle'))
  tone(2093, 0.5, 0.6, 0.07, 'sine')
  tone(1568, 0.55, 0.5, 0.06, 'sine')
}
export function voteSound() {
  tone(659, 0, 0.14, 0.15)
  tone(988, 0.1, 0.16, 0.15)
  tone(1319, 0.22, 0.4, 0.13, 'triangle')
}
export const vib = (p: number | number[]) => {
  try {
    if (navigator.vibrate) navigator.vibrate(p)
  } catch {
    // nicht unterstützt
  }
}

export const SOUNDS = { ding, chime, fanfare, revealSound, winSound, voteSound }
