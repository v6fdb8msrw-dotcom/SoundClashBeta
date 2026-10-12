import { motion } from 'motion/react'
import { dispatch, env } from '../app/store'
import { pcol, pname, pts, ready, sdArt } from '../core/game'
import type { State } from '../core/types'
import { play } from '../services/audio'
import { ArtImg, AvImg, Btn, Eq, useAudio } from '../ui/primitives'
import { Warn } from '../ui/Warn'
import { Tracks } from './Tracks'

/** „Alle vorab“: jeder wählt zu jedem Platz einen Song (songsScreen im Original). */
export function Songs({ S }: { S: State }) {
  const { playing } = useAudio()
  const sd = !!S.sd
  const cols = []
  for (let p = 1; p <= S.players; p++) {
    if (S.sd && !sdArt(S, p)) continue
    const list = sd ? [sdArt(S, p)] : S.lineup[p]
    cols.push(
      <motion.div className="pcol" key={p} style={{ ['--pc' as string]: pcol(S, p) }} initial={env.reduce ? false : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: p * 0.06 }}>
        <div className="ph">
          <AvImg S={S} p={p} />
          <span className="nm">{pname(S, p)}</span>
        </div>
        {list.map((a, i) => {
          if (!a) return null
          const ch = (S.songs[p] || [])[i]
          const k = 's' + p + '_' + i
          return (
            <div className={'acard' + (ch ? ' done' : '')} key={i}>
              <div className="ah">
                <ArtImg n={a} />
                <span className={'badge ' + (!sd && pts(S, i + 1) === 2 ? 'two' : '')}>{sd ? 'SD' : '#' + (i + 1) + (pts(S, i + 1) === 2 ? ' ×2' : '')}</span>
                <span className="an">{a}</span>
              </div>
              {ch ? (
                <motion.div className="chosen" initial={env.reduce ? false : { scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 360, damping: 22 }}>
                  {ch.cover ? <img src={ch.cover} alt="" /> : <span className="cph">♪</span>}
                  <span className="meta">
                    <span className="tt">{ch.title}</span>
                    <span className="td">{ch.dur}</span>
                  </span>
                  <button className={'iconbtn' + (playing === k ? ' on' : '')} data-pv={p + '_' + i} data-url={ch.preview} onClick={(e) => (e.stopPropagation(), play(ch.preview, k))} aria-label="Vorschau">
                    {playing === k ? '⏸' : '▶'}
                    <Eq on={playing === k} />
                  </button>
                  <button className="iconbtn" data-clr={p + '_' + i} onClick={() => dispatch({ type: 'clearSong', p, i })} aria-label="Song wechseln">
                    ↻
                  </button>
                </motion.div>
              ) : (
                <Tracks S={S} p={p} i={i} artist={a} />
              )}
            </div>
          )
        })}
      </motion.div>,
    )
  }
  const rdy = ready(S)
  return (
    <>
      <Warn S={S} />
      <p className="kicker">Battle · Song wählen</p>
      <h2 className="display" style={{ fontSize: 'clamp(38px,7vw,72px)' }}>
        Wählt eure Songs
      </h2>
      <p className="lede" style={{ marginBottom: 26 }}>
        {sd ? 'Sudden Death — alle haben denselben Künstler.' : 'Wählt eure Songs und stimmt danach ab, wer gewinnt.'}
      </p>
      <div className="cols">{cols}</div>
      <div className="row">
        <Btn id="toBattle" className={rdy ? 'ready' : ''} disabled={!rdy} onClick={() => dispatch({ type: 'toBattle' })}>
          Zum Battle →
        </Btn>
        {rdy ? null : (
          <Btn className="ghost" id="skipSongs" onClick={() => dispatch({ type: 'skipSongs' })}>
            Ohne Songs weiter
          </Btn>
        )}
      </div>
      {rdy ? null : <p className="hint">Jeder wählt zu jedem Künstler einen Song — oder ihr geht ohne weiter und nutzt Spotify/YouTube.</p>}
    </>
  )
}
