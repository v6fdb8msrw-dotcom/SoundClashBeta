import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { tvZoom } from '../services/display'

/**
 * Spielbildschirme passen ohne Scrollen auf den Bildschirm (Tims Vorgabe): Ziehen, Songwahl,
 * Aufdecken und Duell. Das Spielfeld bekommt die verfügbare Höhe als `--fitH` (Kacheln enden
 * unten bündig mit dem Bildschirm); ist der Inhalt trotzdem höher, wird er passend verkleinert
 * (bis 60 %), danach scrollt nur der Inhalt selbst. Start- und Endbildschirme scrollen normal.
 * Auf schmalen Geräten (Handy hochkant) bleibt alles wie bisher – dort wäre Verkleinern unleserlich.
 */

const MIN_ZOOM = 0.6
const BOTTOM = 18
const WIDE = '(min-width: 900px)'

interface FitState {
  z: number
  h: number
  over: boolean
}

export function Fit({ on, children }: { on: boolean; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState<FitState>({ z: 1, h: 0, over: false })
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia(WIDE).matches)
  const active = on && wide

  useLayoutEffect(() => {
    const mq = window.matchMedia(WIDE)
    const f = () => setWide(mq.matches)
    mq.addEventListener('change', f)
    return () => mq.removeEventListener('change', f)
  }, [])

  useLayoutEffect(() => {
    const root = document.documentElement
    if (!active) {
      root.removeAttribute('data-fit')
      setFit({ z: 1, h: 0, over: false })
      return
    }
    root.setAttribute('data-fit', '')
    window.scrollTo(0, 0)
    const el = box.current
    if (!el) return
    let raf = 0
    const measure = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const tv = tvZoom()
        // Natürliche Höhe messen: ohne Verkleinerung und ohne Auffüllen
        el.style.zoom = ''
        el.style.height = ''
        el.style.setProperty('--fitH', '0px')
        const r = el.getBoundingClientRect()
        const avail = window.innerHeight - r.top - BOTTOM * tv
        if (avail <= 0 || r.height <= 0) return
        const z = Math.max(MIN_ZOOM, Math.min(1, avail / r.height))
        const over = r.height * MIN_ZOOM > avail
        const h = Math.floor(avail / (tv * z))
        // sofort zurücksetzen (kein Flackern), React übernimmt dieselben Werte
        el.style.zoom = z === 1 ? '' : String(z)
        el.style.setProperty('--fitH', h + 'px')
        if (over) el.style.height = h + 'px'
        setFit((f) => (Math.abs(f.z - z) < 0.005 && f.h === h && f.over === over ? f : { z, h, over }))
      })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    for (const c of Array.from(el.children)) ro.observe(c)
    // Kopfleiste kann nach dem Hochscrollen wieder wachsen – dann neu einpassen
    const head = el.closest('.wrap')?.querySelector('header')
    if (head) ro.observe(head)
    const t1 = setTimeout(measure, 350)
    const t2 = setTimeout(measure, 1000)
    const mo = new MutationObserver(() => {
      for (const c of Array.from(el.children)) ro.observe(c)
      measure()
    })
    mo.observe(el, { childList: true })
    window.addEventListener('resize', measure)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(t1)
      clearTimeout(t2)
      ro.disconnect()
      mo.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [active])

  useLayoutEffect(() => () => document.documentElement.removeAttribute('data-fit'), [])

  if (!active) return <>{children}</>
  return (
    <div
      className={'fitbox' + (fit.over ? ' fit-scroll' : '')}
      ref={box}
      style={{ zoom: fit.z === 1 ? undefined : fit.z, height: fit.over ? fit.h : undefined, ['--fitH' as string]: fit.h ? fit.h + 'px' : undefined }}
    >
      {children}
    </div>
  )
}
