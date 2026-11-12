import { useEffect, useRef } from 'react'
import { currentTime } from '../services/audio'
import { Music2, Pause, Play } from './icons'
import { BANDS, kickVis, onVisFrame, vis } from './visual'

/**
 * Plattenspieler-Karte: Hülle mit Cover, dahinter die Platte. Läuft der Song, gleitet die Platte heraus
 * und dreht sich passend zum Fortschritt der Vorschau. Darunter Welle und Fortschrittsbalken mit Zeit.
 */
export function Deck({ cover, on, color, onToggle, label }: { cover?: string; on: boolean; color: string; onToggle?: () => void; label?: string }) {
  const disc = useRef<HTMLDivElement>(null)
  const bar = useRef<HTMLSpanElement>(null)
  const time = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!on) return
    return onVisFrame(() => {
      const { t, d } = currentTime()
      const p = Math.min(1, t / (d || 30))
      // 33⅓ Umdrehungen pro Minute
      if (disc.current) disc.current.style.transform = `rotate(${(t * 200) % 360}deg)`
      if (bar.current) bar.current.style.transform = `scaleX(${p})`
      if (time.current) time.current.textContent = `0:${String(Math.floor(t)).padStart(2, '0')}`
    })
  }, [on])
  return (
    <div className={'deck' + (on ? ' playing' : '')} style={{ ['--dc' as string]: color }}>
      <button type="button" className="deck-stage" onClick={onToggle} aria-label={label || (on ? 'Pause' : 'Vorschau abspielen')} disabled={!onToggle}>
        <div className="deck-disc" ref={disc}>
          <span className="deck-label" style={cover ? { backgroundImage: `url(${cover})` } : undefined} />
        </div>
        <div className="deck-sleeve">
          {cover ? <img src={cover} alt="" /> : <Music2 />}
          {onToggle ? <span className="deck-play">{on ? <Pause /> : <Play />}</span> : null}
        </div>
      </button>
      <Wave on={on} color={color} />
      <div className="deck-progress" aria-hidden>
        <span className="dp-track">
          <span className="dp-fill" ref={bar} />
        </span>
        <span className="dp-time" ref={time}>
          0:00
        </span>
        <span className="dp-time">0:30</span>
      </div>
    </div>
  )
}

/** Weiche Klangwelle aus den Frequenzbändern (gespiegelt, abgerundet) */
export function Wave({ on, color }: { on: boolean; color: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const ctx = c.getContext('2d')!
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const draw = (live: boolean) => {
      const W = c.clientWidth || 260,
        H = c.clientHeight || 40
      if (c.width !== Math.round(W * dpr)) {
        c.width = Math.round(W * dpr)
        c.height = Math.round(H * dpr)
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)
      const n = 40,
        gap = 3,
        w = (W - gap * (n - 1)) / n
      ctx.fillStyle = color
      for (let i = 0; i < n; i++) {
        // Mitte laut, Ränder leise: Bänder symmetrisch verteilen
        const k = Math.abs(i - (n - 1) / 2) / ((n - 1) / 2)
        const band = Math.floor((1 - k) * (BANDS * 0.6))
        const v = live ? Math.min(1, vis.bands[band] * 1.3 + 0.04) : 0.08 + 0.05 * Math.sin(i * 0.7)
        const h = Math.max(3, v * H * (1 - k * 0.45))
        ctx.globalAlpha = live ? 0.55 + v * 0.45 : 0.35
        const x = i * (w + gap),
          y = (H - h) / 2
        ctx.beginPath()
        ctx.roundRect(x, y, w, h, w / 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }
    draw(false)
    if (!on) return
    kickVis()
    return onVisFrame(() => draw(true))
  }, [on, color])
  return <canvas className={'wave' + (on ? ' on' : '')} ref={ref} aria-hidden />
}
