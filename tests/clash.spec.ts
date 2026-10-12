import { test } from './helpers/driver'

/**
 * Sound Clash (Original-Modus): komplette Matches von der Einrichtung bis zum Endstand.
 * Jeder Ablauf schreibt eine Spur (Bildschirmtexte, Punkte, Rückblick, gespeicherte Daten),
 * die beim Original zur Referenz wird und von der neuen Fassung exakt erfüllt werden muss.
 */

test('Clash · 2 Spieler · 5 Songs · Einzelrunde · Publikum stimmt ab · Songwahl vor jedem Duell', async ({ app }) => {
  await app.open()
  app.record('start-speicher', await app.stored())
  await app.go('setup')
  app.record('setup-hinweis', await app.page.locator('.startbar .hint').first().textContent())
  await app.addArtists(10)
  app.record('topf', await app.page.locator('#app .cardhead .pill').textContent())
  await app.start()
  app.record('draft', await app.draftAll((s) => (s % 3 === 1 ? 4 : 0), (s) => [0.5, 0.1, 0.9, 0.3][s % 4]))

  const winners = [1, 2, 1, 2, 1]
  for (let d = 0; d < 5; d++) {
    app.record(`wahl-${d}`, await app.pickForDuel((k) => (k === 0 ? 0 : 1)))
    const votes = winners[d] === 1 ? { 1: 2, 2: 1 } : { 1: 1, 2: 3 }
    app.record(`duell-${d}`, await app.decideDuel({ votes }))
  }
  app.record('runde', await app.roundFacts())
  await app.click('#toFinal')
  await app.page.locator('#app .final').waitFor()
  await app.page.waitForTimeout(300)
  app.record('final', await app.finalFacts())
  app.record('toasts', await app.toasts())
  app.record('speicher', await app.stored())
  app.matchGolden('clash-2p-publikum')
})

test('Clash · 3 Spieler · Best of 3 · alle Songs vorab · gemeinsam antippen · Gleichstand → Sudden Death', async ({ app }) => {
  await app.open()
  await app.go('setup')
  await app.select('players', 3)
  await app.select('series', 'bo3')
  await app.select('songMode', 'upfront')
  await app.select('audience', '0')
  await app.select('genre', 'deutschrap')
  await app.page.waitForTimeout(100)
  await app.addArtists(15)
  app.record('setup', await app.stored())
  await app.start()
  app.record('draft-1', await app.draftAll((s) => s % 5))

  // Songs vorab: alle wählen, ein Song von Hand, einer geändert
  const songsFacts = async () =>
    app.page.evaluate(() => {
      const t = (e: Element | null) => (e?.textContent ?? '').replace(/\s+/g, ' ').trim()
      return {
        cols: [...document.querySelectorAll('#app .pcol')].map((c) => ({
          nm: t(c.querySelector('.ph .nm')),
          cards: [...c.querySelectorAll('.acard')].map((a) => `${t(a.querySelector('.badge'))}|${t(a.querySelector('.an'))}|${t(a.querySelector('.chosen .tt'))}`),
        })),
        toBattle: (document.querySelector('#toBattle') as HTMLButtonElement | null)?.disabled ?? null,
        skip: !!document.querySelector('#skipSongs'),
      }
    })
  await app.waitTracks()
  app.record('songs-leer', await songsFacts())
  for (let p = 1; p <= 3; p++) {
    for (let i = 0; i < 5; i++) {
      if (p === 2 && i === 3) {
        const det = app.page.locator(`#man_${p}_${i} > summary`)
        await det.click()
        await app.page.locator(`[data-mq="${p}_${i}"]`).fill('Mein Lieblingssong')
        await app.page.locator(`[data-madd="${p}_${i}"]`).click()
        continue
      }
      const row = app.page.locator(`[data-pick^="${p}_${i}_"]`)
      await row.first().waitFor({ timeout: 30000 })
      await row.nth(Math.min(i, (await row.count()) - 1)).click()
    }
  }
  await app.click('[data-clr="1_0"]')
  await app.page.locator('[data-pick^="1_0_"]').nth(2).click()
  app.record('songs-voll', await songsFacts())
  await app.click('#toBattle')

  // P1: #1 + #5(×2) = 3 · P2: #2 #3 #4 = 3 · P3: 0 → Gleichstand P1/P2
  for (const w of [1, 2, 2, 2, 1]) app.record('duell', await app.decideDuel({ winner: w }))
  app.record('toasts-sd', await app.toasts())
  await app.waitTracks()
  app.record('songs-sd', await songsFacts())
  for (const p of [1, 2]) await app.page.locator(`[data-pick^="${p}_0_"]`).first().click()
  await app.click('#toBattle')
  app.record('duell-sd', await app.decideDuel({ winner: 2 }))
  app.record('runde-1', await app.roundFacts())
  await app.click('#nextRound')
  app.record('toasts-runde2', await app.toasts())
  app.record('topf-runde2', await app.page.locator('#app .cardhead .pill').textContent())
  await app.start()
  app.record('draft-2', await app.draftAll((s) => (s * 2) % 5, (s) => [0.7, 0.2][s % 2]))
  await app.click('#skipSongs')
  for (const w of [2, 2, 3, 3, 2]) app.record('duell-r2', await app.decideDuel({ winner: w }))
  app.record('runde-2', await app.roundFacts())
  await app.click('#toFinal')
  await app.page.locator('#app .final').waitFor()
  app.record('final', await app.finalFacts())
  app.record('speicher', await app.stored())
  app.matchGolden('clash-3p-bo3-sd')
})

test('Clash · Gleicher Künstler für alle · 7 Songs · Pick-Timer · Überspringen · von Hand', async ({ app }) => {
  await app.open()
  await app.go('setup')
  await app.select('size', 7)
  await app.select('sameArtist', '1')
  await app.select('audience', '0')
  await app.select('pickSec', '30')
  await app.select('genre', 'pop')
  await app.page.waitForTimeout(100)
  await app.addArtists(14)
  await app.start()
  app.record('draft', await app.draftAll((s) => (s % 2 ? 6 : 0), (s) => [0.15, 0.85, 0.5][s % 3]))

  // Duell 1: P1 wählt, P2 lässt die Zeit ablaufen (automatische Übernahme)
  await app.waitTracks()
  await app.page.locator('[data-pick]').first().click()
  app.record('pick-1', await app.pickFacts())
  await app.click('#pickNext')
  await app.waitTracks()
  app.record('pick-2-vor-timer', await app.pickFacts())
  await app.page.clock.setFixedTime(new Date(Date.parse('2026-05-01T12:00:00Z') + 31_000))
  await app.page.locator('#app .duelhead').waitFor({ timeout: 10000 })
  app.record('toasts-timer', await app.toasts())
  await app.page.clock.setFixedTime(new Date('2026-05-01T12:00:00Z'))
  app.record('duell-0', await app.decideDuel({ winner: 2 }))

  // Duell 2: Reihenfolge dreht sich, einer überspringt, einer trägt von Hand ein
  app.record('wahl-1', await app.pickForDuel((k) => (k === 0 ? 'skip' : 'Handarbeit')))
  app.record('duell-1', await app.decideDuel({ winner: 1 }))
  for (let d = 2; d < 7; d++) {
    app.record(`wahl-${d}`, await app.pickForDuel((k) => k + d - 2))
    app.record(`duell-${d}`, await app.decideDuel({ winner: d % 2 ? 1 : 2 }))
  }
  app.record('runde', await app.roundFacts())
  await app.click('#toFinal')
  await app.page.locator('#app .final').waitFor()
  app.record('final', await app.finalFacts())
  app.record('speicher', await app.stored())
  app.matchGolden('clash-gleicher-kuenstler')
})
