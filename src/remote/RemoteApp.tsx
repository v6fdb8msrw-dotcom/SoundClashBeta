import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { mmss } from '../core/game'
import type { Track } from '../core/types'
import { play, stopAudio } from '../services/audio'
import { MQ, TQ, loadTopsFor, onSongQuery, trackList } from '../services/deezer'
import { picOf } from '../services/catalog'
import { Eq, useAudio, useDeezer } from '../ui/primitives'
import { ask, chooseRole, connect, getClient, subscribeClient } from './client'
import { viewArtist, type HostView, type Role } from './protocol'

/**
 * Handy-Begleiter (Seite nach dem QR-Scan): abstimmen, eigenes Line-up sehen und – wenn man dran ist –
 * den gezogenen Künstler setzen, Rad drehen und den eigenen Song wählen. Gespielt und abgespielt wird
 * auf dem Hauptgerät; das Handy schickt nur Wünsche, die dort wie ein Tippen ausgeführt werden.
 */

const vib = (p: number | number[]) => {
  try {
    navigator.vibrate?.(p)
  } catch {
    // nicht unterstützt
  }
}

function Avatar({ src, color, size = 40 }: { src?: string; color: string; size?: number }) {
  return src ? (
    <img className="r-av" src={src} alt="" style={{ width: size, height: size, boxShadow: `0 0 0 2px ${color}` }} />
  ) : (
    <span className="r-av" style={{ width: size, height: size, background: color }} />
  )
}

function ArtistPic({ V, name, size = 44 }: { V: HostView; name: string; size?: number }) {
  const u = V.pics[name] || picOf(name)
  return u ? <img className="r-pic" src={u} alt="" style={{ width: size, height: size }} /> : <span className="r-pic ph" style={{ width: size, height: size }}>♪</span>
}

function RolePicker({ code, V, avatars }: { code: string; V: HostView; avatars: Record<number, string> }) {
  return (
    <div className="r-roles">
      <p className="r-kicker">Wer bist du?</p>
      <h2 className="r-title">Wähle deinen Platz</h2>
      <div className="r-rolegrid">
        {V.names.map((n, j) => (
          <motion.button key={j} className="r-role" style={{ ['--pc' as string]: V.colors[j + 1] }} data-role={j + 1} whileTap={{ scale: 0.94 }} onClick={() => chooseRole(code, j + 1)}>
            <Avatar src={avatars[j + 1]} color={V.colors[j + 1]} size={52} />
            <span>{n}</span>
          </motion.button>
        ))}
      </div>
      <button className="r-aud" data-role="audience" onClick={() => chooseRole(code, 'audience')}>
        🙋 Nur abstimmen (Publikum)
      </button>
    </div>
  )
}

/** Songwahl auf dem Handy: Top-Tracks des Künstlers, Suche, Vorschau leise am Handy. */
function SongPicker({ V, me, i, artist }: { V: HostView; me: number; i: number; artist: string }) {
  useDeezer()
  const { playing } = useAudio()
  const key = 'r' + i
  useEffect(() => {
    void loadTopsFor([artist], { genre: () => V.genre, eras: () => 'off' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artist])
  const { list, stale } = trackList(key, artist)
  const chosen = (V.songs[me] || [])[i]
  const [manual, setManual] = useState(MQ[key] || '')
  return (
    <div className="r-picker">
      <input type="text" className="r-search" placeholder="Song suchen…" defaultValue={TQ[key] || ''} onChange={(e) => onSongQuery(key, artist, e.target.value)} autoComplete="off" />
      <p className="r-label">
        {(TQ[key] || '').trim() ? 'Suchergebnisse' : 'Top Tracks'}
        {stale ? ' · sucht…' : ''}
      </p>
      <div className="r-tracks">
        {list === null ? (
          <p className="r-hint">Lade Top-Tracks…</p>
        ) : !list.length ? (
          <p className="r-hint">Nichts gefunden — trag den Song unten von Hand ein.</p>
        ) : (
          list.slice(0, 40).map((t: Track, j: number) => {
            const k = 'rt' + i + '_' + j
            const cov = (t.album && (t.album.cover_medium || t.album.cover_small)) || ''
            const isSel = !!chosen && chosen.title === (t.title_short || t.title)
            return (
              <div key={k + t.id} className={'r-trk' + (isSel ? ' on' : '')} data-rpick={j} onClick={() => (vib(15), ask({ t: 'pickSong', i, track: t }))}>
                {cov ? <img src={cov} alt="" /> : <span className="r-pic ph">♪</span>}
                <span className="r-meta">
                  <b>{t.title_short || t.title}</b>
                  <small>{mmss(t.duration)}</small>
                </span>
                <button
                  className={'r-pv' + (playing === k ? ' on' : '')}
                  aria-label="Vorschau auf dem Handy"
                  onClick={(e) => {
                    e.stopPropagation()
                    play(t.preview || '', k, cov)
                  }}
                >
                  {playing === k ? '⏸' : '▶'}
                  <Eq on={playing === k} />
                </button>
              </div>
            )
          })
        )}
      </div>
      <div className="r-manual">
        <input type="text" placeholder="Song fehlt? Titel eintippen" value={manual} onChange={(e) => (setManual(e.target.value), (MQ[key] = e.target.value))} />
        <button
          onClick={() => {
            if (!manual.trim()) return
            ask({ t: 'manualSong', i, text: manual })
            setManual('')
            MQ[key] = ''
          }}
        >
          + Übernehmen
        </button>
      </div>
    </div>
  )
}

function MyLineup({ V, me }: { V: HostView; me: number }) {
  const n = V.sd ? 1 : V.size
  const next = V.screen === 'pick' || V.screen === 'duel' || V.screen === 'songs' ? V.duel : -1
  const rows = []
  for (let i = 0; i < n; i++) {
    const a = viewArtist(V, me, i)
    const so = (V.songs[me] || [])[i]
    const w = V.winners[i]
    rows.push(
      <div key={i} className={'r-slot' + (i === next ? ' next' : '') + (w ? (w === me ? ' won' : ' lost') : '')}>
        <span className="r-pos">{V.sd ? 'SD' : '#' + (i + 1)}</span>
        {a ? <ArtistPic V={V} name={a} size={40} /> : <span className="r-pic ph">?</span>}
        <span className="r-meta">
          <b>{a || 'noch frei'}</b>
          <small>{so ? '♫ ' + so.title : a ? 'kein Song gewählt' : ''}</small>
        </span>
        {!V.sd && V.slotPts[i] === 2 ? <span className="r-x2">×2</span> : null}
        {i === next ? <span className="r-nextbadge">als Nächstes</span> : w === me ? <span className="r-won">✓</span> : null}
      </div>,
    )
  }
  return (
    <section className="r-card">
      <p className="r-kicker">Dein Line-up</p>
      {rows}
    </section>
  )
}

function Vote({ V, mineVote, avatars }: { V: HostView; mineVote: number | null; avatars: Record<number, string> }) {
  const total = Object.values(V.tally || {}).reduce((a, b) => a + b, 0) || 1
  const done = V.votePhase === 'result'
  return (
    <section className="r-card r-vote">
      <p className="r-kicker">{V.sd ? 'Sudden Death' : 'Platz #' + (V.duel + 1) + ' · ' + V.slotPts[V.duel] + ' PTS'}</p>
      <h2 className="r-title">{done ? (V.voteWinner ? V.names[V.voteWinner - 1] + ' gewinnt die Abstimmung' : 'Stimmengleichheit') : 'Wer hat den besseren Song?'}</h2>
      {V.parts.map((p) => {
        const a = viewArtist(V, p, V.duel) || ''
        const so = (V.songs[p] || [])[V.sd ? 0 : V.duel]
        const v = V.tally[p] || 0
        const pct = Math.round((v / total) * 100)
        const mine = mineVote === p
        return (
          <motion.button
            key={p}
            className={'r-vbtn' + (mine ? ' mine' : '') + (done && V.voteWinner === p ? ' win' : '')}
            style={{ ['--pc' as string]: V.colors[p] }}
            data-rvote={p}
            disabled={done}
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              vib(25)
              ask({ t: 'vote', p, key: V.duelKey })
            }}
          >
            <span className="r-vfill" style={{ width: pct + '%' }} />
            <Avatar src={avatars[p]} color={V.colors[p]} size={38} />
            {so?.cover ? <img className="r-vcover" src={so.cover} alt="" /> : <ArtistPic V={V} name={a} size={44} />}
            <span className="r-meta">
              <b>{so?.title || 'Kein Song gewählt'}</b>
              <small>
                {V.names[p - 1]} · {a}
              </small>
            </span>
            <span className="r-pct">{pct}%</span>
            {mine ? <span className="r-mine">Deine Stimme</span> : null}
          </motion.button>
        )
      })}
      <p className="r-hint">{done ? 'Weiter geht’s am Hauptgerät.' : mineVote ? 'Du kannst deine Stimme noch ändern.' : 'Tippe auf deinen Favoriten – eine Stimme pro Handy.'}</p>
    </section>
  )
}

function Turn({ V, me, avatars }: { V: HostView; me: Role; avatars: Record<number, string> }) {
  const p = typeof me === 'number' ? me : 0
  if (V.screen === 'draft') {
    if (V.pending && V.pending.player === p) {
      const free = (V.sameArtist ? V.lineup[1] : V.lineup[p]) || []
      return (
        <section className="r-card r-hot" style={{ ['--pc' as string]: V.colors[p] }}>
          <p className="r-kicker">Du bist dran · blind setzen</p>
          <div className="r-draw">
            <ArtistPic V={V} name={V.pending.artist} size={86} />
            <h2 className="r-title">{V.pending.artist}</h2>
          </div>
          <div className="r-slots">
            {free.map((a, i) => (
              <motion.button key={i} className={'r-sl' + (a ? ' taken' : '') + (V.slotPts[i] === 2 ? ' two' : '')} disabled={!!a} data-rplace={i} whileTap={{ scale: 0.9 }} onClick={() => (vib(30), ask({ t: 'place', pos: i }))}>
                <b>#{i + 1}</b>
                <small>{a ? a : '×' + V.slotPts[i]}</small>
              </motion.button>
            ))}
          </div>
        </section>
      )
    }
    if (!V.pending && V.drawer === p && p) {
      return (
        <section className="r-card r-hot" style={{ ['--pc' as string]: V.colors[p] }}>
          <p className="r-kicker">Du bist am Zug</p>
          <motion.button className="r-spin" data-rspin disabled={V.spinning || !V.poolCount} whileTap={{ scale: 0.92 }} onClick={() => (vib(40), ask({ t: 'spin' }))}>
            {V.spinning ? 'Rad dreht…' : V.poolCount === 1 ? 'Letzten Künstler ziehen' : '🎡 Rad drehen'}
          </motion.button>
        </section>
      )
    }
    const who = V.pending ? V.pending.player : V.drawer
    return (
      <section className="r-card">
        <p className="r-kicker">Ziehen</p>
        <h2 className="r-title">
          <span style={{ color: V.colors[who] }}>{V.names[who - 1]}</span> ist am Zug
        </h2>
        {V.pending ? <p className="r-hint">gezogen: {V.pending.artist}</p> : null}
      </section>
    )
  }
  if (V.screen === 'pick') {
    const picker = V.pickOrder[V.pickIdx]
    const i = V.duel
    if (picker === p && p) {
      const a = viewArtist(V, p, V.sd ? 0 : i) || ''
      const so = (V.songs[p] || [])[V.sd ? 0 : i]
      return (
        <section className="r-card r-hot" style={{ ['--pc' as string]: V.colors[p] }}>
          <p className="r-kicker">Du wählst · {V.sd ? 'Sudden Death' : 'Platz #' + (i + 1) + ' · ×' + V.slotPts[i]}</p>
          <div className="r-draw small">
            <ArtistPic V={V} name={a} size={54} />
            <h2 className="r-title">{a}</h2>
          </div>
          <SongPicker V={V} me={p} i={V.sd ? 0 : i} artist={a} />
          <div className="r-actions">
            <button className="r-primary" data-rnext disabled={!so} onClick={() => (stopAudio(), ask({ t: 'pickNext' }))}>
              {so ? '„' + so.title + '“ bestätigen →' : 'Erst einen Song wählen'}
            </button>
            <button className="r-ghost" onClick={() => (stopAudio(), ask({ t: 'pickNext' }))}>
              Überspringen
            </button>
          </div>
        </section>
      )
    }
    return (
      <section className="r-card">
        <p className="r-kicker">Songwahl · {V.sd ? 'Sudden Death' : 'Platz #' + (i + 1)}</p>
        <h2 className="r-title">
          <span style={{ color: V.colors[picker] }}>{V.names[picker - 1]}</span> wählt gerade…
        </h2>
      </section>
    )
  }
  if (V.screen === 'songs' && p && !(V.sd && !V.sdArt?.[p])) {
    return <SongsAll V={V} me={p} />
  }
  if (V.screen === 'duel') {
    if (V.audience && V.votePhase) return <Vote V={V} mineVote={getClient().mine?.key === V.duelKey ? getClient().mine!.vote : null} avatars={avatars} />
    return (
      <section className="r-card">
        <p className="r-kicker">Battle · {V.sd ? 'Sudden Death' : 'Platz #' + (V.duel + 1)}</p>
        <h2 className="r-title">Entscheidet gemeinsam am Hauptgerät</h2>
      </section>
    )
  }
  if (V.screen === 'round' || V.screen === 'final') {
    const best = Math.max(...Object.values(V.scores))
    return (
      <section className="r-card">
        <p className="r-kicker">{V.screen === 'final' ? 'Endstand' : 'Runde ' + V.round + ' · Endstand'}</p>
        {Array.from({ length: V.players }, (_, j) => j + 1).map((q) => (
          <div key={q} className={'r-score' + (V.scores[q] === best ? ' top' : '')} style={{ ['--pc' as string]: V.colors[q] }}>
            <Avatar src={avatars[q]} color={V.colors[q]} size={34} />
            <b>{V.names[q - 1]}</b>
            <span>
              {V.scores[q]} pts · {V.wins[q] || 0}/{V.target} Siege
            </span>
          </div>
        ))}
      </section>
    )
  }
  const what: Record<string, string> = { home: 'Startbildschirm', setup: 'Einrichtung', bracket: 'Turnierbaum', gssetup: 'Guess the Song', gsplay: 'Guess the Song', tlsetup: 'Timeline Masters', tlplay: 'Timeline Masters', ddplay: 'Jahrzehnt-Duell' }
  return (
    <section className="r-card">
      <p className="r-kicker">Hauptgerät</p>
      <h2 className="r-title">{what[V.screen] || 'Gleich geht’s los'}</h2>
      <p className="r-hint">Sobald du dran bist oder abgestimmt wird, erscheint es hier.</p>
    </section>
  )
}

function SongsAll({ V, me }: { V: HostView; me: number }) {
  const [open, setOpen] = useState<number | null>(null)
  const n = V.sd ? 1 : V.size
  return (
    <section className="r-card r-hot" style={{ ['--pc' as string]: V.colors[me] }}>
      <p className="r-kicker">Wähle deine Songs</p>
      {Array.from({ length: n }, (_, i) => {
        const a = viewArtist(V, me, i)
        if (!a) return null
        const so = (V.songs[me] || [])[i]
        return (
          <div key={i} className="r-acc">
            <button className={'r-slot' + (so ? ' won' : '')} onClick={() => setOpen(open === i ? null : i)}>
              <span className="r-pos">{V.sd ? 'SD' : '#' + (i + 1)}</span>
              <ArtistPic V={V} name={a} size={40} />
              <span className="r-meta">
                <b>{a}</b>
                <small>{so ? '♫ ' + so.title : 'Song wählen ▾'}</small>
              </span>
            </button>
            {open === i ? <SongPicker V={V} me={me} i={i} artist={a} /> : null}
          </div>
        )
      })}
    </section>
  )
}

export function RemoteApp({ code }: { code: string }) {
  const st = useSyncExternalStore(subscribeClient, getClient, getClient)
  const [pickRole, setPickRole] = useState(false)
  const lastHot = useRef('')
  useEffect(() => connect(code), [code])
  useLayoutEffect(() => {
    if (st.view) document.body.setAttribute('data-theme', st.view.theme)
  }, [st.view?.theme, st.view])
  const V = st.view
  // Kurz vibrieren, wenn man dran ist
  const me = st.role
  const hot = V && typeof me === 'number' ? (V.pending?.player === me ? 'place' : V.screen === 'draft' && !V.pending && V.drawer === me ? 'spin' : V.screen === 'pick' && V.pickOrder[V.pickIdx] === me ? 'pick' + V.duel : '') : ''
  useEffect(() => {
    if (hot && hot !== lastHot.current) vib([30, 40, 30])
    lastHot.current = hot
  }, [hot])

  return (
    <div className="remote">
      <header className="r-head">
        <span className="r-logo" aria-hidden />
        <div>
          <b>
            Sound <em>Clash</em>
          </b>
          <small>Handy-Begleiter · Code {code}</small>
        </div>
        {V && me !== null ? (
          <button className="r-me" onClick={() => setPickRole(true)} style={{ ['--pc' as string]: typeof me === 'number' ? V.colors[me] : 'var(--muted)' }}>
            {typeof me === 'number' ? V.names[me - 1] : 'Publikum'}
          </button>
        ) : null}
      </header>
      <AnimatePresence mode="wait">
        {!V ? (
          <motion.div key="wait" className="r-card r-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="eqload">
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
            <p>Verbinde mit dem Hauptgerät…</p>
            {Date.now() - st.since > 12000 ? <p className="r-hint">Dauert es lange? Am Hauptgerät „📱 Handys koppeln“ geöffnet lassen und dasselbe WLAN nutzen.</p> : null}
          </motion.div>
        ) : me === null || pickRole ? (
          <motion.div key="role" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} onClick={() => setPickRole(false)}>
            <RolePicker code={code} V={V} avatars={st.avatars} />
          </motion.div>
        ) : (
          <motion.main key="main" className="r-main" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {st.status === 'lost' ? <p className="r-warn">Verbindung zum Hauptgerät unterbrochen – warte auf Wiederverbindung…</p> : null}
            <Turn V={V} me={me} avatars={st.avatars} />
            {typeof me === 'number' && me <= V.players && ['draft', 'pick', 'songs', 'duel', 'round'].includes(V.screen) ? <MyLineup V={V} me={me} /> : null}
          </motion.main>
        )}
      </AnimatePresence>
    </div>
  )
}
