import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, type CSSProperties } from 'react'
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

function Cluster({ S, p, pl, ro, place }: { S: State; p: number; pl: number; ro?: boolean; place?: CSSProperties }) {
  const active = p === pl,
    col = pcol(S, p)
  const slots = []
  for (let i = 0; i < N(S); i++) slots.push(<Slot key={i} S={S} p={p} i={i} active={active} ro={ro} />)
  // Listen-Raster neben dem Rad: #1 … #5 untereinander, bei mehr Plätzen in 2–3 Spalten
  const cols = N(S) <= 5 ? 1 : N(S) <= 10 ? 2 : 3
  return (
    <motion.div className={'pcluster' + (active ? ' on' : '')} style={{ ['--pc' as string]: col, ['--cols' as string]: cols, ['--srows' as string]: Math.ceil(N(S) / cols), ['--mcols' as string]: N(S) <= 5 ? N(S) : Math.ceil(N(S) / 2), ...place }} layout={false} animate={{ scale: active ? 1 : 0.985 }} transition={{ type: 'spring', stiffness: 300, damping: 26 }}>
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
 * Ziehen: Rad in der Mitte, Spielfelder daneben. Im Handy-Modus derselbe Bildschirm (Tims Vorgabe) –
 * wer sein Handy verbunden hat, dreht und setzt dort; hier steht dann nur der Hinweis.
 */
export function Draft({ S }: { S: State }) {
  const online = useOnline()
  const pl = S.pending ? S.pending.player : drawer(S),
    c = pcol(S, pl)
  const phone = S.phoneMode && online.has(pl)
  const two2 = S.players === 2
  const placed = placedN(S)
  const filled1 = filled(S, 1)

  // Auto-Scroll (Desktop): nach dem Ziehen zur Spalte, danach zurück zum Rad
  useEffect(() => {
    if (S.autoScroll === false || env.reduce || S.spin) return
    if (document.documentElement.hasAttribute('data-fit')) return
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
    <div className={'card stage draftstage' + (phone ? ' phonectl' : '')} style={{ ['--pc' as string]: c }}>
      <Wheel S={S} revealing={!!S.pending}>
        <Presence>{S.pending ? <Reveal key={S.pending.artist + placed} S={S} pl={pl} /> : null}</Presence>
      </Wheel>
      {phone ? (
        <motion.p className="phonehint" key={(S.pending ? 'p' : S.spin ? 'r' : 's') + placed} style={{ color: c }} initial={env.reduce ? false : { y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          📱 {pname(S, pl)} {S.pending ? 'setzt den Künstler am Handy' : S.spin ? 'dreht …' : 'dreht am Handy'}
        </motion.p>
      ) : S.pending ? (
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
    for (let i = 0; i < N(S); i++) slots.push(<Slot key={i} S={S} p={1} i={i} active shared ro={phone} />)
    return (
      <div className="draft-fit">
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
      </div>
    )
  }
  // Spielfelder links und rechts vom Rad: ungerade Spieler links, gerade rechts (P1 P2 / P3 P4 / P5 P6).
  // Die Reihenfolge im Seitenaufbau bleibt P1, P2, … – angeordnet wird nur per CSS-Raster.
  const rows = Math.ceil(S.players / 2)
  const place = (p: number): CSSProperties => {
    const span = S.players % 2 === 1 && p === S.players - 1 ? 2 : 1
    return { ['--gc' as string]: p % 2 ? '1' : '3', ['--gr' as string]: Math.ceil(p / 2) + ' / span ' + span }
  }
  const sides = 'draftgrid sides list n' + S.players
  const style = { ['--wr' as string]: '1 / span ' + rows }
  // 2 Spieler (Ausnahme, Tims Vorgabe): beide Felder immer groß neben dem Rad, P1 links, P2 rechts –
  // in beiden Modi; wer dran ist, bleibt an seiner Stelle
  if (two2)
    return (
      <div className="draft-fit">
        {head}
        <div className={sides} style={style}>
          <Cluster S={S} p={1} pl={pl} place={place(1)} ro={phone} />
          {wheel}
          <Cluster S={S} p={2} pl={pl} place={place(2)} ro={phone} />
        </div>
      </div>
    )
  // Ab 3 Spielern (Tims Wunsch): wer am Zug ist, steht rechts groß wie bei 2 Spielern; die anderen
  // links – bei 3–4 Spielern als kompakte Felder, bei 5–6 als Mini-Leisten mit kleinen Kästchen.
  const others = Array.from({ length: S.players }, (_, j) => j + 1).filter((p) => p !== pl)
  const k = others.length
  const focusPlace = (p: number): CSSProperties =>
    p === pl ? { ['--gc' as string]: '3', ['--gr' as string]: '1 / span ' + k } : { ['--gc' as string]: '1', ['--gr' as string]: String(others.indexOf(p) + 1) }
  const cl = []
  for (let p = 1; p <= S.players; p++) cl.push(<Cluster key={p} S={S} p={p} pl={pl} place={focusPlace(p)} ro={phone} />)
  return (
    <div className="draft-fit">
      {head}
      <div className={'draftgrid sides focus n' + S.players + (S.players >= 5 ? ' mini' : '')} style={{ ['--wr' as string]: '1 / span ' + k }}>
        {wheel}
        {cl}
      </div>
    </div>
  )
}
