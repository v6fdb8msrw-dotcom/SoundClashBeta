import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { bus } from '../app/bus'
import { env } from '../app/store'
import { sdArt } from '../core/game'
import type { State } from '../core/types'
import { lastCover } from '../services/audio'
import { picBigOf, picOf, wallPics } from '../services/catalog'
import { useAudio } from './primitives'
import { onVisFrame, vis } from './visual'
import { Vinyl } from './Vinyl'

/**
 * Hintergrund „Aura“: Wie bei Apple Music liegt das gerade wichtige Cover riesig und weichgezeichnet
 * hinter allem, darüber treiben Farbwolken in den Album-Farben. Die wählbaren Hintergründe aus dem Menü
 * legen eine Ebene darüber: Künstler-Mosaik, Plattenspieler, Bühnenlicht oder Neon-Horizont.
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

/** Bild, das gerade die Stimmung bestimmt: spielender Song, gezogener Künstler oder aktuelles Duell. */
function moodCover(S: State, playing: string | null): string {
  const c = coverForKey(S, playing)
  if (c) return c
  if (S.screen === 'draft' && S.pending) return picBigOf(S.pending.artist) || picOf(S.pending.artist) || ''
  if (S.screen === 'duel' || S.screen === 'listen') {
    for (let p = 1; p <= S.players; p++) {
      const so = (S.songs[p] || [])[S.duel]
      if (so?.cover) return so.cover
    }
  }
  return ''
}

function useWallPics(n: number) {
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
  }, [n, v])
}

/** Künstler-Mosaik: schräge Wand aus Porträts, die langsam wandert. */
function Mosaic() {
  const pics = useWallPics(48)
  const cols = [0, 1, 2, 3, 4, 5]
  return (
    <div className="bg-wall">
      {cols.map((c) => (
        <div key={c} className="mcol" style={{ ['--c' as string]: c }}>
          {[...pics.slice(c * 8, c * 8 + 8), ...pics.slice(c * 8, c * 8 + 8)].map((u, i) => (
            <img key={i} src={u} alt="" loading="lazy" />
          ))}
        </div>
      ))}
    </div>
  )
}

/** Schwebende, glänzende 3D-Formen (Kugeln, Ringe, Kapseln, Sterne) in den Theme-Farben */
function Shapes() {
  const items = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        k: ['ball', 'ring', 'pill', 'star', 'ball', 'disc'][i % 6],
        x: (i * 37 + 11) % 96,
        y: (i * 53 + 7) % 92,
        s: 40 + ((i * 29) % 90),
        d: 14 + ((i * 7) % 12),
        c: ['var(--primary)', 'var(--secondary)', 'var(--accent)', 'var(--primary-soft)'][i % 4],
        r: (i * 47) % 360,
      })),
    [],
  )
  return (
    <div className="bg-shapes">
      {items.map((it, i) => (
        <i
          key={i}
          className={'shp ' + it.k}
          style={{ left: it.x + '%', top: it.y + '%', width: it.s, height: it.s, ['--c' as string]: it.c, ['--d' as string]: it.d + 's', ['--r' as string]: it.r + 'deg', animationDelay: -i * 1.7 + 's' }}
        />
      ))}
    </div>
  )
}

/** Platten, die langsam durchs Bild schweben (das aktuelle Cover als Etikett) */
function Records({ cover }: { cover: string }) {
  const pics = useWallPics(9)
  return (
    <div className="bg-records">
      {Array.from({ length: 9 }, (_, i) => (
        <div key={i} className="rec" style={{ left: ((i * 23 + 5) % 92) + '%', ['--s' as string]: 90 + ((i * 41) % 130) + 'px', ['--d' as string]: 26 + ((i * 9) % 20) + 's', animationDelay: -i * 4.3 + 's' }}>
          <Vinyl cover={(i === 0 && cover) || pics[i] || undefined} spinning />
        </div>
      ))}
    </div>
  )
}

export function Background({ S }: { S: State }) {
  const { playing, beat } = useAudio()
  const cover = moodCover(S, playing)
  const root = useRef<HTMLDivElement>(null)
  const mosaic = S.bg === 'mosaic' || S.bg === 'walldeck' || S.bg === 'flow'
  const deck = S.bg === 'deck' || S.bg === 'walldeck' || S.bg === 'auroradeck'
  // Pegel des laufenden Songs → leichtes Atmen der Farbwolken (abschaltbar über „Album-Wand-Puls“)
  useEffect(() => {
    if (env.reduce || !S.ambience) {
      root.current?.style.setProperty('--lvl', '0')
      return
    }
    return onVisFrame(() => root.current?.style.setProperty('--lvl', vis.level.toFixed(3)))
  }, [S.ambience])
  return (
    <div ref={root} className={'bg bg-' + S.bg + (beat ? ' beat' : '') + (playing ? ' live' : '')} data-screen={S.screen} aria-hidden>
      <div className="aura">
        <i className="a1" />
        <i className="a2" />
        <i className="a3" />
        <i className="a4" />
      </div>
      <AnimatePresence>
        {cover ? (
          <motion.img
            key={cover}
            className="aura-cover"
            src={cover}
            alt=""
            initial={{ opacity: 0, scale: 1.15 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: env.reduce ? 0 : 1.4, ease: [0.2, 0.8, 0.2, 1] }}
          />
        ) : null}
      </AnimatePresence>
      {mosaic ? <Mosaic /> : null}
      {S.bg === 'shapes' ? <Shapes /> : null}
      {S.bg === 'records' ? <Records cover={cover} /> : null}
      {S.bg === 'stage' ? (
        <div className="bg-stage">
          <i />
          <i />
          <i />
        </div>
      ) : null}
      {S.bg === 'horizon' ? (
        <div className="bg-horizon">
          <div className="sun" />
          <div className="floor" />
        </div>
      ) : null}
      {deck ? (
        <div className="bg-deck">
          <Vinyl cover={cover || undefined} spinning={!!playing} />
          <span className="arm" />
        </div>
      ) : null}
      <div className="veil" />
      <div className="grain" />
    </div>
  )
}
