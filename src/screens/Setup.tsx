import { motion } from 'motion/react'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { getList, hasList, listVersion, loadGenre, onSearch, showMore, subscribeList } from '../app/artistList'
import { bus } from '../app/bus'
import { dispatch, env } from '../app/store'
import { avatarPool, isT, pcol, picks, pname, tSize, type PickId } from '../core/game'
import type { State } from '../core/types'
import { GEN, ak, fansOf, realName } from '../services/catalog'
import { ArtImg, AvImg, Btn, Presence, Seg, Sel, type Opt } from '../ui/primitives'
import { Warn } from '../ui/Warn'
import { PairPanel } from '../ui/PairPanel'

const pick = (id: PickId) => (v: string) => dispatch({ type: 'pick', id, v })

/** Eigenes Bild: quadratisch zuschneiden, 160 px, JPEG 0,82 (wie uploadAvatar im Original). */
function uploadAvatar(p: number) {
  const inp = document.createElement('input')
  inp.type = 'file'
  inp.accept = 'image/*'
  inp.onchange = () => {
    const f = inp.files && inp.files[0]
    if (!f) return
    if (!/^image\//.test(f.type)) {
      bus.emit('toast', 'Das ist kein Bild.')
      return
    }
    const fr = new FileReader()
    fr.onload = () => {
      const img = new Image()
      img.onload = () => {
        const sz = 160,
          c = document.createElement('canvas')
        c.width = sz
        c.height = sz
        const g = c.getContext('2d')!
        const m = Math.min(img.width, img.height)
        g.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, sz, sz)
        dispatch({ type: 'uploadAvatar', p, url: c.toDataURL('image/jpeg', 0.82) })
      }
      img.onerror = () => bus.emit('toast', 'Bild konnte nicht gelesen werden.')
      img.src = fr.result as string
    }
    fr.onerror = () => bus.emit('toast', 'Bild konnte nicht gelesen werden.')
    fr.readAsDataURL(f)
  }
  inp.click()
}

/** Namensfeld, das beim Tippen nicht springt (gespeichert wird bei jeder Eingabe). */
function NameInput({ value, onValue, ...rest }: { value: string; onValue: (v: string) => void } & React.InputHTMLAttributes<HTMLInputElement>) {
  const [v, setV] = useState(value)
  const focused = useRef(false)
  useEffect(() => {
    if (!focused.current) setV(value)
  }, [value])
  return (
    <input
      type="text"
      maxLength={16}
      value={v}
      onFocus={() => (focused.current = true)}
      onBlur={() => {
        focused.current = false
        setV(value)
      }}
      onChange={(e) => {
        setV(e.target.value)
        onValue(e.target.value)
      }}
      {...rest}
    />
  )
}

function ArtistList({ S }: { S: State }) {
  useSyncExternalStore(subscribeList, listVersion, listVersion)
  useEffect(() => {
    if (!hasList()) loadGenre(S.genre)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const { gList, shown } = getList()
  const boxRef = useRef<HTMLDivElement>(null)
  if (!gList.length)
    return (
      <div id="alist" className="alist" ref={boxRef}>
        <p className="hint" style={{ gridColumn: '1/-1' }}>
          Nichts gefunden.
        </p>
      </div>
    )
  const inP = new Set(S.pool.map((x) => ak(x)))
  return (
    <div id="alist" className="alist" ref={boxRef}>
      {gList.slice(0, shown).map((n, i) => {
        const has = inP.has(ak(n)),
          f = fansOf(n)
        return (
          <motion.div
            className={'arow' + (has ? ' in' : '')}
            key={n + '|' + i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i, 20) * 0.015, type: 'spring', stiffness: 300, damping: 26 }}
          >
            <ArtImg n={n} />
            <span className="meta">
              <span className="nm">{realName(n)}</span>
              <span className="sub">{f ? Math.round(f / 1000) + 'K Fans' : 'Artist'}</span>
            </span>
            <motion.button className={'act ' + (has ? 'rm' : '')} data-add={n} whileTap={{ scale: 0.8 }} onClick={() => dispatch({ type: 'poolToggle', name: n })} aria-label={(has ? 'Aus dem Topf: ' : 'In den Topf: ') + n}>
              {has ? '✓' : '+'}
            </motion.button>
          </motion.div>
        )
      })}
      {gList.length > shown ? (
        <button className="btn ghost sm" id="moreBtn" style={{ gridColumn: '1/-1', marginTop: 6 }} onClick={showMore}>
          Mehr laden
        </button>
      ) : null}
    </div>
  )
}

function PlayersCard({ S }: { S: State }) {
  const pool = avatarPool(S)
  const [open, setOpen] = useState<number | null>(null)
  const rows = []
  for (let p = 1; p <= S.players; p++) {
    rows.push(
      <div className={'prow' + (open === p ? ' open' : '')} key={p} style={{ ['--pc' as string]: pcol(S, p) }}>
        <div className="ptop">
          <button type="button" className="pav-btn" data-avtoggle={p} aria-expanded={open === p} onClick={() => setOpen(open === p ? null : p)} title="Avatar ändern">
            <AvImg S={S} p={p} className="pav" />
            <span className="pav-edit" aria-hidden>
              ✎
            </span>
          </button>
          <NameInput data-nm={p} value={pname(S, p)} onValue={(v) => dispatch({ type: 'name', p, value: v })} aria-label={'Name Spieler ' + p} />
        </div>
        <div className="avgrid" style={{ ['--ac' as string]: pcol(S, p) }}>
          {pool.map((a, i) => {
            let tk = false
            for (let q = 1; q <= S.players; q++) if (q !== p && S.avatar[q] === a) tk = true
            return (
              <button type="button" key={i} data-av={p} data-i={i} className={S.avatar[p] === a ? 'on' : ''} disabled={tk} onClick={() => (dispatch({ type: 'avatar', p, i }), setOpen(null))}>
                <img src={a} alt="" loading="lazy" />
              </button>
            )
          })}
          <button type="button" className="upav" data-up={p} title="Eigenes Bild hochladen" onClick={() => uploadAvatar(p)}>
            +
          </button>
        </div>
      </div>,
    )
  }
  return (
    <section className="card scard" data-card="players">
      <div className="cardhead">
        <h2 style={{ margin: 0 }}>Spieler</h2>
      </div>
      <Seg id="players" label="Wie viele?" value={S.players} onPick={pick('players')} opts={[2, 3, 4, 5, 6].map((v) => ({ v, t: String(v) }))} />
      <div className="plist">{rows}</div>
    </section>
  )
}

function RosterCard({ S }: { S: State }) {
  const pool = avatarPool(S)
  const [open, setOpen] = useState<number | null>(null)
  return (
    <section className="card scard" data-card="players">
      <div className="cardhead">
        <h2 style={{ margin: 0 }}>Kader</h2>
        <span className="kader-n">{tSize(S)} Spieler · Turnierbaum</span>
      </div>
      <div className="plist">
        {S.T!.roster.map((r, i) => (
          <div className={'prow' + (open === i ? ' open' : '')} key={i} style={{ ['--pc' as string]: r.col }}>
            <div className="ptop">
              <button type="button" className="pav-btn" data-tavtoggle={i} aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)} title="Avatar ändern">
                <img className="pav" src={r.av} alt="" style={{ ['--pc' as string]: r.col }} />
                <span className="pav-edit" aria-hidden>
                  ✎
                </span>
              </button>
              <NameInput data-tn={i} value={r.name} onValue={(v) => dispatch({ type: 'tName', i, value: v })} aria-label={'Name Kaderplatz ' + (i + 1)} />
            </div>
            <div className="avgrid" style={{ ['--ac' as string]: r.col }}>
              {pool.map((a, j) => {
                const tk = pool.length >= tSize(S) && S.T!.roster.some((o, k) => k !== i && o.av === a)
                return (
                  <button type="button" key={j} data-tav={i} data-i={j} className={r.av === a ? 'on' : ''} disabled={tk} onClick={() => (dispatch({ type: 'tAvatar', i, j }), setOpen(null))}>
                    <img src={a} alt="" loading="lazy" />
                  </button>
                )
              })}
              <button type="button" className="upav" data-tup={i} title="Eigenes Bild hochladen" onClick={() => uploadAvatar(-1 - i)}>
                +
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export function Setup({ S }: { S: State }) {
  const need = picks(S)
  const [adv, setAdv] = useState(false)
  const genreOpts: Opt[] = Object.keys(GEN).map((k) => ({ v: k, t: GEN[k].label }))
  return (
    <div className="setup">
      <Warn S={S} />
      <div className="setup-head">
        <p className="eyebrow">— neues match</p>
        <h2 className="display">
          Sound <em>Clash</em>
        </h2>
        <p className="lede">Blind ranken. Song für Song. Bis einer krönt.</p>
      </div>
      <section className="card scard" data-card="mode">
        <Seg id="phoneMode" label="Spielweise" value={S.phoneMode ? '1' : '0'} onPick={pick('phoneMode')} opts={[{ v: '0', t: 'Nur Hauptgerät' }, { v: '1', t: '📱 Mit Handys' }]} />
        <p className="hint" style={{ textAlign: 'left', margin: '10px 0 0' }}>
          {S.phoneMode
            ? 'Jeder spielt am eigenen Handy: drehen, setzen und Songs wählen. Dieses Gerät zeigt das Spiel groß und spielt die Musik.'
            : 'Alles wird an diesem Gerät gespielt. Handys können trotzdem zum Abstimmen dazukommen (📱 oben).'}
        </p>
        {S.phoneMode ? <PairPanel /> : null}
      </section>
      {isT(S) ? <RosterCard S={S} /> : <PlayersCard S={S} />}
      <section className="card scard" data-card="cfg">
        <div className="cardhead">
          <h2 style={{ margin: 0 }}>Regeln</h2>
        </div>
        <div className="g2">
          <Seg id="size" label="Songs pro Spieler" value={S.size} onPick={pick('size')} opts={[5, 7, 10, 15].map((v) => ({ v, t: String(v) }))} />
          <Seg id="series" label="Spielmodus" value={S.series} onPick={pick('series')} opts={[{ v: 'single', t: 'Einzelrunde' }, { v: 'bo3', t: 'Best of 3' }, { v: 'bo5', t: 'Best of 5' }]} />
          <Seg id="songMode" label="Songwahl" value={S.songMode} onPick={pick('songMode')} opts={[{ v: 'upfront', t: 'Alle vorab' }, { v: 'perduel', t: 'Vor jedem Duell' }]} />
          <Seg id="audience" label="Wer entscheidet?" value={S.audience ? '1' : '0'} onPick={pick('audience')} opts={[{ v: '0', t: 'Gemeinsam antippen' }, { v: '1', t: 'Publikum stimmt ab' }]} />
        </div>
        <button type="button" className={'advtoggle' + (adv ? ' on' : '')} id="advToggle" aria-expanded={adv} onClick={() => setAdv((a) => !a)}>
          Mehr Optionen <span className="chev">▾</span>
        </button>
        <div className={'adv' + (adv ? ' open' : '')} aria-hidden={!adv}>
          <div className="g2">
            <Sel id="mode" label="Spielart" value={S.mode} onPick={pick('mode')} opts={[{ v: 'clash', t: 'Clash (alle gegen alle)' }, { v: 't4', t: 'Turnier · 4 Spieler' }, { v: 't8', t: 'Turnier · 8 Spieler' }, { v: 't16', t: 'Turnier · 16 Spieler' }]} />
            <Sel id="sameArtist" label="Künstler" value={S.sameArtist ? '1' : '0'} onPick={pick('sameArtist')} opts={[{ v: '0', t: 'Normal \u2014 jeder eigene K\u00fcnstler' }, { v: '1', t: 'Gleicher K\u00fcnstler f\u00fcr alle' }]} />
            <Seg id="pickSec" label="Pick-Timer" value={String(S.pickSec || 0)} onPick={pick('pickSec')} opts={[{ v: '0', t: 'Aus' }, { v: '30', t: '30 Sek' }, { v: '45', t: '45 Sek' }, { v: '60', t: '60 Sek' }]} />
            <Seg id="ambience" label="Album-Wand-Puls" value={S.ambience ? '1' : '0'} onPick={pick('ambience')} opts={[{ v: '1', t: 'An — Wand pulsiert zum Song' }, { v: '0', t: 'Aus' }]} />
            <Seg id="autoScroll" label="Auto-Scroll (Desktop)" value={S.autoScroll ? '1' : '0'} onPick={pick('autoScroll')} opts={[{ v: '1', t: 'An' }, { v: '0', t: 'Aus' }]} />
            {isT(S) ? <Sel id="_x" label="Spieler" value={String(tSize(S))} onPick={pick('_x')} opts={[{ v: String(tSize(S)), t: tSize(S) + ' (Turnierbaum)' }]} /> : null}
          </div>
        </div>
      </section>
      <section className="card pool-card" data-card="pool">
        <div className="cardhead">
          <h2 style={{ margin: 0 }}>Künstler-Topf</h2>
          <motion.span className="pill" key={S.pool.length} initial={env.reduce ? false : { scale: 1.25 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 18 }}>
            ♪ <b>{S.pool.length}</b> im Topf
          </motion.span>
        </div>
        <div className="g2" style={{ marginBottom: 14 }}>
          <Sel id="genre" label="Genre wählen" value={S.genre || ''} onPick={pick('genre')} opts={genreOpts} />
          <div className="field">
            <label htmlFor="asearch">Künstler suchen…</label>
            <div className="searchwrap">
              <span className="mag" aria-hidden>
                ⌕
              </span>
              <input key={S.genre} type="text" id="asearch" placeholder="Künstler suchen…" autoComplete="off" onChange={(e) => onSearch(e.target.value, S.genre)} />
            </div>
          </div>
        </div>
        <ArtistList S={S} />
        {S.pool.length ? (
          <>
            <p className="kicker" style={{ margin: '18px 0 8px' }}>
              Im Topf · {S.pool.length}
            </p>
            <div className="poolchips">
              <Presence>
                {S.pool.map((a) => (
                  <motion.span className="pchip-pool" key={a} layout={!env.reduce} initial={env.reduce ? false : { opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={env.reduce ? undefined : { opacity: 0, scale: 0.7, transition: { duration: 0.12 } }}>
                    <ArtImg n={a} />
                    <span className="nm">{a}</span>
                    <button className="act rm" data-rm={a} onClick={() => dispatch({ type: 'poolRemove', name: a })} aria-label={'Entfernen: ' + a}>
                      ✕
                    </button>
                  </motion.span>
                ))}
              </Presence>
            </div>
          </>
        ) : null}
      </section>
      <div className="startbar">
        <span className="hint" style={{ margin: 0, textAlign: 'left' }}>
          Mindestens {need} Künstler in den Topf legen.
        </span>
        <Btn id="startBtn" className={S.pool.length >= need ? 'ready' : ''} disabled={S.pool.length < need} onClick={() => dispatch({ type: 'start' })}>
          Match starten →
        </Btn>
      </div>
    </div>
  )
}
