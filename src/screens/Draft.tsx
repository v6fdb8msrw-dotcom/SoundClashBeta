import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { dispatch, env } from '../app/store'
import { drawer, filled, N, pcol, picks, placedN, pname, pts, sameArt, wins } from '../core/game'
import type { State } from '../core/types'
import { picBigOf, picOf } from '../services/catalog'
import { burst, burstAt } from '../ui/Fx'
import { ArtImg, AvImg, Btn, Presence, hideOnError } from '../ui/primitives'
import { Wheel } from './Wheel'
import { useOnline } from './PhoneMode'

/** Ziehen: Rad in der Mitte, Spalten pro Spieler, Künstler blind auf einen Platz setzen. */

function Slot({ S, p, i, active, shared, ro }: { S: State; p: number; i: number; active: boolean; shared?: boolean; ro?: boolean }) {
  const two = pts(S, i + 1) === 2
  const a = shared ? (S.lineup[1] || [])[i] : S.lineup[p][i]
  const canPick = !ro && (shared ? !!S.pending && !a : active && !!S.pending && !a)
  const ref = useRef<HTMLDivElement>(null)
  return (
    <motion.div
      ref={ref}
      layout={false}
      className={'slot ' + (two ? 'two ' : '') + (a ? 'taken ' : '') + (canPick ? 'pick' : '')}
      {...(canPick ? { 'data-pl': i, role: 'button', tabIndex: 0, 'aria-label': 'Platz ' + (i + 1) } : {})}
      onClick={
        canPick
          ? () => {
              burstAt(ref.current, pcol(S, S.pending!.player), 30, 0.9)
              dispatch({ type: 'place', pos: i })
            }
          : undefined
      }
      onKeyDown={canPick ? (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), dispatch({ type: 'place', pos: i })) : undefined}
      whileHover={canPick && !env.reduce ? { y: -3, scale: 1.04 } : undefined}
    >
      <AnimatePresence>
        {a ? (
          <motion.div className="sart" key={a} initial={env.reduce ? false : { scale: 1.6, opacity: 0, rotate: -8 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }}>
            <ArtImg n={a} />
          </motion.div>
        ) : null}
      </AnimatePresence>
      <div className="n" title={a || undefined}>
        {a ? a : '#' + (i + 1)}
      </div>
      <div className="x">{a ? '#' + (i + 1) : '×' + pts(S, i + 1)}</div>
    </motion.div>
  )
}

function Cluster({ S, p, pl, ro }: { S: State; p: number; pl: number; ro?: boolean }) {
  const active = p === pl,
    col = pcol(S, p)
  const slots = []
  for (let i = 0; i < N(S); i++) slots.push(<Slot key={i} S={S} p={p} i={i} active={active} ro={ro} />)
  return (
    <motion.div className={'pcluster' + (active ? ' on' : '')} style={{ ['--pc' as string]: col }} layout={false} animate={{ scale: active ? 1 : 0.985 }} transition={{ type: 'spring', stiffness: 300, damping: 26 }}>
      <div className="pch">
        <AvImg S={S} p={p} />
        <span>
          <span className="nm">{pname(S, p)}</span>
          <span className="st">
            {filled(S, p)}/{N(S)} Plätze · {wins(S, p)} W
          </span>
        </span>
        {active ? <span className="turn">am Zug</span> : null}
      </div>
      <div className="slots" style={{ ['--pc' as string]: col }}>
        {slots}
      </div>
    </motion.div>
  )
}

function Reveal({ S, pl }: { S: State; pl: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const big = picBigOf(S.pending!.artist) || picOf(S.pending!.artist)
  useEffect(() => {
    if (!ref.current) return
    const r = ref.current.getBoundingClientRect()
    burst(r.left + r.width / 2, r.top + r.height / 2, pcol(S, pl), 46, 1.4)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <motion.div className="reveal" ref={ref} initial={env.reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }}>
      <span className="shock" aria-hidden />
      {big ? (
        <motion.img
          className="rimg"
          src={big}
          alt=""
          onError={(e) => {
            hideOnError(e)
            e.currentTarget.style.display = 'none'
          }}
          initial={env.reduce ? false : { scale: 0.3, rotate: -14, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 240, damping: 15 }}
        />
      ) : null}
      <motion.div className="rname" initial={env.reduce ? false : { y: 16, opacity: 0, filter: 'blur(6px)' }} animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }} transition={{ delay: 0.14, duration: 0.4 }}>
        {S.pending!.artist}
      </motion.div>
      <motion.p className="rto" initial={env.reduce ? false : { y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.24, duration: 0.35 }}>
        → {pname(S, pl)}
      </motion.p>
    </motion.div>
  )
}

/**
 * Handy-Modus: In der Mitte groß das Spielfeld des Spielers am Zug, darunter klein die der anderen.
 * Gedreht wird am Handy; das Rad wird dafür groß eingeblendet und verschwindet nach der Enthüllung.
 */
function CineDraft({ S }: { S: State }) {
  const online = useOnline()
  const pl = S.pending ? S.pending.player : drawer(S),
    c = pcol(S, pl)
  const phone = online.has(pl)
  const placed = placedN(S)
  const filled1 = filled(S, 1)
  const others = Array.from({ length: S.players }, (_, j) => j + 1).filter((p) => p !== pl)
  // Rad einblenden, solange gedreht wird, und danach kurz für die Enthüllung
  const [wheelOn, setWheelOn] = useState(!!S.spin)
  const spinning = !!S.spin
  const lastPlaced = useRef(placed)
  useEffect(() => {
    if (spinning) {
      setWheelOn(true)
      return
    }
    if (lastPlaced.current !== placed) {
      lastPlaced.current = placed
      setWheelOn(false)
      return
    }
    const t = setTimeout(() => setWheelOn(false), env.reduce ? 500 : 2300)
    return () => clearTimeout(t)
  }, [spinning, placed])
  const status = phone
    ? S.spin
      ? 'dreht das Rad …'
      : S.pending
        ? '📱 setzt den Künstler am Handy'
        : '📱 dreht am Handy'
    : S.pending
      ? '↓ Platz wählen ' + (sameArt(S) ? 'im gemeinsamen Grid' : 'in der Spalte')
      : 'Handy nicht verbunden – hier drehen'
  return (
    <div className="cine-draft2" style={{ ['--pc' as string]: c }}>
      <div className="dhead">
        <div className="pills">
          <span className="pill">
            Runde <b>{S.round}</b>
          </span>
          <span className="pill">
            Pick <b>{sameArt(S) ? Math.min(filled1 + 1, N(S)) + ' / ' + N(S) : Math.min(placed + 1, picks(S)) + ' / ' + picks(S)}</b>
          </span>
          <span className="pill">
            Im Topf <b>{S.pool.length}</b>
          </span>
        </div>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pl}
          className="cd-turn"
          initial={env.reduce ? false : { opacity: 0, y: -24, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={env.reduce ? undefined : { opacity: 0, y: 24, filter: 'blur(10px)' }}
          transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <AvImg S={S} p={pl} className="cd-av" />
          <div className="cd-who">
            <p className="kicker">Am Zug</p>
            <h2 className="cd-name">{pname(S, pl)}</h2>
            <p className="phonehint">{status}</p>
          </div>
          <AnimatePresence>
            {S.pending && !wheelOn ? (
              <motion.div
                key={S.pending.artist}
                className="cd-pending"
                initial={env.reduce ? false : { opacity: 0, scale: 0.6, rotate: -8 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={env.reduce ? undefined : { opacity: 0, scale: 0.7, y: 60 }}
                transition={{ type: 'spring', stiffness: 220, damping: 18 }}
              >
                <ArtImg n={S.pending.artist} />
                <span>
                  <small>gezogen</small>
                  <b>{S.pending.artist}</b>
                </span>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>
      <div className="cine-active">{sameArt(S) ? <SharedGrid S={S} pl={pl} c={c} ro={phone} /> : <Cluster S={S} p={pl} pl={pl} ro={phone} />}</div>
      {!phone && !S.pending ? (
        <Btn className="spinbtn" id="spinBtn" disabled={!!S.spin} onClick={() => dispatch({ type: 'spin' })}>
          {S.pool.length === 1 ? 'Letzten Künstler ziehen →' : 'Rad drehen · [space]'}
        </Btn>
      ) : null}
      {!sameArt(S) ? (
        <div className="cine-others">
          {others.map((p) => (
            <div key={p} className="mini-grid" style={{ ['--pc' as string]: pcol(S, p) }}>
              <div className="mg-head">
                <AvImg S={S} p={p} />
                <span className="nm">{pname(S, p)}</span>
                <small>
                  {filled(S, p)}/{N(S)}
                </small>
              </div>
              <div className="mg-slots">
                {(S.lineup[p] || []).map((x, i) => (
                  <span key={i} className={'mg-slot' + (x ? ' on' : '') + (pts(S, i + 1) === 2 ? ' two' : '')} title={x || 'Platz ' + (i + 1)}>
                    {x ? <ArtImg n={x} /> : <i>{i + 1}</i>}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
      <AnimatePresence>
        {wheelOn ? (
          <motion.div key="wheel" className="wheel-overlay" initial={env.reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={env.reduce ? undefined : { opacity: 0 }} transition={{ duration: 0.35 }}>
            <motion.div
              className="wo-inner"
              initial={env.reduce ? false : { scale: 0.55, rotate: -25, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={env.reduce ? undefined : { scale: 1.12, opacity: 0, filter: 'blur(12px)' }}
              transition={{ type: 'spring', stiffness: 130, damping: 18 }}
            >
              <p className="wo-kicker" style={{ color: c }}>
                {pname(S, pl)} {S.pending ? 'hat gezogen' : 'dreht'}
              </p>
              <div className="stage cine-wheel phonectl" style={{ ['--pc' as string]: c }}>
                <Wheel S={S} revealing={!!S.pending}>
                  <Presence>{S.pending ? <Reveal key={S.pending.artist + placed} S={S} pl={pl} /> : null}</Presence>
                </Wheel>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

function SharedGrid({ S, pl, c, ro }: { S: State; pl: number; c: string; ro?: boolean }) {
  const slots = []
  for (let i = 0; i < N(S); i++) slots.push(<Slot key={i} S={S} p={1} i={i} active shared ro={ro} />)
  return (
    <div className="pcluster on" style={{ ['--pc' as string]: c }}>
      <div className="pch">
        <span style={{ fontSize: 22 }}>{'\ud83c\udfaf'}</span>
        <span>
          <span className="nm">Gemeinsames Grid</span>
          <span className="st">
            {filled(S, 1)}/{N(S)} Pl{'\u00e4'}tze {'\u00b7'} alle spielen denselben K{'\u00fc'}nstler
          </span>
        </span>
        {S.pending ? <span className="turn">{pname(S, pl)} setzt</span> : null}
      </div>
      <div className="slots" style={{ ['--pc' as string]: c }}>
        {slots}
      </div>
    </div>
  )
}

export function Draft({ S }: { S: State }) {
  if (S.phoneMode) return <CineDraft S={S} />
  const pl = S.pending ? S.pending.player : drawer(S),
    c = pcol(S, pl)
  const two2 = S.players === 2
  const placed = placedN(S)
  const filled1 = filled(S, 1)

  // Auto-Scroll (Desktop): nach dem Ziehen zur Spalte, danach zurück zum Rad
  useEffect(() => {
    if (S.autoScroll === false || env.reduce || S.spin) return
    if (window.matchMedia('(max-width:640px)').matches) return
    const t = setTimeout(
      () => {
        const el = S.pending ? document.querySelector('.pcluster.on') : document.querySelector('.draftstage') || document.querySelector('.wheelbox')
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      },
      S.pending ? 900 : 300,
    )
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!S.pending, placed, filled1])

  const wheel = (
    <div className="card stage draftstage" style={{ ['--pc' as string]: c }}>
      <Wheel S={S} revealing={!!S.pending}>
        <Presence>{S.pending ? <Reveal key={S.pending.artist + placed} S={S} pl={pl} /> : null}</Presence>
      </Wheel>
      {S.pending ? (
        <motion.p className="askplace" style={{ color: c }} initial={env.reduce ? false : { y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          ↓ {pname(S, pl)}, wähle einen Platz {sameArt(S) ? 'im gemeinsamen Grid' : 'in deiner Spalte'}
        </motion.p>
      ) : (
        <Btn className="spinbtn" id="spinBtn" disabled={!!S.spin} onClick={() => dispatch({ type: 'spin' })}>
          {S.pool.length === 1 ? 'Letzten Künstler ziehen →' : 'Rad drehen · [space]'}
        </Btn>
      )}
    </div>
  )

  const head = (
    <div className="dhead">
      <div className="pills">
        <span className="pill">
          Runde <b>{S.round}</b>
        </span>
        <span className="pill">
          Pick <b>{sameArt(S) ? Math.min(filled1 + 1, N(S)) + ' / ' + N(S) : Math.min(placed + 1, picks(S)) + ' / ' + picks(S)}</b>
        </span>
        <span className="pill turnpill" style={{ borderColor: c, ['--pc' as string]: c }}>
          Am Zug: <b style={{ color: c }}>{pname(S, pl)}</b>
        </span>
      </div>
    </div>
  )

  if (sameArt(S)) {
    const slots = []
    for (let i = 0; i < N(S); i++) slots.push(<Slot key={i} S={S} p={1} i={i} active shared />)
    return (
      <>
        {head}
        <div className="draftgrid solo">
          {wheel}
          <div className="pcluster on" style={{ ['--pc' as string]: c }}>
            <div className="pch">
              <span style={{ fontSize: 22 }}>{'🎯'}</span>
              <span>
                <span className="nm">Gemeinsames Grid</span>
                <span className="st">
                  {filled1}/{N(S)} Pl{'ä'}tze {'·'} alle spielen denselben K{'ü'}nstler
                </span>
              </span>
              {S.pending ? <span className="turn">{pname(S, pl)} setzt</span> : null}
            </div>
            <div className="slots" style={{ ['--pc' as string]: c }}>
              {slots}
            </div>
          </div>
        </div>
      </>
    )
  }
  if (two2)
    return (
      <>
        {head}
        <div className="draftgrid">
          <Cluster S={S} p={1} pl={pl} />
          {wheel}
          <Cluster S={S} p={2} pl={pl} />
        </div>
      </>
    )
  const cl = []
  for (let p = 1; p <= S.players; p++) cl.push(<Cluster key={p} S={S} p={p} pl={pl} />)
  return (
    <>
      {head}
      {wheel}
      <div className="clustergrid">{cl}</div>
    </>
  )
}
