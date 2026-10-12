import { useEffect, useMemo, useRef, useState } from 'react'
import { bus } from '../app/bus'
import { env } from '../app/store'
import { sdArt } from '../core/game'
import type { State } from '../core/types'
import { lastCover } from '../services/audio'
import { picBigOf, picOf, wallPics } from '../services/catalog'
import { useAudio } from './primitives'
import { BANDS, onVisFrame, vis } from './visual'
import { Vinyl } from './Vinyl'

/**
 * Hintergrund wie im Original wählbar: Künstler-Mosaik, Plattenspieler, Mosaik + Plattenspieler,
 * Aurora (Beat), Aurora + Plattenspieler. Neu gestaltet: schwebende 3D-Wand, Holo-Raster,
 * Lichtkegel, Plattenspieler mit Frequenz-Ring.
 */

let seed = Math.random()
bus.on('bgSeed', (v) => {
  seed = v as number
})

/** Cover zum aktuell spielenden Song (coverForKey im Original). */
export function coverForKey(S: State, key: string | null): string {
  if (lastCover) return lastCover
  if (!key) return ''
  const m = String(key).match(/(\d+)_(\d+)/)
  if (!m) return ''
  const p = +m[1],
    i = +m[2]
  const so = (S.songs[p] || [])[i]
  if (so && so.cover) return so.cover
  const a = S.sd ? sdArt(S, p) : (S.lineup[p] || [])[i]
  return a ? picBigOf(a) || picOf(a) : ''
}

/**
 * Künstler-Mosaik: Reihen von Künstlerbildern ziehen langsam nach links, jede Reihe mit eigenen
 * Künstlern und eigenem Tempo – so tauchen ständig neue Gesichter auf.
 */
function Wall({ S, beat }: { S: State; beat: boolean }) {
  const [, force] = useState(0)
  useEffect(() => bus.on('bgSeed', () => force((x) => x + 1)), [])
  const dense = S.bg !== 'walldeck'
  const rowH = dense ? 118 : 150
  const rows = Math.max(4, Math.ceil((typeof window !== 'undefined' ? window.innerHeight : 900) / (rowH + 8)) + 2)
  const perRow = 26
  const lines = useMemo(() => {
    let x = Math.floor(seed * 1e6)
    const rnd = () => {
      x = (x * 1103515245 + 12345) & 0x7fffffff
      return x / 0x7fffffff
    }
    const pics = wallPics.slice().sort(() => rnd() - 0.5)
    return Array.from({ length: rows }, (_, r) => pics.slice((r * perRow) % pics.length, ((r * perRow) % pics.length) + perRow))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [S.bg, seed, rows])
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (env.reduce) return
    return onVisFrame(() => {
      if (ref.current) ref.current.style.setProperty('--lvl', String(vis.level.toFixed(3)))
    })
  }, [])
  return (
    <div className="wall-stage">
      <div id="wall" ref={ref} className={(beat ? 'beat ' : '') + (dense ? 'dense' : 'wide')} style={{ ['--rowh' as string]: rowH + 'px', opacity: dense ? 0.5 : 0.38 }}>
        {lines.map((line, r) => (
          <div className="wall-row" key={r} style={{ ['--dur' as string]: 140 + ((r * 37) % 90) + 's', ['--delay' as string]: -((r * 23) % 60) + 's' }}>
            {line.concat(line).map((u, i) => (
              <img key={i} src={u} alt="" loading="lazy" style={{ ['--i' as string]: i % perRow }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function Aurora({ theme }: { theme: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const ctx = c.getContext('2d')!
    const IW = 200,
      IH = Math.max(60, Math.round(200 * (innerHeight / Math.max(1, innerWidth))))
    c.width = IW
    c.height = IH
    const cs = getComputedStyle(document.body)
    const cols = [cs.getPropertyValue('--primary').trim() || '#e0a93b', cs.getPropertyValue('--secondary').trim() || '#c74b6b', cs.getPropertyValue('--accent').trim() || '#5aa9e6']
    const blobs: { c: string; sx: number; sy: number; ph: number; r: number }[] = []
    for (let i = 0; i < 6; i++) blobs.push({ c: cols[i % cols.length], sx: 0.12 + Math.random() * 0.22, sy: 0.1 + Math.random() * 0.2, ph: Math.random() * 6.28, r: 0.55 + Math.random() * 0.35 })
    const t0 = performance.now()
    let raf = 0
    const frame = (now: number) => {
      const t = (now - t0) / 1000,
        pulse = 0.5 + 0.5 * Math.sin(t * 2.2)
      const boost = vis.level * 0.5 + vis.beat * 0.12
      ctx.clearRect(0, 0, IW, IH)
      ctx.globalCompositeOperation = 'lighter'
      for (const b of blobs) {
        const bx = (0.5 + 0.42 * Math.sin(t * b.sx + b.ph)) * IW
        const by = (0.5 + 0.42 * Math.cos(t * b.sy + b.ph * 1.3)) * IH
        const rad = b.r * IW * (0.7 + pulse * 0.16 + boost)
        ctx.globalAlpha = 0.42
        const g = ctx.createRadialGradient(bx, by, 0, bx, by, rad)
        g.addColorStop(0, b.c)
        g.addColorStop(1, 'transparent')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(bx, by, rad, 0, 6.2832)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
      raf = env.reduce ? 0 : requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
    // Farben neu lesen, wenn das Theme wechselt
  }, [theme])
  return <canvas id="aurora" ref={ref} aria-hidden />
}

/** Plattenspieler von oben mit realistischer Platte (Cover als Label) und Frequenz-Ring. */
function Deck({ S, over }: { S: State; over: boolean }) {
  const { playing } = useAudio()
  const cover = playing ? coverForKey(S, playing) : ''
  const ring = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ring.current
    if (!c) return
    const ctx = c.getContext('2d')!
    const size = 520
    c.width = size
    c.height = size
    const draw = () => {
      ctx.clearRect(0, 0, size, size)
      if (!vis.active) return
      const cs = getComputedStyle(document.body)
      const col = cs.getPropertyValue('--primary').trim() || '#fff'
      const cx = size / 2,
        r0 = size * 0.43
      ctx.lineCap = 'round'
      ctx.strokeStyle = col
      for (let i = 0; i < BANDS * 2; i++) {
        const v = vis.bands[i % BANDS]
        const a = (i / (BANDS * 2)) * Math.PI * 2 - Math.PI / 2
        const len = 4 + v * size * 0.07
        ctx.globalAlpha = 0.25 + v * 0.75
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(cx + Math.cos(a) * r0, cx + Math.sin(a) * r0)
        ctx.lineTo(cx + Math.cos(a) * (r0 + len), cx + Math.sin(a) * (r0 + len))
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    }
    return onVisFrame(draw)
  }, [])
  return (
    <div id="deck" className={(playing ? 'spinning-song ' : '') + (over ? 'over-wall' : '')} aria-hidden>
      <canvas className="deck-ring" ref={ring} />
      <div className="deck-plinth" />
      <Vinyl cover={cover} spinning className="deck-vinyl" />
      <div className="tonearm">
        <div className="base" />
        <div className="rod">
          <div className="head" />
        </div>
      </div>
    </div>
  )
}

export function Background({ S }: { S: State }) {
  const { beat } = useAudio()
  const isAU = S.bg === 'aurora' || S.bg === 'auroradeck'
  const deckOn = S.bg === 'deck' || S.bg === 'walldeck' || S.bg === 'auroradeck'
  const wallOn = S.bg === 'mosaic' || S.bg === 'walldeck'
  const pulse = beat && !env.reduce
  return (
    <div className={'bg bg-' + S.bg} aria-hidden>
      <div className="bg-base" />
      {wallOn ? <Wall S={S} beat={pulse} /> : null}
      {isAU ? <Aurora theme={S.theme} /> : null}
      <div id="tint" />
      <div id="veil" className={'veil-' + S.bg} />
      {deckOn ? <Deck S={S} over={S.bg === 'walldeck' || S.bg === 'auroradeck'} /> : null}
      <div id="grain" />
    </div>
  )
}
