import { motion } from 'motion/react'
import { dispatch, env } from '../app/store'
import { isT, leader, pcol, pname, score, target, totalPts, wins } from '../core/game'
import type { State } from '../core/types'
import { AvImg, Btn, Tilt } from '../ui/primitives'
import { CountUp, Recap } from './Results'

/** Rundenende (roundScreen im Original). */
export function Round({ S }: { S: State }) {
  const sc: { p: number; s: number }[] = []
  for (let p = 1; p <= S.players; p++) sc.push({ p, s: score(S, p) })
  const mx = Math.max(...sc.map((x) => x.s)),
    w = sc.find((x) => x.s === mx)!.p,
    ld = leader(S)
  return (
    <>
      <p className="kicker">Runde {S.round} · Endstand</p>
      <motion.h2
        className="display round-win"
        style={{ fontSize: 'clamp(46px,9vw,94px)', color: pcol(S, w) }}
        initial={env.reduce ? false : { scale: 0.6, opacity: 0, filter: 'blur(14px)' }}
        animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
        transition={{ type: 'spring', stiffness: 170, damping: 15 }}
      >
        {pname(S, w)} <span className="sparkle">✦</span>
      </motion.h2>
      <div className="cols" style={{ marginTop: 26 }}>
        {Array.from({ length: S.players }, (_, j) => j + 1).map((p, idx) => (
          <motion.div key={p} initial={env.reduce ? false : { opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + idx * 0.08, type: 'spring', stiffness: 220, damping: 22 }}>
            <Tilt className={'statcard ' + (p === w ? 'lead' : '')} style={{ ['--pc' as string]: pcol(S, p) }} max={6}>
              <div className="top">
                <AvImg S={S} p={p} />
                <span className="nm">{pname(S, p)}</span>
                {p === w ? <span style={{ fontSize: 20 }}>🏆</span> : null}
              </div>
              <div className="stats">
                <div>
                  <div className="k">Punkte diese Runde</div>
                  <CountUp className="v hi" to={score(S, p)} k={'rp' + p} />
                </div>
                <div>
                  <div className="k">Von</div>
                  <div className="v">{S.sd ? 1 : totalPts(S)}</div>
                </div>
                <div>
                  <div className="k">Rundensiege</div>
                  <div className="v">
                    {wins(S, p)}/{target(S)}
                  </div>
                </div>
              </div>
            </Tilt>
          </motion.div>
        ))}
      </div>
      <Recap S={S} titel="Rückblick · wer hat welchen Platz geholt" />
      <div className="row">
        {isT(S) && (ld || S.series === 'single') ? (
          <Btn id="tNext" className="ready" onClick={() => dispatch({ type: 'tNext' })}>
            {pname(S, w)} steigt auf →
          </Btn>
        ) : ld || S.series === 'single' ? (
          <Btn id="toFinal" className="ready" onClick={() => dispatch({ type: 'toFinal' })}>
            Endstand ansehen →
          </Btn>
        ) : (
          <Btn id="nextRound" className="ready" onClick={() => dispatch({ type: 'nextRound' })}>
            Nächste Runde →
          </Btn>
        )}
      </div>
    </>
  )
}
