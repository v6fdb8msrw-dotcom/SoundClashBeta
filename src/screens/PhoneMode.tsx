import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { dispatch, env } from '../app/store'
import { N, parts, pcol, pname, pts, sdArt } from '../core/game'
import type { State } from '../core/types'
import * as audioSvc from '../services/audio'
import { play, stopAudio } from '../services/audio'
import { picBigOf, picOf } from '../services/catalog'
import { spot, yt } from '../services/deezer'
import { CoverViz } from '../ui/CoverViz'
import { useHost } from '../ui/PairDialog'
import { QrCorner } from '../ui/PairPanel'
import { ArtImg, AvImg, Btn, useAudio } from '../ui/primitives'
import { Vinyl } from '../ui/Vinyl'
import { Tracks } from './Tracks'

/**
 * Handy-Modus am Hauptgerät: Spieler wählen gleichzeitig am Handy, hier sieht man nur den Stand.
 * Danach laufen die Songs nacheinander groß auf diesem Gerät (je 30 Sek), abgestimmt wird am Handy.
 */

export function useOnline() {
  const info = useHost()
  return new Set(info.phones.map((p) => p.role).filter((r): r is number => typeof r === 'number'))
}

const artistOf = (S: State, p: number, i: number) => (S.sd ? sdArt(S, p) : (S.lineup[p] || [])[i]) || ''

/** Songwahl „Vor jedem Duell“: Kacheln pro Spieler, Song bleibt bis zum Abspielen geheim. */
export function PhonePick({ S }: { S: State }) {
  const online = useOnline()
  const [manual, setManual] = useState<number | null>(null)
  const i = S.duel
  const ps = parts(S)
  const pt = S.sd ? 1 : pts(S, i + 1)
  const readyN = ps.filter((p) => S.ready[p]).length
  return (
    <>
      <div className="cine-head">
        <p className="kicker">
          Runde {S.round} · {S.sd ? 'Sudden Death' : 'Platz #' + (i + 1) + ' · ×' + pt}
        </p>
        <h2 className="cine-title">Songwahl</h2>
        <p className="cine-sub">
          Alle wählen gleichzeitig am Handy · {readyN} von {ps.length} bereit
        </p>
      </div>
      <div className="ptiles">
        {ps.map((p, k) => {
          const a = artistOf(S, p, i)
          const ready = !!S.ready[p]
          return (
            <motion.div
              key={p}
              className={'ptile' + (ready ? ' ready' : '')}
              style={{ ['--pc' as string]: pcol(S, p) }}
              initial={env.reduce ? false : { opacity: 0, y: 30, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: ready ? 1.03 : 1 }}
              transition={{ type: 'spring', stiffness: 220, damping: 20, delay: k * 0.06 }}
              data-ptile={p}
            >
              <span className={'ptile-phone' + (online.has(p) ? ' on' : '')}>{online.has(p) ? '📱 verbunden' : '📱 –'}</span>
              <AvImg S={S} p={p} className="ptile-av" />
              <div className="ptile-name">{pname(S, p)}</div>
              <div className="ptile-art">
                <ArtImg n={a} />
                {a}
              </div>
              <div className="ptile-state">
                {ready ? (
                  '✓ bereit'
                ) : (
                  <>
                    wählt
                    <span className="dots" aria-hidden>
                      <i />
                      <i />
                      <i />
                    </span>
                  </>
                )}
              </div>
              {!ready ? (
                <div>
                  <button className="ptile-manual" data-manual={p} onClick={() => setManual(manual === p ? null : p)}>
                    {manual === p ? 'schließen' : 'am Hauptgerät wählen'}
                  </button>
                </div>
              ) : null}
            </motion.div>
          )
        })}
      </div>
      <AnimatePresence>
        {manual && ps.includes(manual) && !S.ready[manual] ? (
          <motion.div key={manual} className="manual-pick pcol" style={{ ['--pc' as string]: pcol(S, manual) }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="ph">
              <AvImg S={S} p={manual} />
              <span className="nm">
                {pname(S, manual)} · {artistOf(S, manual, i)}
              </span>
            </div>
            <Tracks S={S} p={manual} i={i} artist={artistOf(S, manual, i)} />
            <div className="row" style={{ marginTop: 14 }}>
              <Btn onClick={() => (stopAudio(), dispatch({ type: 'phoneReady', p: manual }), setManual(null))}>
                {(S.songs[manual] || [])[i] ? '„' + (S.songs[manual] || [])[i]!.title + '“ übernehmen →' : 'Ohne Song weiter'}
              </Btn>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <div className="row" style={{ marginTop: 22 }}>
        <button className="btn ghost sm" id="forceReady" onClick={() => ps.forEach((p) => !S.ready[p] && dispatch({ type: 'phoneReady', p }))}>
          Nicht warten – mit den gewählten Songs weiter
        </button>
      </div>
      <QrCorner />
    </>
  )
}

/** „Alle vorab“ im Handy-Modus: jeder wählt alle seine Songs am Handy. */
export function PhoneSongs({ S }: { S: State }) {
  const online = useOnline()
  const [manual, setManual] = useState<number | null>(null)
  const ps = parts(S)
  const n = S.sd ? 1 : N(S)
  return (
    <>
      <div className="cine-head">
        <p className="kicker">Runde {S.round} · {S.sd ? 'Sudden Death' : 'alle Songs vorab'}</p>
        <h2 className="cine-title">Songwahl</h2>
        <p className="cine-sub">Jeder wählt am eigenen Handy · danach geht’s direkt ins Battle</p>
      </div>
      <div className="ptiles">
        {ps.map((p) => {
          const done = Array.from({ length: n }, (_, i) => !!(S.songs[p] || [])[i]).filter(Boolean).length
          const ready = !!S.ready[p]
          return (
            <div key={p} className={'ptile' + (ready ? ' ready' : '')} style={{ ['--pc' as string]: pcol(S, p) }} data-ptile={p}>
              <span className={'ptile-phone' + (online.has(p) ? ' on' : '')}>{online.has(p) ? '📱 verbunden' : '📱 –'}</span>
              <AvImg S={S} p={p} className="ptile-av" />
              <div className="ptile-name">{pname(S, p)}</div>
              <div className="ptile-art">
                {done} von {n} Songs gewählt
              </div>
              <div className="ptile-progress">
                <i style={{ width: (done / n) * 100 + '%' }} />
              </div>
              <div className="ptile-state">{ready ? '✓ fertig' : 'wählt …'}</div>
              {!ready ? (
                <div>
                  <button className="ptile-manual" onClick={() => setManual(manual === p ? null : p)}>
                    {manual === p ? 'schließen' : 'am Hauptgerät wählen'}
                  </button>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
      {manual && !S.ready[manual] ? (
        <div className="manual-pick pcol" style={{ ['--pc' as string]: pcol(S, manual) }}>
          {Array.from({ length: n }, (_, i) => {
            const a = artistOf(S, manual, i)
            if (!a) return null
            const ch = (S.songs[manual] || [])[i]
            return (
              <div className="acard" key={i}>
                <div className="ah">
                  <ArtImg n={a} />
                  <span className="badge">{S.sd ? 'SD' : '#' + (i + 1)}</span>
                  <span className="an">{a}</span>
                </div>
                {ch ? (
                  <div className="chosen">
                    <span className="meta">
                      <span className="tt">{ch.title}</span>
                    </span>
                    <button className="iconbtn" onClick={() => dispatch({ type: 'clearSong', p: manual, i })}>
                      ↻
                    </button>
                  </div>
                ) : (
                  <Tracks S={S} p={manual} i={i} artist={a} />
                )}
              </div>
            )
          })}
          <div className="row">
            <Btn onClick={() => (dispatch({ type: 'phoneReady', p: manual }), setManual(null))}>{pname(S, manual)} ist fertig →</Btn>
          </div>
        </div>
      ) : null}
      <div className="row" style={{ marginTop: 22 }}>
        <Btn id="toBattle" className="ghost" onClick={() => dispatch({ type: 'toBattle' })}>
          Nicht warten – zum Battle →
        </Btn>
      </div>
      <QrCorner />
    </>
  )
}

const LISTEN_SECS = 30
const INTRO_MS = 6000

/** Abspielen: ein Song nach dem anderen, groß auf dem Hauptgerät. Abgestimmt wird am Handy. */
export function Listen({ S }: { S: State }) {
  const { playing } = useAudio()
  const L = S.listen!
  const p = L.order[L.idx]
  const i = S.sd ? 0 : S.duel
  const a = artistOf(S, p, S.duel)
  const so = (S.songs[p] || [])[i] || null
  const key = 'l' + p + '_' + i
  const cover = so?.cover || picBigOf(a) || picOf(a) || ''
  const bar = useRef<HTMLElement>(null)
  const tl = useRef<HTMLSpanElement>(null)
  const [paused, setPaused] = useState(false)
  // Erst „Alle haben gewählt“ mit allen Songs, dann geht es mit dem ersten Song los
  const [intro, setIntro] = useState(L.idx === 0)
  const votes = Object.values(S.tally || {}).reduce((x, y) => x + y, 0)
  useEffect(() => {
    if (!intro) return
    const t = setTimeout(() => setIntro(false), INTRO_MS)
    return () => clearTimeout(t)
  }, [intro])

  // Automatisch abspielen; nach 30 Sek (oder wenn die Vorschau endet) weiter zum nächsten Song
  const pausedRef = useRef(false)
  pausedRef.current = paused
  useEffect(() => {
    if (intro) return
    setPaused(false)
    const startAt = performance.now() + 900
    const t0 = setTimeout(() => {
      if (so?.preview) play(so.preview, key, so.cover)
    }, 900)
    let raf = 0
    let last = performance.now()
    let elapsed = 0
    let started = false
    const limit = (so?.preview ? LISTEN_SECS : 6) * 1000
    const tick = (now: number) => {
      const dt = now - last
      last = now
      if (!pausedRef.current && now >= startAt) elapsed += dt
      if (audioSvc.playing === key) started = true
      const f = Math.min(1, elapsed / limit)
      if (bar.current) bar.current.style.width = f * 100 + '%'
      if (tl.current) tl.current.textContent = Math.max(0, Math.ceil((limit - elapsed) / 1000)) + ' s'
      const ended = started && audioSvc.playing !== key && !pausedRef.current
      if (elapsed >= limit || ended) {
        dispatch({ type: 'listenNext' })
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      clearTimeout(t0)
      cancelAnimationFrame(raf)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, intro])

  if (intro) return <ListenIntro S={S} onGo={() => setIntro(false)} />

  return (
    <div className="listen-wrap" style={{ ['--pc' as string]: pcol(S, p) }}>
      <div className="cine-head" style={{ marginBottom: 10 }}>
        <p className="kicker">
          Runde {S.round} · {S.sd ? 'Sudden Death' : 'Platz #' + (S.duel + 1) + ' · ×' + pts(S, S.duel + 1)} · Song {L.idx + 1} von {L.order.length}
        </p>
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={key}
          className="listen"
          initial={env.reduce ? false : { opacity: 0, x: 80, filter: 'blur(10px)' }}
          animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
          exit={env.reduce ? undefined : { opacity: 0, x: -80, filter: 'blur(10px)' }}
          transition={{ type: 'spring', stiffness: 160, damping: 22 }}
        >
          <div className="listen-stage">
            {so?.cover ? <motion.img className="listen-sleeve" src={so.cover} alt="" initial={env.reduce ? false : { x: 0, rotate: 0 }} animate={{ x: -40, rotate: -6 }} transition={{ delay: 0.3, type: 'spring', stiffness: 90, damping: 16 }} /> : null}
            <motion.div initial={env.reduce ? false : { x: -60 }} animate={{ x: 30 }} transition={{ delay: 0.25, type: 'spring', stiffness: 80, damping: 16 }} style={{ position: 'relative' }}>
              <Vinyl cover={cover} spinning={playing === key} color={pcol(S, p)} />
              <CoverViz on={playing === key} color={pcol(S, p)} />
            </motion.div>
          </div>
          <div className="listen-info">
            <div className="who">
              <AvImg S={S} p={p} />
              <span>
                <small>gewählt von</small>
                <b>{pname(S, p)}</b>
              </span>
            </div>
            <h2 className="listen-song">{so?.title || 'Kein Song gewählt'}</h2>
            <p className="listen-artist">{a}</p>
            <div className="listen-bar">
              <i ref={bar} />
            </div>
            <div className="listen-time">
              <span>{so?.preview ? '30-Sek-Vorschau' : 'keine Vorschau – Spotify/YouTube'}</span>
              <span ref={tl} />
            </div>
            <div className="listen-actions">
              {so?.preview ? (
                <button
                  className="lnk"
                  onClick={() => {
                    if (playing === key) {
                      stopAudio()
                      setPaused(true)
                    } else {
                      play(so.preview, key, so.cover)
                      setPaused(false)
                    }
                  }}
                >
                  {playing === key ? '⏸ Pause' : '▶ Abspielen'}
                </button>
              ) : null}
              <a className="lnk" href={spot(a, so?.title || '')} target="_blank" rel="noopener">
                ↗ Spotify
              </a>
              <a className="lnk" href={yt(a, so?.title || '')} target="_blank" rel="noopener">
                ↗ YouTube
              </a>
              <Btn className="sm" id="listenNext" onClick={() => dispatch({ type: 'listenNext' })}>
                {L.idx + 1 < L.order.length ? 'Nächster Song ⏭' : 'Zur Entscheidung →'}
              </Btn>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
      <div className="queue">
        {L.order.map((q, k) => {
          const qso = (S.songs[q] || [])[i]
          return (
            <div key={q} className={'qitem' + (k === L.idx ? ' now' : k < L.idx ? ' done' : '')} style={{ ['--pc' as string]: pcol(S, q) }}>
              {qso?.cover && k <= L.idx ? <img src={qso.cover} alt="" /> : <AvImg S={S} p={q} />}
              <span>
                <b>{pname(S, q)}</b>
                <small>{k < L.idx ? '✓ gehört' : k === L.idx ? '▶ läuft' : 'gleich'}</small>
              </span>
            </div>
          )
        })}
        {S.audience ? <span className="pill">🗳 {votes} {votes === 1 ? 'Stimme' : 'Stimmen'}</span> : null}
      </div>
      <QrCorner />
    </div>
  )
}

/** „Alle haben gewählt“: alle Songs des Duells auf einen Blick, danach laufen sie nacheinander. */
function ListenIntro({ S, onGo }: { S: State; onGo: () => void }) {
  const L = S.listen!
  const i = S.sd ? 0 : S.duel
  return (
    <div className="listen-intro">
      <div className="cine-head">
        <p className="kicker">
          Runde {S.round} · {S.sd ? 'Sudden Death' : 'Platz #' + (S.duel + 1) + ' · ×' + pts(S, S.duel + 1)}
        </p>
        <motion.h2 className="cine-title" initial={env.reduce ? false : { opacity: 0, scale: 0.9, letterSpacing: '0.2em' }} animate={{ opacity: 1, scale: 1, letterSpacing: '0em' }} transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}>
          Alle haben gewählt
        </motion.h2>
        <p className="cine-sub">Gleich laufen die Songs nacheinander · je 30 Sekunden · abstimmen am Handy</p>
      </div>
      <div className="intro-grid">
        {L.order.map((q, k) => {
          const a = artistOf(S, q, S.duel)
          const so = (S.songs[q] || [])[i]
          const cover = so?.cover || picBigOf(a) || picOf(a) || ''
          return (
            <motion.div
              key={q}
              className="intro-card"
              style={{ ['--pc' as string]: pcol(S, q) }}
              data-intro={q}
              initial={env.reduce ? false : { opacity: 0, y: 60, rotateX: -35 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ type: 'spring', stiffness: 140, damping: 18, delay: 0.35 + k * 0.18 }}
            >
              <span className="intro-n">{k + 1}</span>
              <div className="intro-disc">
                <Vinyl cover={cover} spinning={false} color={pcol(S, q)} />
              </div>
              <div className="intro-who">
                <AvImg S={S} p={q} />
                <span>
                  <small>gewählt von</small>
                  <b>{pname(S, q)}</b>
                </span>
              </div>
              <div className="intro-title">{so?.title || 'Kein Song gewählt'}</div>
              <div className="intro-artist">{a}</div>
            </motion.div>
          )
        })}
      </div>
      <div className="intro-go">
        <div className="intro-bar">
          <i style={{ animationDuration: INTRO_MS + 'ms' }} />
        </div>
        <Btn id="listenStart" onClick={onGo}>
          Los geht’s ▶
        </Btn>
      </div>
      <QrCorner />
    </div>
  )
}
