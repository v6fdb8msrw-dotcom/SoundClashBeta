import { useEffect, useRef } from 'react'
import { bus } from '../app/bus'
import { env } from '../app/store'
import { AV } from '../core/constants'

/**
 * Partikel-Ebene: Konfetti bei Siegen (Stärke wie im Original) und kurze Funken-Explosionen
 * bei Entscheidungen (Platz setzen, Song wählen, Duell gewinnen). Bei reduzierter Bewegung aus.
 */

interface P {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  a: number
  va: number
  c: string
  shape: 0 | 1 | 2
  life: number
  max: number
  g: number
  glow: boolean
}

export function burst(x: number, y: number, color: string, n = 26, power = 1) {
  bus.emit('burst', { x, y, color, n, power })
}
/** Funken an einem Element (Mitte). */
export function burstAt(el: Element | null, color: string, n = 26, power = 1) {
  if (!el) return
  const r = el.getBoundingClientRect()
  burst(r.left + r.width / 2, r.top + r.height / 2, color, n, power)
}

export function Fx() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (env.reduce) return
    const cv = ref.current!
    const ctx = cv.getContext('2d')!
    let ps: P[] = []
    let raf = 0
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const size = () => {
      cv.width = Math.round(innerWidth * dpr)
      cv.height = Math.round(innerHeight * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    size()
    window.addEventListener('resize', size)
    const loop = () => {
      ctx.clearRect(0, 0, innerWidth, innerHeight)
      let alive = 0
      for (const p of ps) {
        p.life++
        if (p.life > p.max) continue
        p.x += p.vx
        p.y += p.vy
        p.vy += p.g
        p.vx *= p.glow ? 0.94 : 0.995
        p.vy *= p.glow ? 0.94 : 1
        p.a += p.va
        if (p.y > innerHeight + 30) continue
        alive++
        const fade = p.glow ? 1 - p.life / p.max : Math.min(1, (p.max - p.life) / 30)
        ctx.save()
        ctx.globalAlpha = Math.max(0, fade)
        ctx.translate(p.x, p.y)
        ctx.rotate(p.a)
        ctx.fillStyle = p.c
        if (p.glow) {
          ctx.shadowColor = p.c
          ctx.shadowBlur = 12
        }
        if (p.shape === 0) ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.62)
        else if (p.shape === 1) {
          ctx.beginPath()
          ctx.arc(0, 0, p.r / 2, 0, 6.283)
          ctx.fill()
        } else {
          ctx.beginPath()
          for (let k = 0; k < 4; k++) {
            const an = (k / 4) * Math.PI * 2
            ctx.lineTo(Math.cos(an) * p.r, Math.sin(an) * p.r)
            ctx.lineTo(Math.cos(an + Math.PI / 4) * p.r * 0.35, Math.sin(an + Math.PI / 4) * p.r * 0.35)
          }
          ctx.closePath()
          ctx.fill()
        }
        ctx.restore()
      }
      ps = ps.filter((p) => p.life <= p.max && p.y <= innerHeight + 30)
      if (alive) raf = requestAnimationFrame(loop)
      else {
        raf = 0
        ctx.clearRect(0, 0, innerWidth, innerHeight)
        cv.style.display = 'none'
      }
    }
    const start = () => {
      cv.style.display = 'block'
      if (!raf) raf = requestAnimationFrame(loop)
    }
    const offConf = bus.on('confetti', (s) => {
      const str = (s as number) || 1
      const cols = AV.map((a) => a.c).concat(['#FFF3E0'])
      const n = Math.round(str * 170)
      const W = innerWidth,
        H = innerHeight
      for (let i = 0; i < n; i++)
        ps.push({
          x: Math.random() * W,
          y: -20 - Math.random() * H * 0.5,
          vx: (Math.random() - 0.5) * 3.4,
          vy: 2 + Math.random() * 4.6,
          r: 4 + Math.random() * 6,
          a: Math.random() * 6.3,
          va: (Math.random() - 0.5) * 0.3,
          c: cols[i % cols.length],
          shape: (i % 3) as 0 | 1 | 2,
          life: 0,
          max: 260,
          g: 0.05,
          glow: false,
        })
      start()
    })
    const offBurst = bus.on('burst', (o) => {
      const { x, y, color, n, power } = o as { x: number; y: number; color: string; n: number; power: number }
      for (let i = 0; i < n; i++) {
        const an = Math.random() * Math.PI * 2,
          sp = (2 + Math.random() * 7) * power
        ps.push({ x, y, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp, r: 2 + Math.random() * 4, a: 0, va: 0.2, c: i % 4 === 0 ? '#ffffff' : color, shape: (i % 2 ? 1 : 2) as 1 | 2, life: 0, max: 34 + Math.random() * 26, g: 0.08, glow: true })
      }
      start()
    })
    return () => {
      offConf()
      offBurst()
      window.removeEventListener('resize', size)
      cancelAnimationFrame(raf)
    }
  }, [])
  return <canvas id="fx" ref={ref} aria-hidden />
}
