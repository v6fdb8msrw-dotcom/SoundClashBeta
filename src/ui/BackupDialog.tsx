import { motion } from 'motion/react'
import { useRef, useState } from 'react'
import { bus } from '../app/bus'
import { dispatch, getState } from '../app/store'
import { reloadRivalry } from '../services/rivalry'
import { applyBackup, backupFileName, buildBackup, deviceLabel, loadSettings, parseBackup, shareOrDownload, type BackupFile } from '../services/storage'
import { Btn } from './primitives'

/**
 * Spielstand sichern / übernehmen – nur als Datei, kein Server, keine Cloud.
 * iPhone: „Senden“ öffnet das Teilen-Menü (AirDrop zum Mac). Mac: Datei landet in Downloads,
 * per Finder → Teilen → AirDrop zum iPhone. Auf dem anderen Gerät „Datei übernehmen“.
 */
export function BackupDialog({ onClose }: { onClose: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<BackupFile | null>(null)
  const device = deviceLabel()
  const other = device === 'iPhone' ? 'deinen Mac' : device === 'Mac' ? 'dein iPhone' : 'das andere Gerät'

  async function send() {
    setBusy(true)
    setError('')
    try {
      const b = buildBackup()
      const file = new File([JSON.stringify(b, null, 1)], backupFileName(), { type: 'application/json' })
      const r = await shareOrDownload(file)
      if (r === 'shared') bus.emit('toast', 'Gesendet. Auf dem anderen Gerät „Datei übernehmen“ wählen.')
      else if (r === 'downloaded') bus.emit('toast', 'Datei liegt in Downloads. Im Finder per Rechtsklick → Teilen → AirDrop senden.')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function read(f: File) {
    setError('')
    setPreview(null)
    try {
      const res = parseBackup(JSON.parse(await f.text()))
      if (!res.ok) setError(res.error)
      else setPreview(res.backup)
    } catch {
      setError('Die Datei konnte nicht gelesen werden.')
    }
  }

  function take() {
    if (!preview) return
    applyBackup(preview)
    reloadRivalry()
    // Einstellungen neu laden; eine laufende Partie endet, deshalb zurück zum Start
    dispatch({ type: 'load', saved: loadSettings() })
    if (getState().screen !== 'home') dispatch({ type: 'go', to: 'home' })
    bus.emit('toast', 'Spielstand übernommen.')
    onClose()
  }

  const s = preview?.settings
  const pairs = preview ? Object.keys(preview.rivalry || {}).length : 0
  return (
    <motion.div className="modal-back" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        className="modal card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bk-title"
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 40, scale: 0.96, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: 30, scale: 0.97, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      >
        <button className="modal-x" onClick={onClose} aria-label="Schließen">
          ✕
        </button>
        <p className="hud">Speicher · nur auf diesem Gerät</p>
        <h2 id="bk-title" className="display sm">
          Spielstand
        </h2>
        <p className="lede sm">
          Einstellungen, Spieler, Avatare, Künstler-Topf und die ewige Rivalität liegen nur hier auf dem {device === 'Gerät' ? 'Gerät' : device}. Per Datei kommen sie auf {other}.
        </p>
        <div className="bk-grid">
          <div className="bk-box">
            <h3>Senden</h3>
            <p>Erstellt eine Datei mit deinem Spielstand{device === 'iPhone' ? ' und öffnet das Teilen-Menü (AirDrop).' : '.'}</p>
            <Btn onClick={() => void send()} disabled={busy} id="exportBtn">
              ⇪ Spielstand senden
            </Btn>
          </div>
          <div className="bk-box">
            <h3>Übernehmen</h3>
            <p>Eine empfangene Datei öffnen. Einstellungen werden ersetzt, die Rivalität zusammengeführt.</p>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              id="importFile"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void read(f)
                e.target.value = ''
              }}
            />
            <Btn className="ghost" onClick={() => fileRef.current?.click()} id="importBtn">
              ⇩ Datei übernehmen
            </Btn>
          </div>
        </div>
        {error ? <div className="warn">⚠ {error}</div> : null}
        {preview ? (
          <div className="bk-preview" id="importPreview">
            <p>
              Datei {preview.device ? 'vom ' + preview.device + ' ' : ''}
              {preview.exportedAt ? 'vom ' + new Date(preview.exportedAt).toLocaleString('de-DE') : ''}:
            </p>
            <ul>
              <li>{s ? `${s.players ?? '?'} Spieler · ${(s.names || []).slice(0, s.players || 2).join(', ')}` : 'keine Einstellungen'}</li>
              <li>{s ? `${(s.pool || []).length} Künstler im Topf · ${(s.custom || []).length} eigene Bilder` : ''}</li>
              <li>{pairs} Rivalitäts-Paarung(en)</li>
            </ul>
            <Btn onClick={take} id="importConfirm">
              Übernehmen
            </Btn>
          </div>
        ) : null}
      </motion.div>
    </motion.div>
  )
}
