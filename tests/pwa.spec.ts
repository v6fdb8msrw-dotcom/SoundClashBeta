import { expect, test } from '@playwright/test'

/**
 * PWA im echten Chrome (Service Worker erlaubt): Manifest, Icons, iPhone-Metadaten,
 * Registrierung im eigenen Scope und Start ohne Netz.
 */
test('PWA · installierbar, eigener Scope, startet offline', async ({ page, context, baseURL }) => {
  await page.goto('')
  await page.locator('#startBtn').waitFor()
  const sw = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready
    return { scope: reg.scope, active: !!reg.active }
  })
  expect(sw.active).toBe(true)
  expect(sw.scope).toBe(new URL('/SoundClashBeta/', baseURL).href)

  const head = await page.evaluate(() => ({
    manifest: document.querySelector('link[rel="manifest"]')?.getAttribute('href'),
    apple: document.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href'),
    capable: document.querySelector('meta[name="apple-mobile-web-app-capable"]')?.getAttribute('content'),
    viewport: document.querySelector('meta[name="viewport"]')?.getAttribute('content'),
  }))
  expect(head.manifest).toBeTruthy()
  expect(head.apple).toContain('/SoundClashBeta/')
  expect(head.capable).toBe('yes')
  expect(head.viewport).toContain('viewport-fit=cover')
  const man = await (await page.request.get(new URL(head.manifest!, page.url()).href)).json()
  expect(man.name).toBe('Sound Clash')
  expect(man.display).toBe('standalone')
  expect(man.start_url).toBe('/SoundClashBeta/')
  expect(man.scope).toBe('/SoundClashBeta/')
  expect(man.icons.map((i: { sizes: string }) => i.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']))
  for (const ic of man.icons) expect((await page.request.get(new URL(ic.src, new URL(head.manifest!, page.url())).href)).status()).toBe(200)

  // Offline neu laden: App kommt komplett aus dem Cache
  await page.waitForTimeout(1500)
  await context.setOffline(true)
  await page.reload()
  await expect(page.locator('#startBtn')).toBeVisible()
  await expect(page.locator('#alist [data-add]').first()).toBeVisible()
  await expect(page.locator('#startBtn')).toBeVisible()
  const fontsOk = await page.evaluate(async () => {
    await document.fonts.ready
    return document.fonts.check('16px "Chakra Petch"')
  })
  expect(fontsOk).toBe(true)
  await context.setOffline(false)
})
