import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { env } from '../app/store'
import { pcol, pname } from '../core/game'
import type { State } from '../core/types'

/**
 * Kino-Überblendung im Handy-Modus: Zwischen zwei Bildschirmen schließen sich kurz schwarze Blenden,
 * eine Titelkarte erscheint („Runde 1“, „P2 ist dran“, „VS“ …), dann öffnet sich die neue Szene.
 * Rein optisch, blockiert keine Eingaben; bei „Bewegung reduzieren“ aus.
 */

interface Cut {
  key: string
  title: string
  sub?: string
  color?: string
}

function cutOf(S: State): Cut | null {
  if (!S.phoneMode) return null
  const d = S.round + '-' + (S.sd ? 'sd' : S.duel)
  switch (S.screen) {
    case 'draft':
      return { key: 'draft-' + S.round, title: 'Runde ' + S.round, sub: 'Künstler ziehen' }
    case 'pick':
      return { key: 'pick-' + d, title: S.sd ? 'Sudden Death' : 'Platz #' + (S.duel + 1), sub: 'Songwahl am Handy' }
    case 'songs':
      return { key: 'songs-' + S.round + (S.sd ? '-sd' : ''), title: S.sd ? 'Sudden Death' : 'Songwahl', sub: 'alle Songs am Handy wählen' }
    case 'listen': {
      const L = S.listen
      if (!L) return null
      const p = L.order[L.idx]
      return L.idx === 0
        ? { key: 'listen-' + d + '-0', title: 'Alle haben gewählt', sub: pname(S, p) + ' deckt zuerst auf', color: pcol(S, p) }
        : { key: 'listen-' + d + '-' + L.idx, title: pname(S, p) + ' ist dran', sub: 'Song ' + (L.idx + 1) + ' von ' + L.order.length, color: pcol(S, p) }
    }
    case 'duel':
      return { key: 'duel-' + d, title: 'VS', sub: S.audience ? 'Jetzt abstimmen' : 'Wer hat den besseren Song?' }
    case 'round':
      return { key: 'round-' + S.round, title: 'Rundenende' }
    case 'final':
      return { key: 'final', title: 'Endstand' }
    case 'bracket':
      return { key: 'bracket-' + (S.T ? S.T.r + '-' + S.T.m : ''), title: 'Turnier' }
  }
  return null
}

const DUR = 1.3

export function SceneCut({ S }: { S: State }) {
  const cut = cutOf(S)
  const [shown, setShown] = useState<Cut | null>(null)
  const last = useRef<string | null>(null)
  const key = cut?.key ?? null
  useEffect(() => {
    if (key === last.current) return
    last.current = key
    if (!cut || env.reduce) return
    setShown(cut)
    const t = setTimeout(() => setShown(null), DUR * 1000 + 50)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  if (!shown) return null
  const ease = [0.7, 0, 0.3, 1] as const
  return (
    <div className="scenecut" key={shown.key} style={{ ['--cc' as string]: shown.color || 'var(--primary)' }} aria-hidden>
      <motion.div className="sc-bar top" initial={{ scaleY: 0 }} animate={{ scaleY: [0, 1, 1, 0] }} transition={{ duration: DUR, times: [0, 0.26, 0.68, 1], ease }} />
      <motion.div className="sc-bar bot" initial={{ scaleY: 0 }} animate={{ scaleY: [0, 1, 1, 0] }} transition={{ duration: DUR, times: [0, 0.26, 0.68, 1], ease }} />
      <motion.div className="sc-line" initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: [0, 0, 1, 1, 1.6], opacity: [0, 0, 1, 1, 0] }} transition={{ duration: DUR, times: [0, 0.18, 0.36, 0.66, 0.9] }} />
      <motion.div
        className="sc-title"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0, 1, 1, 0], letterSpacing: ['0.45em', '0.45em', '0.06em', '0.03em', '0em'], filter: ['blur(14px)', 'blur(14px)', 'blur(0px)', 'blur(0px)', 'blur(10px)'] }}
        transition={{ duration: DUR, times: [0, 0.2, 0.4, 0.66, 0.86] }}
      >
        <b>{shown.title}</b>
        {shown.sub ? <small>{shown.sub}</small> : null}
      </motion.div>
    </div>
  )
}
