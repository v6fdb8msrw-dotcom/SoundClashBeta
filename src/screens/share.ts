import { bus } from '../app/bus'
import { pcol, pname, roundScore, winnerRecords, wins } from '../core/game'
import type { State } from '../core/types'
import { picBigOf, picOf } from '../services/catalog'

/** Endstand als Bild teilen (shareImg/share/doShare im Original, Inhalt unverändert). */

const css = (v: string) => getComputedStyle(document.body).getPropertyValue(v).trim() || '#888'

function roundRect(x: CanvasRenderingContext2D, rx: number, ry: number, w: number, h: number, r: number) {
  x.beginPath()
  x.moveTo(rx + r, ry)
  x.arcTo(rx + w, ry, rx + w, ry + h, r)
  x.arcTo(rx + w, ry + h, rx, ry + h, r)
  x.arcTo(rx, ry + h, rx, ry, r)
  x.arcTo(rx, ry, rx + w, ry, r)
  x.closePath()
}

function coverUrl(r: ReturnType<typeof winnerRecords>[number]) {
  return r.song && r.song.cover ? r.song.cover : picBigOf(r.artist) || picOf(r.artist)
}

function shareImg(S: State): HTMLCanvasElement {
  const cv = document.createElement('canvas')
  cv.width = 1080
  cv.height = 1350
  const x = cv.getContext('2d')!
  const bg = css('--bg'),
    bg2 = css('--bg-2'),
    pr = css('--primary'),
    tx = css('--text'),
    mu = css('--muted')
  const bgg = x.createLinearGradient(0, 0, 0, 1350)
  bgg.addColorStop(0, bg2)
  bgg.addColorStop(1, bg)
  x.fillStyle = bgg
  x.fillRect(0, 0, 1080, 1350)
  const g = x.createRadialGradient(540, 180, 0, 540, 180, 900)
  g.addColorStop(0, pr + '2E')
  g.addColorStop(1, 'transparent')
  x.fillStyle = g
  x.fillRect(0, 0, 1080, 1350)
  x.textAlign = 'center'
  x.fillStyle = pr
  x.font = 'italic 700 64px Georgia,serif'
  x.fillText('Sound Clash', 540, 130)
  const rk: { p: number; w: number; s: number }[] = []
  for (let p = 1; p <= S.players; p++) rk.push({ p, w: wins(S, p), s: roundScore(S, p) })
  rk.sort((a, b) => b.w - a.w || b.s - a.s)
  const champ = rk[0]
  x.fillStyle = mu
  x.font = '600 26px Manrope,Arial,sans-serif'
  x.fillText('SIEGER DES ABENDS', 540, 205)
  x.fillStyle = pcol(S, champ.p)
  x.font = '800 100px Georgia,serif'
  x.fillText(pname(S, champ.p), 540, 310)
  x.font = '60px serif'
  x.fillText('🏆', 540, 390)
  const recs = winnerRecords(S).slice(0, 5)
  const imgs = recs.map((r) => {
    const u = coverUrl(r)
    if (!u) return null
    const im = new Image()
    im.crossOrigin = 'anonymous'
    im.src = u
    return im.complete ? im : null
  })
  {
    const n = imgs.length || 1,
      gap = 24,
      size = Math.min(180, (920 - (n - 1) * gap) / n),
      total = n * size + (n - 1) * gap,
      sx = (1080 - total) / 2,
      sy = 470
    x.fillStyle = mu
    x.font = '600 24px Manrope,Arial,sans-serif'
    x.fillText('DIE PLATTEN DES ABENDS', 540, 450)
    recs.forEach((r, i) => {
      const px = sx + i * (size + gap)
      x.fillStyle = '#0d0d0f'
      x.beginPath()
      x.arc(px + size * 0.72, sy + size / 2, size * 0.42, 0, 7)
      x.fill()
      x.fillStyle = pcol(S, r.p)
      x.beginPath()
      x.arc(px + size * 0.72, sy + size / 2, size * 0.12, 0, 7)
      x.fill()
      const im = imgs[i]
      if (im) {
        x.save()
        roundRect(x, px, sy, size, size, 14)
        x.clip()
        x.drawImage(im, px, sy, size, size)
        x.restore()
      } else {
        x.fillStyle = bg2
        roundRect(x, px, sy, size, size, 14)
        x.fill()
        x.fillStyle = mu
        x.font = '600 20px Manrope,Arial'
        x.fillText(String(r.artist || '').slice(0, 10), px + size / 2, sy + size / 2)
      }
      x.strokeStyle = pcol(S, r.p)
      x.lineWidth = 3
      roundRect(x, px, sy, size, size, 14)
      x.stroke()
    })
  }
  {
    const y0 = 730,
      rh = Math.min(100, (1160 - y0) / Math.max(1, rk.length))
    x.fillStyle = mu
    x.font = '600 24px Manrope,Arial,sans-serif'
    x.textAlign = 'center'
    x.fillText('ENDSTAND', 540, 700)
    rk.forEach((r, i) => {
      const y = y0 + i * rh
      x.fillStyle = i === 0 ? pr + '22' : 'transparent'
      if (i === 0) {
        roundRect(x, 90, y - 38, 900, rh - 12, 16)
        x.fill()
      }
      x.fillStyle = pcol(S, r.p)
      x.beginPath()
      x.arc(140, y - 6, 22, 0, 7)
      x.fill()
      x.fillStyle = tx
      x.font = '600 22px Manrope,Arial'
      x.textAlign = 'center'
      x.fillText('' + (i + 1), 140, y + 1)
      x.textAlign = 'left'
      x.fillStyle = tx
      x.font = '44px Georgia,serif'
      x.fillText(pname(S, r.p), 185, y + 6)
      x.textAlign = 'right'
      x.fillStyle = pcol(S, r.p)
      x.font = '700 38px Manrope,Arial,sans-serif'
      x.fillText(r.w + ' Siege · ' + r.s + ' pts', 980, y + 6)
    })
    x.textAlign = 'center'
    x.fillStyle = mu
    x.font = '500 26px Manrope,Arial,sans-serif'
    x.fillText('Blind ranken. Song für Song. Bis einer krönt.', 540, 1300)
  }
  return cv
}

async function preloadShareCovers(S: State) {
  const recs = winnerRecords(S).slice(0, 5)
  await Promise.all(
    recs.map(
      (r) =>
        new Promise<void>((res) => {
          const u = coverUrl(r)
          if (!u) return res()
          const im = new Image()
          im.crossOrigin = 'anonymous'
          im.onload = () => res()
          im.onerror = () => res()
          im.src = u
          setTimeout(res, 2500)
        }),
    ),
  )
}

export function share(S: State) {
  bus.emit('toast', 'Teilkarte wird erstellt …')
  void preloadShareCovers(S).then(() => doShare(S))
}

function doShare(S: State) {
  const cv = shareImg(S),
    ls: string[] = []
  for (let p = 1; p <= S.players; p++) ls.push(pname(S, p) + ': ' + wins(S, p) + ' Runden · ' + roundScore(S, p) + ' pts')
  const text = '🏆 Sound Clash — Endstand\n' + ls.join(' · ')
  cv.toBlob(async (b) => {
    if (!b) return
    const f = new File([b], 'sound-clash.png', { type: 'image/png' })
    try {
      if (navigator.canShare && navigator.canShare({ files: [f] })) {
        await navigator.share({ files: [f], text })
        return
      }
    } catch {
      // weiter mit Download
    }
    try {
      const u = URL.createObjectURL(b),
        a = document.createElement('a')
      a.href = u
      a.download = 'sound-clash.png'
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(u), 1500)
    } catch {
      // ignorieren
    }
    try {
      if (navigator.clipboard) void navigator.clipboard.writeText(text)
    } catch {
      // ignorieren
    }
    bus.emit('toast', 'Endstand gespeichert.')
  }, 'image/png')
}
