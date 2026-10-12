import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { bus } from '../app/bus'
import { dispatch, env } from '../app/store'
import { eraAt, eraCheck, mmss, pcol } from '../core/game'
import type { State, Track } from '../core/types'
import { play } from '../services/audio'
import { ak } from '../services/catalog'
import { MQ, TQ, onSongQuery, spot, trackList, trackYear, yt } from '../services/deezer'
import { burstAt } from '../ui/Fx'
import { Eq, useAudio, useDeezer } from '../ui/primitives'

/**
 * Songwahl für ein Feld (tracksHTML im Original): Suchfeld, Top-Tracks bzw. Treffer mit
 * Vorschau, und „Von Hand eintragen“ mit Spotify-/YouTube-Suche.
 */
export function Tracks({ S, p, i, artist }: { S: State; p: number; i: number; artist: string }) {
  useDeezer()
  const { playing } = useAudio()
  const key = p + '_' + i
  const { list, stale } = trackList(key, artist)
  const [mq, setMq] = useState(MQ[key] || '')
  const [open, setOpen] = useState(!!((list && !list.length) || (MQ[key] || '').trim()))
  const detRef = useRef<HTMLDetailsElement>(null)
  useEffect(() => {
    if (list && !list.length) setOpen(true)
  }, [list])
  const era = eraAt(S, i)
  const chosen = (S.songs[p] || [])[i]
  const label = ((TQ[key] || '').trim() ? 'Suchergebnisse' : 'Top Tracks')

  function pickRow(t: Track, el: HTMLElement) {
    const fit = eraCheck(S, i, trackYear(t))
    if (fit === false) {
      bus.emit('toast', 'Passt nicht: ' + eraAt(S, i)!.t + ' — der Song ist von ' + trackYear(t) + '.')
      return
    }
    burstAt(el, pcol(S, p), 18, 0.7)
    dispatch({ type: 'pickSong', p, i, track: t })
  }

  let rows: React.ReactNode
  if (list === null)
    rows = (
      <p className="hint loading-hint" style={{ margin: '8px 0' }}>
        Lade Top-Tracks…
      </p>
    )
  else if (!list.length)
    rows = (
      <p className="hint" style={{ margin: '8px 0' }}>
        Nichts gefunden — trag den Song unten von Hand ein.
      </p>
    )
  else
    rows = list.slice(0, 40).map((t, j) => {
      const cov = (t.album && (t.album.cover_medium || t.album.cover_small)) || '',
        k = 't' + p + '_' + i + '_' + j
      const other = ak((t.artist && t.artist.name) || '') !== ak(artist)
      const yr = trackYear(t),
        fit = eraCheck(S, i, yr)
      const isSel = !!chosen && chosen.id === t.id
      return (
        <motion.div
          key={k + t.id}
          className={'trk ' + (fit === false ? 'bad' : '') + (isSel ? ' sel' : '')}
          data-pick={p + '_' + i + '_' + j}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('[data-pv2]')) return
            pickRow(t, e.currentTarget)
          }}
          initial={env.reduce ? false : { opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: Math.min(j, 14) * 0.018 }}
        >
          {cov ? (
            <img src={cov} alt="" loading="lazy" />
          ) : (
            <span className="ph" style={{ width: 44, height: 44, borderRadius: 7, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              ♪
            </span>
          )}
          <span className="meta">
            <span className="tt">{t.title_short || t.title}</span>
            <span className="td">
              {mmss(t.duration)}
              {yr ? (
                <>
                  {' · '}
                  <span className="yr">{yr}</span>
                </>
              ) : null}
              {other ? ' · ' + ((t.artist && t.artist.name) || '') : ''}
            </span>
          </span>
          <button
            className={'pv ' + (playing === k ? 'on' : '')}
            data-pv2={k}
            data-url={t.preview || ''}
            data-cover={cov || ''}
            aria-label={(playing === k ? 'Pause: ' : 'Vorschau: ') + (t.title_short || t.title)}
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

  return (
    <>
      <div className="searchwrap">
        <span className="mag" aria-hidden>
          ⌕
        </span>
        <input type="text" placeholder="Song suchen…" data-tq={key} data-art={artist} defaultValue={TQ[key] || ''} autoComplete="off" onChange={(e) => onSongQuery(key, artist, e.target.value)} />
      </div>
      {era ? (
        <div className="erabar">
          ⏳ Auflage für Platz #{i + 1}: {era.t}
        </div>
      ) : null}
      <p className="tlabel" id={'tlab_' + key}>
        {label}
        {stale ? <span style={{ color: 'var(--primary)' }}> · sucht…</span> : null}
      </p>
      <div className="tracks" id={'trkbox_' + key}>
        {rows}
      </div>
      <details className="manual" id={'man_' + key} ref={detRef} open={open} onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}>
        <summary>+ Song fehlt? Von Hand eintragen</summary>
        <div className="mrow">
          <input
            type="text"
            placeholder="z. B. Sicko Mode"
            data-mq={key}
            value={mq}
            autoComplete="off"
            onChange={(e) => {
              MQ[key] = e.target.value
              setMq(e.target.value)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addManual()
              }
            }}
          />
          <button className="btn sm" data-madd={key} data-art={artist} onClick={addManual}>
            + Übernehmen
          </button>
        </div>
        <div className="links" style={{ marginTop: 8 }}>
          <a className="lnk" href={spot(artist, mq.trim())} target="_blank" rel="noopener">
            ↗ Auf Spotify suchen
          </a>
          <a className="lnk" href={yt(artist, mq.trim())} target="_blank" rel="noopener">
            ↗ Auf YouTube suchen
          </a>
        </div>
        <p className="hint" style={{ textAlign: 'left', margin: '8px 0 0' }}>
          Ohne 30-Sek-Vorschau — dafür führen die Links im Battle direkt zum Song.
        </p>
      </details>
    </>
  )

  function addManual() {
    const text = MQ[key] || ''
    dispatch({ type: 'manualSong', p, i, text, id: 'm' + Date.now() })
    if (text.trim()) {
      MQ[key] = ''
      setMq('')
    }
  }
}
