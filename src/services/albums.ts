import { useEffect, useState } from 'react'
import { dzAlbum } from './deezer'

/** Echte Alben zu den Themes (Cover kommen von Deezer) */
export const THEME_ALBUMS: Record<string, string[]> = {
  main: ['Graduation Kanye West', 'After Hours The Weeknd', 'Blonde Frank Ocean'],
  graduation: ['Graduation Kanye West', 'Late Registration Kanye West', 'The College Dropout Kanye West'],
  afterhours: ['After Hours The Weeknd', 'Starboy The Weeknd', 'Dawn FM The Weeknd'],
  sos: ['SOS SZA', 'Ctrl SZA', 'Lana SZA'],
  blonde: ['Blonde Frank Ocean', 'Channel Orange Frank Ocean', 'nostalgia ultra Frank Ocean'],
  igor: ['IGOR Tyler, The Creator', 'Flower Boy Tyler, The Creator', 'Call Me If You Get Lost Tyler, The Creator'],
}
export type Album = { cover: string; title: string; artist: string }

/** Cover des Theme-Albums (für die Farbauswahl); das Hauptdesign hat kein eigenes Album */
export function useThemeCover(theme: string): string {
  const [c, setC] = useState('')
  useEffect(() => {
    if (theme === 'main') return
    let alive = true
    void dzAlbum((THEME_ALBUMS[theme] || [])[0] || '').then((a) => alive && setC(a?.cover || ''))
    return () => {
      alive = false
    }
  }, [theme])
  return c
}
