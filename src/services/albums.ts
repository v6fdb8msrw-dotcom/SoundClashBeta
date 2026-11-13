import { useEffect, useState } from 'react'
import { dzAlbum } from './deezer'

/** Echte Alben zu den Themes (Cover kommen von Deezer) */
export const THEME_ALBUMS: Record<string, string[]> = {
  main: ['Graduation Kanye West', 'Late Registration Kanye West', 'The College Dropout Kanye West'],
  astroworld: ['Astroworld Travis Scott', 'Utopia Travis Scott', 'Rodeo Travis Scott'],
  tpab: ['To Pimp a Butterfly Kendrick Lamar', 'DAMN. Kendrick Lamar', 'good kid, m.A.A.d city Kendrick Lamar'],
  darkside: ['The Dark Side of the Moon Pink Floyd', 'Wish You Were Here Pink Floyd', 'The Wall Pink Floyd'],
  thriller: ['Thriller Michael Jackson', 'Bad Michael Jackson', 'Off the Wall Michael Jackson'],
  views: ['Views Drake', 'Take Care Drake', 'Nothing Was the Same Drake'],
  discovery: ['Discovery Daft Punk', 'Random Access Memories Daft Punk', 'Homework Daft Punk'],
  abbeyroad: ['Abbey Road The Beatles', 'Sgt. Pepper The Beatles', 'Revolver The Beatles'],
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
    let alive = true
    void dzAlbum((THEME_ALBUMS[theme] || [])[0] || '').then((a) => alive && setC(a?.cover || ''))
    return () => {
      alive = false
    }
  }, [theme])
  return c
}
