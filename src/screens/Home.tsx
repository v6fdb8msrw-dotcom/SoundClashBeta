import { motion } from 'motion/react'
import { useMemo } from 'react'
import { dispatch } from '../app/store'
import { Tilt } from '../ui/primitives'

const list = { hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } } }
const item = { hidden: { opacity: 0, y: 30, scale: 0.96 }, show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 220, damping: 22 } } }

function Tile(props: { go: string; ic: string; name: string; desc: string; tag: string; feat?: boolean; prod?: boolean }) {
  return (
    <motion.div variants={item} className={'tile-wrap' + (props.feat ? ' feat' : '')}>
      <Tilt className="tile-tilt" max={7}>
        <button className={'mode-tile' + (props.feat ? ' feat' : '') + (props.prod ? ' is-prod' : '')} data-go={props.go} onClick={() => dispatch({ type: 'go', to: props.go })}>
          {props.prod ? <span className="badge-prod">⚙ In Production</span> : null}
          <div className="mt-ic">
            <span className="mt-orbit" aria-hidden />
            {props.ic}
          </div>
          <h3 className="mt-name">{props.name}</h3>
          <p className="mt-desc">{props.desc}</p>
          <div className="mt-foot">
            <span className="mt-tag">{props.tag}</span>
            <span className="mt-play">Spielen →</span>
          </div>
        </button>
      </Tilt>
    </motion.div>
  )
}

export function Home() {
  const bars = useMemo(() => Array.from({ length: 44 }, () => ({ d: (Math.random() * 1.1).toFixed(2), du: (0.6 + Math.random() * 0.7).toFixed(2) })), [])
  return (
    <div className="home">
      <div className="home-hero" aria-hidden>
        <div className="hero-orbit">
          <div className="home-disc">
            <span className="lab">
              <span className="lab-bolt" />
            </span>
            <span className="sheen" />
          </div>
          <span className="orbit-ring r1" />
          <span className="orbit-ring r2" />
        </div>
        <div className="eq">
          {bars.map((b, i) => (
            <i key={i} style={{ animationDelay: b.d + 's', animationDuration: b.du + 's' }} />
          ))}
        </div>
      </div>
      <p className="eyebrow">— party music games</p>
      <h1 className="home-title">
        Sound <em>Clash</em>
      </h1>
      <p className="lede">Wähle deinen Modus.</p>
      <motion.div className="modes" variants={list} initial="hidden" animate="show">
        <Tile go="setup" ic="🥊" name="Sound Clash" desc="Blind ranken, Song für Song — bis einer krönt. Der Original-Modus." tag="2–6 Spieler" feat />
        <Tile go="guess" ic="🎧" name="Guess the Song" desc="Errate den Song an einer Mini-Stichprobe. Je früher du triffst, desto mehr Punkte." tag="1 Spieler" prod />
        <Tile go="timeline" ic="🕰️" name="Timeline Masters" desc="Erkenne den Song an der 30-Sek-Vorschau und sortiere ihn ins richtige Jahr. Wer zuerst 10 hat, gewinnt." tag="2–6 Spieler" prod />
      </motion.div>
    </div>
  )
}
