import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { env } from '../app/store'

/** Titelmoment beim Öffnen: Platte läuft an, Titel baut sich auf. Blockiert keine Eingaben. */
export function Splash() {
  const [on, setOn] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setOn(false), env.reduce ? 300 : 1700)
    return () => clearTimeout(t)
  }, [])
  const letters = 'Sound Clash'.split('')
  return (
    <AnimatePresence>
      {on ? (
        <motion.div id="splash" key="splash" aria-hidden exit={{ opacity: 0, scale: 1.04, filter: 'blur(12px)' }} transition={{ duration: env.reduce ? 0 : 0.45, ease: 'easeOut' }}>
          <div className="sp-deck">
            <motion.div className="sp-ring" initial={{ scale: 0.6, opacity: 0, rotate: -90 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 120, damping: 16 }} />
            <motion.div className="sp-disc" initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 140, damping: 14, delay: 0.1 }}>
              <span className="sp-label" />
            </motion.div>
          </div>
          <div className="sp-title">
            {letters.map((ch, i) => (
              <motion.span
                key={i}
                className={i > 5 ? 'em' : ''}
                initial={{ opacity: 0, y: 26, rotateX: -80, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, rotateX: 0, filter: 'blur(0px)' }}
                transition={{ delay: 0.35 + i * 0.045, type: 'spring', stiffness: 260, damping: 18 }}
              >
                {ch === ' ' ? ' ' : ch}
              </motion.span>
            ))}
          </div>
          <motion.div className="sp-sub" initial={{ opacity: 0, letterSpacing: '0.6em' }} animate={{ opacity: 1, letterSpacing: '0.28em' }} transition={{ delay: 0.9, duration: 0.6 }}>
            Blind ranken · Song für Song
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
