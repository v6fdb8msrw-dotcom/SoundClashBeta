import { DIFF_CFG } from '../core/constants'
import type { PoolSong, Track } from '../core/types'
import { GEN, LIVE, ak, fansOf, idOf, picOf } from './catalog'

/**
 * Deezer – exakt wie im Original: JSONP-Aufrufe an api.deezer.com (keine Server, kein Schlüssel).
 * Reihenfolge, Parameter, Grenzen und Parallelität sind unverändert, weil sie bestimmen,
 * welche Songs in Pools und Listen landen.
 */

let seq = 0
export let dzDead = false
let dzOK = false

/* Benachrichtigung für die Oberfläche (Warnung, nachgeladene Listen) */
const listeners = new Set<() => void>()
let version = 0
export function subscribeDeezer(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
export const deezerVersion = () => version
export function notify() {
  version++
  listeners.forEach((fn) => fn())
}

export function dz(path: string, params?: Record<string, string | number>): Promise<{ data?: unknown[] } & Record<string, unknown>> {
  return new Promise((res, rej) => {
    const cb = 'dz' + ++seq + 'x' + Date.now()
    const q: Record<string, string | number> = Object.assign({ output: 'jsonp', callback: cb }, params || {})
    const url =
      'https://api.deezer.com/' +
      path +
      '?' +
      Object.keys(q)
        .map((k) => encodeURIComponent(k) + '=' + encodeURIComponent(q[k]))
        .join('&')
    const s = document.createElement('script')
    let done = false
    const w = window as unknown as Record<string, unknown>
    const to = setTimeout(() => {
      if (!done) {
        done = true
        cl()
        fail()
        rej(new Error('timeout'))
      }
    }, 9000)
    function cl() {
      try {
        delete w[cb]
      } catch {
        w[cb] = undefined
      }
      if (s.parentNode) s.parentNode.removeChild(s)
      clearTimeout(to)
    }
    function fail() {
      if (!dzOK && !dzDead) {
        dzDead = true
        notify()
      }
    }
    w[cb] = (d: unknown) => {
      if (done) return
      done = true
      dzOK = true
      dzDead = false
      cl()
      res(d as { data?: unknown[] })
    }
    s.onerror = () => {
      if (done) return
      done = true
      cl()
      fail()
      rej(new Error('blocked'))
    }
    s.src = url
    document.head.appendChild(s)
  })
}

interface DzArtist {
  id: number
  name: string
  picture_medium?: string
  nb_fan?: number
}

export async function dzSearchArtist(q: string, limit?: number): Promise<DzArtist[]> {
  const d = await dz('search/artist', { q, limit: limit || 10 })
  const a = ((d && d.data) || []) as DzArtist[]
  a.forEach((x) => {
    LIVE[ak(x.name)] = { id: x.id, name: x.name, pic: x.picture_medium || '', fans: x.nb_fan || 0 }
  })
  return a
}
export async function dzTop(id: number, limit?: number): Promise<Track[]> {
  const d = await dz('artist/' + id + '/top', { limit: limit || 50 })
  return ((d && d.data) || []) as Track[]
}

/** Jahre kommen über die Alben des Künstlers: EIN Aufruf liefert alle Release-Daten. */
export const YEARS: Record<number, number> = {}
const YDONE: Record<string, boolean> = {}
export async function dzAlbums(id: number, key: string) {
  if (YDONE[key]) return
  YDONE[key] = true
  try {
    const d = await dz('artist/' + id + '/albums', { limit: 200 })
    ;(((d && d.data) || []) as { id: number; release_date?: string }[]).forEach((al) => {
      const y = parseInt(String(al.release_date || '').slice(0, 4), 10)
      if (!y) return
      if (YEARS[al.id] === undefined || y < YEARS[al.id]) YEARS[al.id] = y // Original schlägt Reissue
    })
  } catch {
    // ohne Jahre weiter
  }
}
export const trackYear = (t: Track | null | undefined): number | null => (t && t.album && YEARS[t.album.id]) || null

/** Frühste bekannte Album-Version eines Songs = Original (Jahr + Vorschau + Cover). */
export async function origVersion(artist: string, title: string) {
  try {
    const res = await dzTracks(artist + ' ' + title, 12)
    let best: Track | null = null,
      bestY: number | null = null
    const nt = ak(title),
      na = ak(artist)
    for (const r of res) {
      if (!r || !r.album || !r.preview) continue
      if (ak(r.title_short || r.title || '') !== nt) continue
      if (r.artist && ak(r.artist.name) !== na) continue
      const y = YEARS[r.album.id]
      if (!y) continue
      if (bestY === null || y < bestY) {
        bestY = y
        best = r
      }
    }
    if (!best) return null
    return { year: bestY!, preview: best.preview!, album: best.album!.id, cover: (best.album && (best.album.cover_medium || best.album.cover_big)) || '' }
  } catch {
    return null
  }
}
export async function dzTracks(q: string, limit?: number): Promise<Track[]> {
  const d = await dz('search', { q, limit: limit || 15 })
  return ((d && d.data) || []) as Track[]
}
export async function ensure(n: string): Promise<number | null> {
  if (idOf(n)) return idOf(n)
  try {
    const r = await dzSearchArtist(n, 1)
    return r[0] ? r[0].id : null
  } catch {
    return null
  }
}

/* ------------------------------------------------------------------ */
/* Pools für Guess / Sing it Back / Timeline / Jahrzehnt-Duell          */
/* ------------------------------------------------------------------ */

const POOLCACHE: Record<string, PoolSong[]> = {}

export async function filmPool(genre: string): Promise<PoolSong[]> {
  const ck = genre + '|film'
  if (POOLCACHE[ck]) return POOLCACHE[ck]
  const films = ((GEN[genre] && GEN[genre].films) || []).slice()
  const out: PoolSong[] = []
  const seen = new Set<string>()
  async function one(fl: { f: string; y: number; q: string }) {
    let tr: Track[] = []
    try {
      tr = await dzTracks(fl.q, 5)
    } catch {
      // nichts
    }
    const t = (tr || []).find((x) => x && x.preview)
    if (!t) return
    const title = t.title_short || t.title || ''
    const key = ak(fl.f) + '|' + ak(title)
    if (seen.has(key)) return
    seen.add(key)
    out.push({
      title, artist: fl.f, year: fl.y, album: (t.album && t.album.id) || null, preview: t.preview!,
      cover: (t.album && (t.album.cover_medium || t.album.cover_big || t.album.cover_small)) || '',
      img: (t.artist && (t.artist.picture_medium || t.artist.picture)) || '',
    })
  }
  for (let i = 0; i < films.length; i += 4) {
    await Promise.all(films.slice(i, i + 4).map(one))
  }
  POOLCACHE[ck] = out
  return out
}

export async function famousPool(genre: string, diff: string): Promise<PoolSong[]> {
  if (GEN[genre] && GEN[genre].type === 'film') return await filmPool(genre)
  diff = DIFF_CFG[diff] ? diff : 'easy'
  const ck = genre + '|' + diff
  if (POOLCACHE[ck]) return POOLCACHE[ck]
  const cfg = DIFF_CFG[diff]
  let names = (GEN[genre] ? GEN[genre].artists || [] : []).slice()
  if (!(GEN[genre] && GEN[genre].keepOrder)) names = names.sort((a, b) => fansOf(b) - fansOf(a))
  names = names.slice(0, cfg.artists)
  const out: PoolSong[] = []
  const seen = new Set<string>()
  for (const nm of names) {
    let id = idOf(nm)
    if (!id) {
      try {
        id = await ensure(nm)
      } catch {
        id = null
      }
    }
    if (!id) continue
    let tops: Track[] = []
    try {
      tops = await dzTop(id, Math.max(6, cfg.to + 1))
    } catch {
      tops = []
    }
    const band = tops.slice(cfg.from, cfg.to)
    let added = 0
    for (const t of band) {
      if (!t || !t.preview) continue
      const title = t.title_short || t.title || ''
      const artist = (t.artist && t.artist.name) || nm
      const key = ak(artist) + '|' + ak(title)
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ title, artist, preview: t.preview, cover: (t.album && (t.album.cover_medium || t.album.cover_big || t.album.cover_small)) || '', img: picOf(nm) })
      if (++added >= cfg.per) break
    }
  }
  POOLCACHE[ck] = out
  return out
}

export async function famousPoolMulti(genres: string[] | string, diff: string): Promise<PoolSong[]> {
  const list = (Array.isArray(genres) ? genres : [genres]).filter(Boolean)
  const out: PoolSong[] = []
  const seen = new Set<string>()
  for (const g of list) {
    let p: PoolSong[] = []
    try {
      p = await famousPool(g, diff)
    } catch {
      p = []
    }
    for (const s of p) {
      const k = ak(s.artist) + '|' + ak(s.title)
      if (seen.has(k)) continue
      seen.add(k)
      out.push(s)
    }
  }
  return out
}

export async function timelinePool(genres: string[] | string, rng: () => number): Promise<PoolSong[]> {
  const list = (Array.isArray(genres) ? genres : [genres]).filter(Boolean)
  const raw: PoolSong[] = []
  const seen = new Set<string>()
  const push = (c: PoolSong) => {
    if (!c || !c.preview || !c.year) return
    const k = ak(c.artist) + '|' + ak(c.title)
    if (seen.has(k)) return
    seen.add(k)
    raw.push(c)
  }
  // Film-Genres: Themes per Track-Suche, Jahr = Filmjahr
  for (const g of list) {
    if (GEN[g] && GEN[g].type === 'film') {
      let fp: PoolSong[] = []
      try {
        fp = await filmPool(g)
      } catch {
        // nichts
      }
      fp.forEach(push)
    }
  }
  // Künstler-Genres: Top-Tracks + Album-Jahre (breiter Pool für Jahres-Streuung)
  let names: string[] = []
  for (const g of list) {
    if (GEN[g] && GEN[g].type === 'film') continue
    let a = ((GEN[g] && GEN[g].artists) || []).slice()
    if (!(GEN[g] && GEN[g].keepOrder)) a = a.sort((x, y) => fansOf(y) - fansOf(x))
    names = names.concat(a.slice(0, 22))
  }
  names = [...new Set(names.map(ak))].map((k) => names.find((n) => ak(n) === k)!)
  names.sort(() => rng() - 0.5)
  names = names.slice(0, 32)
  async function one(nm: string) {
    let id = idOf(nm)
    if (!id) {
      try {
        id = await ensure(nm)
      } catch {
        id = null
      }
    }
    if (!id) return
    try {
      await dzAlbums(id, ak(nm))
    } catch {
      // nichts
    }
    let tops: Track[] = []
    try {
      tops = await dzTop(id, 12)
    } catch {
      // nichts
    }
    const cand: Track[] = []
    for (const t of tops) {
      if (!t || !t.preview) continue
      if (!trackYear(t)) continue
      cand.push(t)
      if (cand.length >= 2) break
    }
    await Promise.all(
      cand.map(async (t) => {
        const title = t.title_short || t.title || ''
        const artist = (t.artist && t.artist.name) || nm
        let ov: Awaited<ReturnType<typeof origVersion>> = null
        try {
          ov = await origVersion(artist, title)
        } catch {
          // nichts
        }
        const y = ov ? ov.year : trackYear(t)!
        push({
          title, artist, year: y, album: ov ? ov.album : (t.album && t.album.id) || null,
          preview: ov ? ov.preview : t.preview!,
          cover: ov ? ov.cover : (t.album && (t.album.cover_medium || t.album.cover_big)) || picOf(nm) || '',
        })
      }),
    )
  }
  for (let i = 0; i < names.length; i += 4) {
    await Promise.all(names.slice(i, i + 4).map(one))
  }
  // Mischen, dann: nie zwei Songs vom selben Album, und jedes Jahr nur EINMAL
  raw.sort(() => rng() - 0.5)
  const byAlbum = new Set<number>(),
    byYear = new Set<number>(),
    out: PoolSong[] = []
  for (const c of raw) {
    if (byYear.has(c.year!)) continue
    if (c.album && byAlbum.has(c.album)) continue
    byYear.add(c.year!)
    if (c.album) byAlbum.add(c.album)
    out.push(c)
  }
  return out
}

/* ------------------------------------------------------------------ */
/* Top-Tracks und Songsuche je Feld                                     */
/* ------------------------------------------------------------------ */

export const TOPS: Record<string, Track[]> = {}
/** Suchtext je Feld "p_i" (bleibt wie im Original über Runden erhalten). */
export const TQ: Record<string, string> = {}
/** Von-Hand-Text je Feld. */
export const MQ: Record<string, string> = {}
const SR: Record<string, Track[]> = {}
const SRQ: Record<string, string> = {}
const songT: Record<string, ReturnType<typeof setTimeout>> = {}
const songSeq: Record<string, number> = {}

function filmEntry(genre: string, name: string) {
  const G = GEN[genre]
  if (!G || G.type !== 'film') return null
  return (G.films || []).find((f) => ak(f.f) === ak(name)) || null
}
async function loadFilmTracks(genre: string, name: string): Promise<Track[]> {
  const fe = filmEntry(genre, name)
  if (!fe) return []
  let tr: Track[] = []
  try {
    tr = await dzTracks(fe.q, 25)
  } catch {
    // nichts
  }
  const out: Track[] = [],
    seen = new Set<string>()
  for (const t of tr || []) {
    if (!t || !t.preview) continue
    const k = ak(t.title_short || t.title || '')
    if (seen.has(k)) continue
    seen.add(k)
    out.push(t)
  }
  return out
}

export interface TopsCtx {
  genre: () => string
  eras: () => string
}

export async function loadTopsFor(names: string[], ctx: TopsCtx) {
  const all = names.filter((n) => n && TOPS[ak(n)] === undefined)
  for (let i = 0; i < all.length; i += 4) {
    await Promise.all(
      all.slice(i, i + 4).map(async (n) => {
        try {
          const fe = filmEntry(ctx.genre(), n)
          if (fe) {
            TOPS[ak(n)] = await loadFilmTracks(ctx.genre(), n)
          } else {
            const id = await ensure(n)
            TOPS[ak(n)] = id ? await dzTop(id, 50) : await dzTracks('artist:"' + n + '"', 50)
            if (id && ctx.eras() !== 'off') await dzAlbums(id, ak(n))
          }
        } catch {
          TOPS[ak(n)] = []
        }
      }),
    )
    notify()
    await new Promise((r) => setTimeout(r, 120))
  }
}

/** Alle Top-Tracks der Line-ups („Alle vorab“). sdName: im Original S.sd (nie ein Name). */
export async function loadTops(lineupNames: string[], ctx: TopsCtx) {
  const all: string[] = []
  lineupNames.forEach((a) => {
    if (a && TOPS[ak(a)] === undefined && !all.includes(a)) all.push(a)
  })
  for (let i = 0; i < all.length; i += 4) {
    await Promise.all(
      all.slice(i, i + 4).map(async (n) => {
        try {
          const fe = filmEntry(ctx.genre(), n)
          if (fe) {
            TOPS[ak(n)] = await loadFilmTracks(ctx.genre(), n)
          } else {
            const id = await ensure(n)
            TOPS[ak(n)] = id ? await dzTop(id, 50) : await dzTracks('artist:"' + n + '"', 50)
          }
        } catch {
          TOPS[ak(n)] = []
        }
      }),
    )
    notify()
    await new Promise((r) => setTimeout(r, 120))
  }
}

/** Suchtext für ein Feld: sofort lokal filtern, nach 380 ms live bei Deezer nachlegen. */
export function onSongQuery(key: string, artist: string, q: string) {
  TQ[key] = q
  if (songT[key]) clearTimeout(songT[key])
  if (q.trim().length < 2) {
    delete SR[key]
    delete SRQ[key]
    notify()
    return
  }
  notify() // zeigt sofort „sucht…“
  songT[key] = setTimeout(async () => {
    const my = (songSeq[key] = (songSeq[key] || 0) + 1),
      qq = q.trim()
    let res: Track[] = []
    // Deezer verlangt track:"..." – ohne das wird der Songname ignoriert
    try {
      res = await dzTracks('artist:"' + artist + '" track:"' + qq + '"', 25)
    } catch {
      // weiter
    }
    if (!res.length) {
      try {
        res = await dzTracks(artist + ' ' + qq, 25)
      } catch {
        // weiter
      }
    }
    if (!res.length) {
      try {
        res = await dzTracks(qq, 25)
      } catch {
        // weiter
      }
    }
    if (my !== songSeq[key]) return
    const an = ak(artist)
    res.sort((a, b) => {
      const A = ak((a.artist && a.artist.name) || '') === an ? 0 : 1,
        B = ak((b.artist && b.artist.name) || '') === an ? 0 : 1
      return A - B
    })
    SR[key] = res
    SRQ[key] = qq
    notify()
  }, 380)
}

/** Alle Wörter der Suche müssen im Titel vorkommen. */
function titleHit(t: Track, words: string[]) {
  const T = (t.title || '').toLowerCase()
  return words.every((w) => T.includes(w))
}

/** Anzuzeigende Trackliste für ein Feld. list=null → lädt noch. */
export function trackList(key: string, artist: string): { list: Track[] | null; live: boolean; stale: boolean } {
  const raw = (TQ[key] || '').trim(),
    q = raw.toLowerCase()
  const tr = TOPS[ak(artist)]
  if (tr === undefined) return { list: null, live: false, stale: false }
  if (!q) return { list: tr, live: false, stale: false }
  const words = q.split(/\s+/).filter(Boolean)
  const local = tr.filter((t) => titleHit(t, words))
  const extra: Track[] = []
  if (q.length >= 2 && SR[key]) {
    const seenT = new Set(local.map((t) => (t.title || '').toLowerCase()))
    SR[key].forEach((t) => {
      const k = (t.title || '').toLowerCase()
      if (!seenT.has(k) && titleHit(t, words)) {
        seenT.add(k)
        extra.push(t)
      }
    })
  }
  return { list: local.concat(extra), live: true, stale: q.length >= 2 && SRQ[key] !== raw }
}

/* Spotify / YouTube: nur Links in deren Suche (unverändert). */
export const spot = (a: string, t: string) => 'https://open.spotify.com/search/' + encodeURIComponent(a + ' ' + t)
export const yt = (a: string, t: string) => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(a + ' ' + t)
