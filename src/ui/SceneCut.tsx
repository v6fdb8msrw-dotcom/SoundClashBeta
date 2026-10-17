import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { env } from '../app/store'
import { N, pname, pts } from '../core/game'
import { Vinyl } from './Vinyl'
import type { State } from '../core/types'

/**
 * Überblendungen zwischen den Spielphasen: Wisch von links nach rechts mit Titelkarte, in beiden
 * Modi gleich. Rein optisch, blockiert keine Eingaben; bei „Bewegung reduzieren“ aus.
 */

interface Cut {
  key: string
  title: string
  sub?: string
  /** Art der Wisch-Überblendung */
  kind: 'roll' | 'battle' | 'vs' | 'plain' | 'final'
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
  // Handy-Modus: dieselbe Wisch-Überblendung wie im normalen Modus (Tims Wunsch), eigene Texte
  const d = S.round + '-' + (S.sd ? 'sd' : S.duel)
  switch (S.screen) {
    case 'pick': {
      const w = wipeOf(S, prevKey)
      return w && { ...w, sub: (S.sd ? 'Ein Song. Eine Entscheidung.' : 'Platz #' + (S.duel + 1)) + ' · Songwahl am Handy' }
    }
    case 'songs': {
      const w = wipeOf(S, prevKey)
      return w && { ...w, sub: 'alle Songs am Handy wählen' }
    }
    case 'listen': {
      const L = S.listen
      if (!L) return null
      const p = L.order[L.idx]
      return L.idx === 0
        ? { key: 'listen-' + d + '-0', title: 'Alle haben gewählt', sub: pname(S, p) + ' deckt zuerst auf', kind: 'plain' }
        : { key: 'listen-' + d + '-' + L.idx, title: pname(S, p) + ' ist dran', sub: 'Song ' + (L.idx + 1) + ' von ' + L.order.length, kind: 'plain' }
    }
    case 'duel':
      return { key: 'duel-' + d, title: 'VS', sub: S.audience ? 'Jetzt am Handy abstimmen' : 'Wer hat den besseren Song?', kind: 'vs' }
  }
  return wipeOf(S, prevKey)
}

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
    const t = setTimeout(() => setShown(null), WIPE * 1000 + 50)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  if (!shown) return null
  return <Wipe cut={shown} />
}

const WIPE = 2.8

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
      <motion.div className="pw-ghost" initial={{ x: '-110%' }} animate={{ x: ['-110%', '0%', '0%', '110%'] }} transition={{ duration: WIPE, times: [0, 0.18, 0.76, 0.95], ease }} />
      <motion.div className="pw-panel" initial={{ x: '-115%' }} animate={{ x: ['-115%', '0%', '0%', '115%'] }} transition={{ duration: WIPE, times: [0.02, 0.2, 0.78, 1], ease }}>
        <span className="pw-edge lead" />
        <span className="pw-edge trail" />
      </motion.div>
      <motion.div className="pw-card" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0], x: [0, 0, 18, 120] }} transition={{ duration: WIPE, times: [0.14, 0.22, 0.74, 0.88], ease: 'easeInOut' }}>
        {cut.num ? (
          <motion.span className="pw-num" initial={{ scale: 1.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: WIPE * 0.18, duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}>
            {cut.num}
          </motion.span>
        ) : null}
        {cut.kind === 'roll' ? (
          <motion.span className="pw-disc" initial={{ x: -180, rotate: -270, opacity: 0 }} animate={{ x: 0, rotate: 0, opacity: 1 }} transition={{ delay: WIPE * 0.16, duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}>
            <Vinyl spinning size={84} />
          </motion.span>
        ) : null}
        {cut.kind === 'final' ? (
          <motion.span className="pw-crown" initial={{ y: -40, rotate: -20, opacity: 0 }} animate={{ y: 0, rotate: 0, opacity: 1 }} transition={{ delay: WIPE * 0.18, type: 'spring', stiffness: 260, damping: 14 }}>
            👑
          </motion.span>
        ) : null}
        <b className={'pw-title' + (cut.kind === 'vs' ? ' pw-vs' : '')}>
          {words.map((w, i) => (
            <span className="pw-wmask" key={i}>
              <motion.span className="pw-word" initial={{ y: '105%' }} animate={{ y: '0%' }} transition={{ delay: WIPE * 0.2 + i * 0.08, duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}>
                {w}
              </motion.span>
            </span>
          ))}
        </b>
        {cut.sub ? (
          <motion.small initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: WIPE * 0.27, duration: 0.4 }}>
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
