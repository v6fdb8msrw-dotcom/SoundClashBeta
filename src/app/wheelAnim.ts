import { chime, stopWhoosh, tick, vib, whoosh } from '../services/sfx'

/**
 * Raddrehung wie im Original: Zielsegment kommt aus der Spiellogik, hier läuft nur die Bewegung.
 * 5 Umdrehungen in 4,2 s mit kubischem Ausrollen (reduzierte Bewegung: 1 Umdrehung, 0,5 s),
 * 30 Pegs erzeugen Ticks; nach dem Stopp 0,7 s (reduziert 0,2 s) Pause, dann „land“.
 * Läuft unabhängig von der Anzeige weiter, damit ein Bildschirmwechsel nichts hängen lässt.
 */

export const wheel = { rot: -Math.PI / 2, hi: -1, spinning: false, speed: 0, pegFlick: 0 }
const drawers = new Set<() => void>()
export function onWheelFrame(fn: () => void) {
  drawers.add(fn)
  return () => drawers.delete(fn)
}
const draw = () => drawers.forEach((f) => f())

export function spinAnim(tg: number, n: number, reduce: boolean, land: () => void) {
  wheel.spinning = true
  wheel.hi = -1
  const seg = (Math.PI * 2) / n
  let d = -Math.PI / 2 - (tg * seg + seg / 2) - (wheel.rot % (Math.PI * 2))
  d = ((d % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
  const turns = reduce ? 1 : 5,
    total = turns * Math.PI * 2 + d,
    start = wheel.rot,
    dur = reduce ? 500 : 4200,
    t0 = performance.now()
  whoosh(dur)
  const PEGS = 30,
    ps = (Math.PI * 2) / PEGS
  let lp = Math.floor(wheel.rot / ps)
  let last = t0
  const frame = (t: number) => {
    const p = Math.min(1, (t - t0) / dur),
      e = 1 - Math.pow(1 - p, 3)
    const prev = wheel.rot
    wheel.rot = start + total * e
    wheel.speed = (wheel.rot - prev) / Math.max(1, t - last)
    last = t
    const peg = Math.floor(wheel.rot / ps)
    if (peg !== lp) {
      tick()
      wheel.pegFlick = 1
      lp = peg
    }
    draw()
    if (p < 1) requestAnimationFrame(frame)
    else {
      wheel.speed = 0
      wheel.hi = tg
      draw()
      stopWhoosh()
      chime()
      vib(45)
      setTimeout(
        () => {
          wheel.hi = -1
          wheel.spinning = false
          land()
          draw()
        },
        reduce ? 200 : 700,
      )
    }
  }
  requestAnimationFrame(frame)
}
