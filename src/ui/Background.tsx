import { useEffect, useMemo, useRef, useState } from 'react'
import { bus } from '../app/bus'
import { env } from '../app/store'
import { sdArt } from '../core/game'
import type { State } from '../core/types'
import { bgBase, bgHasDeck } from '../core/constants'
import { lastCover } from '../services/audio'
import { picBigOf, picOf, wallPics } from '../services/catalog'
import { useAudio } from './primitives'
import { BANDS, onVisFrame, vis } from './visual'
import { Vinyl } from './Vinyl'

/**
 * Hintergrund wählbar wie im Original (Künstler-Mosaik, Plattenspieler, Mosaik + Plattenspieler,
 * Aurora, Aurora + Plattenspieler) plus neu: Mosaik (wandernd), Bühne (Lichtkegel), Neon-Horizont,
 * Klangwellen, Schlicht – jeweils mit zuschaltbarem Plattenspieler.
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

/** Gemischte Künstlerbilder (fester Zufall pro Sitzung, neu mit „bgSeed“). */
function useWallPics(n: number, dep: string) {
  const [v, force] = useState(0)
  useEffect(() => bus.on('bgSeed', () => force((x) => x + 1)), [])
  return useMemo(() => {
    let x = Math.floor(seed * 1e6)
    const rnd = () => {
      x = (x * 1103515245 + 12345) & 0x7fffffff
      return x / 0x7fffffff
    }
    return wallPics
      .slice()
      .sort(() => rnd() - 0.5)
      .slice(0, n)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dep, n, v])
}

function useLevelVar(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (env.reduce) return
    return onVisFrame(() => {
      if (ref.current) ref.current.style.setProperty('--lvl', String(vis.level.toFixed(3)))
    })
  }, [ref])
}

const OFF: Record<string, number> = { setup: 0, bracket: -8, draft: -16, songs: -26, pick: -26, duel: -36, round: -48, final: -60 }

/** Künstler-Mosaik wie vorher: geneigte Wand, die langsam schwebt und im Beat pulsiert. */
function Wall({ S, beat }: { S: State; beat: boolean }) {
  const cfg = S.bg === 'walldeck' ? { n: 60, size: 140, op: 0.4, im: 0.5 } : { n: 120, size: 78, op: 0.55, im: 0.6 }
  const pics = useWallPics(cfg.n, S.bg)
  const ref = useRef<HTMLDivElement>(null)
  useLevelVar(ref)
  return (
    <div className="wall-stage" style={{ ['--shift' as string]: (OFF[S.screen] || 0) + 'px' }}>
      <div
        id="wall"
        ref={ref}
        className={beat ? 'beat' : ''}
        style={{ gridTemplateColumns: `repeat(auto-fill,minmax(${cfg.size}px,1fr))`, gridAutoRows: cfg.size + 'px', opacity: cfg.op }}
      >
        {pics.map((u, i) => (
          <img key={u + i} src={u} alt="" loading="lazy" style={{ ['--i' as string]: i, ['--im' as string]: cfg.im }} />
        ))}
      </div>
    </div>
  )
}

/**
 * Mosaik (wandernd): Reihen von Künstlerbildern ziehen langsam nach links, jede Reihe mit eigenen
 * Künstlern und eigenem Tempo – so tauchen ständig neue Gesichter auf.
 */
function FlowWall({ beat }: { beat: boolean }) {
  const rowH = 118
  const rows = Math.max(4, Math.ceil((typeof window !== 'undefined' ? window.innerHeight : 900) / (rowH + 8)) + 2)
  const perRow = 26
  const pics = useWallPics(rows * perRow, 'flow')
  const lines = Array.from({ length: rows }, (_, r) => pics.slice((r * perRow) % Math.max(1, pics.length), ((r * perRow) % Math.max(1, pics.length)) + perRow))
  const ref = useRef<HTMLDivElement>(null)
  useLevelVar(ref)
  return (
    <div className="flow-stage">
      <div id="flowwall" ref={ref} className={beat ? 'beat' : ''} style={{ ['--rowh' as string]: rowH + 'px' }}>
        {lines.map((line, r) => (
          <div className="wall-row" key={r} style={{ ['--dur' as string]: 140 + ((r * 37) % 90) + 's', ['--delay' as string]: -((r * 23) % 60) + 's' }}>
            {line.concat(line).map((u, i) => (
              <img key={i} src={u} alt="" loading="lazy" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/** Bühne: Lichtkegel in den Album-Farben schwenken durch Dunst, im Beat heller. */
function StageLights({ beat }: { beat: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useLevelVar(ref)
  return (
    <div className={'scene-stage' + (beat ? ' beat' : '')} ref={ref}>
      <div className="haze" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <i key={i} className={'beam b' + i} />
      ))}
      <div className="floor" />
    </div>
  )
}

/** Neon-Horizont: Sonne mit Streifen, Raster-Boden läuft auf einen zu. */
function Horizon({ beat }: { beat: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useLevelVar(ref)
  return (
    <div className={'scene-horizon' + (beat ? ' beat' : '')} ref={ref}>
      <div className="sky" />
      <div className="sun" />
      <div className="ground">
        <div className="grid" />
      </div>
      <div className="mist" />
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

/** Klangwellen: leuchtende Wellenlinien in den Album-Farben, im Takt der Musik höher und schneller. */
function Waves({ theme }: { theme: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const ctx = c.getContext('2d')!
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    let W = 0,
      H = 0
    const fit = () => {
      W = c.clientWidth
      H = c.clientHeight
      c.width = Math.round(W * dpr)
      c.height = Math.round(H * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    fit()
    window.addEventListener('resize', fit)
    const cs = getComputedStyle(document.body)
    const cols = [cs.getPropertyValue('--primary').trim() || '#e0a93b', cs.getPropertyValue('--secondary').trim() || '#c74b6b', cs.getPropertyValue('--accent').trim() || '#5aa9e6']
    const lines = Array.from({ length: 7 }, (_, i) => ({ c: cols[i % 3], y: 0.5 + (i - 3) * 0.06, f: 1.4 + i * 0.37, sp: 0.18 + i * 0.045, ph: i * 1.7, a: 0.85 - Math.abs(i - 3) * 0.12 }))
    const t0 = performance.now()
    let raf = 0,
      drive = 0
    const frame = (now: number) => {
      const t = (now - t0) / 1000
      drive = drive * 0.9 + (vis.level * 1.6 + vis.beat * 0.35) * 0.1
      ctx.clearRect(0, 0, W, H)
      ctx.globalCompositeOperation = 'lighter'
      for (const l of lines) {
        const amp = H * (0.035 + drive * 0.12) * (1 + 0.3 * Math.sin(t * 0.4 + l.ph))
        ctx.beginPath()
        for (let x = 0; x <= W; x += 6) {
          const u = x / W
          const env = Math.sin(Math.PI * u) ** 1.4
          const y = H * l.y + env * amp * (Math.sin(u * Math.PI * 2 * l.f + t * (l.sp + drive) * 2 + l.ph) + 0.35 * Math.sin(u * Math.PI * 7 * l.f - t * 1.3 + l.ph))
          if (x === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.strokeStyle = l.c
        ctx.globalAlpha = l.a * (0.75 + drive * 0.5)
        ctx.lineWidth = 2.5
        ctx.shadowColor = l.c
        ctx.shadowBlur = 18
        ctx.stroke()
      }
      ctx.globalAlpha = 1
      ctx.shadowBlur = 0
      ctx.globalCompositeOperation = 'source-over'
      raf = env.reduce ? 0 : requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => (cancelAnimationFrame(raf), window.removeEventListener('resize', fit))
    // Farben neu lesen, wenn das Theme wechselt
  }, [theme])
  return <canvas id="waves" ref={ref} aria-hidden />
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
  const base = bgBase(S.bg)
  const deckOn = bgHasDeck(S.bg)
  // Die Kombinationen aus dem Original (deck, walldeck, auroradeck) behalten ihr eigenes Aussehen,
  // die neuen „+ Plattenspieler“-Varianten sehen aus wie ihr Grund-Hintergrund.
  const look = S.bg === 'deck' || S.bg === 'walldeck' || S.bg === 'auroradeck' ? S.bg : base
  const pulse = beat && !env.reduce
  return (
    <div className={'bg bg-' + look} aria-hidden>
      <div className="bg-base" />
      {base === 'mosaic' ? <Wall S={S} beat={pulse} /> : null}
      {base === 'flow' ? <FlowWall beat={pulse} /> : null}
      {base === 'stage' ? <StageLights beat={pulse} /> : null}
      {base === 'horizon' ? <Horizon beat={pulse} /> : null}
      {base === 'aurora' ? <Aurora theme={S.theme} /> : null}
      {base === 'waves' ? <Waves theme={S.theme} /> : null}
      <div id="tint" />
      <div id="veil" className={'veil-' + look} />
      {deckOn ? <Deck S={S} over={S.bg !== 'deck'} /> : null}
      <div id="grain" />
    </div>
  )
}
