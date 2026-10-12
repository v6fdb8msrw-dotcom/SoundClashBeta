import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring, useTransform, type HTMLMotionProps } from 'motion/react'
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react'
import { pav, pcol } from '../core/game'
import type { State } from '../core/types'
import { audioVersion, beat, playing, subscribeAudio } from '../services/audio'
import { picOf } from '../services/catalog'
import { deezerVersion, subscribeDeezer } from '../services/deezer'

/* ------------------------------------------------------------------ */
/* Abos auf Dienste                                                    */
/* ------------------------------------------------------------------ */

export function useAudio() {
  useSyncExternalStore(subscribeAudio, audioVersion, audioVersion)
  return { playing, beat }
}
export function useDeezer() {
  return useSyncExternalStore(subscribeDeezer, deezerVersion, deezerVersion)
}
export const isTouch = () => typeof window !== 'undefined' && window.matchMedia?.('(hover: none)').matches

/* ------------------------------------------------------------------ */
/* Auswahlfeld (wie dd() im Original: .sel / data-tg / data-op)         */
/* ------------------------------------------------------------------ */

let openSel: string | null = null
const selListeners = new Set<() => void>()
const selSub = (f: () => void) => {
  selListeners.add(f)
  return () => selListeners.delete(f)
}
export function setOpenSel(id: string | null) {
  openSel = id
  selListeners.forEach((f) => f())
}
const getOpen = () => openSel
export function useOpenSel() {
  return useSyncExternalStore(selSub, getOpen, getOpen)
}

export interface Opt {
  v: string | number
  t: string
}

/** Auswahlfeld. `label` wird als Feldbeschriftung gezeigt; `slbl` statt Wert (Kopfleiste). */
export function Sel(props: { id: string; label?: string; value: string | number; opts: Opt[]; onPick: (v: string) => void; slbl?: ReactNode; icon?: ReactNode; className?: string }) {
  const { id, label, value, opts, onPick, slbl, icon } = props
  const open = useOpenSel() === id
  const cur = opts.find((o) => String(o.v) === String(value))
  const ref = useRef<HTMLDivElement>(null)
  const [up, setUp] = useState(false)
  useEffect(() => {
    if (!open || !ref.current) return
    const menu = ref.current.querySelector('.selmenu') as HTMLElement | null
    const r = ref.current.getBoundingClientRect(),
      h = Math.min((menu?.scrollHeight || 0) + 14, 314)
    setUp(r.bottom + h > window.innerHeight - 8 && r.top - h > 8)
  }, [open])
  const sel = (
    <div className={'sel' + (open ? ' open' : '') + (props.className ? ' ' + props.className : '')} data-sel={id} ref={ref}>
      <button
        type="button"
        data-tg={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation()
          setOpenSel(open ? null : id)
        }}
      >
        {icon}
        {slbl ?? <span>{cur ? cur.t : '—'}</span>}
        <span className="chev" aria-hidden>
          ▾
        </span>
      </button>
      <div className={'selmenu' + (up ? ' up' : '')} role="listbox">
        {opts.map((o) => (
          <button
            key={String(o.v)}
            type="button"
            role="option"
            data-op={id}
            data-v={String(o.v)}
            aria-selected={String(o.v) === String(value)}
            onClick={(e) => {
              e.stopPropagation()
              setOpenSel(null)
              onPick(String(o.v))
            }}
          >
            {o.t}
          </button>
        ))}
      </div>
    </div>
  )
  if (label === undefined) return sel
  return (
    <div className={'field' + (open ? ' raise' : '')}>
      <label>{label}</label>
      {sel}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Knopf mit Federphysik                                               */
/* ------------------------------------------------------------------ */

export function Btn({ className, children, ...rest }: Omit<HTMLMotionProps<'button'>, 'children'> & { className?: string; children?: ReactNode }) {
  const reduce = useReducedMotion()
  return (
    <motion.button
      type="button"
      className={'btn ' + (className || '')}
      whileHover={reduce || rest.disabled ? undefined : { scale: 1.035, y: -1 }}
      whileTap={reduce || rest.disabled ? undefined : { scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 520, damping: 24, mass: 0.6 }}
      {...rest}
    >
      <span className="btn-sheen" aria-hidden />
      {children}
    </motion.button>
  )
}

/* ------------------------------------------------------------------ */
/* 3D-Neigung (Maus) mit Lichtreflex                                    */
/* ------------------------------------------------------------------ */

export function Tilt({ children, className, style, max = 9, glare = true, ...rest }: Omit<HTMLMotionProps<'div'>, 'children' | 'style'> & { max?: number; glare?: boolean; className?: string; style?: CSSProperties; children?: ReactNode }) {
  const reduce = useReducedMotion()
  const mx = useMotionValue(0.5),
    my = useMotionValue(0.5)
  const sx = useSpring(mx, { stiffness: 220, damping: 22 }),
    sy = useSpring(my, { stiffness: 220, damping: 22 })
  const rotateY = useTransform(sx, [0, 1], [-max, max])
  const rotateX = useTransform(sy, [0, 1], [max, -max])
  const gx = useTransform(sx, (v) => `${v * 100}%`)
  const gy = useTransform(sy, (v) => `${v * 100}%`)
  const enabled = !reduce && !isTouch()
  return (
    <motion.div
      className={'tilt ' + (className || '')}
      style={enabled ? { ...style, rotateX, rotateY, transformPerspective: 900, ['--gx' as string]: gx, ['--gy' as string]: gy } : style}
      onPointerMove={
        enabled
          ? (e) => {
              const r = e.currentTarget.getBoundingClientRect()
              mx.set((e.clientX - r.left) / r.width)
              my.set((e.clientY - r.top) / r.height)
            }
          : undefined
      }
      onPointerLeave={
        enabled
          ? () => {
              mx.set(0.5)
              my.set(0.5)
            }
          : undefined
      }
      {...rest}
    >
      {children}
      {enabled && glare ? <span className="glare" aria-hidden /> : null}
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* Bilder                                                              */
/* ------------------------------------------------------------------ */

const hide = (e: React.SyntheticEvent<HTMLImageElement>) => {
  e.currentTarget.style.visibility = 'hidden'
}

/** Spieler-Avatar (avI im Original). */
export function AvImg({ S, p, className }: { S: State; p: number; className?: string }) {
  return <img className={className || ''} src={pav(S, p)} alt="" style={{ ['--pc' as string]: pcol(S, p) }} onError={hide} />
}

/** Künstlerbild oder ♪-Platzhalter (artI im Original). */
export function ArtImg({ n, className, style }: { n: string; className?: string; style?: CSSProperties }) {
  const u = picOf(n)
  return u ? (
    <img className={className || ''} src={u} alt="" loading="lazy" style={style} onError={hide} />
  ) : (
    <span className={'ph ' + (className || '')} style={style}>
      ♪
    </span>
  )
}

export const hideOnError = hide

/** Kleines Equalizer-Symbol für laufende Vorschauen. */
export function Eq({ on }: { on: boolean }) {
  return (
    <span className={'mini-eq' + (on ? ' on' : '')} aria-hidden>
      <i />
      <i />
      <i />
      <i />
    </span>
  )
}

/**
 * AnimatePresence nur, wenn Bewegung erlaubt ist. Bei reduzierter Bewegung wird sofort
 * umgeschaltet (wie im Original, das den Bildschirm synchron neu aufbaut).
 */
export function Presence({ children, mode }: { children: ReactNode; mode?: 'wait' | 'sync' | 'popLayout' }) {
  const reduce = useReducedMotion()
  if (reduce) return <>{children}</>
  return (
    <AnimatePresence mode={mode} initial={false}>
      {children}
    </AnimatePresence>
  )
}
