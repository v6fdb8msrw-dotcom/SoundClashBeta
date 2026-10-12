import DATA from '../data/catalog.json'
import type { Genres } from '../core/game'

/**
 * Eingebetteter Künstlerkatalog (Genres + Deezer-Cache) aus dem Original.
 * Cache-Einträge: [deezerId, Name, Bild-md5, Fans]. Live-Treffer aus der Deezer-Suche
 * landen zusätzlich in LIVE und haben Vorrang.
 */

type CacheEntry = [number, string, string, number]
type LiveEntry = { id: number; name: string; pic: string; fans: number }

export const GEN = DATA.genres as unknown as Genres
export const CACHE = DATA.cache as unknown as Record<string, CacheEntry>

export const PIC = (h: string) => 'https://cdn-images.dzcdn.net/images/artist/' + h + '/250x250-000000-80-0-0.jpg'
export const PICBIG = (h: string) => 'https://cdn-images.dzcdn.net/images/artist/' + h + '/500x500-000000-80-0-0.jpg'

export const ak = (s: unknown) => String(s).toLowerCase().trim()
export const LIVE: Record<string, LiveEntry> = {}

export function info(n: unknown): CacheEntry | LiveEntry | null {
  return LIVE[ak(n)] || CACHE[ak(n)] || null
}
export function picBigOf(n: unknown): string {
  const i = info(n)
  if (!i) return ''
  if (Array.isArray(i)) return PICBIG(i[2])
  return (i.pic || '').replace('/250x250-', '/500x500-')
}
export function picOf(n: unknown): string {
  const i = info(n)
  if (!i) return ''
  if (Array.isArray(i)) return PIC(i[2])
  return i.pic || ''
}
export function idOf(n: unknown): number | null {
  const i = info(n)
  if (!i) return null
  return Array.isArray(i) ? i[0] : i.id
}
export function fansOf(n: unknown): number {
  const i = info(n)
  if (!i) return 0
  return Array.isArray(i) ? i[3] || 0 : i.fans || 0
}
export function realName(n: string): string {
  const i = info(n)
  if (!i) return n
  return Array.isArray(i) ? i[1] : i.name || n
}

export const wallPics = Object.values(CACHE)
  .slice(0, 400)
  .map((v) => PIC(v[2]))

/** Künstler eines Genres (Filmmusik: Filmtitel). */
export function genreRoster(g: string): string[] {
  const G = GEN[g]
  if (!G) return []
  return G.type === 'film' ? (G.films || []).map((f) => f.f) : G.artists || []
}
