import { motion, useAnimationControls } from 'motion/react'
import { useEffect, useLayoutEffect, useRef } from 'react'
import { dispatch, env } from '../app/store'
import { onWheelFrame, wheel } from '../app/wheelAnim'
import { mixHex } from '../core/colors'
import { GENRE_HUE, WCOL } from '../core/constants'
import type { State } from '../core/types'

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
  const dpr = Math.min(2.5, window.devicePixelRatio || 1),
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
  // Außenring
  ctx.save()
  ctx.shadowColor = primary
  ctx.shadowBlur = 22
  ctx.beginPath()
  ctx.arc(cx, cy, R + 9, 0, Math.PI * 2)
  ctx.fillStyle = surf
  ctx.fill()
  ctx.restore()
  ctx.beginPath()
  ctx.arc(cx, cy, R + 9, 0, Math.PI * 2)
  ctx.strokeStyle = primary
  ctx.lineWidth = 2.5
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
    ctx.font = '600 15px Manrope,sans-serif'
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
    ctx.strokeStyle = 'rgba(0,0,0,.45)'
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(a0 + seg / 2)
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#140805'
    ctx.font = (i === wheel.hi ? '800 ' : '700 ') + fs + 'px Manrope,sans-serif'
    let l = S.pool[i]
    const mx = Math.max(6, Math.floor(26 - n * 0.32))
    if (l.length > mx) l = l.slice(0, mx - 1) + '…'
    ctx.fillText(l, R - 14, 0)
    ctx.restore()
  }
  // Glanz (steht still, während sich das Rad dreht)
  const sh = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R)
  sh.addColorStop(0, 'rgba(255,255,255,.22)')
  sh.addColorStop(0.35, 'rgba(255,255,255,0)')
  sh.addColorStop(0.7, 'rgba(255,255,255,0)')
  sh.addColorStop(1, 'rgba(255,255,255,.08)')
  ctx.beginPath()
  ctx.arc(cx, cy, R, 0, Math.PI * 2)
  ctx.fillStyle = sh
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
      <canvas id="wheel" ref={ref} width={600} height={600} aria-label={'Glücksrad mit ' + S.pool.length + ' Künstlern'} />
      <button className="hub" id="wheelHub" title="Rad drehen" onClick={() => dispatch({ type: 'spin' })}>
        SPIN
      </button>
      {children}
    </div>
  )
}
