import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { dispatch, env, getState } from '../app/store'
import { N, parts, pcol, pname, pts, sdArt } from '../core/game'
import type { State } from '../core/types'
import * as audioSvc from '../services/audio'
import { pauseAudio, play, resumeAudio, stopAudio } from '../services/audio'
import { picBigOf, picOf } from '../services/catalog'
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

function Dots() {
  return (
    <span className="dots" aria-hidden>
      <i />
      <i />
      <i />
    </span>
  )
}

/**
 * Aufdecken: Spieler für Spieler. Der Spieler drückt am Handy Play, der Song läuft hier groß
 * (30 Sek oder bis die Vorschau endet, „Weiter“ am Handy geht früher). Danach der Versus-Screen.
 */
export function Listen({ S }: { S: State }) {
  const online = useOnline()
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
  const phone = online.has(p)
  const last = L.idx + 1 >= L.order.length

  // Abspielen und Anhalten folgen dem Spielstand (Play/Pause kommt vom Handy oder von hier)
  useEffect(() => {
    if (!L.shown || !so?.preview) return
    if (L.paused) {
      if (audioSvc.playing === key) pauseAudio()
      return
    }
    if (audioSvc.playing !== key && !resumeAudio(key)) play(so.preview, key, so.cover)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [L.shown, L.paused, key])

  // Zeit läuft nur beim Abspielen; nach 30 Sek oder am Ende der Vorschau ist der Nächste dran
  useEffect(() => {
    if (!L.shown) return
    let raf = 0
    let prev = performance.now()
    let elapsed = 0
    let started = false
    const limit = (so?.preview ? LISTEN_SECS : 8) * 1000
    const tick = (now: number) => {
      const dt = now - prev
      prev = now
      const paused = !!getState().listen?.paused
      if (!paused) elapsed += dt
      if (audioSvc.playing === key) started = true
      const f = Math.min(1, elapsed / limit)
      if (bar.current) bar.current.style.width = f * 100 + '%'
      if (tl.current) tl.current.textContent = Math.max(0, Math.ceil((limit - elapsed) / 1000)) + ' s'
      const ended = started && audioSvc.playing !== key && !paused
      if (elapsed >= limit || ended) {
        dispatch({ type: 'listenNext' })
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, L.shown])

  return (
    <div className="rv" style={{ ['--pc' as string]: pcol(S, p) }}>
      <p className="kicker rv-kicker">
        Runde {S.round} · {S.sd ? 'Sudden Death' : 'Platz #' + (S.duel + 1) + ' · ×' + pts(S, S.duel + 1)} · Song {L.idx + 1} von {L.order.length}
      </p>
      <div className="rv-main" key={key}>
        <motion.div
          className={'rv-disc' + (L.shown ? ' shown' : '')}
          initial={env.reduce ? false : { x: -160, opacity: 0, rotate: -60 }}
          animate={{ x: 0, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 80, damping: 16, delay: 0.15 }}
        >
          <Vinyl cover={L.shown ? cover : undefined} spinning={playing === key} color={pcol(S, p)} />
          {!L.shown ? <span className="rv-q">?</span> : null}
        </motion.div>
        <div className="rv-info">
          <motion.div className="rv-who" initial={env.reduce ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <AvImg S={S} p={p} className="rv-av" />
            <span>
              <small>{L.shown ? 'gewählt von' : 'deckt jetzt auf'}</small>
              <b>{pname(S, p)}</b>
            </span>
          </motion.div>
          <motion.div className="rv-artist" initial={env.reduce ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <ArtImg n={a} />
            <span>{a}</span>
          </motion.div>
          <AnimatePresence mode="wait" initial={false}>
            {L.shown ? (
              <motion.h2
                key="t"
                className="rv-title listen-song"
                initial={env.reduce ? false : { opacity: 0, y: 30, filter: 'blur(14px)', letterSpacing: '0.25em' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)', letterSpacing: '-0.01em' }}
                transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
              >
                {so?.title || 'Kein Song gewählt'}
              </motion.h2>
            ) : (
              <motion.h2 key="h" className="rv-title hidden" exit={env.reduce ? undefined : { opacity: 0, filter: 'blur(12px)' }}>
                Noch geheim
              </motion.h2>
            )}
          </AnimatePresence>
          {L.shown ? (
            <>
              <div className="listen-bar">
                <i ref={bar} />
              </div>
              <div className="listen-time">
                <span>{so?.preview ? (L.paused ? '⏸ angehalten' : '30-Sek-Vorschau') : 'keine Vorschau'}</span>
                <span ref={tl} />
              </div>
            </>
          ) : (
            <p className="rv-wait">
              {phone ? (
                <>
                  📱 {pname(S, p)} drückt Play am Handy <Dots />
                </>
              ) : (
                'Handy nicht verbunden – hier aufdecken'
              )}
            </p>
          )}
          <div className="rv-ctrl">
            <button className={'lnk' + (L.shown && !L.paused ? ' on' : '')} id="listenPlay" onClick={() => dispatch({ type: 'listenPlay' })}>
              {!L.shown ? '▶ Aufdecken' : L.paused ? '▶ Weiter abspielen' : '⏸ Pause'}
            </button>
            {L.shown ? (
              <Btn className="sm" id="listenNext" onClick={() => dispatch({ type: 'listenNext' })}>
                {last ? 'Zum Versus →' : 'Nächster Spieler ⏭'}
              </Btn>
            ) : null}
          </div>
        </div>
      </div>
      <div className="queue">
        {L.order.map((q, k) => {
          const qso = (S.songs[q] || [])[i]
          const done = k < L.idx
          return (
            <div key={q} className={'qitem' + (k === L.idx ? ' now' : done ? ' done' : '')} style={{ ['--pc' as string]: pcol(S, q) }}>
              {qso?.cover && (done || (k === L.idx && L.shown)) ? <img src={qso.cover} alt="" /> : <AvImg S={S} p={q} />}
              <span>
                <b>{pname(S, q)}</b>
                <small>{done ? qso?.title || '✓ gehört' : k === L.idx ? (L.shown ? '▶ läuft' : 'deckt auf') : 'gleich'}</small>
              </span>
            </div>
          )
        })}
      </div>
      <QrCorner />
    </div>
  )
}
