import { motion } from 'motion/react'
import QRCode from 'qrcode'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { getState } from '../app/store'
import { pname } from '../core/game'
import { hostInfo, hostVersion, joinUrl, startHost, stopHost, subscribeHost } from '../remote/host'
import { Btn } from './primitives'

export function useHost() {
  useSyncExternalStore(subscribeHost, hostVersion, hostVersion)
  return hostInfo()
}

/**
 * Handys koppeln: QR-Code scannen → Handy wird Begleiter (abstimmen, eigenes Line-up, selbst setzen
 * und Songs wählen). Das Spiel und die Musik bleiben auf diesem Gerät.
 */
export function PairDialog({ onClose }: { onClose: () => void }) {
  const [code] = useState(() => startHost())
  const info = useHost()
  const [svg, setSvg] = useState('')
  const url = joinUrl(code)
  useEffect(() => {
    void QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#0b0b0e', light: '#ffffff' } }).then(setSvg)
  }, [url])
  const S = getState()
  const roles = info.phones.map((p) => (p.role === null ? 'wählt noch…' : p.role === 'audience' ? 'Publikum' : pname(S, p.role)))
  return (
    <motion.div className="modal-back" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        className="modal card pair"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pair-title"
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 40, scale: 0.96, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: 30, scale: 0.97, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      >
        <button className="modal-x" onClick={onClose} aria-label="Schließen">
          ✕
        </button>
        <p className="hud">Handy-Begleiter · kostenlos, ohne Konto</p>
        <h2 id="pair-title" className="display sm">
          Handys koppeln
        </h2>
        <div className="pair-grid">
          <div className="pair-qr" dangerouslySetInnerHTML={{ __html: svg }} aria-label={'QR-Code für ' + url} />
          <div className="pair-info">
            <p className="lede sm">Mit der Handy-Kamera scannen. Jeder kann dann am eigenen Handy:</p>
            <ul>
              <li>im Duell für den besseren Song abstimmen,</li>
              <li>sein Line-up sehen und welcher Künstler als Nächstes dran ist,</li>
              <li>wenn er dran ist: Rad drehen, Künstler setzen, Song wählen (Vorschau leise am Handy).</li>
            </ul>
            <p className="pair-code">
              Code <b id="pairCode">{code}</b>
            </p>
            <p className="hint" style={{ textAlign: 'left', wordBreak: 'break-all' }}>
              {url}
            </p>
          </div>
        </div>
        <div className="pair-phones">
          <b>{info.phones.length ? info.phones.length + (info.phones.length === 1 ? ' Handy verbunden' : ' Handys verbunden') : 'Noch kein Handy verbunden'}</b>
          {roles.length ? <span> · {roles.join(', ')}</span> : null}
        </div>
        <p className="hint" style={{ textAlign: 'left' }}>
          Die Geräte verbinden sich direkt miteinander (WebRTC). Am besten alle im selben WLAN. Es wird nichts auf einem Server gespeichert. Die Kopplung bleibt aktiv, bis du sie beendest.
        </p>
        <div className="row" style={{ justifyContent: 'flex-start' }}>
          <Btn onClick={onClose}>Fertig</Btn>
          <Btn
            className="ghost"
            onClick={() => {
              stopHost()
              onClose()
            }}
          >
            Kopplung beenden
          </Btn>
        </div>
      </motion.div>
    </motion.div>
  )
}
