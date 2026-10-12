import { motion } from 'motion/react'
import { dispatch, env } from '../app/store'
import type { PoolSong, State } from '../core/types'
import { play } from '../services/audio'
import { GEN } from '../services/catalog'
import { burstAt } from '../ui/Fx'
import { AvImg, Btn, Eq, Presence, useAudio } from '../ui/primitives'
import { Backlink, Chips, GenreLabel, LoadingEq } from './common'
import { pcol, pname } from '../core/game'

/** Timeline Masters (tlSetup / tlPlay / tlResult im Original). */

function TlCard({ c, i, pc, onPlay, hot }: { c: PoolSong; i: number; pc: string; onPlay: () => void; hot?: boolean }) {
  return (
    <motion.button
      layout={!env.reduce}
      className={'tlcard' + (hot ? ' hot' : '')}
      data-tlcard={i}
      style={{ ['--pc' as string]: pc }}
      onClick={onPlay}
      initial={env.reduce ? false : { scale: 0.6, opacity: 0, y: -30 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
    >
      <div className="tlcyear">{c.year}</div>
      {c.cover ? <img src={c.cover} alt="" /> : <span className="cph">♪</span>}
      <div className="tlct">{c.title}</div>
    </motion.button>
  )
}

export function TimelineSetup({ S }: { S: State }) {
  const t = S.tl || { genres: [], players: 2, target: 10 }
  const tg = t.genres || []
  const variant = t.variant || 'timeline'
  let desc: React.ReactNode, opts: React.ReactNode, hint: string
  if (variant === 'decade') {
    desc = (
      <p className="lede">
        Zwei Teams, abwechselnd. Ein Song läuft — dein Team rät das <b>Jahrzehnt</b>. Richtig = Punkt, daneben darf das andere Team klauen. Wer zuerst {t.ddTarget || 7} Punkte hat, gewinnt.
      </p>
    )
    opts = (
      <div className="gsrow" style={{ marginTop: 16 }}>
        <div>
          <label className="gslab">Punkte zum Sieg · 2 Teams</label>
          <div className="gseg">
            {[5, 7, 10].map((n) => (
              <button key={n} className={'gsopt' + ((t.ddTarget || 7) === n ? ' on' : '')} data-tldd={n} onClick={() => dispatch({ type: 'tlDdTarget', n })}>
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
    hint = 'Zwei Teams treten gegeneinander an. Die Songs kommen aus deinen Kategorien — mit echtem Original-Jahr.'
  } else {
    desc = <p className="lede">Erkenne den Song an der 30-Sek-Vorschau und sortiere ihn ins richtige Jahr ein. Wer zuerst {t.target || 10} Karten korrekt platziert, gewinnt.</p>
    opts = (
      <div className="gsrow" style={{ marginTop: 16 }}>
        <div>
          <label className="gslab">Spieler</label>
          <div className="gseg">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <button key={n} className={'gsopt' + ((t.players || 2) === n ? ' on' : '')} data-tlp={n} onClick={() => dispatch({ type: 'tlPlayers', n })}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="gslab">Karten zum Sieg</label>
          <div className="gseg">
            {[5, 10, 15].map((r) => (
              <button key={r} className={'gsopt' + ((t.target || 10) === r ? ' on' : '')} data-tlt={r} onClick={() => dispatch({ type: 'tlTarget', n: r })}>
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
    hint = 'Jeder startet mit einer gratis Anker-Karte. Tippe eine platzierte Karte, um ihre Vorschau nochmal zu hören.'
  }
  return (
    <div className="gs">
      <Backlink />
      <p className="eyebrow">— timeline masters</p>
      <h2 className="display" style={{ fontSize: 'clamp(32px,6vw,60px)' }}>
        Timeline <em>Masters</em>
      </h2>
      {desc}
      <div className="gscard">
        <label className="gslab">Kategorien (mehrere wählbar)</label>
        <Chips keys={Object.keys(GEN)} on={tg} attr="data-tlg" onToggle={(k) => dispatch({ type: 'tlGenre', k })} />
        <div className="gsrow" style={{ marginTop: 16 }}>
          <div>
            <label className="gslab">Spielart</label>
            <div className="gseg">
              <button className={'gsopt' + (variant === 'timeline' ? ' on' : '')} data-tlvar="timeline" onClick={() => dispatch({ type: 'tlVariant', v: 'timeline' })}>
                Einsortieren
              </button>
              <button className={'gsopt' + (variant === 'decade' ? ' on' : '')} data-tlvar="decade" onClick={() => dispatch({ type: 'tlVariant', v: 'decade' })}>
                Jahrzehnt-Duell
              </button>
            </div>
          </div>
        </div>
        {opts}
        <p className="gshint" style={{ marginTop: 14 }}>
          {hint}
        </p>
        <div className="startbar">
          <span className="hint" style={{ margin: 0 }}>
            {tg.length ? <GenreLabel arr={tg} /> : 'Wähl mind. eine Kategorie'}
          </span>
          <Btn data-tlstart className={tg.length ? 'ready' : ''} disabled={!tg.length} onClick={() => dispatch({ type: 'tlStart' })}>
            Los geht{'’'}s →
          </Btn>
        </div>
      </div>
    </div>
  )
}

function Result({ S }: { S: State }) {
  const t = S.tl!,
    w = t.winner!,
    pc = pcol(S, w + 1)
  return (
    <div className="gs">
      <Backlink />
      <p className="eyebrow">— timeline masters</p>
      <h2 className="display" style={{ fontSize: 'clamp(34px,7vw,64px)' }}>
        <span style={{ color: pc }}>{pname(S, w + 1)}</span> <em>gewinnt!</em>
      </h2>
      <p className="lede">{t.timelines![w].length} Karten korrekt in die Zeitachse einsortiert. 🏆</p>
      <div className="tlfield">
        <div className="tlline">
          {t.timelines![w].map((c, i) => (
            <TlCard key={i} c={c} i={i} pc={pc} onPlay={() => play(c.preview, 'tlc' + i, c.cover)} />
          ))}
        </div>
      </div>
      <div className="startbar">
        <Btn data-tlagain onClick={() => dispatch({ type: 'tlStart' })}>
          Nochmal
        </Btn>
        <button className="tool" data-go="home" onClick={() => dispatch({ type: 'go', to: 'home' })}>
          Menü
        </button>
      </div>
    </div>
  )
}

export function TimelinePlay({ S }: { S: State }) {
  const { playing } = useAudio()
  const t = S.tl!
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
  if (t.stage === 'win') return <Result S={S} />
  const p = t.turn!,
    line = t.timelines![p],
    card = t.current!,
    pc = pcol(S, p + 1)
  const others = t.timelines!.map((tl, i) => ({ tl, i })).filter((o) => o.i !== p)
  const listen = t.stage === 'listen'
  const gap = (g: number) => (
    <button
      key={'g' + g}
      className={'tlgap' + (listen ? ' active' : '')}
      data-tlgap={g}
      disabled={!listen}
      onClick={(e) => {
        burstAt(e.currentTarget, pc, 14, 0.6)
        dispatch({ type: 'tlPlace', g })
      }}
      aria-label={'Lücke ' + g}
    >
      <span>+</span>
    </button>
  )
  const items: React.ReactNode[] = [gap(0)]
  line.forEach((c, i) => {
    items.push(<TlCard key={'c' + c.title + c.year} c={c} i={i} pc={pc} hot={!!t.result && t.result.ok && t.result.g === i} onPlay={() => play(c.preview, 'tlc' + i, c.cover)} />)
    items.push(gap(i + 1))
  })
  const revealCard = (showYear: boolean) => (
    <>
      <div className="tlrcard">
        {card.cover ? <img src={card.cover} alt="" /> : <span className="cph">♪</span>}
        <div className="tlryear">{showYear ? card.year : '?'}</div>
      </div>
      <div className="tlrinfo">
        <span className="tlrt">{card.title}</span>
        <span className="tlra">
          {card.artist}
          {showYear ? ' · ' + card.year : ''}
        </span>
      </div>
    </>
  )
  return (
    <div className="gs tl">
      <Backlink />
      {others.length ? (
        <div className="tlothers">
          {others.map((o) => {
            const opc = pcol(S, o.i + 1)
            return (
              <div className="tlmini" key={o.i} style={{ ['--pc' as string]: opc }}>
                <div className="tlmini-h">
                  <AvImg S={S} p={o.i + 1} className="tlmini-av" />
                  <span className="tlmini-n">{pname(S, o.i + 1)}</span>
                  <span className="tlmini-ct">
                    {o.tl.length}/{t.target}
                  </span>
                </div>
                <div className="tlmini-line">
                  {o.tl.length ? (
                    o.tl.map((c, j) => (
                      <span className="tlmc" key={j} style={{ ['--pc' as string]: opc }}>
                        {c.year}
                      </span>
                    ))
                  ) : (
                    <span className="tlmc empty">–</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : null}
      <div className="tlactive" style={{ ['--pc' as string]: pc }}>
        <div className="tlact-head">
          <AvImg S={S} p={p + 1} className="tlact-av" />
          <span className="tlturn">
            <span style={{ color: pc }}>{pname(S, p + 1)}</span> ist dran · {line.length}/{t.target} Karten
          </span>
        </div>
        <div className={'tlfield' + (t.rotating ? ' rot' : '')}>
          <div className="tlline">{items}</div>
        </div>
      </div>
      <Presence mode="wait">
        {listen ? (
          <motion.div key="listen" className="tlreveal mystery" initial={env.reduce ? false : { y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={env.reduce ? undefined : { y: -10, opacity: 0, transition: { duration: 0.12 } }}>
            {revealCard(false)}
            <Btn className={'tlplaybtn' + (playing === 'tlq' ? ' on' : '')} data-tlplay onClick={() => play(card.preview, 'tlq', card.cover)}>
              {playing === 'tlq' ? '⏸ Pause' : '▶ 30-Sek-Vorschau'}
              <Eq on={playing === 'tlq'} />
            </Btn>
            <p className="tlhelp">
              Tippe die Lücke <b>(+)</b>, in welches Jahr der Song gehört.
            </p>
          </motion.div>
        ) : (
          <motion.div key="reveal" className={'tlreveal ' + (t.result!.ok ? 'good' : 'bad')} initial={env.reduce ? false : { rotateX: 70, opacity: 0 }} animate={{ rotateX: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 18 }}>
            {revealCard(true)}
            <span className="tlrtag">{t.result!.ok ? '✓ Richtig einsortiert!' : '✗ Daneben — fliegt raus'}</span>
            <Btn data-tlnext onClick={() => dispatch({ type: 'tlNext' })}>
              {t.result!.ok && line.length >= t.target ? '🏆 Sieg ansehen' : 'Nächster Spieler →'}
            </Btn>
          </motion.div>
        )}
      </Presence>
    </div>
  )
}
