import { dispatch } from '../app/store'
import type { State } from '../core/types'
import { dzDead } from '../services/deezer'
import { useDeezer } from './primitives'

/** Hinweis, wenn Deezer nicht erreichbar ist (warnHTML im Original). */
export function Warn({ S }: { S: State }) {
  useDeezer()
  const on = dzDead && !S.warnOff
  return (
    <div className="warn" id="warnbox" style={{ display: on ? 'flex' : 'none' }}>
      <span>⚠</span>
      <span>
        <b>Songsuche gerade nicht erreichbar.</b> Künstler, Bilder und das Rad laufen normal — für Top-Tracks und 30-Sek-Vorschauen braucht die App aber Internet (Deezer). Prüf die Verbindung und
        lade neu. Spotify- und YouTube-Links funktionieren immer.
      </span>
      <button id="warnX" onClick={() => dispatch({ type: 'warnOff' })} aria-label="Hinweis ausblenden">
        ✕
      </button>
    </div>
  )
}
