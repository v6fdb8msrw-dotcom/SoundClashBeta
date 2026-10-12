import { motion } from 'motion/react'
import { dispatch, env } from '../app/store'
import { GEN } from '../services/catalog'

/** Gemeinsame Bausteine der Minispiele. */

export function Backlink() {
  return (
    <button className="backlink" data-go="home" onClick={() => dispatch({ type: 'go', to: 'home' })}>
      ← Menü
    </button>
  )
}

/** gGenreLabel im Original: ein Genre → Name, sonst „n Kategorien“. */
export function genreLabel(arr: string[] | undefined) {
  const a = (arr || []).filter(Boolean)
  return a.length === 1 ? GEN[a[0]].label : a.length + ' Kategorien'
}
export function GenreLabel({ arr }: { arr: string[] | undefined }) {
  return <>{genreLabel(arr)}</>
}

export function Chips({ keys, on, attr, onToggle }: { keys: string[]; on: string[]; attr: string; onToggle: (k: string) => void }) {
  return (
    <div className="gchips">
      {keys.map((k) => (
        <motion.button key={k} className={'gchip' + (on.includes(k) ? ' on' : '')} {...{ [attr]: k }} onClick={() => onToggle(k)} whileTap={env.reduce ? undefined : { scale: 0.92 }}>
          {GEN[k].label}
        </motion.button>
      ))}
    </div>
  )
}

export function LoadingEq({ text }: { text: string }) {
  return (
    <div className="gsload">
      <div className="eqload">
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>
      <p>{text}</p>
    </div>
  )
}
