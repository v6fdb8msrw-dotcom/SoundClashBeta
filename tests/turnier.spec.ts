import { test } from './helpers/driver'

/** Turnier mit 4 Spielern: Kader, Turnierbaum, drei Matches, Turniersieger. */
test('Turnier · 4 Spieler · Kader umbenennen · drei Matches bis zum Turniersieg', async ({ app }) => {
  await app.open()
  await app.go('setup')
  await app.select('mode', 't4')
  app.record('speicher-nach-modus', await app.stored())
  await app.page.locator('[data-tn="0"]').fill('Anna')
  await app.page.locator('[data-tn="3"]').fill('Ben')
  await app.rosterAvatar(1, 4)
  await app.select('genre', 'uk')
  await app.page.waitForTimeout(100)
  // Hinweis: Das Original verbraucht den Topf pro Match. Für drei Matches braucht es 30 Künstler.
  await app.addArtists(30)
  await app.start()

  const bracket = async () =>
    app.page.evaluate(() => {
      const t = (e: Element | null) => (e?.textContent ?? '').replace(/\s+/g, ' ').trim()
      return {
        kicker: t(document.querySelector('#app .kicker')),
        title: t(document.querySelector('#app h2.display')),
        ranks: [...document.querySelectorAll('#app .rank')].map(t),
        go: t(document.querySelector('#tGo')),
      }
    })
  for (let m = 0; m < 3; m++) {
    app.record(`baum-${m}`, await bracket())
    await app.click('#tGo')
    app.record(`draft-${m}`, await app.draftAll((s) => (s + m) % 5))
    for (let d = 0; d < 5; d++) {
      app.record(`wahl-${m}-${d}`, await app.pickForDuel((k) => (k + d) % 3))
      app.record(`duell-${m}-${d}`, await app.decideDuel({ winner: (d + m) % 2 ? 2 : 1 }))
    }
    app.record(`runde-${m}`, await app.roundFacts())
    await app.click('#tNext')
  }
  await app.page.locator('#app .final').waitFor()
  app.record('final', await app.finalFacts())
  app.record('baum-final', await app.page.evaluate(() => [...document.querySelectorAll('#app .final .rank')].map((r) => (r.textContent ?? '').replace(/\s+/g, ' ').trim())))
  app.record('speicher', await app.stored())
  app.matchGolden('turnier-t4')
})
