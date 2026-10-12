import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { dispatch, env } from '../app/store'
import { drawer, filled, N, pcol, picks, placedN, pname, pts, sameArt, wins } from '../core/game'
import type { State } from '../core/types'
import { picBigOf, picOf } from '../services/catalog'
import { burst, burstAt } from '../ui/Fx'
import { ArtImg, AvImg, Btn, Presence, hideOnError } from '../ui/primitives'
import { Wheel } from './Wheel'

/** Ziehen: Rad in der Mitte, Spalten pro Spieler, Künstler blind auf einen Platz setzen. */

function Slot({ S, p, i, active, shared }: { S: State; p: number; i: number; active: boolean; shared?: boolean }) {
  const two = pts(S, i + 1) === 2
  const a = shared ? (S.lineup[1] || [])[i] : S.lineup[p][i]
  const canPick = shared ? !!S.pending && !a : active && !!S.pending && !a
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

function Cluster({ S, p, pl }: { S: State; p: number; pl: number }) {
  const active = p === pl,
    col = pcol(S, p)
  const slots = []
  for (let i = 0; i < N(S); i++) slots.push(<Slot key={i} S={S} p={p} i={i} active={active} />)
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

export function Draft({ S }: { S: State }) {
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
