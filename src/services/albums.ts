import { useEffect, useState } from 'react'
import { dzAlbum } from './deezer'

/** Echte Alben zu den Themes (Cover kommen von Deezer) */
export const THEME_ALBUMS: Record<string, string[]> = {
  main: ['Graduation Kanye West', 'Late Registration Kanye West', 'The College Dropout Kanye West'],
  itoldthem: ['I Told Them Burna Boy', 'African Giant Burna Boy', 'Love, Damini Burna Boy'],
  heavenorhell: ['Heaven Or Hell Don Toliver', 'Life of a DON Don Toliver', 'HARDSTONE PSYCHO Don Toliver'],
  wunna: ['WUNNA Gunna', 'DS4EVER Gunna', 'a Gift & a Curse Gunna'],
  testing: ['TESTING A$AP Rocky', 'LONG.LIVE.A$AP A$AP Rocky', 'AT.LONG.LAST.A$AP A$AP Rocky'],
  ajtracey: ['AJ Tracey AJ Tracey', 'Flu Game AJ Tracey', 'Ladbroke Grove AJ Tracey'],
  tooloud: ['tooloud vol.1 lemvig', 'tooloud vol. 2 essaouira', 'Eimsbüttel Altona tooloudfortheroom'],
  universum: ['Universum regelt Schmyt', 'Gift Schmyt', 'Sternenstaub Schmyt'],
  megatron: ['Planet Megatron RIN', 'EROS RIN', 'Nimmerland RIN'],
  geist: ['Geist OG Keemo', 'Mann Beisst Hund OG Keemo', 'Fieber OG Keemo'],
  berliner: ['Ich bin 2 Berliner Ufo361', 'Ich bin ein Berliner Ufo361', 'VVS Ufo361'],
  justice: ['Justice Justin Bieber', 'Purpose Justin Bieber', 'Changes Justin Bieber'],
  heavyhead: ['Heavy Is The Head Stormzy', 'Gang Signs & Prayer Stormzy', 'This Is What I Mean Stormzy'],
  c23: ['23 Central Cee', 'Can\'t Rush Greatness Central Cee', 'Wild West Central Cee'],
  psychodrama: ['PSYCHODRAMA Dave', 'We\'re All Alone In This Together Dave', 'Game Over Dave'],
  konnichiwa: ['Konnichiwa Skepta', 'Ignorance Is Bliss Skepta', 'Knife Party Skepta'],
  russisch: ['Russisch Roulette Haftbefehl', 'Blockplatin Haftbefehl', 'Das weisse Album Haftbefehl'],
  kiox: ['KIOX KUMMER', 'Mit K Kraftklub', 'KARGO Kraftklub'],
  raop: ['Raop CRO', 'Melodie CRO', 'tru. CRO'],
  afterhours: ['After Hours The Weeknd', 'Starboy The Weeknd', 'Dawn FM The Weeknd'],
  sos: ['SOS SZA', 'Ctrl SZA', 'Lana SZA'],
  blonde: ['Blonde Frank Ocean', 'Channel Orange Frank Ocean', 'nostalgia ultra Frank Ocean'],
  igor: ['IGOR Tyler, The Creator', 'Flower Boy Tyler, The Creator', 'CHROMAKOPIA Tyler, The Creator'],
  astroworld: ['Astroworld Travis Scott', 'Utopia Travis Scott', 'Rodeo Travis Scott'],
  tpab: ['To Pimp a Butterfly Kendrick Lamar', 'DAMN. Kendrick Lamar', 'good kid, m.A.A.d city Kendrick Lamar'],
  views: ['Views Drake', 'Take Care Drake', 'Nothing Was the Same Drake'],
  darkside: ['The Dark Side of the Moon Pink Floyd', 'Wish You Were Here Pink Floyd', 'The Wall Pink Floyd'],
  thriller: ['Thriller Michael Jackson', 'Bad Michael Jackson', 'Off the Wall Michael Jackson'],
  discovery: ['Discovery Daft Punk', 'Random Access Memories Daft Punk', 'Homework Daft Punk'],
  abbeyroad: ['Abbey Road The Beatles', 'Sgt. Pepper The Beatles', 'Revolver The Beatles'],
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
