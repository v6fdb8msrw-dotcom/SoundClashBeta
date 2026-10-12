import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { mmss } from '../core/game'
import type { Track } from '../core/types'
import { play, stopAudio } from '../services/audio'
import { picOf } from '../services/catalog'
import { MQ, TQ, loadTopsFor, onSongQuery, trackList } from '../services/deezer'
import { Eq, useAudio, useDeezer } from '../ui/primitives'
import { Vinyl } from '../ui/Vinyl'
import { ask, chooseRole, connect, getClient, subscribeClient } from './client'
import { viewArtist, type HostView, type Role } from './protocol'

/**
 * Handy-Begleiter (Seite nach dem QR-Scan). Gespielt und abgespielt wird auf dem Hauptgerät;
 * das Handy schickt Wünsche, die dort wie ein Tippen ausgeführt werden.
 * Spieler: drehen, blind setzen, Songs wählen (Hörprobe leise am Handy), abstimmen, Line-up.
 * Publikum: abstimmen und sehen, welcher Song gerade läuft und von wem er ist.
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
    <img className="r-av" src={src} alt="" style={{ width: size, height: size, boxShadow: `0 0 0 2px ${color}, 0 0 18px -4px ${color}` }} />
  ) : (
    <span className="r-av" style={{ width: size, height: size, background: color }} />
  )
}

function ArtistPic({ V, name, size = 44, round }: { V: HostView; name: string; size?: number; round?: boolean }) {
  const u = V.pics[name] || picOf(name)
  return u ? (
    <img className={'r-pic' + (round ? ' round' : '')} src={u} alt="" style={{ width: size, height: size }} />
  ) : (
    <span className={'r-pic ph' + (round ? ' round' : '')} style={{ width: size, height: size }}>
      ♪
    </span>
  )
}

function Dots() {
  return (
    <span className="dots" aria-hidden>
      <i />
      <i />
      <i />
    </span>
  )
}

/** Oberer „Bühnen“-Bereich: großer Status in Spielerfarbe. */
function Hero({ color, kicker, title, sub, pulse, children }: { color: string; kicker: string; title: React.ReactNode; sub?: React.ReactNode; pulse?: boolean; children?: React.ReactNode }) {
  return (
    <motion.section className={'r-hero' + (pulse ? ' pulse' : '')} style={{ ['--pc' as string]: color }} initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 24 }}>
      <span className="r-hero-glow" aria-hidden />
      <p className="r-kicker">{kicker}</p>
      <h2 className="r-title">{title}</h2>
      {sub ? <p className="r-sub">{sub}</p> : null}
      {children}
    </motion.section>
  )
}

function RolePicker({ code, V, avatars }: { code: string; V: HostView; avatars: Record<number, string> }) {
  return (
    <div className="r-roles">
      <Vinyl spinning size={120} className="r-roles-vinyl" />
      <p className="r-kicker">Code {code}</p>
      <h2 className="r-title big">Wer bist du?</h2>
      <div className="r-rolegrid">
        {V.names.map((n, j) => (
          <motion.button
            key={j}
            className={'r-role' + (V.online.includes(j + 1) ? ' taken' : '')}
            style={{ ['--pc' as string]: V.colors[j + 1] }}
            data-role={j + 1}
            whileTap={{ scale: 0.94 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: j * 0.05 }}
            onClick={() => (vib(20), chooseRole(code, j + 1))}
          >
            <Avatar src={avatars[j + 1]} color={V.colors[j + 1]} size={56} />
            <span>{n}</span>
            {V.online.includes(j + 1) ? <small>schon verbunden</small> : <small>Spieler {j + 1}</small>}
          </motion.button>
        ))}
      </div>
      <button className="r-aud" data-role="audience" onClick={() => (vib(20), chooseRole(code, 'audience'))}>
        🙋 Ich schaue zu und stimme ab
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
      <div className="r-searchwrap">
        <span aria-hidden>⌕</span>
        <input type="text" className="r-search" placeholder="Song suchen…" defaultValue={TQ[key] || ''} onChange={(e) => onSongQuery(key, artist, e.target.value)} autoComplete="off" />
      </div>
      <p className="r-label">
        {(TQ[key] || '').trim() ? 'Suchergebnisse' : 'Top Tracks'}
        {stale ? ' · sucht…' : ''}
      </p>
      <div className="r-tracks">
        {list === null ? (
          <p className="r-hint">
            Lade Top-Tracks <Dots />
          </p>
        ) : !list.length ? (
          <p className="r-hint">Nichts gefunden — trag den Song unten von Hand ein.</p>
        ) : (
          list.slice(0, 40).map((t: Track, j: number) => {
            const k = 'rt' + i + '_' + j
            const cov = (t.album && (t.album.cover_medium || t.album.cover_small)) || ''
            const isSel = !!chosen && (chosen.id !== undefined ? String(chosen.id) === String(t.id) : chosen.title === (t.title_short || t.title))
            return (
              <motion.div
                key={k + t.id}
                className={'r-trk' + (isSel ? ' on' : '')}
                data-rpick={j}
                onClick={() => (vib(15), ask({ t: 'pickSong', i, track: t }))}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(j, 12) * 0.02 }}
              >
                {cov ? <img src={cov} alt="" /> : <span className="r-pic ph">♪</span>}
                <span className="r-meta">
                  <b>{t.title_short || t.title}</b>
                  <small>{mmss(t.duration)}</small>
                </span>
                {isSel ? <span className="r-check">✓</span> : null}
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
              </motion.div>
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
          Übernehmen
        </button>
      </div>
    </div>
  )
}

function MyLineup({ V, me }: { V: HostView; me: number }) {
  const n = V.sd ? 1 : V.size
  const next = ['pick', 'duel', 'songs', 'listen'].includes(V.screen) ? V.duel : -1
  const rows = []
  for (let i = 0; i < n; i++) {
    const a = viewArtist(V, me, i)
    const so = (V.songs[me] || [])[i]
    const w = V.winners[i]
    rows.push(
      <div key={i} className={'r-slot' + (i === next ? ' next' : '') + (w ? (w === me ? ' won' : ' lost') : '')}>
        <span className="r-pos">{V.sd ? 'SD' : '#' + (i + 1)}</span>
        {a ? <ArtistPic V={V} name={a} size={42} round /> : <span className="r-pic ph round">?</span>}
        <span className="r-meta">
          <b>{a || 'noch frei'}</b>
          <small>{so ? '♫ ' + so.title : a ? 'kein Song gewählt' : ''}</small>
        </span>
        {!V.sd && V.slotPts[i] === 2 ? <span className="r-x2">×2</span> : null}
        {i === next ? <span className="r-nextbadge">jetzt</span> : w === me ? <span className="r-won">+{V.sd ? 1 : V.slotPts[i]}</span> : null}
      </div>,
    )
  }
  return (
    <section className="r-card">
      <p className="r-kicker">Dein Line-up · {V.scores[me] || 0} Punkte</p>
      {rows}
    </section>
  )
}

/** Abstimmen und „läuft gerade“: deutlich, wer welchen Song gewählt hat. */
function Vote({ V, mineVote, avatars }: { V: HostView; mineVote: number | null; avatars: Record<number, string> }) {
  const total = Object.values(V.tally || {}).reduce((a, b) => a + b, 0) || 1
  const done = V.votePhase === 'result'
  const canVote = V.audience && V.votePhase === 'tally'
  const i = V.sd ? 0 : V.duel
  const listen = V.screen === 'listen' && V.listen ? V.listen : null
  const order = listen ? listen.order : V.parts
  return (
    <section className="r-vote">
      {order.map((p, k) => {
        const a = viewArtist(V, p, V.duel) || ''
        const so = (V.songs[p] || [])[i]
        const v = V.tally[p] || 0
        const pct = Math.round((v / total) * 100)
        const mine = mineVote === p
        const now = V.nowPlaying === p
        const upcoming = listen ? k > listen.idx : false
        return (
          <motion.button
            key={p}
            layout
            className={'r-vbtn' + (mine ? ' mine' : '') + (now ? ' now' : '') + (done && V.voteWinner === p ? ' win' : '')}
            style={{ ['--pc' as string]: V.colors[p] }}
            data-rvote={p}
            disabled={!canVote}
            whileTap={canVote ? { scale: 0.97 } : undefined}
            onClick={() => {
              if (!canVote) return
              vib(25)
              ask({ t: 'vote', p, key: V.duelKey })
            }}
          >
            {V.audience ? <span className="r-vfill" style={{ width: pct + '%' }} /> : null}
            <span className="r-vtop">
              <Avatar src={avatars[p]} color={V.colors[p]} size={30} />
              <b className="r-vwho">{V.names[p - 1]}</b>
              <span className="r-vlabel">hat gewählt</span>
              {now ? (
                <span className="r-now">
                  <span className="r-eq" aria-hidden>
                    <i />
                    <i />
                    <i />
                    <i />
                  </span>
                  läuft gerade
                </span>
              ) : upcoming ? (
                <span className="r-soon">gleich</span>
              ) : null}
            </span>
            <span className="r-vbody">
              {so?.cover ? <img className="r-vcover" src={so.cover} alt="" /> : <ArtistPic V={V} name={a} size={56} />}
              <span className="r-meta">
                <b>{so?.title || 'Kein Song gewählt'}</b>
                <small>{a}</small>
              </span>
              {V.audience ? <span className="r-pct">{pct}%</span> : null}
            </span>
            {mine ? <span className="r-mine">✓ Deine Stimme</span> : null}
          </motion.button>
        )
      })}
      <p className="r-hint">
        {!V.audience
          ? 'Ihr entscheidet gemeinsam am Hauptgerät.'
          : done
            ? V.voteWinner
              ? V.names[V.voteWinner - 1] + ' gewinnt die Abstimmung.'
              : 'Stimmengleichheit – entscheidet am Hauptgerät.'
            : mineVote
              ? 'Du kannst deine Stimme noch ändern.'
              : 'Tippe auf deinen Favoriten – eine Stimme pro Handy.'}
      </p>
    </section>
  )
}

function Turn({ code, V, me, avatars }: { code: string; V: HostView; me: Role; avatars: Record<number, string> }) {
  const p = typeof me === 'number' ? me : 0
  const mine = getClient().mine
  const mineVote = mine && mine.key === V.duelKey ? mine.vote : null
  void code
  if (V.screen === 'draft') {
    if (V.pending && V.pending.player === p) {
      const free = (V.sameArtist ? V.lineup[1] : V.lineup[p]) || []
      return (
        <Hero color={V.colors[p]} kicker="Du bist dran · blind setzen" title={V.pending.artist} pulse>
          <div className="r-draw">
            <ArtistPic V={V} name={V.pending.artist} size={110} round />
          </div>
          <p className="r-sub">Auf welchen Platz? Was noch kommt, weiß keiner.</p>
          <div className="r-slots">
            {free.map((a, i) => (
              <motion.button key={i} className={'r-sl' + (a ? ' taken' : '') + (V.slotPts[i] === 2 ? ' two' : '')} disabled={!!a} data-rplace={i} whileTap={{ scale: 0.9 }} onClick={() => (vib(30), ask({ t: 'place', pos: i }))}>
                <b>#{i + 1}</b>
                <small>{a ? a : '×' + V.slotPts[i]}</small>
              </motion.button>
            ))}
          </div>
        </Hero>
      )
    }
    if (!V.pending && V.drawer === p && p) {
      return (
        <Hero color={V.colors[p]} kicker="Du bist am Zug" title="Dreh das Rad!" pulse>
          <motion.button className="r-spin" data-rspin disabled={V.spinning || !V.poolCount} whileTap={{ scale: 0.92 }} onClick={() => (vib(40), ask({ t: 'spin' }))}>
            <Vinyl spinning={V.spinning} size={150} color={V.colors[p]} />
            <span>{V.spinning ? 'dreht …' : V.poolCount === 1 ? 'Letzten ziehen' : 'SPIN'}</span>
          </motion.button>
          <p className="r-sub">Das Rad dreht sich groß auf dem Hauptgerät.</p>
        </Hero>
      )
    }
    const who = V.pending ? V.pending.player : V.drawer
    return (
      <Hero color={V.colors[who]} kicker="Künstler ziehen" title={<>{V.names[who - 1]} ist am Zug</>} sub={V.pending ? 'gezogen: ' + V.pending.artist : V.spinning ? 'Das Rad dreht …' : 'Gleich wird gedreht.'}>
        {V.pending ? (
          <div className="r-draw">
            <ArtistPic V={V} name={V.pending.artist} size={84} round />
          </div>
        ) : null}
      </Hero>
    )
  }
  if (V.screen === 'pick') {
    const i = V.duel
    const slotLabel = V.sd ? 'Sudden Death' : 'Platz #' + (i + 1) + ' · ×' + V.slotPts[i]
    // Handy-Modus: alle wählen gleichzeitig
    if (V.phoneMode) {
      if (p && V.parts.includes(p)) {
        const a = viewArtist(V, p, i) || ''
        const so = (V.songs[p] || [])[V.sd ? 0 : i]
        if (V.ready[p]) {
          return (
            <Hero color={V.colors[p]} kicker={'✓ Bereit · ' + slotLabel} title={so ? '„' + so.title + '“' : 'Ohne Song'} sub={a}>
              <div className="r-draw">
                <Vinyl cover={so?.cover || V.pics[a] || picOf(a) || undefined} spinning={false} size={120} color={V.colors[p]} />
              </div>
              <div className="r-readylist">
                {V.parts.map((q) => (
                  <span key={q} className={'r-rchip' + (V.ready[q] ? ' on' : '')} style={{ ['--pc' as string]: V.colors[q] }}>
                    {V.names[q - 1]} {V.ready[q] ? '✓' : <Dots />}
                  </span>
                ))}
              </div>
              <button className="r-ghost" onClick={() => ask({ t: 'pickDone', on: false })}>
                Song ändern
              </button>
            </Hero>
          )
        }
        return (
          <>
            <Hero color={V.colors[p]} kicker={'Deine Songwahl · ' + slotLabel} title={a} sub="Alle wählen gleichzeitig. Hör leise am Handy rein.">
              <div className="r-draw small">
                <ArtistPic V={V} name={a} size={64} round />
              </div>
            </Hero>
            <section className="r-card">
              <SongPicker V={V} me={p} i={V.sd ? 0 : i} artist={a} />
              <div className="r-actions">
                <button className="r-primary" data-rdone onClick={() => (stopAudio(), vib([20, 30, 20]), ask({ t: 'pickDone' }))}>
                  {so ? '„' + so.title + '“ nehmen ✓' : 'Ohne Song fertig'}
                </button>
              </div>
            </section>
          </>
        )
      }
      return (
        <Hero color="var(--primary)" kicker={'Songwahl · ' + slotLabel} title="Alle wählen gerade …">
          <div className="r-readylist">
            {V.parts.map((q) => (
              <span key={q} className={'r-rchip' + (V.ready[q] ? ' on' : '')} style={{ ['--pc' as string]: V.colors[q] }}>
                {V.names[q - 1]} {V.ready[q] ? '✓' : <Dots />}
              </span>
            ))}
          </div>
        </Hero>
      )
    }
    const picker = V.pickOrder[V.pickIdx]
    if (picker === p && p) {
      const a = viewArtist(V, p, V.sd ? 0 : i) || ''
      const so = (V.songs[p] || [])[V.sd ? 0 : i]
      return (
        <>
          <Hero color={V.colors[p]} kicker={'Du wählst · ' + slotLabel} title={a} pulse />
          <section className="r-card">
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
        </>
      )
    }
    return <Hero color={V.colors[picker]} kicker={'Songwahl · ' + slotLabel} title={<>{V.names[picker - 1]} wählt gerade</>} sub={<Dots />} />
  }
  if (V.screen === 'songs' && p && !(V.sd && !V.sdArt?.[p])) {
    return <SongsAll V={V} me={p} />
  }
  if (V.screen === 'listen' || V.screen === 'duel') {
    const L = V.listen
    const nowP = V.nowPlaying
    return (
      <>
        <Hero
          color={nowP ? V.colors[nowP] : 'var(--primary)'}
          kicker={(V.sd ? 'Sudden Death' : 'Platz #' + (V.duel + 1) + ' · ' + V.slotPts[V.duel] + ' PTS') + (V.screen === 'listen' && L ? ' · Song ' + (L.idx + 1) + '/' + L.order.length : '')}
          title={nowP ? <>♫ {V.names[nowP - 1]}s Song läuft</> : V.screen === 'listen' ? (L && L.idx === 0 ? 'Alle haben gewählt' : 'Gleich geht’s weiter') : V.votePhase === 'result' ? 'Abstimmung beendet' : 'Wer hat den besseren Song?'}
          sub={nowP ? (V.songs[nowP] || [])[V.sd ? 0 : V.duel]?.title : undefined}
        >
          {nowP ? (
            <div className="r-draw small">
              <Vinyl cover={(V.songs[nowP] || [])[V.sd ? 0 : V.duel]?.cover} spinning size={86} color={V.colors[nowP]} />
            </div>
          ) : null}
        </Hero>
        <Vote V={V} mineVote={mineVote} avatars={avatars} />
      </>
    )
  }
  if (V.screen === 'round' || V.screen === 'final') {
    const best = Math.max(...Object.values(V.scores))
    return (
      <Hero color="var(--primary)" kicker={V.screen === 'final' ? 'Endstand' : 'Runde ' + V.round + ' · Endstand'} title="🏆 Ergebnis">
        {Array.from({ length: V.players }, (_, j) => j + 1)
          .sort((x, y) => (V.wins[y] || 0) - (V.wins[x] || 0) || V.scores[y] - V.scores[x])
          .map((q) => (
            <div key={q} className={'r-score' + (V.scores[q] === best ? ' top' : '')} style={{ ['--pc' as string]: V.colors[q] }}>
              <Avatar src={avatars[q]} color={V.colors[q]} size={34} />
              <b>{V.names[q - 1]}</b>
              <span>
                {V.scores[q]} pts · {V.wins[q] || 0}/{V.target} Siege
              </span>
            </div>
          ))}
      </Hero>
    )
  }
  return <Hero color="var(--primary)" kicker="Hauptgerät" title="Gleich geht’s los" sub="Sobald du dran bist oder abgestimmt wird, erscheint es hier." />
}

function SongsAll({ V, me }: { V: HostView; me: number }) {
  const [open, setOpen] = useState<number | null>(null)
  const n = V.sd ? 1 : V.size
  const ready = !!V.ready[me]
  return (
    <>
      <Hero color={V.colors[me]} kicker="Wähle deine Songs" title={ready ? '✓ Fertig' : 'Deine Songs'} sub={ready ? 'Warte auf die anderen …' : 'Tippe einen Platz an und such deinen Song aus.'} />
      <section className="r-card">
        {Array.from({ length: n }, (_, i) => {
          const a = viewArtist(V, me, i)
          if (!a) return null
          const so = (V.songs[me] || [])[i]
          return (
            <div key={i} className="r-acc">
              <button className={'r-slot' + (so ? ' won' : '')} onClick={() => setOpen(open === i ? null : i)}>
                <span className="r-pos">{V.sd ? 'SD' : '#' + (i + 1)}</span>
                <ArtistPic V={V} name={a} size={42} round />
                <span className="r-meta">
                  <b>{a}</b>
                  <small>{so ? '♫ ' + so.title : 'Song wählen ▾'}</small>
                </span>
              </button>
              {open === i ? <SongPicker V={V} me={me} i={i} artist={a} /> : null}
            </div>
          )
        })}
        {V.phoneMode ? (
          <div className="r-actions">
            {ready ? (
              <button className="r-ghost" onClick={() => ask({ t: 'pickDone', on: false })}>
                Doch noch ändern
              </button>
            ) : (
              <button className="r-primary" data-rdone onClick={() => (stopAudio(), ask({ t: 'pickDone' }))}>
                Fertig ✓
              </button>
            )}
          </div>
        ) : null}
      </section>
    </>
  )
}

export function RemoteApp({ code }: { code: string }) {
  const st = useSyncExternalStore(subscribeClient, getClient, getClient)
  const [pickRole, setPickRole] = useState(false)
  const [tab, setTab] = useState<'now' | 'lineup'>('now')
  const lastHot = useRef('')
  useEffect(() => connect(code), [code])
  useLayoutEffect(() => {
    if (st.view) document.body.setAttribute('data-theme', st.view.theme)
  }, [st.view?.theme, st.view])
  const V = st.view
  const me = st.role
  const hot =
    V && typeof me === 'number'
      ? V.pending?.player === me
        ? 'place'
        : V.screen === 'draft' && !V.pending && V.drawer === me
          ? 'spin'
          : V.screen === 'pick' && (V.phoneMode ? V.parts.includes(me) && !V.ready[me] : V.pickOrder[V.pickIdx] === me)
            ? 'pick' + V.duel
            : ''
      : ''
  useEffect(() => {
    if (hot && hot !== lastHot.current) {
      vib([30, 40, 30])
      setTab('now')
    }
    lastHot.current = hot
  }, [hot])
  const isPlayer = V && typeof me === 'number' && me <= V.players
  const showTabs = isPlayer && ['draft', 'pick', 'songs', 'listen', 'duel', 'round'].includes(V!.screen)

  return (
    <div className="remote">
      <header className="r-head">
        <span className="r-logo" aria-hidden />
        <div>
          <b>
            Sound <em>Clash</em>
          </b>
          <small>{st.status === 'online' ? 'verbunden' : st.status === 'lost' ? 'Verbindung weg …' : 'verbinde …'}</small>
        </div>
        {V && me !== null ? (
          <button className="r-me" onClick={() => setPickRole(true)} style={{ ['--pc' as string]: typeof me === 'number' ? V.colors[me] : 'var(--muted)' }}>
            {typeof me === 'number' ? <Avatar src={st.avatars[me]} color={V.colors[me]} size={24} /> : '🙋'}
            {typeof me === 'number' ? V.names[me - 1] : 'Publikum'}
          </button>
        ) : null}
      </header>
      <AnimatePresence mode="wait">
        {!V ? (
          <motion.div key="wait" className="r-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Vinyl spinning size={150} />
            <p className="r-title">Verbinde mit dem Hauptgerät …</p>
            <p className="r-hint">Code {code}</p>
            {Date.now() - st.since > 12000 ? <p className="r-hint">Dauert es lange? Am Hauptgerät „📱 Handys koppeln“ geöffnet lassen und dasselbe WLAN nutzen.</p> : null}
          </motion.div>
        ) : me === null || pickRole ? (
          <motion.div key="role" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} onClick={() => setPickRole(false)}>
            <RolePicker code={code} V={V} avatars={st.avatars} />
          </motion.div>
        ) : (
          <motion.main key="main" className="r-main" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {st.status === 'lost' ? <p className="r-warn">Verbindung zum Hauptgerät unterbrochen – warte auf Wiederverbindung …</p> : null}
            {showTabs ? (
              <div className="r-tabs" role="tablist">
                <button role="tab" aria-selected={tab === 'now'} className={tab === 'now' ? 'on' : ''} onClick={() => setTab('now')}>
                  Jetzt
                  {hot ? <i className="r-dot" /> : null}
                </button>
                <button role="tab" aria-selected={tab === 'lineup'} className={tab === 'lineup' ? 'on' : ''} onClick={() => setTab('lineup')}>
                  Mein Line-up
                </button>
              </div>
            ) : null}
            {showTabs && tab === 'lineup' ? <MyLineup V={V} me={me as number} /> : <Turn code={code} V={V} me={me} avatars={st.avatars} />}
          </motion.main>
        )}
      </AnimatePresence>
    </div>
  )
}
