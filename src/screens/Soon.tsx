import { dispatch } from '../app/store'
import type { State } from '../core/types'
import { Btn } from '../ui/primitives'

/** „Im Aufbau“-Bildschirm (im Original nicht erreichbar). */
export function Soon({ S }: { S: State }) {
  const M: Record<string, { ic: string; t: string; d: string }> = {
    sing: { ic: '🎤', t: 'Sing It Back', d: 'Der Song stoppt mittendrin — du singst weiter, danach kommt die Auflösung.' },
  }
  const m = M[S.pendingMode || ''] || { ic: '🎧', t: 'Neuer Modus', d: 'Kommt bald.' }
  return (
    <div className="soon">
      <div className="ic">{m.ic}</div>
      <p className="eyebrow" style={{ textAlign: 'center' }}>
        — im aufbau
      </p>
      <h2 className="display" style={{ fontSize: 'clamp(32px,6vw,56px)' }}>
        {m.t}
      </h2>
      <p className="lede" style={{ textAlign: 'center' }}>
        {m.d}
      </p>
      <p className="lede" style={{ textAlign: 'center', opacity: 0.65, fontSize: 15 }}>
        Dieser Modus ist noch im Aufbau — die Idee steht, das Spiel selbst kommt als Nächstes.
      </p>
      <div style={{ marginTop: 24 }}>
        <Btn data-go="home" onClick={() => dispatch({ type: 'go', to: 'home' })}>
          ← Zurück zum Menü
        </Btn>
      </div>
    </div>
  )
}
