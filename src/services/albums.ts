import { useEffect, useState } from 'react'
import { dzAlbum } from './deezer'

/** Echte Alben zu den Themes (Cover kommen von Deezer) */
export const THEME_ALBUMS: Record<string, string[]> = {
  main: ['Graduation Kanye West', 'Late Registration Kanye West', 'The College Dropout Kanye West'],
  itoldthem: ['I Told Them Burna Boy', 'African Giant Burna Boy', 'Love, Damini Burna Boy'],
  astroworld: ['Astroworld Travis Scott', 'Utopia Travis Scott', 'Rodeo Travis Scott'],
  afterhours: ['After Hours The Weeknd', 'Starboy The Weeknd', 'Dawn FM The Weeknd'],
  igor: ['IGOR Tyler, The Creator', 'Flower Boy Tyler, The Creator', 'CHROMAKOPIA Tyler, The Creator'],
  blonde: ['Blonde Frank Ocean', 'Channel Orange Frank Ocean', 'nostalgia ultra Frank Ocean'],
  darkside: ['The Dark Side of the Moon Pink Floyd', 'Wish You Were Here Pink Floyd', 'The Wall Pink Floyd'],
  heavenorhell: ['Heaven Or Hell Don Toliver', 'Life of a DON Don Toliver', 'HARDSTONE PSYCHO Don Toliver'],
  wunna: ['WUNNA Gunna', 'DS4EVER Gunna', 'a Gift & a Curse Gunna'],
  testing: ['TESTING A$AP Rocky', 'LONG.LIVE.A$AP A$AP Rocky', 'AT.LONG.LAST.A$AP A$AP Rocky'],
  ajtracey: ['AJ Tracey AJ Tracey', 'Flu Game AJ Tracey', 'Ladbroke Grove AJ Tracey'],
  berliner: ['Ich bin 2 Berliner Ufo361', 'Ich bin ein Berliner Ufo361', 'VVS Ufo361'],
  silksonic: ['An Evening With Silk Sonic Bruno Mars', '24K Magic Bruno Mars', 'Malibu Anderson .Paak'],
}
/** Plattenstapel für Themes ohne eigenes Album (Graphit): Tims meistgehörte Künstler, in Graustufen */
export const NEUTRAL_ALBUMS = ['DS4EVER Gunna', 'I Told Them Burna Boy', 'Heaven Or Hell Don Toliver']
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
