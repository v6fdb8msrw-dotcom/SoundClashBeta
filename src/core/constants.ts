/**
 * Feste Werte aus dem Original (legacy/index.html). Nicht ändern – sie bestimmen Regeln,
 * Auswahllisten und gespeicherte Daten.
 */

/** Grundfarben der Spieler (P1 rot, P2 blau, …). */
export const AV: readonly { c: string }[] = [
  { c: '#E5344E' }, { c: '#33CCFF' }, { c: '#22C55E' }, { c: '#E5B23C' }, { c: '#C084FC' }, { c: '#14D4C4' },
  { c: '#FF8A3D' }, { c: '#F472B6' }, { c: '#7C5CFF' }, { c: '#A3E635' }, { c: '#0EA5E9' }, { c: '#FB7185' },
  { c: '#FACC15' }, { c: '#2DD4BF' }, { c: '#E879F9' }, { c: '#94A3B8' },
]

export const BGS: readonly [string, string][] = [
  ['mosaic', 'Künstler-Mosaik'],
  ['deck', 'Plattenspieler'],
  ['walldeck', 'Mosaik + Plattenspieler'],
  ['aurora', 'Aurora (Beat)'],
  ['auroradeck', 'Aurora + Plattenspieler'],
  // neu (Tims Wunsch nach mehr Auswahl)
  ['flow', 'Mosaik (wandernd)'],
  ['stage', 'Bühne (Lichtkegel)'],
  ['horizon', 'Neon-Horizont'],
]

export const THEMES: readonly [string, string][] = [
  ['silksonic', 'Silk Sonic'],
  ['graduation', 'Graduation'],
  ['igor', 'IGOR'],
  ['sos', 'SOS'],
  ['llasap', 'Long. Live. A$AP'],
  ['afterhours', 'After Hours'],
  ['blonde', 'Blonde'],
  ['currents', 'Currents'],
  ['nectar', 'Nectar'],
  ['warmlime', 'Warm Lime'],
  ['skymint', 'Sky Mint'],
  ['emerald', 'Emerald'],
  ['ultraviolet', 'Ultra Violet'],
]

/** Theme-Hintergrund (--bg) – Grundlage für die Kontrast-Anpassung der Spielerfarben. */
export const THEME_BG: Record<string, string> = {
  silksonic: '#190A07', graduation: '#210947', igor: '#F0CFC6', sos: '#050D18', llasap: '#070707',
  afterhours: '#12060A', blonde: '#0B1A0E', currents: '#0C1922', nectar: '#160913', warmlime: '#20280F',
  skymint: '#1B1D22', emerald: '#053E2F', ultraviolet: '#22083D',
}

/** Farben der Radsegmente: Theme-Farben + feste Töne. */
export const WCOL = ['var(--primary)', 'var(--secondary)', 'var(--accent)', '#FF9500', '#4A90E2', '#B084EE', '#00C896', '#FF6B9D']

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
