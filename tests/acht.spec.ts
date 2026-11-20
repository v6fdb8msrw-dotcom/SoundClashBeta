import { test, expect } from './helpers/driver'

/**
 * Bis zu 8 Spieler (Tims Freigabe 20.11.2026, MECHANIK §12): eine ganze Runde mit 8 Spielern –
 * Einrichtung, Ziehen, Songwahl vor jedem Duell, Abstimmen, Rundenbildschirm, Endstand.
 * Nur gegen die neue Fassung (das Original kann höchstens 6). Bildschirmfotos landen im Testordner.
 */
test('Clash · 8 Spieler · eine ganze Runde', async ({ app }, info) => {
  const page = app.page
  const snap = async (name: string) => {
    await page.waitForTimeout(500)
    await page.screenshot({ path: info.outputPath(name + '.png') })
  }

  await app.open()
  await app.go('setup')
  await app.select('players', 8)
  // 8 Spieler × 5 Songs = 40 Künstler. Genommen werden Künstler, deren Deezer-Antworten in
  // tests/fixtures/deezer aufgezeichnet sind – so läuft der Test auch ohne Netz.
  await expect(page.locator('.sb-text')).toContainText('Mindestens 40 Künstler')
  const POT: Record<string, string[]> = {
    uk: ['Stormzy', 'Skepta', 'Central Cee', 'J Hus', 'Headie One', 'Aitch', 'AJ Tracey', 'Digga D', 'Little Simz', 'Wiley', 'Yxng Bane', 'Not3s', 'Lethal Bizzle', 'Chip', 'Fredo', 'Bugzy Malone', 'Russ Millions', 'Tion Wayne', 'Professor Green', 'Tinie Tempah', 'Dizzee Rascal', 'Kate Nash', 'Lily Allen', 'Jorja Smith', 'FKA twigs', 'Michael Kiwanuka', 'The 1975', 'Arctic Monkeys', 'Lana Del Rey', 'Yungblud'],
    deutschrap: ['Kollegah', 'Farid Bang', 'Bushido', 'Sido', 'Cro', 'Capital Bra', 'Bonez MC', 'RAF Camora', 'Ufo361', 'Apache 207'],
  }
  for (const [genre, names] of Object.entries(POT)) {
    await app.select('genre', genre)
    await page.waitForTimeout(100)
    for (const n of names) {
      const btn = page.locator(`#alist [data-add="${n}"]`).first()
      while (!(await btn.count()) && (await page.locator('#moreBtn').count())) await page.locator('#moreBtn').click()
      await btn.click()
    }
  }
  await expect(page.locator('#startBtn')).toBeEnabled()
  // Jeder der 8 hat Namen und Avatar
  const names = await page.locator('.plist input').evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value))
  expect(names).toEqual(['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'])
  const stored = (await app.stored()).settings as { players: number; avatar: Record<string, string> }
  expect(stored.players).toBe(8)
  for (let p = 1; p <= 8; p++) expect(stored.avatar[p], `Avatar P${p}`).toBeTruthy()
  await snap('1-einrichtung')

  await app.start()
  await expect(page.locator('#app .pcluster')).toHaveCount(8)
  await snap('2-ziehen-start')
  const log = (await app.draftAll((s) => s % 5)) as { before: { clusters: { on: boolean }[] } }[]
  expect(log.length).toBe(40)
  // reihum: jeder der 8 war am Zug
  const turns = new Set(log.map((l) => l.before.clusters.findIndex((c) => c.on)))
  expect([...turns].sort()).toEqual([0, 1, 2, 3, 4, 5, 6, 7])

  // Songwahl und Duelle, bis der Rundenbildschirm kommt
  for (let d = 0; d < 12; d++) {
    if (await page.locator('#toFinal, #nextRound').count()) break
    if (await page.locator('#pickNext').count()) {
      if (d === 0) {
        await app.waitTracks()
        await snap('3-songwahl')
      }
      await app.pickForDuel(() => 0)
    }
    await page.locator('.dcard').first().waitFor({ timeout: 30000 })
    if (d === 0) {
      await expect(page.locator('#app .dcard')).toHaveCount(8)
      await snap('4-duell')
    }
    await app.decideDuel({ votes: { [(d % 8) + 1]: 2 } })
    await page.waitForTimeout(1100)
  }
  await page.locator('#toFinal, #nextRound').first().waitFor()
  const round = await app.roundFacts()
  expect(round.stats.length).toBe(8)
  await snap('5-runde')
  await app.click('#toFinal')
  await page.waitForTimeout(1500)
  await snap('6-endstand')
})
