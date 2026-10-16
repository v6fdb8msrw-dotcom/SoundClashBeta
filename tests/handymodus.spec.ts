import { devices, expect, test, type Page } from '@playwright/test'
import { mockNetwork, silentWav } from './helpers/net'

const SHOT = (page: Page, name: string) =>
  process.env.SHOTS ? page.waitForTimeout(700).then(() => page.screenshot({ path: 'docs/screenshots/' + name + '.jpg', type: 'jpeg', quality: 78, scale: 'css' })) : Promise.resolve()

/**
 * Handy-Modus: Hauptgerät + zwei Spieler-Handys + ein Zuschauer, verbunden über WebRTC mit echten
 * öffentlichen Relays. Prüft: Spielweise „Mit Handys“, Koppeln in der Einrichtung, Drehen und Setzen
 * nur am Handy, gleichzeitige Songwahl mit „Fertig“, Zuschauer kommt mitten in der Runde dazu,
 * Songs laufen nacheinander am Hauptgerät, „läuft gerade“ und „gewählt von“ am Handy, Abstimmen.
 */
test.describe.configure({ retries: 1 })

test('Handy-Modus · alles am Handy, Songs nacheinander am Hauptgerät', async ({ browser, baseURL }) => {
  test.setTimeout(300_000)
  // 30 Sek stille Hörprobe, damit kein Song während der Prüfungen von selbst endet
  const longWav = silentWav(30)
  const ctx = async (opts: Parameters<typeof browser.newContext>[0]) => {
    const c = await browser.newContext({ reducedMotion: process.env.SHOTS ? 'no-preference' : 'reduce', serviceWorkers: 'block', ...opts })
    await mockNetwork(c)
    await c.route(/https:\/\/[^/]*preview[^/]*\.dzcdn\.net\/.*/, (route) =>
      route.fulfill({ status: 200, contentType: 'audio/wav', body: longWav, headers: { 'access-control-allow-origin': '*', 'accept-ranges': 'none' } }),
    )
    return c
  }
  const hostCtx = await ctx({ viewport: { width: 1440, height: 900 } })
  const host = await hostCtx.newPage()
  await host.goto(baseURL!)
  await host.locator('[data-op="phoneMode"][data-v="1"]').click()
  const code = (await host.locator('#pairCode').textContent())!.trim()
  expect(code).toMatch(/^[A-Z2-9]{5}$/)

  const join = async (role: string, dev: (typeof devices)[string]) => {
    const page = await (await ctx({ ...dev })).newPage()
    await page.goto(baseURL! + '?join=' + code)
    await page.locator(`[data-role="${role}"]`).waitFor({ timeout: 90_000 })
    return page
  }
  const p1 = await join('1', devices['iPhone 13'])
  await SHOT(p1, 'handy-6-rolle')
  await p1.locator('[data-role="1"]').click()
  const p2 = await join('2', devices['iPhone 13'])
  await p2.locator('[data-role="2"]').click()
  await expect(host.locator('.pp-chip.on')).toHaveCount(2, { timeout: 30_000 })
  await SHOT(host, 'mac-14-handymodus-einrichtung')

  // Match vorbereiten
  for (let i = 0; i < 10; i++) await host.locator('#alist [data-add]').filter({ hasText: '+' }).first().click()
  await host.locator('#startBtn').click()

  // Ziehen: nur am Handy (am Hauptgerät gibt es keinen Dreh-Knopf, solange das Handy verbunden ist)
  await host.locator('.draftstage .phonehint').waitFor({ timeout: 30_000 })
  await expect(host.locator('#spinBtn')).toHaveCount(0)
  const phones = [p1, p2]
  let shotSpin = false
  let shotPlace = false
  let spins = 0
  const until = Date.now() + 200_000
  while (Date.now() < until) {
    if (await host.locator('[data-ptile]').count()) break
    let acted = false
    for (const ph of phones) {
      const place = ph.locator('[data-rplace]:not([disabled])')
      if (await place.count()) {
        if (!shotPlace) {
          shotPlace = true
          await SHOT(ph, 'handy-8-blind-setzen')
          await SHOT(host, 'mac-15c-handymodus-gezogen')
        }
        await place.first().click()
        acted = true
        break
      }
      const spin = ph.locator('[data-rspin]:not([disabled])')
      if (await spin.count()) {
        spins++
        // Spielfeld-Ansicht, wenn der zweite Spieler gleich dreht (P1 hat schon einen Künstler)
        if (spins === 2) await SHOT(host, 'mac-15-handymodus-ziehen')
        if (!shotSpin) {
          shotSpin = true
          await SHOT(ph, 'handy-7-drehen')
          await spin.click()
          // Das Rad dreht nur am Hauptgerät; das Handy zeigt kein Rad (Tims Vorgabe)
          await expect(ph.locator('.r-wheel')).toHaveCount(0)
          acted = true
          break
        }
        await spin.click()
        acted = true
        break
      }
    }
    await host.waitForTimeout(acted ? 700 : 300)
  }
  await host.locator('[data-ptile]').first().waitFor({ timeout: 30_000 })

  // Zuschauer kommt mitten in der Runde dazu
  const fan = await join('audience', devices['Pixel 7'])
  await fan.locator('[data-role="audience"]').click()

  // Songwahl gleichzeitig: beide wählen am Handy und tippen „Fertig“
  await p2.locator('[data-rpick]').first().click({ timeout: 30_000 })
  await p1.locator('[data-rpick]').nth(1).click({ timeout: 30_000 })
  await expect(p1.locator('[data-rpick].on, .r-trk.on')).toHaveCount(1, { timeout: 15_000 })
  await SHOT(p1, 'handy-9-songwahl')
  await p1.locator('[data-rdone]').click()
  await expect(host.locator('[data-ptile="1"]')).toHaveClass(/ready/, { timeout: 15_000 })
  await expect(host.locator('[data-ptile="2"]')).not.toHaveClass(/ready/)
  await expect(p1.locator('.r-readylist')).toBeVisible({ timeout: 15_000 })
  await SHOT(host, 'mac-16-handymodus-songwahl')
  await SHOT(p1, 'handy-10-bereit')
  await expect(p2.locator('.r-trk.on')).toHaveCount(1, { timeout: 15_000 })
  await p2.locator('[data-rdone]').click()

  // Aufdecken Spieler für Spieler: zuerst P1 (Duell 1). Abstimmen geht erst im Versus.
  if (process.env.SHOTS) {
    // Kino-Überblendung „Alle haben gewählt“ mitten im Übergang
    await host.locator('.scenecut').waitFor({ timeout: 15_000 })
    await host.waitForTimeout(420)
    await host.screenshot({ path: 'docs/screenshots/mac-16b-ueberblendung.jpg', type: 'jpeg', quality: 78, scale: 'css' })
    await host.waitForTimeout(1200)
  }
  await host.locator('.rv').waitFor({ timeout: 15_000 })
  await expect(host.locator('.rv-who b')).toHaveText(/P1|Spieler 1/)
  await expect(host.locator('.rv-title')).toHaveText('Noch geheim')
  await expect(p1.locator('[data-rreveal]')).toBeVisible({ timeout: 20_000 })
  await expect(p2.locator('[data-rreveal]')).toHaveCount(0)
  await expect(fan.locator('[data-rq="1"]')).toContainText('noch geheim', { timeout: 20_000 })
  await expect(fan.locator('[data-rvote]')).toHaveCount(0)
  await expect(p1.locator('.r-card .r-kicker', { hasText: 'Dein Line-up' })).toBeVisible()
  await SHOT(host, 'mac-17-handymodus-aufdecken')
  await SHOT(p1, 'handy-11-aufdecken')
  await p1.locator('[data-rreveal]').click()
  await expect(host.locator('.rv-title')).not.toHaveText('Noch geheim', { timeout: 15_000 })
  const t1 = (await host.locator('.rv-title').textContent())!.trim()
  await expect(fan.locator('[data-rq="1"]')).toContainText('läuft gerade', { timeout: 20_000 })
  await expect(fan.locator('[data-rq="1"]')).toContainText(t1)
  await expect(fan.locator('[data-rq="2"]')).toContainText('noch geheim')
  await SHOT(host, 'mac-18-handymodus-song-laeuft')
  await SHOT(fan, 'handy-12-laeuft-gerade')
  // Weiter am Handy → P2 ist dran
  await p1.locator('[data-rlnext]').click()
  await expect(host.locator('.rv-who b')).toHaveText(/P2|Spieler 2/, { timeout: 15_000 })
  await expect(host.locator('.rv-title')).toHaveText('Noch geheim')
  await p2.locator('[data-rreveal]').click({ timeout: 20_000 })
  await expect(host.locator('.rv-title')).not.toHaveText('Noch geheim', { timeout: 15_000 })
  const t2 = (await host.locator('.rv-title').textContent())!.trim()
  // Pause und weiter abspielen vom Handy
  await expect(p2.locator('[data-rreveal]')).toContainText('Pause', { timeout: 15_000 })
  await p2.locator('[data-rreveal]').click()
  await expect(host.locator('.listen-time')).toContainText('angehalten', { timeout: 15_000 })
  await expect(p2.locator('[data-rreveal]')).toContainText('Weiter abspielen', { timeout: 15_000 })
  await p2.locator('[data-rreveal]').click()
  await expect(host.locator('.listen-time')).toContainText('30-Sek-Vorschau', { timeout: 15_000 })
  await p2.locator('[data-rlnext]').click({ timeout: 15_000 })

  // Versus: nur die gewählten Songs, jetzt abstimmen; man sieht, wer wofür gestimmt hat
  await host.locator('.duelhead').waitFor({ timeout: 15_000 })
  await expect(host.locator('.dcard .links')).toHaveCount(0)
  await expect(host.locator('.dcard').nth(0)).toContainText(t1)
  await expect(host.locator('.dcard').nth(1)).toContainText(t2)
  await fan.locator('[data-rvote="1"]').click({ timeout: 30_000 })
  await p1.locator('[data-rvote="2"]').click({ timeout: 30_000 })
  await expect(host.locator('#voteClose')).toContainText('2 Stimmen', { timeout: 15_000 })
  await expect(host.locator('[data-voters="1"]')).toContainText('1 Publikum', { timeout: 15_000 })
  await expect(host.locator('[data-voters="2"]')).toContainText(/P1|Spieler 1/, { timeout: 15_000 })
  await expect(fan.locator('[data-rvote="2"] .r-voter')).toContainText(/P1|Spieler 1/, { timeout: 15_000 })
  await SHOT(host, 'mac-19-handymodus-versus')
  await SHOT(p1, 'handy-13-abstimmen')

  await hostCtx.close()
})
