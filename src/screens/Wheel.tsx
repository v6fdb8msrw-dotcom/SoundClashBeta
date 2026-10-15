import { motion, useAnimationControls } from 'motion/react'
import { useEffect, useLayoutEffect, useRef } from 'react'
import { dispatch, env } from '../app/store'
import { onWheelFrame, wheel } from '../app/wheelAnim'
import { mixHex } from '../core/colors'
import { GENRE_HUE, WCOL } from '../core/constants'
import type { State } from '../core/types'
import { tvZoom } from '../services/display'

/**
 * Glücksrad: Segmentfarben wie im Original (Theme-Farben, Richtung Genre-Ton gemischt),
 * neu gezeichnet mit Leuchtring, LED-Pegs, Tiefe und Glanz. Gedreht wird über wheelAnim.
 */

function cssVar(name: string) {
  return getComputedStyle(document.body).getPropertyValue(name).trim() || '#888'
}

export function drawWheel(cv: HTMLCanvasElement | null, S: State) {
  if (!cv) return
  const ctx = cv.getContext('2d')
  if (!ctx) return
  // Fernseher-Modus vergrößert per CSS-Zoom: Zeichenfläche entsprechend schärfer anlegen
  const dpr = Math.min(5, (window.devicePixelRatio || 1) * tvZoom()),
    W = cv.clientWidth || 400
  if (cv.width !== Math.round(W * dpr)) {
    cv.width = Math.round(W * dpr)
    cv.height = Math.round(W * dpr)
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  const cx = W / 2,
    cy = W / 2,
    R = W / 2 - 14
  ctx.clearRect(0, 0, W, W)
  const base = WCOL.map((c) => (c.startsWith('var(') ? cssVar(c.slice(4, -1)) : c))
  const gh = GENRE_HUE[S.genre]
  const cols = gh
    ? base.map((c, i) => {
        try {
          return mixHex(c, gh, 0.32 + 0.16 * Math.sin(i * 1.7))
        } catch {
          return c
        }
      })
    : base
  const primary = cssVar('--primary'),
    surf = cssVar('--surface-2')
  const font = cssVar('--font-body') || 'system-ui,sans-serif'
  const tone = (a: string, b: string, t: number) => {
    try {
      return mixHex(a, b, t)
    } catch {
      return a
    }
  }
  // Außenring: metallischer Rahmen in der Album-Farbe mit Glanz von oben links
  ctx.save()
  ctx.shadowColor = primary
  ctx.shadowBlur = 26
  ctx.beginPath()
  ctx.arc(cx, cy, R + 10, 0, Math.PI * 2)
  const rim = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R)
  rim.addColorStop(0, tone(primary, '#ffffff', 0.45))
  rim.addColorStop(0.35, tone(primary, surf, 0.55))
  rim.addColorStop(0.7, tone(surf, '#000000', 0.35))
  rim.addColorStop(1, tone(primary, '#000000', 0.45))
  ctx.fillStyle = rim
  ctx.fill()
  ctx.restore()
  ctx.beginPath()
  ctx.arc(cx, cy, R + 1.5, 0, Math.PI * 2)
  ctx.fillStyle = tone(surf, '#000000', 0.55)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(cx, cy, R + 10, 0, Math.PI * 2)
  ctx.strokeStyle = tone(primary, '#ffffff', 0.25)
  ctx.lineWidth = 1.5
  ctx.stroke()
  // LED-Pegs (30) – leuchten am Zeiger auf
  const PEGS = 30
  for (let k = 0; k < PEGS; k++) {
    const a = wheel.rot + (k / PEGS) * Math.PI * 2
    const px = cx + Math.cos(a) * (R + 4.5),
      py = cy + Math.sin(a) * (R + 4.5)
    const near = Math.cos(a + Math.PI / 2) // 1 = oben am Zeiger
    const glow = Math.max(0, near) ** 12
    ctx.beginPath()
    ctx.arc(px, py, 2.2 + glow * 1.6, 0, Math.PI * 2)
    ctx.fillStyle = glow > 0.2 ? '#fff' : 'rgba(255,255,255,.45)'
    ctx.fill()
  }
  const n = S.pool.length
  if (!n) {
    ctx.fillStyle = 'rgba(255,255,255,.25)'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = '600 15px ' + (cssVar('--font-body') || 'sans-serif')
    ctx.fillText('Topf ist leer', cx, cy)
    return
  }
  const seg = (Math.PI * 2) / n,
    fs = Math.max(9, Math.min(17, 140 / n + 7))
  for (let i = 0; i < n; i++) {
    const a0 = wheel.rot + i * seg,
      a1 = a0 + seg
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.arc(cx, cy, R, a0, a1)
    ctx.closePath()
    ctx.fillStyle = cols[i % cols.length]
    ctx.fill()
    // Tiefe: innen dunkler, außen heller
    const g = ctx.createRadialGradient(cx, cy, R * 0.15, cx, cy, R)
    g.addColorStop(0, 'rgba(0,0,0,.42)')
    g.addColorStop(0.55, 'rgba(0,0,0,.06)')
    g.addColorStop(0.92, 'rgba(255,255,255,.08)')
    g.addColorStop(1, 'rgba(0,0,0,.25)')
    ctx.fillStyle = g
    ctx.fill()
    if (i === wheel.hi) {
      ctx.save()
      ctx.fillStyle = 'rgba(255,255,255,.38)'
      ctx.shadowColor = '#fff'
      ctx.shadowBlur = 30
      ctx.fill()
      ctx.restore()
    }
    // feine helle Trennlinien statt dunkler Ränder
    ctx.strokeStyle = 'rgba(255,255,255,.16)'
    ctx.lineWidth = 1.2
    ctx.stroke()
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(a0 + seg / 2)
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#140805'
    ctx.font = (i === wheel.hi ? '800 ' : '700 ') + fs + 'px ' + font
    let l = S.pool[i]
    const mx = Math.max(6, Math.floor(26 - n * 0.32))
    if (l.length > mx) l = l.slice(0, mx - 1) + '…'
    ctx.fillText(l, R - 14, 0)
    ctx.restore()
  }
  // Glas-Kuppel: weicher Lichtfleck oben links, leichte Vignette am Rand (steht still beim Drehen)
  const sh = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.45, R * 0.05, cx - R * 0.2, cy - R * 0.25, R * 1.05)
  sh.addColorStop(0, 'rgba(255,255,255,.26)')
  sh.addColorStop(0.45, 'rgba(255,255,255,.04)')
  sh.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.beginPath()
  ctx.arc(cx, cy, R, 0, Math.PI * 2)
  ctx.fillStyle = sh
  ctx.fill()
  const vg = ctx.createRadialGradient(cx, cy, R * 0.7, cx, cy, R)
  vg.addColorStop(0, 'rgba(0,0,0,0)')
  vg.addColorStop(1, 'rgba(0,0,0,.28)')
  ctx.fillStyle = vg
  ctx.fill()
  // Bewegungsunschärfe-Andeutung bei hoher Geschwindigkeit
  if (wheel.speed > 0.012 && !env.reduce) {
    ctx.beginPath()
    ctx.arc(cx, cy, R * 0.98, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(255,255,255,${Math.min(0.25, wheel.speed * 6)})`
    ctx.lineWidth = R * 0.08
    ctx.stroke()
  }
}

export function Wheel({ S, revealing, children }: { S: State; revealing: boolean; children?: React.ReactNode }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const sRef = useRef(S)
  const ptr = useAnimationControls()
  const flickStart = useRef<{ x: number; y: number; t: number } | null>(null)
  sRef.current = S
  useLayoutEffect(() => drawWheel(ref.current, S))
  useEffect(() => {
    let flick = 0
    const off = onWheelFrame(() => {
      drawWheel(ref.current, sRef.current)
      if (wheel.pegFlick && !env.reduce) {
        wheel.pegFlick = 0
        flick++
        void ptr.start({ rotate: [0, -16, 0], transition: { duration: 0.12, ease: 'easeOut' } })
      }
    })
    const rs = () => drawWheel(ref.current, sRef.current)
    window.addEventListener('resize', rs)
    // Schriften können nach dem ersten Zeichnen kommen
    void document.fonts?.ready.then(rs)
    return () => {
      off()
      window.removeEventListener('resize', rs)
      void flick
    }
  }, [ptr])
  return (
    <div className={'wheelbox' + (revealing ? ' revealing' : '') + (S.spin ? ' spinning' : '')}>
      <motion.div className="ptr" animate={ptr} aria-hidden />
      <canvas
        id="wheel"
        ref={ref}
        width={600}
        height={600}
        aria-label={'Glücksrad mit ' + S.pool.length + ' Künstlern – wischen oder SPIN tippen'}
        onPointerDown={(e) => (flickStart.current = { x: e.clientX, y: e.clientY, t: performance.now() })}
        onPointerUp={(e) => {
          // Wisch-Geste: kräftig über das Rad ziehen = drehen (wie der Knopf)
          const f = flickStart.current
          flickStart.current = null
          if (!f) return
          const d = Math.hypot(e.clientX - f.x, e.clientY - f.y),
            dt = performance.now() - f.t
          if (d > 40 && dt < 700) dispatch({ type: 'spin' })
        }}
        style={{ touchAction: 'pan-y' }}
      />
      <button className="hub" id="wheelHub" title="Rad drehen" onClick={() => dispatch({ type: 'spin' })}>
        SPIN
      </button>
      {children}
    </div>
  )
}
