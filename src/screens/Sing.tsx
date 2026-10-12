import { useState } from 'react'
import { dispatch } from '../app/store'
import type { State } from '../core/types'
import { gPlayFrom } from '../services/audio'
import { GEN } from '../services/catalog'
import { Btn } from '../ui/primitives'
import { Warn } from '../ui/Warn'
import { Backlink, Chips, GenreLabel, LoadingEq } from './common'

/** Sing it Back – im Original vorhanden, aber ohne Startkachel (nicht erreichbar). */

export function SingSetup({ S }: { S: State }) {
  const s = S.sb || { genres: [], players: 2, rounds: 5 }
  const sg = s.genres || []
  return (
    <div className="gs">
      <Backlink />
      <div className="wipbar">🚧 Under Construction — dieser Modus ist noch in Arbeit und nicht final.</div>
      <p className="eyebrow">— sing it back</p>
      <h2 className="display" style={{ fontSize: 'clamp(32px,6vw,60px)' }}>
        Sing it <em>Back</em>
      </h2>
      <p className="lede">Der Song stoppt mittendrin — du singst weiter. Danach kommt die Auflösung.</p>
      <div className="card" style={{ marginTop: 22 }}>
        <label className="gslab">Genre</label>
        <Chips keys={Object.keys(GEN)} on={sg} attr="data-sbg" onToggle={(k) => dispatch({ type: 'sbGenre', k })} />
        <div className="gsrow">
          <div>
            <label className="gslab">Spieler</label>
            <div className="gseg">
              <button className={'gsopt' + (s.players === 1 ? ' on' : '')} data-sbp="1" onClick={() => dispatch({ type: 'sbPlayers', n: 1 })}>
                1 Spieler
              </button>
              <button className={'gsopt' + (s.players === 2 ? ' on' : '')} data-sbp="2" onClick={() => dispatch({ type: 'sbPlayers', n: 2 })}>
                2 Spieler
              </button>
            </div>
          </div>
          <div>
            <label className="gslab">Runden pro Spieler</label>
            <div className="gseg">
              {[3, 5, 10].map((r) => (
                <button key={r} className={'gsopt' + (s.rounds === r ? ' on' : '')} data-sbr={r} onClick={() => dispatch({ type: 'sbRounds', n: r })}>
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="gshint" style={{ marginTop: 14 }}>
          Nur die größten Hits — mehrere Kategorien wählbar.
        </p>
        <div className="startbar">
          <span className="hint" style={{ margin: 0 }}>
            {sg.length ? <GenreLabel arr={sg} /> : 'Wähl mind. eine Kategorie'}
          </span>
          <Btn data-sbstart disabled={!sg.length} onClick={() => dispatch({ type: 'sbStart' })}>
            Los geht{'’'}s →
          </Btn>
        </div>
      </div>
    </div>
  )
}

export function SingPlay({ S }: { S: State }) {
  const s = S.sb!
  const [on, setOn] = useState(false)
  const pn = (p: number) => S.names[p - 1] || 'P' + p
  if (s.loading)
    return (
      <div className="gs">
        <LoadingEq text="Songs werden geladen…" />
      </div>
    )
  if (s.err)
    return (
      <div className="gs">
        <div className="card" style={{ textAlign: 'center' }}>
          <Warn S={S} />
          <p className="lede" style={{ textAlign: 'center' }}>
            {s.err}
          </p>
          <Btn data-go="home" style={{ marginTop: 16 }} onClick={() => dispatch({ type: 'go', to: 'home' })}>
            ← Menü
          </Btn>
        </div>
      </div>
    )
  if (!s.seq || s.ridx! >= s.seq.length) {
    let body: React.ReactNode
    if (s.players === 2) {
      const w = s.scores![1] === s.scores![2] ? 0 : s.scores![1] > s.scores![2] ? 1 : 2
      body = (
        <>
          <div className="gswin">{w ? '🏆 ' + pn(w) + ' gewinnt!' : 'Unentschieden!'}</div>
          <div className="gsscores">
            <div>
              <span>{pn(1)}</span>
              <b>{s.scores![1]}</b>
            </div>
            <div>
              <span>{pn(2)}</span>
              <b>{s.scores![2]}</b>
            </div>
          </div>
        </>
      )
    } else
      body = (
        <>
          <div className="gswin">{s.scores![1]} Punkte</div>
          <p className="lede" style={{ textAlign: 'center' }}>
            {s.rounds} Runden · <GenreLabel arr={s.genres} />
          </p>
        </>
      )
    return (
      <div className="gs" style={{ textAlign: 'center' }}>
        <p className="eyebrow" style={{ textAlign: 'center' }}>
          — ergebnis
        </p>
        {body}
        <div className="result-actions">
          <Btn data-sbagain onClick={() => dispatch({ type: 'sbStart' })}>
            Nochmal
          </Btn>
          <button className="tool" data-go="home" onClick={() => dispatch({ type: 'go', to: 'home' })}>
            Menü
          </button>
        </div>
      </div>
    )
  }
  const q = s.seq[s.ridx!],
    total = s.seq.length
  const intro = () => {
    setOn(true)
    gPlayFrom(q.song.preview, 0, 7, () => {
      setOn(false)
      dispatch({ type: 'sbStage', stage: 1 })
    })
  }
  const resolve = () => {
    setOn(true)
    gPlayFrom(q.song.preview, 7, 8, () => {
      setOn(false)
      dispatch({ type: 'sbStage', stage: 2, onlyIfBelow: 2 })
    })
  }
  return (
    <div className="gs">
      <div className="gshead">
        <Backlink />
        <div className="gsmeta">
          <span>
            Runde {s.ridx! + 1} / {total}
          </span>
          {s.players === 2 ? <span className="gsturn">{pn(q.player)} ist dran</span> : null}
          <span>{s.players === 2 ? pn(1) + ' ' + s.scores![1] + ' · ' + pn(2) + ' ' + s.scores![2] : s.scores![1] + ' Pkt'}</span>
        </div>
      </div>
      <div className="gsmystery">
        {q.song.cover ? <img className="sbcover" src={q.song.cover} alt="" /> : null}
        <p className="sbtitle">{q.song.title}</p>
        <p className="sbartist">{q.song.artist}</p>
        {s.stage === 0 ? (
          <>
            <Btn className={'gsplaybtn' + (on ? ' on' : '')} id="gsBtnPlay" data-sbintro onClick={intro}>
              ▶ Anspielen
            </Btn>
            <p className="gshint">Hör rein — gleich musst du ab dem Stopp weitersingen.</p>
          </>
        ) : s.stage === 1 ? (
          <>
            <p className="sbprompt">🎤 Jetzt du — sing weiter!</p>
            <Btn className="gsplaybtn" data-sbresolve onClick={resolve}>
              ▶ Auflösung abspielen
            </Btn>
            <div style={{ marginTop: 12 }}>
              <button className="gsskip" data-sbintro onClick={intro}>
                ↺ nochmal anspielen
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="sbprompt">War{'’'}s on point?</p>
            <div className="sbrate">
              <button data-sbrate="0" onClick={() => dispatch({ type: 'sbRate', pts: 0 })}>
                😬 Verkackt · 0
              </button>
              <button data-sbrate="1" onClick={() => dispatch({ type: 'sbRate', pts: 1 })}>
                🙂 Okay · 1
              </button>
              <button className="r2" data-sbrate="2" onClick={() => dispatch({ type: 'sbRate', pts: 2 })}>
                🔥 On Point · 2
              </button>
            </div>
            <div style={{ marginTop: 12 }}>
              <button className="gsskip" data-sbresolve onClick={resolve}>
                ↺ Auflösung nochmal
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
