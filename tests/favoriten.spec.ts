import { devices, expect, test } from '@playwright/test'
import { mockNetwork } from './helpers/net'

const SHOT = (page: import('@playwright/test').Page, name: string) =>
  process.env.SHOTS ? page.waitForTimeout(600).then(() => page.screenshot({ path: 'docs/screenshots/' + name + '.jpg', type: 'jpeg', quality: 78, scale: 'css' })) : Promise.resolve()

/**
 * Favoriten-Modus mit Handy: Hauptgerät stellt „Favoriten“ ein, ein Handy koppelt sich als Spieler 1,
 * sucht am Handy einen Künstler und legt ihn in den Topf. Das Hauptgerät zeigt ihn als Favorit von
 * Spieler 1. Herausnehmen geht nur mit eigenen Favoriten.
 */
test.describe.configure({ retries: 1 })

test('Favoriten · Handy sucht Künstler und legt sie in den Topf', async ({ browser, baseURL }) => {
  test.setTimeout(240_000)
  const hostCtx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce', serviceWorkers: 'block' })
  await mockNetwork(hostCtx)
  const host = await hostCtx.newPage()
  await host.goto(baseURL!)
  await host.locator('[data-modetile="fav"]').click()
  await expect(host.locator('.ft-p')).toHaveCount(2)
  await host.locator('#pairBtn').click()
  const code = (await host.locator('#pairCode').textContent())!.trim()
  await host.locator('.modal-x').click()

  const phoneCtx = await browser.newContext({ ...devices['iPhone 13'], reducedMotion: 'reduce', serviceWorkers: 'block' })
  await mockNetwork(phoneCtx)
  const phone = await phoneCtx.newPage()
  await phone.goto(baseURL! + '?join=' + code)
  await phone.locator('[data-role="1"]').waitFor({ timeout: 90_000 })
  await phone.locator('[data-role="1"]').click()
  await expect(phone.locator('.r-fav-search')).toBeVisible({ timeout: 30_000 })
  await phone.locator('.r-fav-search').fill('Drake')
  const first = phone.locator('.r-fav').first()
  await first.waitFor({ timeout: 30_000 })
  const name = ((await first.locator('b').textContent()) || '').trim()
  await first.click()
  await expect(host.locator('.ft-p').first()).toContainText('1 Favoriten', { timeout: 20_000 })
  await expect(host.locator('.pchip-pool')).toContainText(name)
  await expect(phone.locator('.r-fav-chip')).toContainText(name, { timeout: 20_000 })
  await SHOT(phone, 'handy-favoriten')
  // wieder herausnehmen (eigener Favorit)
  await phone.locator('.r-fav-chip').first().click()
  await expect(host.locator('.ft-p').first()).toContainText('0 Favoriten', { timeout: 20_000 })
  await phoneCtx.close()
  await hostCtx.close()
})
