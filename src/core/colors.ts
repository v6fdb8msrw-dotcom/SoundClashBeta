import { AV, THEME_BG } from './constants'

/**
 * Spielerfarben ans Theme anpassen (1:1 aus dem Original).
 * Der Farbton bleibt (P1 ist immer rot), aber die Helligkeit wird so weit nachgezogen,
 * bis der Kontrast zum Theme-Hintergrund reicht.
 */
export function hex2rgb(h: string): [number, number, number] {
  h = h.replace('#', '')
  return [0, 2, 4].map((i) => parseInt(h.substr(i, 2), 16)) as [number, number, number]
}
export function rgb2hex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')
}
export function rgb2hsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255
  g /= 255
  b /= 255
  const mx = Math.max(r, g, b),
    mn = Math.min(r, g, b)
  let h = 0,
    sl = 0
  const l = (mx + mn) / 2
  if (mx !== mn) {
    const d = mx - mn
    sl = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn)
    h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4
    h /= 6
  }
  return [h, sl, l]
}
export function hsl2rgb(h: number, sl: number, l: number): [number, number, number] {
  if (!sl) return [l * 255, l * 255, l * 255]
  const q = l < 0.5 ? l * (1 + sl) : l + sl - l * sl,
    pp = 2 * l - q
  const f = (t: number) => {
    t = (t + 1) % 1
    if (t < 1 / 6) return pp + (q - pp) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return pp + (q - pp) * (2 / 3 - t) * 6
    return pp
  }
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255]
}
export function mixHex(a: string, b: string, t: number): string {
  const norm = (x: string) => {
    if (x[0] === '#') return x
    const m = x.match(/\d+/g)
    return m ? '#' + m.slice(0, 3).map((v) => (+v).toString(16).padStart(2, '0')).join('') : '#888888'
  }
  const A = hex2rgb(norm(a)),
    B = hex2rgb(norm(b))
  return rgb2hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t)
}
export function relLum(hex: string): number {
  const c = hex2rgb(hex).map((v) => {
    v /= 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
export function contrast(a: string, b: string): number {
  const x = relLum(a),
    y = relLum(b)
  const hi = Math.max(x, y),
    lo = Math.min(x, y)
  return (hi + 0.05) / (lo + 0.05)
}
export function fitColor(hex: string, bg: string, target: number): string {
  if (contrast(hex, bg) >= target) return hex
  const [h, sl] = rgb2hsl(...hex2rgb(hex))
  const heller = relLum(bg) < 0.2
  let l = rgb2hsl(...hex2rgb(hex))[2],
    best = hex,
    bestK = contrast(hex, bg)
  for (let i = 0; i < 48; i++) {
    l += heller ? 0.02 : -0.02
    if (l > 0.98 || l < 0.02) break
    const c = rgb2hex(...hsl2rgb(h, sl, l))
    const k = contrast(c, bg)
    if (k > bestK) {
      bestK = k
      best = c
    }
    if (k >= target) return c
  }
  return best
}

/*
 * Zwischenspeicher wie im Original: berechnet gegen das Theme, das gerade am <body> hängt,
 * gemerkt unter dem Theme aus dem Zustand. Das Original setzt das Body-Theme erst beim Zeichnen –
 * die Reihenfolge wird hier nachgebildet (siehe MECHANIK.md, Auffälligkeit 7).
 */
let COLFIT: Record<number, string> = {}
let colfitTheme: string | null = null
let bodyTheme = 'silksonic'

export function setBodyTheme(theme: string) {
  bodyTheme = theme
}
export function resetColorCache() {
  colfitTheme = null
}
export function themeColors(stateTheme: string): Record<number, string> {
  if (colfitTheme === stateTheme) return COLFIT
  const bg = THEME_BG[bodyTheme] || '#1A0A08'
  COLFIT = {}
  AV.forEach((a, i) => {
    COLFIT[i] = fitColor(a.c, bg, 3.2)
  })
  colfitTheme = stateTheme
  return COLFIT
}
