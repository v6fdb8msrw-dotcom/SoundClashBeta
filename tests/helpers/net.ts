import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import type { BrowserContext, Route } from '@playwright/test'

/**
 * Netzwerk für die Verhaltenstests.
 * Deezer-Antworten kommen aus aufgezeichneten Dateien (tests/fixtures/deezer), damit beide Fassungen
 * exakt dieselben Daten sehen. Fehlt eine Aufzeichnung, wird sie einmal live geholt und gespeichert.
 * Hörproben werden durch eine kurze stille WAV-Datei ersetzt, Bilder durch ein 1×1-PNG.
 * Der Live-Test (live.spec.ts) nutzt diese Hilfe nicht und spielt echte Deezer-Vorschauen.
 */

const FIX_DIR = new URL('../fixtures/deezer/', import.meta.url)

export function deezerKey(u: URL): string {
  const params = [...u.searchParams.entries()].filter(([k]) => k !== 'output' && k !== 'callback')
  params.sort((a, b) => (a[0] === b[0] ? a[1].localeCompare(b[1]) : a[0].localeCompare(b[0])))
  return u.pathname + '?' + params.map(([k, v]) => k + '=' + v).join('&')
}

function fixtureFile(key: string): URL {
  return new URL(createHash('sha1').update(key).digest('hex').slice(0, 20) + '.json', FIX_DIR)
}

async function loadDeezer(u: URL): Promise<unknown> {
  const key = deezerKey(u)
  const file = fixtureFile(key)
  if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8')).data
  const live = new URL(u.toString())
  live.searchParams.delete('output')
  live.searchParams.delete('callback')
  const res = await fetch(live)
  const data = await res.json()
  mkdirSync(FIX_DIR, { recursive: true })
  writeFileSync(file, JSON.stringify({ key, data }))
  return data
}

function silentWav(seconds = 4, rate = 8000): Buffer {
  const n = seconds * rate
  const b = Buffer.alloc(44 + n)
  b.write('RIFF', 0)
  b.writeUInt32LE(36 + n, 4)
  b.write('WAVEfmt ', 8)
  b.writeUInt32LE(16, 16)
  b.writeUInt16LE(1, 20)
  b.writeUInt16LE(1, 22)
  b.writeUInt32LE(rate, 24)
  b.writeUInt32LE(rate, 28)
  b.writeUInt16LE(1, 32)
  b.writeUInt16LE(8, 34)
  b.write('data', 36)
  b.writeUInt32LE(n, 40)
  b.fill(128, 44)
  return b
}
const WAV = silentWav()
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

export async function mockNetwork(ctx: BrowserContext): Promise<void> {
  // Antworten strikt in Anfrage-Reihenfolge ausliefern. Manche Pools werden parallel geladen
  // (Promise.all) und in Ankunftsreihenfolge gefüllt; so ist die Reihenfolge in beiden Fassungen gleich.
  let queue: Promise<void> = Promise.resolve()
  await ctx.route('https://api.deezer.com/**', async (route: Route) => {
    const u = new URL(route.request().url())
    if (/^\/artist\/\d+\/image$/.test(u.pathname)) return route.fallback()
    const cb = u.searchParams.get('callback')
    // Platz in der Warteschlange sofort (synchron) reservieren, erst danach die Datei lesen
    const turn = queue
    let release!: () => void
    queue = new Promise((r) => (release = r))
    const data = await loadDeezer(u)
    await turn
    setTimeout(release, 8)
    if (cb) {
      await route.fulfill({ status: 200, contentType: 'application/javascript', body: `${cb}(${JSON.stringify(data)})` })
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data), headers: { 'access-control-allow-origin': '*' } })
    }
  })
  await ctx.route(/https:\/\/[^/]*preview[^/]*\.dzcdn\.net\/.*/, (route) =>
    route.fulfill({ status: 200, contentType: 'audio/wav', body: WAV, headers: { 'access-control-allow-origin': '*', 'accept-ranges': 'none' } }),
  )
  await ctx.route(/https:\/\/((cdn-images|e-cdns-images)\.dzcdn\.net\/|api\.deezer\.com\/artist\/\d+\/image)/, (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: PNG, headers: { 'access-control-allow-origin': '*' } }),
  )
  await ctx.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/, (route) =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '' }),
  )
}
