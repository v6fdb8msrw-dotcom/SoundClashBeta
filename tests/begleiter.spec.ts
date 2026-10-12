import { devices, expect, test } from '@playwright/test'
import { mockNetwork } from './helpers/net'

const SHOT = (page: import('@playwright/test').Page, name: string) =>
  process.env.SHOTS ? page.waitForTimeout(600).then(() => page.screenshot({ path: 'docs/screenshots/' + name + '.jpg', type: 'jpeg', quality: 78, scale: 'css' })) : Promise.resolve()

/**
 * Handy-Begleiter: Hauptgerät + zwei Handys (eigene Browser-Kontexte), verbunden über WebRTC
 * mit echten öffentlichen Relays. Prüft: Koppeln per Code, Rad drehen und Platz setzen vom Handy,
 * Songwahl vom Handy, Abstimmen und Stimme ändern vom Handy. Alles läuft auf dem Hauptgerät als
 * normale Spielaktion.
 */
test.describe.configure({ retries: 1 })

test('Begleiter · koppeln, vom Handy drehen, setzen, Song wählen und abstimmen', async ({ browser, baseURL }) => {
  test.setTimeout(240_000)
  const hostCtx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce', serviceWorkers: 'block' })
  await mockNetwork(hostCtx)
  const host = await hostCtx.newPage()
  await host.goto(baseURL!)
  await host.locator('#pairBtn').click()
  const code = (await host.locator('#pairCode').textContent())!.trim()
  expect(code).toMatch(/^[A-Z2-9]{5}$/)
  await SHOT(host, 'mac-13-handys-koppeln')

  const phoneCtx = await browser.newContext({ ...devices['iPhone 13'], reducedMotion: 'reduce', serviceWorkers: 'block' })
  await mockNetwork(phoneCtx)
  const phone = await phoneCtx.newPage()
  await phone.goto(baseURL! + '?join=' + code)
  await phone.locator('[data-role="1"]').waitFor({ timeout: 90_000 })
  await SHOT(phone, 'handy-1-rolle')
  await phone.locator('[data-role="1"]').click()
  await expect(host.locator('.pair-phones')).toContainText('P1', { timeout: 30_000 })

  const fan = await (await browser.newContext({ ...devices['Pixel 7'], reducedMotion: 'reduce', serviceWorkers: 'block' })).newPage()
  await mockNetwork(fan.context())
  await fan.goto(baseURL! + '?join=' + code)
  await fan.locator('[data-role="audience"]').waitFor({ timeout: 90_000 })
  await fan.locator('[data-role="audience"]').click()
  await expect(host.locator('.pair-phones')).toContainText('Publikum', { timeout: 30_000 })
  await host.locator('.modal-x').click()

  // Match vorbereiten
  for (let i = 0; i < 10; i++) await host.locator('#alist [data-add]').filter({ hasText: '+' }).first().click()
  await host.locator('#startBtn').click()

  // P1 ist am Zug: vom Handy drehen und setzen
  await phone.locator('[data-rspin]').waitFor({ timeout: 30_000 })
  await SHOT(phone, 'handy-2-am-zug')
  await phone.locator('[data-rspin]').click({ timeout: 30_000 })
  await phone.locator('[data-rplace="4"]').waitFor({ timeout: 30_000 })
  await SHOT(phone, 'handy-3-blind-setzen')
  await phone.locator('[data-rplace="4"]').click({ timeout: 30_000 })
  await expect(host.locator('.pcluster').first().locator('.slot').nth(4)).toHaveClass(/taken/, { timeout: 15_000 })

  // Rest am Hauptgerät ziehen
  for (let s = 0; s < 12 && (await host.locator('#wheel').count()); s++) {
    if (!(await host.locator('[data-pl]').count())) {
      await host.locator('#spinBtn').click()
      await host.locator('.reveal .rname').waitFor()
    }
    await host.locator('[data-pl]').first().click()
    await host.waitForTimeout(100)
  }

  // Songwahl: P1 wählt am Handy und bestätigt
  await phone.locator('[data-rpick]').first().click({ timeout: 30_000 })
  await SHOT(phone, 'handy-4-songwahl')
  await expect(host.locator('#pickNext')).toContainText('bestätigen', { timeout: 15_000 })
  await phone.locator('[data-rnext]').click()
  await expect(host.locator('.pchip.on')).toContainText('P2', { timeout: 15_000 })
  await host.locator('[data-pick]').first().waitFor({ timeout: 30_000 })
  await host.locator('[data-pick]').first().click()
  await host.locator('#pickNext').click()

  // Abstimmen vom Handy (Publikum stimmt ab ist Standard)
  await host.locator('.duelhead').waitFor()
  await phone.locator('[data-rvote="1"]').click({ timeout: 30_000 })
  await expect(host.locator('#voteClose')).toContainText('1 Stimme', { timeout: 15_000 })
  await fan.locator('[data-rvote="2"]').click({ timeout: 30_000 })
  await expect(host.locator('#voteClose')).toContainText('2 Stimmen', { timeout: 15_000 })
  // Stimme ändern: P1-Handy wechselt zu P2 → 0 : 2
  await phone.locator('[data-rvote="2"]').click()
  await expect(host.locator('.dcard').nth(1).locator('.vpct')).toHaveText('100%', { timeout: 15_000 })
  await expect(host.locator('#voteClose')).toContainText('2 Stimmen')
  await expect(phone.locator('[data-rvote="2"]')).toHaveClass(/mine/)
  await SHOT(phone, 'handy-5-abstimmen')
  // Doppelt tippen zählt nicht doppelt
  await fan.locator('[data-rvote="2"]').click()
  await host.waitForTimeout(800)
  await expect(host.locator('#voteClose')).toContainText('2 Stimmen')

  await hostCtx.close()
  await phoneCtx.close()
})
