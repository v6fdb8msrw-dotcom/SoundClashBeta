import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { env } from '../app/store'
import { N, pcol, pname, pts } from '../core/game'
import { Vinyl } from './Vinyl'
import type { State } from '../core/types'

/**
 * Überblendungen zwischen den Spielphasen. Handy-Modus: Kino-Überblendung: Zwischen zwei Bildschirmen schließen sich kurz schwarze Blenden,
 * eine Titelkarte erscheint („Runde 1“, „P2 ist dran“, „VS“ …), dann öffnet sich die neue Szene.
 * Rein optisch, blockiert keine Eingaben; bei „Bewegung reduzieren“ aus.
 */

interface Cut {
  key: string
  title: string
  sub?: string
  color?: string
  /** Normaler Modus: Art der Wisch-Überblendung */
  kind?: 'roll' | 'battle' | 'vs' | 'plain' | 'final'
  num?: number
}

/**
 * Normaler Modus („An diesem Gerät“): verspielte Wisch-Überblendung von links nach rechts zwischen
 * den Spielphasen – Start → Drehrad → Song Battle 1 → Song Battle 2 … → Endstand.
 */
function wipeOf(S: State, prevKey: string | null): Cut | null {
  const d = S.round + '-' + (S.sd ? 'sd' : S.duel)
  const n = S.duel + 1
  const p = pts(S, n)
  const last = !S.sd && n === N(S)
  const battle = S.sd ? 'Sudden Death' : 'Song Battle ' + n
  const slot = S.sd ? 'Ein Song. Eine Entscheidung.' : last ? 'Das letzte Battle · ×' + p : p === 2 ? 'Platz #' + n + ' · doppelte Punkte' : 'Platz #' + n
  switch (S.screen) {
    case 'draft': {
      const DRAW = ['Das Rad entscheidet', 'Wer zieht wen?', 'Neue Runde, neues Glück']
      return { key: 'draft-' + S.round + (S.T ? '-' + S.T.r + '-' + S.T.m : ''), title: DRAW[(S.round - 1) % DRAW.length], sub: 'Runde ' + S.round + ' · blind ziehen, blind setzen', kind: 'roll' }
    }
    case 'pick':
      return { key: 'pick-' + d, title: battle, sub: slot + ' · wähl deinen Song', kind: 'battle', num: S.sd ? undefined : n }
    case 'songs':
      return { key: 'songs-' + S.round + (S.sd ? '-sd' : ''), title: S.sd ? 'Sudden Death' : 'Plattenkiste', sub: S.sd ? 'Ein Song. Eine Entscheidung.' : 'alle Songs vorab wählen', kind: 'plain' }
    case 'duel':
      // Nach der Songwahl desselben Duells nur noch das „VS“, sonst die Battle-Nummer
      return prevKey === 'pick-' + d
        ? { key: 'duel-' + d, title: 'VS', sub: battle + ' · wer hat den besseren Song?', kind: 'vs' }
        : { key: 'duel-' + d, title: battle, sub: slot, kind: 'battle', num: S.sd ? undefined : n }
    case 'round':
      return { key: 'round-' + S.round, title: 'Abpfiff', sub: 'Runde ' + S.round + ' ist entschieden', kind: 'final' }
    case 'final':
      return { key: 'final', title: 'Die Krönung', sub: 'Wer holt die Krone?', kind: 'final' }
    case 'bracket':
      return { key: 'bracket-' + (S.T ? S.T.r + '-' + S.T.m : ''), title: 'Turnierbaum', sub: 'Wer kommt weiter?', kind: 'plain' }
  }
  return null
}

function cutOf(S: State, prevKey: string | null): Cut | null {
  if (!S.phoneMode) return wipeOf(S, prevKey)
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
  const last = useRef<string | null>(null)
  const cut = cutOf(S, last.current)
  const [shown, setShown] = useState<Cut | null>(null)
  const key = cut?.key ?? null
  useEffect(() => {
    if (key === last.current) return
    last.current = key
    if (!cut || env.reduce) return
    setShown(cut)
    const t = setTimeout(() => setShown(null), (cut.kind ? WIPE : DUR) * 1000 + 50)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  if (!shown) return null
  if (shown.kind) return <Wipe cut={shown} />
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

const WIPE = 1.3

/**
 * Wisch-Überblendung von links nach rechts: eine Fläche in den Farben des gewählten Albums gleitet
 * mit einer leuchtenden Kante durchs Bild, der Titel baut sich Wort für Wort auf, dann zieht die
 * Fläche nach rechts weiter und gibt die neue Szene frei. Nur Verschieben (GPU) – läuft flüssig.
 */
function Wipe({ cut }: { cut: Cut }) {
  const ease = [0.65, 0, 0.35, 1] as const
  const words = cut.title.split(' ')
  return (
    <div className={'phasewipe pw-' + cut.kind} key={cut.key} aria-hidden>
      <motion.div className="pw-ghost" initial={{ x: '-110%' }} animate={{ x: ['-110%', '0%', '0%', '110%'] }} transition={{ duration: WIPE, times: [0, 0.34, 0.6, 0.94], ease }} />
      <motion.div className="pw-panel" initial={{ x: '-115%' }} animate={{ x: ['-115%', '0%', '0%', '115%'] }} transition={{ duration: WIPE, times: [0.04, 0.38, 0.62, 1], ease }}>
        <span className="pw-edge lead" />
        <span className="pw-edge trail" />
      </motion.div>
      <motion.div className="pw-card" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0], x: [0, 0, 18, 120] }} transition={{ duration: WIPE, times: [0.3, 0.4, 0.66, 0.84], ease: 'easeInOut' }}>
        {cut.num ? (
          <motion.span className="pw-num" initial={{ scale: 1.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: WIPE * 0.36, duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}>
            {cut.num}
          </motion.span>
        ) : null}
        {cut.kind === 'roll' ? (
          <motion.span className="pw-disc" initial={{ x: -180, rotate: -270, opacity: 0 }} animate={{ x: 0, rotate: 0, opacity: 1 }} transition={{ delay: WIPE * 0.32, duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}>
            <Vinyl spinning size={84} />
          </motion.span>
        ) : null}
        {cut.kind === 'final' ? (
          <motion.span className="pw-crown" initial={{ y: -40, rotate: -20, opacity: 0 }} animate={{ y: 0, rotate: 0, opacity: 1 }} transition={{ delay: WIPE * 0.36, type: 'spring', stiffness: 260, damping: 14 }}>
            👑
          </motion.span>
        ) : null}
        <b className={'pw-title' + (cut.kind === 'vs' ? ' pw-vs' : '')}>
          {words.map((w, i) => (
            <span className="pw-wmask" key={i}>
              <motion.span className="pw-word" initial={{ y: '105%' }} animate={{ y: '0%' }} transition={{ delay: WIPE * 0.38 + i * 0.07, duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}>
                {w}
              </motion.span>
            </span>
          ))}
        </b>
        {cut.sub ? (
          <motion.small initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: WIPE * 0.46, duration: 0.4 }}>
            {cut.sub}
          </motion.small>
        ) : null}
        <span className="pw-eq">
          <i />
          <i />
          <i />
          <i />
          <i />
        </span>
      </motion.div>
    </div>
  )
}
