import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { bus } from '../app/bus'
import { getState } from '../app/store'

/**
 * Offline-Fähigkeit und Updates (Service Worker, nur im gebauten Zustand).
 * Neue Version: auf Start-/Setup-Bildschirm sofort neu laden, mitten im Spiel erst nachfragen.
 */
export function UpdatePrompt() {
  const [ready, setReady] = useState(false)
  const updater = useRef<((reload?: boolean) => Promise<void>) | null>(null)
  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
    let registration: ServiceWorkerRegistration | undefined
    let timer: number | undefined
    const safe = () => ['home', 'setup', 'gssetup', 'tlsetup'].includes(getState().screen)
    const check = () => {
      if (document.visibilityState === 'visible') void registration?.update().catch(() => undefined)
    }
    void import('virtual:pwa-register').then(({ registerSW }) => {
      updater.current = registerSW({
        immediate: true,
        onNeedRefresh: () => {
          if (safe()) void updater.current?.(true)
          else setReady(true)
        },
        onOfflineReady: () => bus.emit('toast', 'Offline bereit: Sound Clash startet jetzt auch ohne Internet.'),
        onRegisteredSW: (_url, reg) => {
          registration = reg
          timer = window.setInterval(check, 30 * 60 * 1000)
        },
      })
    })
    document.addEventListener('visibilitychange', check)
    return () => {
      document.removeEventListener('visibilitychange', check)
      window.clearInterval(timer)
    }
  }, [])
  return (
    <AnimatePresence>
      {ready ? (
        <motion.div className="update" initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}>
          <span>Neue Version bereit</span>
          <button className="tool" onClick={() => void updater.current?.(true)}>
            Aktualisieren
          </button>
          <button className="tool icon" aria-label="Später" onClick={() => setReady(false)}>
            ✕
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
