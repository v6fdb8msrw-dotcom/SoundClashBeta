import { motion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { dispatch, env } from '../app/store'
import { parts, pcol, pname, pts, roundScore, sameArt, sdArt, voteTotal } from '../core/game'
import type { State } from '../core/types'
import { play } from '../services/audio'
import { picBigOf, picOf } from '../services/catalog'
import { spot, yt } from '../services/deezer'
import { CoverViz } from '../ui/CoverViz'
import { burstAt } from '../ui/Fx'
import { ArtImg, AvImg, Btn, Tilt, useAudio } from '../ui/primitives'
import { Vinyl } from '../ui/Vinyl'
import { QrCorner } from '../ui/PairPanel'
import { useHost } from '../ui/PairDialog'
import { voterRoles } from '../remote/host'

/** Duell: Platz gegen Platz, reinhören, abstimmen oder gemeinsam antippen (duelScreen im Original). */

function VoteBlock({ S, p }: { S: State; p: number }) {
  if (!S.audience)
    return (
      <Btn className="winbtn" data-win={p} onClick={(e) => (burstAt(e.currentTarget, pcol(S, p), 40, 1.2), dispatch({ type: 'win', p }))}>
        {pname(S, p)} gewinnt →
      </Btn>
    )
  const v = (S.tally || {})[p] || 0,
    total = voteTotal(S) || 1,
    pct = Math.round((v / total) * 100)
  const done = S.votePhase === 'result',
    win = done && S.voteWinner === p
  return (
    <>
      <div className="veq" style={{ ['--bc' as string]: pcol(S, p), ['--lvl' as string]: pct }}>
        {Array.from({ length: 14 }, (_, bi) => (
          <span key={bi} className={'eqbar' + (bi < Math.round((pct / 100) * 14) ? ' lit' : '')} style={{ ['--bi' as string]: bi }} />
        ))}
        <span className="vpct">{pct}%</span>
      </div>
      {done ? (
        <motion.div className={'vresult' + (win ? ' win' : '')} style={{ ['--pc' as string]: pcol(S, p) }} initial={env.reduce ? false : { scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          {win ? '👑 ' : ''}
          {v}
          {v === 1 ? ' Stimme' : ' Stimmen'}
        </motion.div>
      ) : (
        <div className="trow">
          <button className="tminus" data-bump={p} data-d="-1" disabled={!v} onClick={() => dispatch({ type: 'bump', p, d: -1 })} aria-label="Stimme abziehen">
            −
          </button>
          <Btn className="winbtn tplus" data-bump={p} data-d="1" onClick={(e) => (burstAt(e.currentTarget, pcol(S, p), 10, 0.6), dispatch({ type: 'bump', p, d: 1 }))}>
            +1 Stimme
          </Btn>
        </div>
      )}
    </>
  )
}

/** Handy-Modus: wer (per Handy) für diesen Song gestimmt hat; Stimmen vom Hauptgerät als „+n“. */
function Voters({ S, p }: { S: State; p: number }) {
  useHost()
  const list = voterRoles()[p] || []
  const local = Math.max(0, ((S.tally || {})[p] || 0) - list.length)
  const aud = list.filter((r) => r === 'audience').length
  const ps = list.filter((r): r is number => typeof r === 'number')
  return (
    <div className={'voters' + (!list.length && !local ? ' empty' : '')} data-voters={p}>
      {!list.length && !local ? <span className="vnone">noch keine Stimme</span> : null}
      {ps.map((r) => (
        <motion.span key={r} className="voter" style={{ ['--pc' as string]: pcol(S, r) }} initial={env.reduce ? false : { scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <AvImg S={S} p={r} />
          {pname(S, r)}
        </motion.span>
      ))}
      {aud ? <span className="voter aud">🙋 {aud} Publikum</span> : null}
      {local ? <span className="voter aud">🖥 +{local}</span> : null}
    </div>
  )
}

function Card({ S, p, idx }: { S: State; p: number; idx: number }) {
  const { playing } = useAudio()
  const sd = !!S.sd,
    i = S.duel
  const a = (sd ? sdArt(S, p) : S.lineup[p][i]) as string
  const so = (S.songs[p] || [])[i] || ({} as Partial<NonNullable<State['songs'][number][number]>>)
  const k = 'd' + p + '_' + i
  const glow = so.cover || picBigOf(a) || picOf(a) || ''
  const w = S.winners[S.duel]
  const state = w ? (w === p ? ' victor' : ' defeated') : ''
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (w === p) burstAt(ref.current, pcol(S, p), 60, 1.5)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w])
  const on = playing === k
  return (
    <motion.div
      className="dcard-wrap"
      initial={env.reduce ? false : { opacity: 0, y: 40, rotateY: idx % 2 ? -18 : 18 }}
      animate={{ opacity: 1, y: 0, rotateY: 0 }}
      transition={{ type: 'spring', stiffness: 180, damping: 20, delay: idx * 0.08 }}
    >
      <Tilt className={'dcard' + state + (on ? ' live' : '')} style={{ ['--pc' as string]: pcol(S, p) }} max={6}>
        <div ref={ref} className="dcard-in">
          {glow ? <div className="cglow" style={{ backgroundImage: `url(${glow})` }} /> : null}
          <div className="dplayer">
            <AvImg S={S} p={p} className="dpav" />
            <span className="dpname">{pname(S, p)}</span>
          </div>
          <div className="dart">
            <ArtImg n={a} style={{ width: 50, height: 50, borderRadius: 12 }} />
            <span>
              <span className="lbl">Artist</span>
              <br />
              <span className="nm">{a}</span>
            </span>
          </div>
          <div className="dsong">
            <div className="top">
              <span className={'coverwrap' + (on ? ' playing' : '')}>
                {on ? <Vinyl cover={so.cover || glow} color={pcol(S, p)} /> : so.cover ? <img src={so.cover} alt="" /> : <span className="cph">♪</span>}
                <CoverViz on={on} color={pcol(S, p)} />
              </span>
              <span>
                <span className="tt">{so.title || 'Kein Song gewählt'}</span>
                <br />
                <span className="td">{so.dur || ''}</span>
              </span>
            </div>
            {/* Handy-Modus: nur der gewählte Song – gehört wurde er schon beim Aufdecken */}
            {S.phoneMode ? null : (
              <div className="links">
                <button className={'lnk ' + (on ? 'on' : '')} data-pv3={k} data-url={so.preview || ''} onClick={() => play(so.preview || '', k)}>
                  {on ? '⏸ Pause' : '▶ 30 Sek'}
                </button>
                <a className="lnk" href={spot(a, so.title || '')} target="_blank" rel="noopener">
                  ↗ Spotify
                </a>
                <a className="lnk" href={yt(a, so.title || '')} target="_blank" rel="noopener">
                  ↗ YouTube
                </a>
              </div>
            )}
          </div>
          {S.phoneMode && S.audience ? <Voters S={S} p={p} /> : null}
          <VoteBlock S={S} p={p} />
        </div>
      </Tilt>
    </motion.div>
  )
}

export function Duel({ S }: { S: State }) {
  const sd = !!S.sd,
    i = S.duel,
    pos = i + 1,
    pt = sd ? 1 : pts(S, pos)
  const cards = []
  let idx = 0
  for (let p = 1; p <= S.players; p++) {
    if (S.sd && !sdArt(S, p)) continue
    cards.push(<Card key={p} S={S} p={p} idx={idx++} />)
  }
  const total = voteTotal(S)
  const done = S.votePhase === 'result'
  return (
    <>
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
                Platz <b>#{pos}</b> · ×{pt}
              </>
            )}
          </span>
        </div>
        <div className="pchips">
          {Array.from({ length: S.players }, (_, j) => j + 1).map((p) => (
            <span key={p} className="pill score" style={{ borderColor: pcol(S, p) }}>
              {pname(S, p)}:{' '}
              <motion.b key={roundScore(S, p)} initial={env.reduce ? false : { scale: 1.6, color: '#fff' }} animate={{ scale: 1, color: 'var(--text)' }}>
                {roundScore(S, p)}
              </motion.b>
            </span>
          ))}
        </div>
      </div>
      <div className="duelhead">
        <p className="kicker" style={{ margin: 0 }}>
          Battle
        </p>
        <motion.div className="big" initial={env.reduce ? false : { scale: 0.7, opacity: 0, letterSpacing: '0.4em' }} animate={{ scale: 1, opacity: 1, letterSpacing: '0.02em' }} transition={{ type: 'spring', stiffness: 200, damping: 18 }}>
          {sd ? 'Sudden Death' : '#' + pos + ' · ' + pt + ' PTS'}
        </motion.div>
        {S.phoneMode && S.audience && S.votePhase === 'tally' ? <p className="lede vs-lede">Alle Songs gehört – jetzt am Handy abstimmen</p> : null}
        {sd ? (
          <p className="lede">
            {sameArt(S) ? (
              <>
                Alle haben <span style={{ color: 'var(--primary)' }}>{sdArt(S, parts(S)[0]) || ''}</span> {'— '}
              </>
            ) : null}
            wer holt den besseren Song?
          </p>
        ) : null}
      </div>
      <div className={'cols duelcols n' + cards.length + (S.phoneMode ? ' vs-cine' : '')}>
        {cards.length === 2 ? (
          <>
            {cards[0]}
            <div className="vs" aria-hidden>
              <span>VS</span>
            </div>
            {cards[1]}
          </>
        ) : (
          cards
        )}
      </div>
      {S.audience ? (
        done ? (
          <div className="row" style={{ marginTop: 16 }}>
            {S.voteWinner ? (
              <Btn className="ready" data-vwin={S.voteWinner} onClick={() => dispatch({ type: 'vwin', p: S.voteWinner! })}>
                {pname(S, S.voteWinner)} holt {pt} {pt === 1 ? 'Punkt' : 'Punkte'} →
              </Btn>
            ) : (
              <>
                <span className="hint" style={{ width: '100%', margin: '0 0 8px' }}>
                  Stimmengleichheit — tippt gemeinsam:
                </span>
                {parts(S).map((q) => (
                  <Btn key={q} style={{ background: pcol(S, q), color: '#160806' }} data-vwin={q} onClick={() => dispatch({ type: 'vwin', p: q })}>
                    {pname(S, q)}
                  </Btn>
                ))}
              </>
            )}
            <Btn className="ghost" id="voteAgain" onClick={() => dispatch({ type: 'voteAgain' })}>
              ↻ Nochmal abstimmen
            </Btn>
          </div>
        ) : (
          <div className="row" style={{ marginTop: 16 }}>
            <Btn id="voteClose" disabled={!total} onClick={() => dispatch({ type: 'voteClose' })}>
              Abstimmung schließen · {total} {total === 1 ? 'Stimme' : 'Stimmen'} →
            </Btn>
            <Btn className="ghost" id="voteReset" onClick={() => dispatch({ type: 'voteReset' })}>
              ↻ Zurücksetzen
            </Btn>
          </div>
        )
      ) : null}
      {S.phoneMode ? <QrCorner /> : null}
    </>
  )
}
