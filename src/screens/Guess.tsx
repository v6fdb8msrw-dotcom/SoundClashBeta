import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { dispatch, env } from '../app/store'
import { GUESS_STEPS } from '../core/constants'
import type { State, Track } from '../core/types'
import { gPlayFrom, gStop } from '../services/audio'
import { GEN } from '../services/catalog'
import { dzTracks } from '../services/deezer'
import { Btn } from '../ui/primitives'
import { Warn } from '../ui/Warn'
import { Backlink, Chips, GenreLabel, LoadingEq } from './common'

/** Guess the Song (gsSetup / gsPlay / gsResult im Original). */

export function GuessSetup({ S }: { S: State }) {
  const g = S.gs || { genres: [], rounds: 5, diff: 'easy', players: 1 }
  const gg = g.genres || []
  const diff = g.diff || 'easy'
  return (
    <div className="gs">
      <Backlink />
      <p className="eyebrow">— guess the song</p>
      <h2 className="display" style={{ fontSize: 'clamp(32px,6vw,60px)' }}>
        Guess the <em>Song</em>
      </h2>
      <p className="lede">Errate den Song an einer Mini-Stichprobe. Je früher, desto mehr Punkte.</p>
      <div className="card" style={{ marginTop: 22 }}>
        <label className="gslab">Genre</label>
        <Chips keys={Object.keys(GEN)} on={gg} attr="data-gsg" onToggle={(k) => dispatch({ type: 'gsGenre', k })} />
        <div className="gsrow">
          <div>
            <label className="gslab">Runden</label>
            <div className="gseg">
              {[3, 5, 10].map((r) => (
                <button key={r} className={'gsopt' + (g.rounds === r ? ' on' : '')} data-gsr={r} onClick={() => dispatch({ type: 'gsRounds', n: r })}>
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="gslab">Schwierigkeit</label>
            <div className="gseg">
              {[
                ['easy', 'Easy'],
                ['medium', 'Medium'],
                ['ultra', 'Ultra'],
              ].map((d) => (
                <button key={d[0]} className={'gsopt' + (diff === d[0] ? ' on' : '')} data-gsd={d[0]} onClick={() => dispatch({ type: 'gsDiff', d: d[0] })}>
                  {d[1]}
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="gshint" style={{ marginTop: 14 }}>
          {{ easy: 'Easy — die Hits, die jeder kennt.', medium: 'Medium — solide Bekanntheit.', ultra: 'Ultra — tiefe Cuts, nur für Kenner.' }[diff]} · Mehrere Kategorien wählbar.
        </p>
        <div className="startbar">
          <span className="hint" style={{ margin: 0 }}>
            {gg.length ? <GenreLabel arr={gg} /> : 'Wähl mind. eine Kategorie'}
          </span>
          <Btn data-gsstart className={gg.length ? 'ready' : ''} disabled={!gg.length} onClick={() => dispatch({ type: 'gsStart' })}>
            Los geht{'’'}s →
          </Btn>
        </div>
      </div>
    </div>
  )
}

/** Suchfeld mit Deezer-Treffern (gsDoSearch im Original). */
function GuessSearch({ onPick }: { onPick: (i: number, t: Track) => void }) {
  const [hits, setHits] = useState<Track[] | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  function search(q: string) {
    if (!q || q.trim().length < 2) {
      setHits(null)
      return
    }
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      let d: Track[] = []
      try {
        d = await dzTracks(q, 8)
      } catch {
        d = []
      }
      setHits(d || [])
    }, 260)
  }
  return (
    <div className="gssearch">
      <input type="text" id="gsSearch" autoComplete="off" placeholder="Song eintippen und antippen…" onChange={(e) => search(e.target.value)} />
      <div className="gsres" id="gsResults">
        {hits === null ? null : !hits.length ? (
          <div className="gsres-empty">Nichts gefunden…</div>
        ) : (
          hits.map((t, i) => (
            <motion.button key={i + '|' + t.id} className="gsres-item" data-gspick={i} onClick={() => onPick(i, t)} initial={env.reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.025 }}>
              <b>{t.title_short || t.title || ''}</b>
              <span>{(t.artist && t.artist.name) || ''}</span>
            </motion.button>
          ))
        )}
      </div>
    </div>
  )
}

function Result({ S }: { S: State }) {
  const g = S.gs!
  let body: React.ReactNode
  if (g.players === 2) {
    const w = g.scores![1] === g.scores![2] ? 0 : g.scores![1] > g.scores![2] ? 1 : 2
    body = (
      <>
        <div className="gswin">{w ? '🏆 ' + (S.names[w - 1] || 'P' + w) + ' gewinnt!' : 'Unentschieden!'}</div>
        <div className="gsscores">
          <div>
            <span>{S.names[0] || 'P1'}</span>
            <b>{g.scores![1]}</b>
          </div>
          <div>
            <span>{S.names[1] || 'P2'}</span>
            <b>{g.scores![2]}</b>
          </div>
        </div>
      </>
    )
  } else {
    body = (
      <>
        <motion.div className="gswin" initial={env.reduce ? false : { scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 180, damping: 13 }}>
          {g.scores![1]} Punkte
        </motion.div>
        <p className="lede" style={{ textAlign: 'center' }}>
          {g.rounds} Runden · <GenreLabel arr={g.genres} />
        </p>
      </>
    )
  }
  return (
    <div className="gs" style={{ textAlign: 'center' }}>
      <p className="eyebrow" style={{ textAlign: 'center' }}>
        — ergebnis
      </p>
      {body}
      <div className="result-actions">
        <Btn data-gsagain onClick={() => dispatch({ type: 'gsStart' })}>
          Nochmal
        </Btn>
        <button className="tool" data-go="home" onClick={() => dispatch({ type: 'go', to: 'home' })}>
          Menü
        </button>
      </div>
    </div>
  )
}

export function GuessPlay({ S }: { S: State }) {
  const g = S.gs!
  const [snip, setSnip] = useState(false)
  if (g.loading)
    return (
      <div className="gs">
        <LoadingEq text="Songs werden geladen…" />
      </div>
    )
  if (g.err)
    return (
      <div className="gs">
        <div className="card" style={{ textAlign: 'center' }}>
          <Warn S={S} />
          <p className="lede" style={{ textAlign: 'center' }}>
            {g.err}
          </p>
          <Btn data-go="home" style={{ marginTop: 16 }} onClick={() => dispatch({ type: 'go', to: 'home' })}>
            ← Menü
          </Btn>
        </div>
      </div>
    )
  if (!g.seq || g.ridx! >= g.seq.length) return <Result S={S} />
  const q = g.seq[g.ridx!]
  const st = GUESS_STEPS[g.step!]
  const secs = st[0],
    pts = st[1],
    total = g.seq.length,
    answered = g.picked != null
  const pn = (p: number) => S.names[p - 1] || 'P' + p
  return (
    <div className="gs">
      <div className="gshead">
        <Backlink />
        <div className="gsmeta">
          <span>
            Runde {g.ridx! + 1} / {total}
          </span>
          {g.players === 2 ? <span className="gsturn">{pn(q.player)} ist dran</span> : null}
          <span>{g.players === 2 ? pn(1) + ' ' + g.scores![1] + ' · ' + pn(2) + ' ' + g.scores![2] : g.scores![1] + ' Pkt'}</span>
        </div>
      </div>
      <div className="gsmystery">
        <motion.div className={'gsdisc' + (answered ? ' rev' : '') + (snip ? ' spin' : '')} animate={answered && !env.reduce ? { rotateY: [90, 0] } : undefined} transition={{ type: 'spring', stiffness: 160, damping: 14 }}>
          {answered ? <img src={q.song.cover || q.song.img || ''} alt="" /> : <span className="q">?</span>}
        </motion.div>
        {!answered ? (
          <>
            <Btn
              className={'gsplaybtn' + (snip ? ' on' : '')}
              id="gsBtnPlay"
              data-gsplay
              onClick={() => {
                setSnip(true)
                gPlayFrom(q.song.preview, 0, secs, () => setSnip(false))
              }}
            >
              ▶ Anspielen · {secs}s
            </Btn>
            <div className="gssteps">
              {GUESS_STEPS.map((s, i) => (
                <span key={i} className={i < g.step! ? 'used' : i === g.step ? 'cur' : ''}>
                  {s[1]}
                </span>
              ))}
            </div>
            <p className="gshint">Aktuell {pts} Punkte · daneben oder überspringen = mehr hören, weniger Punkte</p>
            <GuessSearch key={g.ridx + '-' + g.step} onPick={(i, t) => (gStop(), dispatch({ type: 'gsGuess', i, hit: { artist: (t.artist && t.artist.name) || '', title: t.title_short || t.title || '' } }))} />
            <button className="gsskip" data-gsskip onClick={() => dispatch({ type: 'gsSkip' })}>
              {g.step! < GUESS_STEPS.length - 1 ? 'Mehr hören / überspringen →' : 'Aufgeben & auflösen →'}
            </button>
          </>
        ) : (
          <motion.div className={'gsreveal ' + (g.correct ? 'ok' : 'no')} initial={env.reduce ? false : { y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            <p className="gsr-t">{g.correct ? '✓ Richtig!' : '✗ Daneben'}</p>
            <p className="gsr-s">{q.song.title}</p>
            <p className="gsr-a">{q.song.artist}</p>
            <p className="gsr-p">{g.correct ? '+' + g.gained + ' Punkte' : '0 Punkte'}</p>
            <Btn data-gsnext onClick={() => dispatch({ type: 'gsNext' })}>
              {g.ridx! + 1 >= total ? 'Ergebnis →' : 'Nächster Song →'}
            </Btn>
          </motion.div>
        )}
      </div>
    </div>
  )
}
