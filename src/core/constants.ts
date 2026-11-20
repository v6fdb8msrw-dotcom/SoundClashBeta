/**
 * Feste Werte aus dem Original (legacy/index.html). Nicht ändern – sie bestimmen Regeln,
 * Auswahllisten und gespeicherte Daten.
 */

/** Höchstzahl der Spieler in einer Runde. Original: 6 – Tims Freigabe 20.11.2026: 8 (MECHANIK §12). */
export const MAX_PLAYERS = 8

/** Grundfarben der Spieler (P1 rot, P2 blau, …). */
export const AV: readonly { c: string }[] = [
  { c: '#E5344E' }, { c: '#33CCFF' }, { c: '#22C55E' }, { c: '#E5B23C' }, { c: '#C084FC' }, { c: '#14D4C4' },
  { c: '#FF8A3D' }, { c: '#F472B6' }, { c: '#7C5CFF' }, { c: '#A3E635' }, { c: '#0EA5E9' }, { c: '#FB7185' },
  { c: '#FACC15' }, { c: '#2DD4BF' }, { c: '#E879F9' }, { c: '#94A3B8' },
]

export const BGS: readonly [string, string][] = [
  ['cover', 'Album-Cover'],
  ['aura', 'Farbwolken'],
  ['shapes', 'Schwebende Formen'],
  ['records', 'Platten-Regen'],
  ['mosaic', 'Künstler-Mosaik'],
  ['deck', 'Plattenspieler'],
  ['walldeck', 'Mosaik + Plattenspieler'],
  ['aurora', 'Aurora (Beat)'],
  ['auroradeck', 'Aurora + Plattenspieler'],
  // neu (Tims Wunsch nach mehr Auswahl)
  ['flow', 'Mosaik (wandernd)'],
  ['stage', 'Bühne (Lichtkegel)'],
  ['horizon', 'Neon-Horizont'],
  ['waves', 'Klangwellen'],
  ['plain', 'Schlicht'],
  // Plattenspieler zu jedem Hintergrund zuschaltbar (Tims Wunsch)
  ['flowdeck', 'Mosaik (wandernd) + Plattenspieler'],
  ['stagedeck', 'Bühne + Plattenspieler'],
  ['horizondeck', 'Neon-Horizont + Plattenspieler'],
  ['wavesdeck', 'Klangwellen + Plattenspieler'],
  ['auradeck', 'Farbwolken + Plattenspieler'],
  ['shapesdeck', 'Formen + Plattenspieler'],
]

/** Im Menü angebotene Hintergründe (die übrigen Werte bleiben für alte Spielstände gültig) */
export const BG_MENU = ['cover', 'aura', 'mosaic', 'horizon', 'plain']

/**
 * Hintergrund ohne → mit Plattenspieler. Im Menü wählt man den Hintergrund und schaltet den
 * Plattenspieler getrennt dazu; gespeichert wird weiter ein einzelner Wert (wie im Original).
 */
export const BG_DECK: Readonly<Record<string, string>> = {
  aura: 'auradeck',
  shapes: 'shapesdeck',
  records: 'records',
  mosaic: 'walldeck',
  flow: 'flowdeck',
  aurora: 'auroradeck',
  stage: 'stagedeck',
  horizon: 'horizondeck',
  waves: 'wavesdeck',
  plain: 'deck',
}
/** Grund-Hintergrund ohne Plattenspieler (z. B. „walldeck“ → „mosaic“). */
export function bgBase(bg: string): string {
  if (BG_DECK[bg]) return bg
  for (const k in BG_DECK) if (BG_DECK[k] === bg) return k
  return bg
}
export function bgHasDeck(bg: string): boolean {
  return bgBase(bg) !== bg
}

export const THEMES: readonly [string, string][] = [
  ['main', 'Graduation'],
  ['itoldthem', 'I Told Them...'],
  ['astroworld', 'Astroworld'],
  ['afterhours', 'After Hours'],
  ['igor', 'IGOR'],
  ['blonde', 'Blonde'],
  ['darkside', 'Dark Side of the Moon'],
  ['heavenorhell', 'Heaven Or Hell'],
  ['wunna', 'WUNNA'],
  ['testing', 'TESTING'],
  ['ajtracey', 'AJ Tracey'],
  ['berliner', 'Ich bin 2 Berliner'],
  ['silksonic', 'Silk Sonic'],
  ['graphit', 'Graphit (neutral)'],
]

/** Jedes Theme startet mit seinem Album-Cover als Hintergrund (danach im Menü frei wählbar). */
export const THEME_DEFAULT_BG: Record<string, string> = Object.fromEntries(
  THEMES.map(([k]) => [k, k === 'graphit' ? 'aura' : 'cover']),
)

/** Theme mit hellem Hintergrund (dunkle Schrift). */
export const LIGHT_THEMES: string[] = []

/** Theme-Hintergrund (--bg) – Grundlage für die Kontrast-Anpassung der Spielerfarben. */
export const THEME_BG: Record<string, string> = {
  main: '#2A1450', testing: '#0B0B0B', ajtracey: '#0B0C10', c23: '#F2C230', psychodrama: '#02060F', konnichiwa: '#F4F2EE',
  russisch: '#080808', kiox: '#1230F5', itoldthem: '#0B1A2A', heavenorhell: '#1A0F0D', wunna: '#04211F', geist: '#0C1414', berliner: '#1C0F20', tooloud: '#170707',
  justice: '#071413', megatron: '#12111C', heavyhead: '#0A1412', universum: '#020308', raop: '#F6E7D2', astroworld: '#24160A', tpab: '#0E0D0C', darkside: '#050506', thriller: '#F4EEE4', views: '#0F1318', discovery: '#0B0B12', abbeyroad: '#0B1622', silksonic: '#1A0F08', graduation: '#210947', igor: '#1E0D14', sos: '#050D18', llasap: '#070707',
  afterhours: '#120A08', blonde: '#0E1410', currents: '#0C1922', nectar: '#160913', warmlime: '#20280F',
  skymint: '#1B1D22', graphit: '#101113', emerald: '#053E2F', ultraviolet: '#22083D',
}

/** Farben der Radsegmente: Theme-Farben + feste Töne. */
export const WCOL = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--c5)', 'var(--c6)', 'var(--primary)', 'var(--accent)']

/** Grundfarbe je Genre – das Rad tönt seine Segmente in diese Richtung. */
export const GENRE_HUE: Record<string, string> = {
  rnb: '#B25FE6', rap_usa: '#E5484D', rap_usa_nostalgie: '#C4552E', deutschrap: '#3D8BFF',
  uk: '#E5344E', nostalgie: '#E0A93B', country: '#C6893F', old_rock: '#8A5A2B',
  electronic: '#12C7D4', pop: '#FF5FA2', banger: '#FF6A00', silk_soul: '#D4A24C',
  reggae: '#3FBF5F', latin: '#FF8A3D', afrobeats: '#F2B807', kpop: '#FF7ED4',
  indie: '#6F9E76', metal: '#9AA0A6', jazz_soul: '#C77D3A', house_techno: '#2FE0B0',
  french_rap: '#5C7CFA', schlager: '#FF9BC4', myrotation: '#C74BFF',
  d70: '#E0873B', d80: '#FF3D9A', d90: '#33B5E5', d00: '#7C5CFF', d10: '#2FE0B0', d20: '#FF5A4D', film: '#D4AF37',
}

/** Jahrzehnt-Auflagen pro Platz (im Original nie aktiv, siehe MECHANIK.md). */
export interface Era {
  id: string
  t: string
}
export const ERAS: readonly Era[] = [
  { id: 'pre00', t: 'nur vor 2000' },
  { id: 'pre10', t: 'nur vor 2010' },
  { id: '00s', t: 'nur 2000–2009' },
  { id: '10s', t: 'nur 2010–2019' },
  { id: 'post15', t: 'nur ab 2015' },
  { id: 'post20', t: 'nur ab 2020' },
]
export function eraOk(id: string, y: number): boolean {
  switch (id) {
    case 'pre00': return y < 2000
    case 'pre10': return y < 2010
    case '00s': return y >= 2000 && y < 2010
    case '10s': return y >= 2010 && y < 2020
    case 'post15': return y >= 2015
    case 'post20': return y >= 2020
  }
  return true
}

/** Guess the Song – Stichproben (Sekunden) und Punkte. */
export const GUESS_STEPS: readonly [number, number][] = [[0.2, 12], [0.5, 10], [1, 8], [2, 6], [3, 5], [5, 3], [8, 1]]

export const DIFF_CFG: Record<string, { artists: number; per: number; from: number; to: number }> = {
  sing: { artists: 22, per: 1, from: 0, to: 1 },
  easy: { artists: 14, per: 2, from: 0, to: 2 },
  medium: { artists: 20, per: 3, from: 0, to: 6 },
  ultra: { artists: 22, per: 5, from: 3, to: 10 },
}

/** Jahrzehnt-Duell. */
export const DEC = [1960, 1970, 1980, 1990, 2000, 2010, 2020]
export const decLabel = (d: number) => ('0' + (d % 100)).slice(-2) + 'er'
export function decadeOf(y: number): number {
  let d = Math.floor(y / 10) * 10
  if (d < 1960) d = 1960
  if (d > 2020) d = 2020
  return d
}

export const roundLabel = (n: number) =>
  n === 2 ? 'Finale' : n === 4 ? 'Halbfinale' : n === 8 ? 'Viertelfinale' : n === 16 ? 'Achtelfinale' : 'Runde'
