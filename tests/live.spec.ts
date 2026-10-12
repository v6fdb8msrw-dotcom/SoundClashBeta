import { expect, test } from '@playwright/test'

/**
 * Live-Test ohne Attrappen: echte Deezer-Suche, echte 30-Sekunden-Hörprobe im echten Chrome.
 * Prüft, dass die Vorschau tatsächlich abspielt (Zeit läuft, nicht pausiert, Quelle von Deezer)
 * und dass Spotify- und YouTube-Links zur Suche führen.
 */
test.describe.configure({ retries: 1 })

test('Live · Deezer-Hörprobe spielt wirklich · Links führen zur Suche', async ({ page, context }) => {
  await context.addInitScript(`
    window.__media = [];
    const p = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () { if (!window.__media.includes(this)) window.__media.push(this); return p.apply(this, arguments); };
  `)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('')
  await page.locator('[data-go="setup"]').click()
  for (let i = 0; i < 10; i++) await page.locator('#alist [data-add]').filter({ hasText: '+' }).first().click()
  await page.locator('#startBtn').click()
  for (let s = 0; s < 12 && (await page.locator('#wheel').count()); s++) {
    await page.locator('#spinBtn').click()
    await page.locator('[data-pl]').first().click()
  }
  const play = page.locator('[data-pv2]').first()
  await play.waitFor({ timeout: 30000 })
  await play.click()
  const state = await page.waitForFunction(
    () => {
      const m = (window as unknown as { __media: HTMLMediaElement[] }).__media.find((x) => !x.paused && x.currentTime > 1.5)
      return m ? { src: m.currentSrc, t: m.currentTime, paused: m.paused, dur: m.duration } : null
    },
    null,
    { timeout: 20000 },
  )
  const s = (await state.jsonValue())!
  expect(s.src).toMatch(/^https:\/\/[^/]*dzcdn\.net\/.*\.mp3/)
  expect(s.paused).toBe(false)
  expect(s.dur).toBeGreaterThan(25)

  // erneut tippen pausiert
  await page.locator('[data-pv2]').first().click()
  await expect.poll(() => page.evaluate(() => (window as unknown as { __media: HTMLMediaElement[] }).__media.every((m) => m.paused))).toBe(true)

  // Song wählen, dann Links im Duell prüfen
  const artist = (await page.locator('#app .pcol .ph .nm').textContent())!.trim()
  await page.locator('[data-pick]').first().click()
  const title = (await page.locator('#app .pcol .chosen .tt, #pickNext').first().textContent())!.replace(/ bestätigen →$/, '').trim()
  await page.locator('#pickNext').click()
  await page.locator('#pickSkip').click()
  const card = page.locator('#app .dcard').first()
  await card.waitFor()
  const links = await card.locator('a.lnk').evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).href))
  // Erwartung durch den URL-Parser des Browsers schicken (er schreibt z. B. ' in der Abfrage als %27)
  const expected = await page.evaluate(
    (u) => u.map((x) => new URL(x).href),
    ['https://open.spotify.com/search/' + encodeURIComponent(artist + ' ' + title), 'https://www.youtube.com/results?search_query=' + encodeURIComponent(artist + ' ' + title)],
  )
  expect(links).toEqual(expected)
  // 30-Sek-Knopf im Duell spielt ebenfalls
  await card.locator('[data-pv3]').click()
  await page.waitForFunction(() => (window as unknown as { __media: HTMLMediaElement[] }).__media.some((m) => !m.paused && m.currentTime > 1), null, { timeout: 20000 })
})
