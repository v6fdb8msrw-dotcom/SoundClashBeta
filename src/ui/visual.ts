import { currentTime, getAnalyser, gPlaying, playing } from '../services/audio'

/**
 * Gemeinsame Taktquelle für alle Visualisierungen (Plattenspieler-Ring, Duell-Cover, Aurora, Wand).
 * Mit echtem AnalyserNode (Mac) kommen echte Frequenzen; sonst (iPhone, CORS-Fehler) eine
 * simulierte, musikalisch wirkende Bewegung. Läuft nur, solange etwas spielt oder ausklingt.
 */

export const BANDS = 48
export const vis = { bands: new Float32Array(BANDS), level: 0, beat: 0, real: false, active: false }

const subs = new Set<(dt: number) => void>()
let raf = 0
let lastT = 0
let buf: Uint8Array<ArrayBuffer> | null = null
let simPhase = Math.random() * 100
let beatAcc = 0

export function onVisFrame(fn: (dt: number) => void) {
  subs.add(fn)
  ensureLoop()
  return () => {
    subs.delete(fn)
  }
}

function noise(x: number) {
  return Math.sin(x) * 0.5 + Math.sin(x * 2.17 + 1.3) * 0.3 + Math.sin(x * 5.03 + 0.7) * 0.2
}

function step(t: number) {
  raf = 0
  const dt = Math.min(64, t - (lastT || t))
  lastT = t
  const on = !!playing || gPlaying
  const an = on ? getAnalyser() : null
  vis.real = !!an
  if (an) {
    if (!buf || buf.length !== an.frequencyBinCount) buf = new Uint8Array(new ArrayBuffer(an.frequencyBinCount))
    an.getByteFrequencyData(buf)
    const n = buf.length
    let sum = 0
    for (let i = 0; i < BANDS; i++) {
      // logarithmische Verteilung: mehr Auflösung im Bass
      const a = Math.floor(Math.pow(i / BANDS, 1.6) * (n * 0.72)),
        b = Math.max(a + 1, Math.floor(Math.pow((i + 1) / BANDS, 1.6) * (n * 0.72)))
      let m = 0
      for (let k = a; k < b; k++) m = Math.max(m, buf[k])
      const v = m / 255
      vis.bands[i] = vis.bands[i] * 0.35 + v * 0.65
      sum += v
    }
    const lvl = sum / BANDS
    vis.beat = Math.max(vis.beat * 0.9, lvl > vis.level * 1.25 ? 1 : 0)
    vis.level = vis.level * 0.8 + lvl * 0.2
  } else if (on) {
    // Simulation: Grundpuls ~118 BPM + Rauschen pro Band
    const { t: ct } = currentTime()
    simPhase += dt * 0.0021
    beatAcc += dt
    const period = 60000 / 118
    const ph = (beatAcc % period) / period
    const kick = Math.pow(1 - ph, 3)
    vis.beat = kick
    let sum = 0
    for (let i = 0; i < BANDS; i++) {
      const f = i / BANDS
      const base = 0.55 - f * 0.35
      const v = Math.max(0, Math.min(1, base + noise(simPhase * (1.2 + f * 3) + i * 0.9 + ct) * 0.32 + kick * (0.42 - f * 0.3)))
      vis.bands[i] = vis.bands[i] * 0.55 + v * 0.45
      sum += vis.bands[i]
    }
    vis.level = sum / BANDS
  } else {
    let sum = 0
    for (let i = 0; i < BANDS; i++) {
      vis.bands[i] *= 0.86
      sum += vis.bands[i]
    }
    vis.level = sum / BANDS
    vis.beat *= 0.85
  }
  vis.active = on || vis.level > 0.004
  subs.forEach((f) => f(dt))
  if (subs.size && (vis.active || on)) raf = requestAnimationFrame(step)
  else idle()
}

let idleT: ReturnType<typeof setTimeout> | undefined
function idle() {
  // ruhig warten, ohne Dauer-Animation; alle 250 ms nachsehen, ob etwas spielt
  clearTimeout(idleT)
  idleT = setTimeout(() => {
    if (subs.size) {
      lastT = 0
      if (!!playing || gPlaying) ensureLoop()
      else idle()
    }
  }, 250)
}

function ensureLoop() {
  if (!raf) raf = requestAnimationFrame(step)
}

/** Sofort aufwecken (z. B. direkt nach Start einer Vorschau). */
export function kickVis() {
  ensureLoop()
}
