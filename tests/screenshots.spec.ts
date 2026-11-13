import { mkdirSync } from 'node:fs'
import { devices, test, type Page } from '@playwright/test'

/**
 * Bildschirmfotos der neuen Oberfläche (echtes Netz, echte Bilder) für den Bericht.
 * Nur bei Bedarf: SHOTS=1 npx playwright test tests/screenshots.spec.ts --project=neu
 */
test.skip(!process.env.SHOTS, 'nur mit SHOTS=1')
test.describe.configure({ mode: 'serial' })

const OUT = new URL('../docs/screenshots/', import.meta.url)
mkdirSync(OUT, { recursive: true })

async function shot(page: Page, name: string) {
  await page.waitForTimeout(900)
  await page.screenshot({ path: new URL(name + '.jpg', OUT).pathname, type: 'jpeg', quality: 78 })
}

/** Songs einzeln aufdecken: jeden Song abspielen, dann weiter (bis zum Versus) */
async function passListen(page: Page, shots?: string) {
  for (let i = 0; i < 6; i++) {
    if (!(await page.locator('#listenNext, #listenPlay').count())) {
      await page.waitForTimeout(500)
      if (!(await page.locator('#listenNext, #listenPlay').count())) return
    }
    const play = page.locator('#listenPlay')
    if (shots && i === 0) await shot(page, shots + '-6a-aufdecken')
    if (await play.count()) {
      await play.click({ force: true })
      await page.waitForTimeout(900)
      if (shots && i === 0) await shot(page, shots + '-6b-song-laeuft')
    }
    await page.locator('#listenNext').click({ force: true })
    await page.waitForTimeout(600)
  }
}

async function flow(page: Page, prefix: string, mobile: boolean) {
  await page.goto('')
  await page.waitForTimeout(2400)
  await shot(page, prefix + '-1-start')
  for (let i = 0; i < 10; i++) await page.locator('#alist [data-add]').filter({ hasText: '+' }).first().click()
  await page.locator('[data-avtoggle="1"]').click()
  await shot(page, prefix + '-2-setup')
  await page.locator('[data-avtoggle="1"]').click()
  await page.locator('#menuBtn').click()
  await shot(page, prefix + '-3-menue')
  await page.locator('#menuBtn').click()
  await page.locator('#startBtn').click()
  await page.waitForTimeout(500)
  await page.locator('#spinBtn').click()
  await page.locator('.reveal .rname').waitFor({ timeout: 15000 })
  await page.waitForTimeout(700)
  await shot(page, prefix + '-4-aufgedeckt')
  await page.locator('[data-pl]').first().click()
  for (let s = 0; s < 12 && (await page.locator('#wheel').count()); s++) {
    if (!(await page.locator('[data-pl]').count())) {
      await page.locator('#spinBtn').click()
      await page.locator('.reveal .rname').waitFor({ timeout: 15000 })
    }
    await page.locator('[data-pl]').first().click()
    await page.waitForTimeout(400)
  }
  await page.locator('[data-pick]').first().waitFor({ timeout: 30000 })
  await page.locator('[data-pick]').first().click()
  await shot(page, prefix + '-5-songwahl')
  await page.locator('#pickNext').click()
  await page.locator('[data-pick]').nth(1).waitFor({ timeout: 30000 })
  await page.locator('[data-pick]').nth(1).click()
  await page.locator('#pickNext').click()
  await passListen(page, prefix)
  await page.locator('.dcard').first().waitFor()
  await page.locator('[data-pv3]').first().click()
  await page.locator('[data-bump="1"][data-d="1"]').click()
  await page.locator('[data-bump="1"][data-d="1"]').click()
  await page.locator('[data-bump="2"][data-d="1"]').click()
  await shot(page, prefix + '-6-duell')
  await page.locator('#voteClose').click()
  await page.locator('[data-vwin]').first().click()
  for (let d = 1; d < 5; d++) {
    await page.locator('#pickSkip').click()
    await page.locator('#pickSkip').click()
    await passListen(page)
    await page.locator(`[data-bump="${(d % 2) + 1}"][data-d="1"]`).click()
    await page.locator('#voteClose').click()
    await page.locator('[data-vwin]').first().click()
    await page.waitForTimeout(1100)
  }
  await page.locator('#toFinal, #nextRound').first().waitFor()
  await shot(page, prefix + '-7-runde')
  await page.locator('#toFinal').click()
  await page.waitForTimeout(1500)
  await shot(page, prefix + '-8-endstand')
  // anderes Theme über das Menü
  await page.locator('.brand-home').click()
  await page.locator('#menuBtn').click()
  await page.locator('[data-op="theme"][data-v="astroworld"]').click()
  await page.locator('[data-op="bg"][data-v="mosaic"]').click()
  await page.waitForTimeout(400)
  await shot(page, prefix + '-9-menue-astroworld')
  await page.locator('#menuBtn').click()
  await page.waitForTimeout(600)
  await shot(page, prefix + '-9-theme-astroworld')
}

test('Mac · 1440×900', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, serviceWorkers: 'block' })
  const page = await ctx.newPage()
  await flow(page, 'mac', false)
  await ctx.close()
})

test('iPhone · 393×852', async ({ browser }) => {
  const ctx = await browser.newContext({ ...devices['iPhone 15 Pro'], serviceWorkers: 'block' })
  const page = await ctx.newPage()
  await flow(page, 'iphone', true)
  await ctx.close()
})
