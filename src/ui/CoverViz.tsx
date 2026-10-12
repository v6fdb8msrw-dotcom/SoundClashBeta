import { useEffect, useRef } from 'react'
import { BANDS, kickVis, onVisFrame, vis } from './visual'

/** Frequenz-Ring um ein Cover, solange dessen Vorschau läuft. */
export function CoverViz({ on, color }: { on: boolean; color: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (!on) return
    kickVis()
    const c = ref.current
    if (!c) return
    const ctx = c.getContext('2d')!
    const S = 200
    c.width = S
    c.height = S
    return onVisFrame(() => {
      ctx.clearRect(0, 0, S, S)
      const cx = S / 2,
        r0 = S * 0.34
      ctx.strokeStyle = color
      ctx.lineCap = 'round'
      for (let i = 0; i < BANDS; i++) {
        const v = vis.bands[i]
        const a = (i / BANDS) * Math.PI * 2 - Math.PI / 2
        const len = 3 + v * S * 0.14
        ctx.globalAlpha = 0.35 + v * 0.65
        ctx.lineWidth = 3.2
        ctx.beginPath()
        ctx.moveTo(cx + Math.cos(a) * r0, cx + Math.sin(a) * r0)
        ctx.lineTo(cx + Math.cos(a) * (r0 + len), cx + Math.sin(a) * (r0 + len))
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    })
  }, [on, color])
  return on ? <canvas className="coverviz" ref={ref} aria-hidden /> : null
}
