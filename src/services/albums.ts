import { useEffect, useState } from 'react'
import { dzAlbum } from './deezer'

/** Echte Alben zu den Themes (Cover kommen von Deezer) */
export const THEME_ALBUMS: Record<string, string[]> = {
  main: ['Graduation Kanye West', 'Late Registration Kanye West', 'The College Dropout Kanye West'],
  testing: ['TESTING A$AP Rocky', 'LONG.LIVE.A$AP A$AP Rocky', 'AT.LONG.LAST.A$AP A$AP Rocky'],
  ajtracey: ['AJ Tracey AJ Tracey', 'Flu Game AJ Tracey', 'Ladbroke Grove AJ Tracey'],
  c23: ['23 Central Cee', 'Can\'t Rush Greatness Central Cee', 'Wild West Central Cee'],
  psychodrama: ['PSYCHODRAMA Dave', 'We\'re All Alone In This Together Dave', 'Game Over Dave'],
  konnichiwa: ['Konnichiwa Skepta', 'Ignorance Is Bliss Skepta', 'Knife Party Skepta'],
  afterhours: ['After Hours The Weeknd', 'Starboy The Weeknd', 'Dawn FM The Weeknd'],
  igor: ['IGOR Tyler, The Creator', 'Flower Boy Tyler, The Creator', 'CHROMAKOPIA Tyler, The Creator'],
  russisch: ['Russisch Roulette Haftbefehl', 'Blockplatin Haftbefehl', 'Das weisse Album Haftbefehl'],
  kiox: ['KIOX KUMMER', 'Mit K Kraftklub', 'KARGO Kraftklub'],
  wildberry: ['Wildberry Lillet Nina Chuba', 'Glas Nina Chuba', 'Nina Chuba Farbenblind'],
  raop: ['Raop CRO', 'Melodie CRO', 'tru. CRO'],
}
export type Album = { cover: string; title: string; artist: string }

/** Cover des Theme-Albums (für die Farbauswahl); das Hauptdesign hat kein eigenes Album */
export function useThemeCover(theme: string): string {
  const [c, setC] = useState('')
  useEffect(() => {
    let alive = true
    void dzAlbum((THEME_ALBUMS[theme] || [])[0] || '').then((a) => alive && setC(a?.cover || ''))
    return () => {
      alive = false
    }
  }, [theme])
  return c
}
