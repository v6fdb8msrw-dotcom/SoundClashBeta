// Holt die eingebetteten Daten aus legacy/index.html (Künstlerkatalog, Avatare, altes Icon).
// Einmalig ausgeführt; das Ergebnis liegt in src/data. Die Werte bleiben byte-genau gleich.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
const html = readFileSync(new URL('../legacy/index.html', import.meta.url), 'utf8')
const lines = html.split('\n')
const avLine = lines.find((l) => l.startsWith('const AVATARS = '))
const dataLine = lines.find((l) => l.startsWith('const DATA = '))
const AVATARS = JSON.parse(avLine.replace(/^const AVATARS = /, '').replace(/;\s*$/, ''))
const DATA = JSON.parse(dataLine.replace(/^const DATA = /, '').replace(/;\s*$/, ''))
writeFileSync(new URL('../src/data/catalog.json', import.meta.url), JSON.stringify(DATA))
writeFileSync(
  new URL('../src/data/avatars.ts', import.meta.url),
  '// Eingebaute Avatare aus der Originalfassung, unverändert als data-URL.\n' +
    '// Gespeicherte Spielstände enthalten genau diese Zeichenketten, deshalb bleiben sie byte-gleich.\n' +
    'export const AVATARS: readonly string[] = ' + JSON.stringify(AVATARS, null, 0).replace(/","/g, '",\n  "') + '\n',
)
const man = html.match(/<link rel="manifest" href="data:application\/manifest\+json,([^"]+)"/)[1]
const manifest = JSON.parse(decodeURIComponent(man))
mkdirSync(new URL('../scripts/legacy-icons/', import.meta.url), { recursive: true })
for (const ic of manifest.icons) {
  const b64 = ic.src.replace(/^data:image\/png;base64,/, '')
  writeFileSync(new URL(`../scripts/legacy-icons/icon-${ic.sizes}.png`, import.meta.url), Buffer.from(b64, 'base64'))
}
console.log('avatars', AVATARS.length, 'genres', Object.keys(DATA.genres).length, 'cache', Object.keys(DATA.cache).length)
