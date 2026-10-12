import { CACHE, fansOf, genreRoster, GEN } from '../services/catalog'
import { dzSearchArtist } from '../services/deezer'

/** Künstlerliste im Setup (gList/shown im Original): Genre-Liste oder Suchtreffer. */

let gList: string[] = []
let shown = 30
let version = 0
const listeners = new Set<() => void>()
const notify = () => {
  version++
  listeners.forEach((f) => f())
}
export const subscribeList = (f: () => void) => {
  listeners.add(f)
  return () => listeners.delete(f)
}
export const listVersion = () => version
export const getList = () => ({ gList, shown })
export const hasList = () => gList.length > 0

export function loadGenre(g: string) {
  shown = 30
  gList = genreRoster(g).slice()
  if (!(GEN[g] && GEN[g].type === 'film')) gList.sort((a, b) => fansOf(b) - fansOf(a))
  notify()
}

export function showMore() {
  shown += 30
  notify()
}

let sT: ReturnType<typeof setTimeout> | null = null
let sSeq = 0
export function onSearch(value: string, genre: string) {
  const q = value.trim()
  if (sT) clearTimeout(sT)
  if (q.length < 2) {
    loadGenre(genre)
    return
  }
  // 1) sofort im eingebetteten Katalog suchen
  const local = Object.keys(CACHE)
    .filter((k) => k.includes(q.toLowerCase()))
    .map((k) => CACHE[k][1])
    .slice(0, 12)
  if (local.length) {
    gList = local
    shown = 30
    notify()
  }
  // 2) danach live bei Deezer nachlegen
  sT = setTimeout(async () => {
    const my = ++sSeq
    try {
      const r = await dzSearchArtist(q, 12)
      if (my !== sSeq) return
      const names = r.map((x) => x.name)
      if (names.length) {
        gList = names
        shown = 30
        notify()
      }
    } catch {
      if (!local.length) {
        gList = []
        notify()
      }
    }
  }, 340)
}
