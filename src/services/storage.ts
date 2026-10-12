import { z } from 'zod'
import type { Rivalry, SavedSettings } from '../core/types'

/**
 * Speicher nur lokal auf diesem Gerät (localStorage).
 *
 * Die Herkunft v6fdb8msrw-dotcom.github.io teilen sich Sound Clash UND Muscle Studio.
 * Deshalb nutzt die neue Fassung ausschließlich Schlüssel mit eigenem Präfix `soundclash.app.`.
 * Alte Sound-Clash-Daten (`soundclash.v5`, `soundclash.rivalry`) werden beim ersten Start
 * kopiert und bleiben selbst unangetastet. Andere Schlüssel werden nie gelesen oder geschrieben.
 */

export const PREFIX = 'soundclash.app.'
export const KEY_SETTINGS = PREFIX + 'settings'
export const KEY_RIVALRY = PREFIX + 'rivalry'
export const LEGACY_SETTINGS = 'soundclash.v5'
export const LEGACY_RIVALRY = 'soundclash.rivalry'

const mem: Record<string, string> = {}

export function getItem(k: string): string | null {
  try {
    return localStorage.getItem(k)
  } catch {
    return k in mem ? mem[k] : null
  }
}
export function setItem(k: string, v: string) {
  try {
    localStorage.setItem(k, v)
  } catch {
    mem[k] = v
  }
}

/** Alte Spielstände übernehmen (nur wenn die neuen Schlüssel noch fehlen). */
export function migrateLegacy(): { settings: boolean; rivalry: boolean } {
  const out = { settings: false, rivalry: false }
  const pairs: [string, string, keyof typeof out][] = [
    [LEGACY_SETTINGS, KEY_SETTINGS, 'settings'],
    [LEGACY_RIVALRY, KEY_RIVALRY, 'rivalry'],
  ]
  for (const [oldK, newK, flag] of pairs) {
    if (getItem(newK) != null) continue
    const v = getItem(oldK)
    if (v == null) continue
    try {
      JSON.parse(v)
    } catch {
      continue
    }
    setItem(newK, v)
    out[flag] = true
  }
  return out
}

export function loadSettings(): Partial<SavedSettings> | null {
  const raw = getItem(KEY_SETTINGS)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}
export function saveSettings(s: SavedSettings) {
  setItem(KEY_SETTINGS, JSON.stringify(s))
}

export function loadRivalryData(): Record<string, Rivalry> {
  try {
    return JSON.parse(getItem(KEY_RIVALRY) as string) || {}
  } catch {
    return {}
  }
}
export function saveRivalryData(r: Record<string, Rivalry>) {
  setItem(KEY_RIVALRY, JSON.stringify(r))
}

/* ------------------------------------------------------------------ */
/* Export / Import als Datei (AirDrop zwischen iPhone und Mac)          */
/* ------------------------------------------------------------------ */

export const BACKUP_APP = 'sound-clash'
export const BACKUP_FORMAT = 1

export interface BackupFile {
  app: typeof BACKUP_APP
  format: number
  exportedAt: string
  device: string
  settings: Partial<SavedSettings> | null
  rivalry: Record<string, Rivalry>
}

const rivalrySchema = z.record(
  z.string(),
  z.looseObject({ a: z.string(), b: z.string(), aw: z.number().min(0), bw: z.number().min(0), draws: z.number().min(0), last: z.number() }),
)
const backupSchema = z.looseObject({
  app: z.literal(BACKUP_APP),
  format: z.number().int().min(1).max(BACKUP_FORMAT),
  exportedAt: z.string().optional(),
  settings: z.looseObject({}).nullable(),
  rivalry: rivalrySchema.optional(),
})

export function deviceLabel(): string {
  const ua = navigator.userAgent
  if (/iPhone/.test(ua)) return 'iPhone'
  if (/iPad/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'iPad'
  if (/Macintosh/.test(ua)) return 'Mac'
  return 'Gerät'
}

export function buildBackup(): BackupFile {
  return {
    app: BACKUP_APP,
    format: BACKUP_FORMAT,
    exportedAt: new Date().toISOString(),
    device: deviceLabel(),
    settings: loadSettings(),
    rivalry: loadRivalryData(),
  }
}

export function backupFileName(d = new Date()) {
  return `sound-clash-spielstand-${d.toISOString().slice(0, 10)}.json`
}

export type ParseResult = { ok: true; backup: BackupFile } | { ok: false; error: string }

export function parseBackup(raw: unknown): ParseResult {
  const res = backupSchema.safeParse(raw)
  if (!res.success) {
    const obj = raw as Record<string, unknown> | null
    if (!obj || typeof obj !== 'object') return { ok: false, error: 'Die Datei enthält keine gültigen Daten.' }
    if (obj.app !== BACKUP_APP) return { ok: false, error: 'Die Datei stammt nicht aus Sound Clash.' }
    if (typeof obj.format === 'number' && obj.format > BACKUP_FORMAT) return { ok: false, error: 'Die Datei stammt aus einer neueren Version.' }
    return { ok: false, error: 'Die Datei ist beschädigt oder unvollständig.' }
  }
  const b = res.data
  return {
    ok: true,
    backup: {
      app: BACKUP_APP,
      format: b.format,
      exportedAt: b.exportedAt || '',
      device: typeof b.device === 'string' ? b.device : '',
      settings: (b.settings as Partial<SavedSettings>) ?? null,
      rivalry: (b.rivalry as Record<string, Rivalry>) || {},
    },
  }
}

/**
 * Datei übernehmen: Einstellungen werden ersetzt, die ewige Rivalität wird zusammengeführt
 * (pro Paarung gewinnt der Eintrag mit dem jüngeren letzten Duell).
 */
export function applyBackup(b: BackupFile): { pairs: number } {
  if (b.settings) saveSettings(b.settings as SavedSettings)
  const mine = loadRivalryData()
  for (const [k, r] of Object.entries(b.rivalry || {})) {
    if (!mine[k] || (r.last || 0) > (mine[k].last || 0)) mine[k] = r
  }
  saveRivalryData(mine)
  return { pairs: Object.keys(mine).length }
}

export async function shareOrDownload(file: File): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: 'Sound Clash' })
      return 'shared'
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled'
    }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
  return 'downloaded'
}
