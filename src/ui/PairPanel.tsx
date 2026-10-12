import QRCode from 'qrcode'
import { useEffect, useState } from 'react'
import { useGame } from '../app/store'
import { pcol, pname } from '../core/game'
import { joinUrl, startHost } from '../remote/host'
import { useHost } from './PairDialog'

/** QR-Code als SVG (lokal erzeugt, kein externer Dienst). */
export function useQr(url: string | null) {
  const [svg, setSvg] = useState('')
  useEffect(() => {
    if (!url) return
    void QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#0b0b0e', light: '#ffffff' } }).then(setSvg)
  }, [url])
  return svg
}

/** Kopplungsfeld in der Einrichtung (Handy-Modus): QR-Code und wer schon verbunden ist. */
export function PairPanel() {
  const S = useGame()
  const [code] = useState(() => startHost())
  const info = useHost()
  const url = joinUrl(code)
  const svg = useQr(url)
  const roles = new Set(info.phones.map((p) => p.role))
  const audience = info.phones.filter((p) => p.role === 'audience').length
  return (
    <div className="pairpanel">
      <div className="pair-qr" dangerouslySetInnerHTML={{ __html: svg }} aria-label={'QR-Code für ' + url} />
      <div className="pp-info">
        <p className="pp-title">Handys koppeln</p>
        <p className="hint" style={{ textAlign: 'left', margin: '4px 0 10px' }}>
          Mit der Kamera scannen, Spieler wählen. Zuschauer können jederzeit zum Abstimmen dazukommen.
        </p>
        <div className="pp-players">
          {Array.from({ length: S.players }, (_, j) => j + 1).map((p) => (
            <span key={p} className={'pp-chip' + (roles.has(p) ? ' on' : '')} style={{ ['--pc' as string]: pcol(S, p) }}>
              <i aria-hidden />
              {pname(S, p)}
              <small>{roles.has(p) ? 'verbunden' : 'wartet'}</small>
            </span>
          ))}
          {audience ? <span className="pp-chip on aud">🙋 {audience} Publikum</span> : null}
        </div>
        <p className="pair-code">
          Code <b id="pairCode">{code}</b>
        </p>
        <LinkRow url={url} />
      </div>
    </div>
  )
}

/** Verbindungslink zum Kopieren oder Teilen (z. B. per AirDrop oder in den Gruppenchat). */
function LinkRow({ url }: { url: string }) {
  const [done, setDone] = useState(false)
  const share = typeof navigator !== 'undefined' && 'share' in navigator
  return (
    <div className="pp-link">
      <span className="pp-url" title={url}>
        {url.replace(/^https?:\/\//, '')}
      </span>
      <button
        type="button"
        className="lnk"
        onClick={() => {
          void navigator.clipboard?.writeText(url).then(() => {
            setDone(true)
            setTimeout(() => setDone(false), 1800)
          })
        }}
      >
        {done ? '✓ Kopiert' : 'Link kopieren'}
      </button>
      {share ? (
        <button type="button" className="lnk" onClick={() => void navigator.share({ title: 'Sound Clash', text: 'Komm in die Runde:', url }).catch(() => undefined)}>
          Teilen
        </button>
      ) : null}
    </div>
  )
}

/** Kleiner QR-Code in der Ecke, damit Zuschauer während der Runde dazukommen können. */
export function QrCorner() {
  const info = useHost()
  const svg = useQr(info.code ? joinUrl(info.code) : null)
  if (!info.code) return null
  return (
    <div className="qr-corner" aria-label="Mit dem Handy abstimmen">
      <div className="qr" dangerouslySetInnerHTML={{ __html: svg }} />
      <div>
        <b>Mit abstimmen</b>
        <span>Scannen und am Handy für den besten Song stimmen.</span>
      </div>
    </div>
  )
}
