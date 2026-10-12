// Kleiner statischer Server für die Verhaltenstests.
// /legacy/…        → legacy/ (Originalfassung)
// /SoundClashBeta/… → dist/ (neue Fassung, gebaut mit VITE_BASE=/SoundClashBeta/)
// Beide laufen unter derselben Herkunft, damit der Speicher-Übernahmetest echt ist.
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const port = Number(process.env.TEST_PORT || 4179)
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.jpg': 'image/jpeg', '.txt': 'text/plain',
}
async function send(res, file) {
  try {
    const s = await stat(file)
    if (s.isDirectory()) return send(res, join(file, 'index.html'))
    const body = await readFile(file)
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' })
    res.end(body)
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' })
    res.end('404')
  }
}
createServer((req, res) => {
  const url = new URL(req.url, 'http://x')
  const path = normalize(decodeURIComponent(url.pathname))
  if (path.startsWith('/legacy/')) return send(res, join(root, 'legacy', path.slice('/legacy/'.length)))
  if (path.startsWith('/SoundClashBeta/')) {
    const rel = path.slice('/SoundClashBeta/'.length)
    return send(res, join(root, 'dist', rel || 'index.html'))
  }
  res.writeHead(302, { location: '/SoundClashBeta/' })
  res.end()
}).listen(port, '127.0.0.1', () => console.log(`Testserver: http://127.0.0.1:${port}`))
