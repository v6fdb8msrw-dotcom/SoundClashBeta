import { beforeEach, describe, expect, it } from 'vitest'
import { applyBackup, KEY_RIVALRY, KEY_SETTINGS, LEGACY_RIVALRY, LEGACY_SETTINGS, migrateLegacy, parseBackup } from './storage'

/** Minimaler localStorage für Node. */
class Mem {
  m = new Map<string, string>()
  getItem(k: string) {
    return this.m.has(k) ? this.m.get(k)! : null
  }
  setItem(k: string, v: string) {
    this.m.set(k, String(v))
  }
  removeItem(k: string) {
    this.m.delete(k)
  }
  clear() {
    this.m.clear()
  }
}

describe('Speicher', () => {
  let ls: Mem
  beforeEach(() => {
    ls = new Mem()
    ;(globalThis as unknown as { localStorage: Mem }).localStorage = ls
  })

  it('übernimmt alte Schlüssel einmalig und fasst nichts anderes an', () => {
    ls.setItem(LEGACY_SETTINGS, '{"players":3}')
    ls.setItem(LEGACY_RIVALRY, '{}')
    ls.setItem('ms.display', 'x')
    expect(migrateLegacy()).toEqual({ settings: true, rivalry: true })
    expect(ls.getItem(KEY_SETTINGS)).toBe('{"players":3}')
    ls.setItem(KEY_SETTINGS, '{"players":5}')
    expect(migrateLegacy()).toEqual({ settings: false, rivalry: false })
    expect(ls.getItem(KEY_SETTINGS)).toBe('{"players":5}')
    expect(ls.getItem(LEGACY_SETTINGS)).toBe('{"players":3}')
    expect(ls.getItem('ms.display')).toBe('x')
  })

  it('ignoriert kaputte alte Daten', () => {
    ls.setItem(LEGACY_SETTINGS, '{kaputt')
    expect(migrateLegacy().settings).toBe(false)
    expect(ls.getItem(KEY_SETTINGS)).toBeNull()
  })

  it('prüft Dateien und führt die Rivalität zusammen', () => {
    expect(parseBackup({ app: 'muscle-studio', format: 1 }).ok).toBe(false)
    expect(parseBackup({ app: 'sound-clash', format: 99, settings: null }).ok).toBe(false)
    const res = parseBackup({ app: 'sound-clash', format: 1, settings: { players: 2 }, rivalry: { 'a|b': { a: 'a', b: 'b', aw: 1, bw: 0, draws: 0, last: 10 } } })
    expect(res.ok).toBe(true)
    ls.setItem(KEY_RIVALRY, JSON.stringify({ 'a|b': { a: 'a', b: 'b', aw: 0, bw: 9, draws: 0, last: 5 }, 'c|d': { a: 'c', b: 'd', aw: 1, bw: 1, draws: 0, last: 1 } }))
    if (res.ok) applyBackup(res.backup)
    const r = JSON.parse(ls.getItem(KEY_RIVALRY)!)
    expect(r['a|b'].aw).toBe(1)
    expect(r['c|d']).toBeTruthy()
    expect(JSON.parse(ls.getItem(KEY_SETTINGS)!)).toEqual({ players: 2 })
  })
})
