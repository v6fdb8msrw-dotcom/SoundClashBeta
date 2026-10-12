import { useEffect, useRef, useState } from 'react'
import { bus } from '../app/bus'

/** Hinweis oben (3 s), wie toast() im Original. Bleibt im DOM, damit Ansagen für Screenreader klappen. */
export function Toast() {
  const [msg, setMsg] = useState('')
  const [show, setShow] = useState(false)
  const [n, setN] = useState(0)
  const t = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(
    () =>
      bus.on('toast', (m) => {
        setMsg(String(m))
        setShow(true)
        setN((x) => x + 1)
        clearTimeout(t.current)
        t.current = setTimeout(() => setShow(false), 3000)
      }),
    [],
  )
  return (
    <div className={'toast' + (show ? ' show' : '')} id="toast" role="status" aria-live="polite" key={n}>
      {msg}
    </div>
  )
}
