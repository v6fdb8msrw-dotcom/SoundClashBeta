import { motion } from 'motion/react'
import { dispatch, env } from '../app/store'
import { isT, pcol, pname, roundScore, wins } from '../core/game'
import { roundLabel } from '../core/constants'
import type { State } from '../core/types'
import { AvImg, Btn } from '../ui/primitives'
import { Crate, Recap, Rivalry, Trophy } from './Results'
import { share } from './share'

const rowIn = (i: number) => ({ initial: env.reduce ? false : ({ opacity: 0, x: -24 } as const), animate: { opacity: 1, x: 0 }, transition: { delay: 0.35 + i * 0.09, type: 'spring' as const, stiffness: 240, damping: 22 } })

/** Endstand bzw. Turniersieger (finalScreen im Original). */
export function Final({ S }: { S: State }) {
  if (isT(S) && S.T && S.T.champ !== null) {
    const R = S.T.roster,
      c = R[S.T.champ]
    return (
      <div className="final" style={{ ['--pc' as string]: c.col }}>
        <Trophy />
        <p className="kicker" style={{ margin: '6px 0 0' }}>
          Turniersieger
        </p>
        <motion.div className="win" initial={env.reduce ? false : { scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 160, damping: 13, delay: 0.2 }}>
          {c.name}
        </motion.div>
        <motion.img src={c.av} alt="" className="champ-av" style={{ boxShadow: '0 0 40px ' + c.col }} initial={env.reduce ? false : { rotate: -20, scale: 0.4 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 180, damping: 14, delay: 0.3 }} />
        <div className="card bracket-card" style={{ maxWidth: 620, margin: '24px auto 0', textAlign: 'left' }}>
          <p className="kicker">Turnierbaum</p>
          {S.T.rounds.map((pairs, ri) => (
            <div key={ri}>
              <p className="kicker" style={{ margin: (ri ? '16px' : '0') + ' 0 8px' }}>
                {roundLabel(pairs.length * 2)}
              </p>
              {pairs.map((pr, mi) => {
                const win = S.T!.results[ri][mi]
                return (
                  <motion.div className="rank" key={mi} {...rowIn(mi + ri * 2)}>
                    {pr.map((pi, k) => (
                      <span key={k} style={{ display: 'contents' }}>
                        <span className="rk-side" style={{ opacity: win !== pi ? 0.42 : undefined }}>
                          <img src={R[pi].av} alt="" />
                          <span className="nm" style={{ fontSize: 14, color: R[pi].col }}>
                            {R[pi].name}
                          </span>
                          {win === pi ? <span style={{ fontSize: 12 }}>🏆</span> : null}
                        </span>
                        {k === 0 ? (
                          <span className="pos" style={{ fontSize: 13, width: 'auto' }}>
                            vs
                          </span>
                        ) : null}
                      </span>
                    ))}
                  </motion.div>
                )
              })}
            </div>
          ))}
        </div>
        <Crate S={S} />
        <Recap S={S} titel="Line-up des Finales" />
        <div className="row">
          <Btn className="ghost" id="newBtn" onClick={() => dispatch({ type: 'newMatch' })}>
            ↻ Neues Turnier
          </Btn>
        </div>
      </div>
    )
  }
  const rk: { p: number; w: number; s: number }[] = []
  for (let p = 1; p <= S.players; p++) rk.push({ p, w: wins(S, p), s: roundScore(S, p) })
  rk.sort((a, b) => b.w - a.w || b.s - a.s)
  const w = rk[0].p
  return (
    <div className="final" style={{ ['--pc' as string]: pcol(S, w) }}>
      <Trophy />
      <p className="kicker" style={{ margin: '6px 0 0' }}>
        Sieger
      </p>
      <motion.div className="win" initial={env.reduce ? false : { scale: 0.5, opacity: 0, filter: 'blur(16px)' }} animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }} transition={{ type: 'spring', stiffness: 160, damping: 13, delay: 0.2 }}>
        {pname(S, w)}
      </motion.div>
      <div className="card" style={{ maxWidth: 640, margin: '0 auto', textAlign: 'left' }}>
        <p className="kicker">Endstand</p>
        {rk.map((r, i) => (
          <motion.div className={'rank ' + (i === 0 ? 'first' : '')} style={{ ['--pc' as string]: pcol(S, r.p) }} key={r.p} {...rowIn(i)}>
            <span className="pos">{i + 1}</span>
            <AvImg S={S} p={r.p} />
            <span className="meta">
              <span className="nm">{pname(S, r.p)}</span>
              <br />
              <span className="sub">
                {r.w} Rundensiege · {r.s} pts
              </span>
            </span>
            {i === 0 ? <span style={{ fontSize: 18 }}>🏆</span> : null}
          </motion.div>
        ))}
      </div>
      <Crate S={S} />
      <Rivalry S={S} />
      <Recap S={S} titel={S.series === 'single' ? 'Das Line-up des Duells' : 'Line-up der letzten Runde'} />
      <div className="row">
        <Btn id="shareBtn" onClick={() => share(S)}>
          ⇪ Teilen
        </Btn>
        <Btn className="ghost" id="newBtn" onClick={() => dispatch({ type: 'newMatch' })}>
          ↻ Neues Match
        </Btn>
      </div>
    </div>
  )
}
