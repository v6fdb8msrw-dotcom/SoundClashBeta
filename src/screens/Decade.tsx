import { motion } from 'motion/react'
import { dispatch, env } from '../app/store'
import { DEC, decLabel, decadeOf } from '../core/constants'
import { pcol } from '../core/game'
import type { State } from '../core/types'
import { play } from '../services/audio'
import { GEN } from '../services/catalog'
import { burstAt } from '../ui/Fx'
import { Btn, Eq, Presence, useAudio } from '../ui/primitives'
import { Backlink, Chips, GenreLabel, LoadingEq } from './common'

/** Jahrzehnt-Duell (ddPlay im Original; ddSetup ist im Original nicht erreichbar). */

const ddTeam = (i: number) => 'Team ' + (i + 1)

function DecadeSetup({ S }: { S: State }) {
  const t = S.dd || { genres: [], target: 7 }
  const tg = t.genres || []
  return (
    <div className="gs">
      <Backlink />
      <p className="eyebrow">— decade duel</p>
      <h2 className="display" style={{ fontSize: 'clamp(32px,6vw,60px)' }}>
        Decade <em>Duel</em>
      </h2>
      <p className="lede">
        Zwei Teams, abwechselnd. Ein Song läuft — dein Team rät das <b>Jahrzehnt</b>. Richtig = Punkt. Daneben = das andere Team darf klauen. Wer zuerst {t.target || 7} Punkte hat, gewinnt.
      </p>
      <div className="gscard">
        <label className="gslab">Kategorien (mehrere wählbar — Jahrzehnte geben die beste Streuung)</label>
        <Chips keys={Object.keys(GEN).filter((k) => GEN[k].type !== 'film')} on={tg} attr="data-ddg" onToggle={(k) => dispatch({ type: 'ddGenre', k })} />
        <div className="gsrow" style={{ marginTop: 16 }}>
          <div>
            <label className="gslab">Punkte zum Sieg</label>
            <div className="gseg">
              {[5, 7, 10].map((n) => (
                <button key={n} className={'gsopt' + ((t.target || 7) === n ? ' on' : '')} data-ddt={n} onClick={() => dispatch({ type: 'ddTarget', n })}>
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="startbar">
          <span className="hint" style={{ margin: 0 }}>
            {tg.length ? <GenreLabel arr={tg} /> : 'Wähl mind. eine Kategorie'}
          </span>
          <Btn data-ddstart disabled={!tg.length} onClick={() => dispatch({ type: 'ddStart' })}>
            Los geht{'’'}s →
          </Btn>
        </div>
      </div>
    </div>
  )
}

export function Decade({ S }: { S: State }) {
  const { playing } = useAudio()
  if (S.screen === 'ddsetup') return <DecadeSetup S={S} />
  const t = S.dd!
  if (t.loading)
    return (
      <div className="gs">
        <Backlink />
        <LoadingEq text="Songs & Jahre werden geladen…" />
      </div>
    )
  if (t.err)
    return (
      <div className="gs">
        <Backlink />
        <p className="lede" style={{ marginTop: 30 }}>
          {t.err}
        </p>
        <Btn data-go="home" style={{ marginTop: 12 }} onClick={() => dispatch({ type: 'go', to: 'home' })}>
          ← Menü
        </Btn>
      </div>
    )
  if (t.stage === 'win')
    return (
      <div className="gs">
        <Backlink />
        <p className="eyebrow">— decade duel</p>
        <h2 className="display" style={{ fontSize: 'clamp(34px,7vw,64px)' }}>
          <span style={{ color: pcol(S, t.winner! + 1) }}>{ddTeam(t.winner!)}</span> <em>gewinnt!</em>
        </h2>
        <p className="lede">
          {t.scores![0]} : {t.scores![1]} 🏆
        </p>
        <div className="startbar">
          <Btn data-ddagain onClick={() => dispatch({ type: 'ddStart' })}>
            Nochmal
          </Btn>
          <button className="tool" data-go="home" onClick={() => dispatch({ type: 'go', to: 'home' })}>
            Menü
          </button>
        </div>
      </div>
    )
  const c = t.current!,
    active = t.stage === 'steal' ? 1 - t.turn! : t.turn!
  const scoreCard = (i: number) => (
    <div className={'ddteam' + (active === i ? ' on' : '')} style={{ ['--pc' as string]: pcol(S, i + 1) }}>
      <span className="ddt-n">{ddTeam(i)}</span>
      <motion.span className="ddt-s" key={t.scores![i]} initial={env.reduce ? false : { scale: 1.8 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 14 }}>
        {t.scores![i]}
      </motion.span>
    </div>
  )
  let panel: React.ReactNode
  if (t.stage === 'reveal') {
    const wonPt = (t.pick != null && decadeOf(c.year!) === t.pick) || (t.stealPick != null && decadeOf(c.year!) === t.stealPick)
    const who = t.pick != null && decadeOf(c.year!) === t.pick ? t.turn! : t.stealPick != null && decadeOf(c.year!) === t.stealPick ? 1 - t.turn! : -1
    panel = (
      <motion.div key="rev" className={'tlreveal ' + (wonPt ? 'good' : 'bad')} initial={env.reduce ? false : { rotateX: 70, opacity: 0 }} animate={{ rotateX: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 18 }}>
        <div className="tlrcard">
          {c.cover ? <img src={c.cover} alt="" /> : <span className="cph">♪</span>}
          <div className="tlryear">{c.year}</div>
        </div>
        <div className="tlrinfo">
          <span className="tlrt">{c.title}</span>
          <span className="tlra">{c.artist}</span>
        </div>
        <span className="tlrtag">{who >= 0 ? '✓ ' + ddTeam(who) + ' schnappt sich den Punkt! (' + decLabel(decadeOf(c.year!)) + ')' : '✗ Beide daneben — war ' + decLabel(decadeOf(c.year!))}</span>
        <Btn data-ddnext onClick={() => dispatch({ type: 'ddNext' })}>
          {Math.max(t.scores![0], t.scores![1]) >= t.target ? '🏆 Sieger' : 'Nächste Runde →'}
        </Btn>
      </motion.div>
    )
  } else {
    panel = (
      <motion.div key={'ask' + t.stage} className="tlmystery" initial={env.reduce ? false : { y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <div className="tlrcard" style={{ margin: '0 auto' }}>
          <span className="cph">♪</span>
        </div>
        <Btn className={'tlplaybtn' + (playing === 'ddq' ? ' on' : '')} data-ddplaybtn onClick={() => play(c.preview, 'ddq', c.cover)}>
          {playing === 'ddq' ? '⏸ Pause' : '▶ 30-Sek-Vorschau'}
          <Eq on={playing === 'ddq'} />
        </Btn>
        <p className="tlhelp" style={{ color: pcol(S, active + 1) }}>
          <b>{ddTeam(active)}</b>
          {t.stage === 'steal' ? ' klaut' : ''} — aus welchem Jahrzehnt ist der Song?
        </p>
        <div className="dddecs">
          {DEC.map((d) => (
            <motion.button key={d} className="dddec" data-dddec={d} whileTap={env.reduce ? undefined : { scale: 0.9 }} onClick={(e) => (burstAt(e.currentTarget, pcol(S, active + 1), 12, 0.6), dispatch({ type: 'ddGuess', d }))}>
              {decLabel(d)}
            </motion.button>
          ))}
        </div>
      </motion.div>
    )
  }
  return (
    <div className="gs tl">
      <Backlink />
      <div className="ddteams">
        {scoreCard(0)}
        <span className="ddvs">
          {t.scores![0]}:{t.scores![1]}
        </span>
        {scoreCard(1)}
      </div>
      <p className="hint" style={{ textAlign: 'center', margin: '0 0 6px' }}>
        Ziel: {t.target} Punkte
      </p>
      <Presence mode="wait">
        {panel}
      </Presence>
    </div>
  )
}
