import { motion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { dispatch, env, getState } from '../app/store'
import { eraCheck, pcol, pickOrder, pname, pts, sdArt } from '../core/game'
import type { State } from '../core/types'
import { trackList, trackYear } from '../services/deezer'
import { ArtImg, AvImg, Btn } from '../ui/primitives'
import { Warn } from '../ui/Warn'
import { Tracks } from './Tracks'

/** Pick-Timer: Startzeit je (Runde, Duell/SD, Wahl) einmal festgelegt (pickTimerSync im Original). */
const timer = { key: '', deadline: 0 }

function PickTimer({ S }: { S: State }) {
  const bar = useRef<HTMLDivElement>(null)
  const num = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (S.screen !== 'pick' || !S.pickSec) return
    const key = S.round + '_' + (S.sd ? 'sd' : S.duel) + '_' + S.pickIdx
    if (timer.key !== key) {
      timer.key = key
      timer.deadline = Date.now() + S.pickSec * 1000
    }
    let iv: ReturnType<typeof setInterval> | undefined
    const tick = () => {
      const total = S.pickSec * 1000,
        left = Math.max(0, timer.deadline - Date.now())
      if (bar.current) {
        bar.current.style.width = (left / total) * 100 + '%'
        bar.current.classList.toggle('low', left < total * 0.25)
      }
      if (num.current) num.current.textContent = String(Math.ceil(left / 1000))
      if (left <= 0) {
        clearInterval(iv)
        timeUp()
      }
    }
    tick()
    iv = setInterval(tick, 120)
    return () => clearInterval(iv)
  }, [S.screen, S.pickSec, S.round, S.sd, S.duel, S.pickIdx])
  return (
    <div className="picktimer" title="Optionaler Timer">
      <div className="pt-bar" id="pickbar" ref={bar} />
      <span className="pt-num" ref={num} aria-hidden />
    </div>
  )
}

function timeUp() {
  const S = getState()
  if (S.screen !== 'pick') return
  const order = pickOrder(S, S.duel)
  const p = order[S.pickIdx],
    i = S.duel
  const ch = (S.songs[p] || [])[i]
  if (ch) return dispatch({ type: 'pickTimeUp', track: null })
  const a = S.sd ? sdArt(S, p) : S.lineup[p][i]
  const list = trackList(p + '_' + i, a as string).list || []
  const cands = list.filter((t) => t && t.preview)
  const fitc = cands.filter((t) => eraCheck(S, i, trackYear(t)) !== false)
  const from = fitc.length ? fitc : cands
  const t = from.length ? from[Math.floor(env.rng() * from.length)] : null
  dispatch({ type: 'pickTimeUp', track: t })
}

export function Pick({ S }: { S: State }) {
  const order = pickOrder(S, S.duel)
  const p = order[S.pickIdx]
  const sd = !!S.sd,
    i = S.duel,
    a = (sd ? sdArt(S, p) : S.lineup[p][i]) as string
  const pt = sd ? 1 : pts(S, i + 1)
  const ch = (S.songs[p] || [])[i]
  return (
    <>
      <Warn S={S} />
      {S.pickSec ? <PickTimer S={S} /> : null}
      <div className="dhead">
        <div className="pills">
          <span className="pill">
            Runde <b>{S.round}</b>
          </span>
          <span className="pill">
            {sd ? (
              'Sudden Death'
            ) : (
              <>
                Platz <b>#{i + 1}</b> · ×{pt}
              </>
            )}
          </span>
          <span className="pill">
            Wahl{' '}
            <b>
              {S.pickIdx + 1} / {order.length}
            </b>
          </span>
        </div>
        <div className="pchips">
          {order.map((q, j) => {
            const done = j < S.pickIdx
            const qa = sd ? sdArt(S, q) : (S.lineup[q] || [])[i] || ''
            return (
              <motion.div key={q} className={'pchip ' + (q === p ? 'on' : '')} style={{ ['--pc' as string]: pcol(S, q), opacity: done ? 0.5 : undefined }} layout={false}>
                <AvImg S={S} p={q} />
                <span>
                  <span className="nm">{pname(S, q)}</span>
                  <br />
                  <span className="st">{done ? '✓ gewählt' : q === p ? 'wählt…' : qa || 'wartet'}</span>
                </span>
              </motion.div>
            )
          })}
        </div>
      </div>
      <div className="pick-head">
        <motion.h2 className="display pick-who" style={{ color: pcol(S, p) }} initial={env.reduce ? false : { x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 22 }}>
          {pname(S, p)}
        </motion.h2>
        <span className="lede" style={{ margin: 0 }}>
          {sd ? 'Sudden Death' : 'Platz #' + (i + 1)} · <span style={{ color: 'var(--primary)' }}>{a}</span>
        </span>
      </div>
      <div className="pick-body">
        <div className="pcol" style={{ ['--pc' as string]: pcol(S, p) }}>
          <div className="ph">
            <ArtImg n={a} style={{ width: 38, height: 38, borderRadius: 11 }} />
            <span className="nm">{a}</span>
            <span className={'badge ' + (!sd && pt === 2 ? 'two' : '')} style={{ marginLeft: 'auto' }}>
              {sd ? 'SD' : '#' + (i + 1) + (pt === 2 ? ' ×2' : '')}
            </span>
          </div>
          <Tracks S={S} p={p} i={i} artist={a} />
        </div>
      </div>
      <div className="row">
        {ch ? (
          <Btn id="pickNext" className="confirm" onClick={() => dispatch({ type: 'pickNext' })}>
            {ch.title} bestätigen →
          </Btn>
        ) : (
          <Btn id="pickNext" disabled>
            Erst einen Song wählen
          </Btn>
        )}
        <Btn className="ghost" id="pickSkip" onClick={() => dispatch({ type: 'pickNext' })}>
          Überspringen
        </Btn>
      </div>
      {ch ? <p className="hint">Nochmal antippen wechselt den Song.</p> : null}
    </>
  )
}
