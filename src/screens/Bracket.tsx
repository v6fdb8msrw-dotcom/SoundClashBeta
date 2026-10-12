import { motion } from 'motion/react'
import { dispatch, env } from '../app/store'
import { roundLabel } from '../core/constants'
import { tMatch, tPairs, tSize } from '../core/game'
import type { State } from '../core/types'
import { Btn } from '../ui/primitives'

/** Turnierbaum (bracketScreen im Original). */
export function Bracket({ S }: { S: State }) {
  const T = S.T!,
    R = T.roster
  const m = tMatch(S)
  return (
    <>
      <p className="kicker">Turnier · {tSize(S)} Spieler</p>
      <h2 className="display" style={{ fontSize: 'clamp(38px,7vw,74px)' }}>
        {roundLabel(tPairs(S).length * 2)}
      </h2>
      <p className="lede" style={{ marginBottom: 26 }}>
        Gewinner steigt auf. Wer verliert, ist raus.
      </p>
      <div className="card bracket-card" style={{ maxWidth: 760, margin: '0 auto' }}>
        {T.rounds.map((pairs, ri) => (
          <div key={ri} className="bracket-round">
            <p className="kicker" style={{ margin: (ri ? '20px' : '0') + ' 0 10px' }}>
              {roundLabel(pairs.length * 2)}
            </p>
            {pairs.map((pr, mi) => {
              const done = ri < T.r || (ri === T.r && mi < T.m)
              const now = ri === T.r && mi === T.m
              const win = done ? T.results[ri][mi] : null
              return (
                <motion.div
                  key={mi}
                  className={'rank' + (now ? ' now' : '') + (done ? ' done' : '')}
                  initial={env.reduce ? false : { opacity: 0, x: mi % 2 ? 30 : -30 }}
                  animate={{ opacity: done ? 0.72 : 1, x: 0 }}
                  transition={{ delay: 0.1 + (ri * 2 + mi) * 0.06, type: 'spring', stiffness: 240, damping: 24 }}
                >
                  {pr.map((pi, k) => {
                    const isW = done && win === pi
                    return (
                      <span key={k} style={{ display: 'contents' }}>
                        <span className="rk-side" style={{ opacity: done && !isW ? 0.45 : undefined }}>
                          <img src={R[pi].av} alt="" />
                          <span className="nm" style={{ fontSize: 15, color: R[pi].col }}>
                            {R[pi].name}
                          </span>
                          {isW ? <span style={{ fontSize: 13 }}>🏆</span> : null}
                        </span>
                        {k === 0 ? (
                          <span className="pos" style={{ fontSize: 14, width: 'auto', flex: '0 0 auto' }}>
                            vs
                          </span>
                        ) : null}
                      </span>
                    )
                  })}
                  {now ? (
                    <span className="badge two" style={{ flex: '0 0 auto' }}>
                      jetzt
                    </span>
                  ) : null}
                </motion.div>
              )
            })}
          </div>
        ))}
      </div>
      <div className="row">
        <Btn id="tGo" className="ready" onClick={() => dispatch({ type: 'tGo' })}>
          {R[m[0]].name} vs {R[m[1]].name} starten →
        </Btn>
        <Btn className="ghost" id="tAbort" onClick={() => dispatch({ type: 'tAbort' })}>
          Turnier abbrechen
        </Btn>
      </div>
    </>
  )
}
