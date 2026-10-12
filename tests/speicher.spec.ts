import { test } from './helpers/driver'

/** Einstellungen ändern, gespeicherte Daten prüfen, neu laden und Wiederherstellung prüfen. */
test('Speicher · Einstellungen, Namen, Avatar, Topf, Theme und Hintergrund überstehen einen Neustart', async ({ app }) => {
  const visible = async () =>
    app.page.evaluate(() => {
      const t = (e: Element | null) => (e?.textContent ?? '').replace(/\s+/g, ' ').trim()
      const sel: Record<string, string> = {}
      for (const id of ['mode', 'players', 'size', 'series', 'songMode', 'sameArtist', 'audience', 'pickSec', 'ambience', 'autoScroll', 'genre', 'bg', 'theme']) {
        sel[id] = t(document.querySelector(`[data-op="${id}"][aria-selected="true"]`))
      }
      return {
        theme: document.body.getAttribute('data-theme'),
        sound: t(document.querySelector('#soundBtn')),
        sel,
        names: [...document.querySelectorAll('[data-nm]')].map((i) => (i as HTMLInputElement).value),
        avatarOn: [...document.querySelectorAll('[data-av].on')].map((b) => b.getAttribute('data-av') + ':' + b.getAttribute('data-i')),
        pool: [...document.querySelectorAll('[data-rm]')].map((b) => b.getAttribute('data-rm')),
        poolPill: t(document.querySelector('#app .cardhead .pill')),
        start: (document.querySelector('#startBtn') as HTMLButtonElement | null)?.disabled ?? null,
        hint: t(document.querySelector('#app .startbar .hint')),
      }
    })
  await app.open()
  await app.select('theme', 'igor')
  await app.select('bg', 'aurora')
  await app.click('#soundBtn')
  await app.go('setup')
  app.record('frisch', await visible())
  await app.select('players', 4)
  await app.page.locator('[data-nm="1"]').fill('Tim')
  await app.page.locator('[data-nm="2"]').fill('Lea')
  await app.page.locator('[data-nm="3"]').fill('  ')
  await app.page.locator('[data-av="1"][data-i="7"]').click()
  await app.select('size', 10)
  await app.select('series', 'bo5')
  await app.select('songMode', 'upfront')
  await app.select('sameArtist', '1')
  await app.select('audience', '0')
  await app.select('pickSec', '45')
  await app.select('ambience', '0')
  await app.select('autoScroll', '0')
  await app.select('genre', 'latin')
  await app.page.waitForTimeout(100)
  await app.addArtists(4)
  await app.page.locator('[data-rm]').nth(1).click()
  // Künstlersuche im eingebetteten Katalog (ohne Live-Treffer, die kommen erst nach 340 ms)
  await app.page.locator('#asearch').fill('drake')
  await app.page.waitForTimeout(800)
  app.record('suche', await app.page.evaluate(() => [...document.querySelectorAll('#alist .arow .nm')].map((e) => e.textContent)))
  await app.page.locator('#alist [data-add]').first().click()
  app.record('vor-neustart', await visible())
  app.record('speicher', await app.stored())
  await app.page.reload()
  await app.page.locator('[data-go="setup"]').waitFor()
  await app.go('setup')
  app.record('nach-neustart', await visible())
  app.record('speicher-nach-neustart', await app.stored())
  // Turnier-Kader wird mitgespeichert
  await app.select('mode', 't8')
  await app.page.locator('[data-tn="5"]').fill('Kim')
  await app.page.reload()
  await app.go('setup')
  app.record('turnier-nach-neustart', await app.page.evaluate(() => [...document.querySelectorAll('[data-tn]')].map((i) => (i as HTMLInputElement).value)))
  app.record('speicher-turnier', await app.stored())
  app.matchGolden('speicher')
})
