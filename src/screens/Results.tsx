import { motion, useMotionValue, useTransform, animate } from 'motion/react'
import { useEffect, useRef, useSyncExternalStore } from 'react'
import { dispatch, env } from '../app/store'
import { N, pcol, pname, pts, score, sdArt, winnerRecords } from '../core/game'
import type { State } from '../core/types'
import { play } from '../services/audio'
import { picBigOf, picOf } from '../services/catalog'
import { getRivalry, rivalKey, rivalryVersion, subscribeRivalry } from '../services/rivalry'
import { tone } from '../services/sfx'
import { ArtImg, AvImg, useAudio } from '../ui/primitives'

/** Bausteine für Runden- und Endstand: Zähler, Rückblick, Platten des Abends, Rivalität. */

const lastCount: Record<string, number> = {}

/** Zählt von der letzten Anzeige hoch (runCountUps im Original). */
export function CountUp({ to, k, className }: { to: number; k: string; className?: string }) {
  const from = k && lastCount[k] !== undefined ? lastCount[k] : 0
  const mv = useMotionValue(env.reduce ? to : from)
  const txt = useTransform(mv, (v) => String(Math.round(v)))
  useEffect(() => {
    if (k) lastCount[k] = to
    if (env.reduce || from === to) {
      mv.set(to)
      return
    }
    const c = animate(mv, to, { duration: 0.65, ease: [0.16, 1, 0.3, 1] })
    return () => c.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to])
  return (
    <motion.div className={className} data-cnt={to} data-cnt-key={k}>
      {txt}
    </motion.div>
  )
}

export function Recap({ S, titel }: { S: State; titel: string }) {
  if (!S.lineup || !S.lineup[1]) return null
  const n = S.sd ? 1 : N(S)
  const cols = []
  for (let p = 1; p <= S.players; p++) {
    const rows = []
    for (let i = 0; i < n; i++) {
      const a = S.sd ? sdArt(S, p) : S.lineup[p][i]
      if (!a) continue
      const won = S.winners[i] === p,
        pt = S.sd ? 1 : pts(S, i + 1)
      const so = (S.songs[p] || [])[i] || ({} as { title?: string })
      rows.push(
        <div className={'rrow ' + (won ? 'won' : 'lost')} key={i}>
          <span className="rp">{S.sd ? 'SD' : '#' + (i + 1)}</span>
          <ArtImg n={a} className="ra" />
          <span className="rm">
            <span className="rn">{a}</span>
            <span className="rs">{so.title || '—'}</span>
          </span>
          <span className="rw">{won ? '+' + pt : '—'}</span>
        </div>,
      )
    }
    cols.push(
      <div className="recap" key={p} style={{ ['--pc' as string]: pcol(S, p) }}>
        <div className="rh">
          <AvImg S={S} p={p} />
          <span className="nm">{pname(S, p)}</span>
          <span className="tot">{score(S, p)}</span>
        </div>
        {rows}
      </div>,
    )
  }
  return (
    <details className="recapwrap">
      <summary>
        {titel} <span className="chev">▾</span>
      </summary>
      <div className="cols" style={{ marginTop: 14 }}>
        {cols}
      </div>
    </details>
  )
}

/** Die Platten des Abends: Sieger-Songs als Vinyl-Regal. */
export function Crate({ S }: { S: State }) {
  const { playing } = useAudio()
  const recs = winnerRecords(S)
  if (!recs.length) return null
  return (
    <div className="crate">
      <p className="kicker" style={{ margin: 0 }}>
        Die Platten des Abends
      </p>
      <div className="shelf">
        {recs.map((r, idx) => {
          const cov = r.song.cover || picBigOf(r.artist) || picOf(r.artist) || ''
          const k = 'crate' + r.p + '_' + (r.pos - 1)
          const on = playing === k
          return (
            <motion.div
              key={k + idx}
              className={'lp' + (on ? ' playing up' : '')}
              tabIndex={0}
              style={{ ['--pc' as string]: pcol(S, r.p) }}
              data-lp={k}
              data-url={r.song.preview || ''}
              data-cover={cov}
              initial={env.reduce ? false : { opacity: 0, y: 40, rotateX: 40 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ delay: 0.25 + idx * 0.07, type: 'spring', stiffness: 200, damping: 20 }}
              onClick={() => {
                const url = r.song.preview || ''
                if (url) {
                  // Plattenspieler sichtbar machen (falls nicht schon), dann spielen
                  dispatch({ type: 'lpBg' })
                  play(url, k, cov)
                } else if (!S.muted) tone(660, 0, 0.06, 0.07)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.currentTarget as HTMLElement).click()
              }}
            >
              <div className="disc" />
              <div className="sleeve">
                {cov ? <img src={cov} alt="" loading="lazy" /> : null}
                <span className="spine" />
                {r.song.preview ? <span className="lpplay">{on ? '⏸' : '▶'}</span> : null}
              </div>
              <span className="cap">
                <span className="t">{String(r.song.title || r.artist)}</span>
                <span className="a">{String(r.artist)}</span>
                <span className="w">
                  {r.sd ? 'Sudden Death' : 'Platz #' + r.pos} · {pname(S, r.p)}
                </span>
              </span>
            </motion.div>
          )
        })}
      </div>
      <p className="hint">{recs.length} Sieger-Songs · antippen spielt 30 Sek &amp; legt die Platte auf</p>
    </div>
  )
}

export function Rivalry({ S }: { S: State }) {
  useSyncExternalStore(subscribeRivalry, rivalryVersion, rivalryVersion)
  const RIVAL = getRivalry()
  if (S.players !== 2 || !RIVAL) return null
  const n1 = pname(S, 1),
    n2 = pname(S, 2),
    k = rivalKey(n1, n2),
    r = RIVAL[k]
  if (!r) return null
  const disp = (x: string) => [n1, n2].find((n) => n.toLowerCase().trim() === x) || x
  const aw = r.aw,
    bw = r.bw
  const lead = aw > bw ? disp(r.a) : bw > aw ? disp(r.b) : null
  const s1 = disp(r.a) === n1 ? aw : bw,
    s2 = disp(r.a) === n1 ? bw : aw
  const tot = aw + bw + r.draws
  return (
    <details className="rivwrap">
      <summary>
        Ewige Rivalität · {tot} Duelle <span className="chev">▾</span>
      </summary>
      <div className="rivalry">
        <div className="rvbar">
          <span className="rvname" style={{ color: pcol(S, 1) }}>
            {n1}
          </span>
          <span className="rvscore">
            {s1} : {s2}
            {r.draws ? ' · ' + r.draws + ' ∅' : ''}
          </span>
          <span className="rvname" style={{ color: pcol(S, 2) }}>
            {n2}
          </span>
        </div>
        <div className="rvmeter" aria-hidden>
          <span style={{ flexGrow: Math.max(0.0001, s1), background: pcol(S, 1) }} />
          <span style={{ flexGrow: Math.max(0.0001, r.draws), background: 'var(--muted)' }} />
          <span style={{ flexGrow: Math.max(0.0001, s2), background: pcol(S, 2) }} />
        </div>
        {lead ? (
          <p className="hint" style={{ margin: '10px 0 0' }}>
            {lead} führt die Serie an.
          </p>
        ) : (
          <p className="hint" style={{ margin: '10px 0 0' }}>
            Kopf an Kopf — alles offen.
          </p>
        )}
      </div>
    </details>
  )
}

/** Pokal mit Lichtschweif. */
export function Trophy() {
  const ref = useRef<HTMLDivElement>(null)
  return (
    <motion.div
      ref={ref}
      className="trophy"
      initial={env.reduce ? false : { scale: 0.2, rotate: -30, opacity: 0, y: 40 }}
      animate={{ scale: 1, rotate: 0, opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 160, damping: 12, delay: 0.1 }}
    >
      <span className="trophy-rays" aria-hidden />
      🏆
    </motion.div>
  )
}
