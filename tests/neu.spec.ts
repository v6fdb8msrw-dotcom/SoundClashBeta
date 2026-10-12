import { readFileSync } from 'node:fs'
import { expect, test } from './helpers/driver'

/**
 * Nur für die neue Fassung: Übernahme alter Spielstände (gleiche Herkunft wie das Original),
 * Muscle-Studio-Schlüssel bleiben unberührt, Export/Import als Datei.
 */
test.skip(({ target }) => target !== 'neu', 'nur neue Fassung')

const MUSCLE = { 'ms.display': '{"density":"compact"}', 'ms.spotify.clientId': 'abc123', 'ms.updated': '1' }

test('Übernahme · Spielstand aus dem Original wird kopiert, alte und Muscle-Studio-Schlüssel bleiben gleich', async ({ app, page }) => {
  // 1) Original auf derselben Herkunft benutzen
  await page.goto('/legacy/index.html')
  await page.evaluate((ms) => Object.entries(ms).forEach(([k, v]) => localStorage.setItem(k, v)), MUSCLE)
  await page.locator('[data-go="setup"]').click()
  await app.select('theme', 'sos')
  await app.select('players', 3)
  await page.locator('[data-nm="1"]').fill('Tim')
  await page.locator('[data-nm="2"]').fill('Lea')
  await app.select('songMode', 'upfront')
  await app.select('genre', 'kpop')
  await page.waitForTimeout(100)
  await app.addArtists(3)
  await page.evaluate(() =>
    localStorage.setItem('soundclash.rivalry', JSON.stringify({ 'lea|tim': { a: 'lea', b: 'tim', aw: 2, bw: 5, draws: 1, last: 1700000000000 } })),
  )
  const before = await page.evaluate(() => ({ ...localStorage }))

  // 2) Neue Fassung öffnen
  await page.goto('/SoundClashBeta/')
  await page.locator('[data-go="setup"]').waitFor()
  const after = await page.evaluate(() => ({ ...localStorage }))
  expect(after['soundclash.app.settings']).toBe(before['soundclash.v5'])
  expect(after['soundclash.app.rivalry']).toBe(before['soundclash.rivalry'])
  for (const k of Object.keys(before)) expect(after[k], `Schlüssel ${k} unverändert`).toBe(before[k])
  for (const [k, v] of Object.entries(MUSCLE)) expect(after[k]).toBe(v)
  expect(Object.keys(after).sort()).toEqual([...Object.keys(before), 'soundclash.app.settings', 'soundclash.app.rivalry'].sort())

  // 3) Oberfläche zeigt die übernommenen Einstellungen
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'sos')
  await page.locator('[data-go="setup"]').click()
  await expect(page.locator('[data-nm="1"]')).toHaveValue('Tim')
  await expect(page.locator('[data-nm="3"]')).toHaveValue('P3')
  await expect(page.locator('[data-op="songMode"][aria-selected="true"]')).toHaveText('Alle vorab')
  await expect(page.locator('[data-rm]')).toHaveCount(3)

  // 4) Änderungen landen nur unter dem neuen Präfix
  await app.select('size', 7)
  const later = await page.evaluate(() => ({ ...localStorage }))
  expect(JSON.parse(later['soundclash.app.settings']).size).toBe(7)
  expect(later['soundclash.v5']).toBe(before['soundclash.v5'])
  for (const [k, v] of Object.entries(MUSCLE)) expect(later[k]).toBe(v)

  // 5) Zweiter Start überschreibt den neuen Stand nicht mehr mit dem alten
  await page.reload()
  await page.locator('[data-go="setup"]').click()
  await expect(page.locator('[data-op="size"][aria-selected="true"]')).toHaveText('7')
})

test('Spielstand · Export als Datei und Import auf „einem anderen Gerät“', async ({ app, page, context }) => {
  await app.open()
  await app.go('setup')
  await page.locator('[data-nm="1"]').fill('Anna')
  await app.select('series', 'bo3')
  await app.select('genre', 'latin')
  await page.waitForTimeout(100)
  await app.addArtists(2)
  await page.evaluate(() => localStorage.setItem('soundclash.app.rivalry', JSON.stringify({ 'anna|p2': { a: 'anna', b: 'p2', aw: 1, bw: 0, draws: 0, last: 1 } })))

  await page.locator('#backupBtn').click()
  const dl = page.waitForEvent('download')
  await page.locator('#exportBtn').click()
  const file = await (await dl).path()
  const json = JSON.parse(readFileSync(file!, 'utf8'))
  expect(json.app).toBe('sound-clash')
  expect(json.format).toBe(1)
  expect(json.settings.names[0]).toBe('Anna')
  expect(json.settings.series).toBe('bo3')
  expect(json.settings.pool).toHaveLength(2)
  expect(json.rivalry['anna|p2'].aw).toBe(1)

  // „Anderes Gerät“: neuer, leerer Kontext auf derselben Adresse
  const other = await context.browser()!.newContext({ serviceWorkers: 'block' })
  const p2 = await other.newPage()
  await p2.goto(page.url())
  await p2.locator('[data-go="setup"]').waitFor()
  await p2.evaluate(() => localStorage.setItem('soundclash.app.rivalry', JSON.stringify({ 'anna|p2': { a: 'anna', b: 'p2', aw: 0, bw: 3, draws: 0, last: 5 }, 'x|y': { a: 'x', b: 'y', aw: 1, bw: 1, draws: 0, last: 2 } })))
  await p2.locator('#backupBtn').click()
  await p2.locator('#importFile').setInputFiles(file!)
  await expect(p2.locator('#importPreview')).toContainText('2 Künstler im Topf')
  await p2.locator('#importConfirm').click()
  await p2.locator('[data-go="setup"]').click()
  await expect(p2.locator('[data-nm="1"]')).toHaveValue('Anna')
  await expect(p2.locator('[data-op="series"][aria-selected="true"]')).toHaveText('Best of 3')
  await expect(p2.locator('[data-rm]')).toHaveCount(2)
  const riv = await p2.evaluate(() => JSON.parse(localStorage.getItem('soundclash.app.rivalry')!))
  // jüngerer Eintrag gewinnt: lokal last=5 > Datei last=1; fremde Paarung bleibt erhalten
  expect(riv['anna|p2'].bw).toBe(3)
  expect(riv['x|y']).toBeTruthy()

  // kaputte Datei wird abgelehnt
  await p2.locator('#backupBtn').click()
  await p2.locator('#importFile').setInputFiles({ name: 'falsch.json', mimeType: 'application/json', buffer: Buffer.from('{"app":"muscle-studio","format":1}') })
  await expect(p2.locator('.modal .warn')).toContainText('nicht aus Sound Clash')
  await other.close()
})
