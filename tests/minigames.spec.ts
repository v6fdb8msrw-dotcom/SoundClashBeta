import { test } from './helpers/driver'

/** Guess the Song, Timeline Masters und Jahrzehnt-Duell. */

test('Guess the Song · 3 Runden · aufgeben, daneben, überspringen, richtig', async ({ app }) => {
  await app.open()
  await app.go('guess')
  const setupFacts = async () =>
    app.page.evaluate(() => {
      const t = (e: Element | null) => (e?.textContent ?? '').replace(/\s+/g, ' ').trim()
      return {
        chipsOn: [...document.querySelectorAll('#app .gchip.on')].map(t),
        opts: [...document.querySelectorAll('#app .gsopt.on')].map(t),
        hint: t(document.querySelector('#app .gshint')),
        bar: t(document.querySelector('#app .startbar .hint')),
        disabled: (document.querySelector('[data-gsstart]') as HTMLButtonElement | null)?.disabled ?? null,
      }
    })
  app.record('setup-leer', await setupFacts())
  await app.click('[data-gsg="rnb"]')
  await app.click('[data-gsg="pop"]')
  await app.click('[data-gsg="pop"]')
  await app.click('[data-gsr="3"]')
  await app.click('[data-gsd="medium"]')
  app.record('setup', await setupFacts())
  await app.click('[data-gsstart]')

  const playFacts = async () =>
    app.page.evaluate(() => {
      const t = (e: Element | null) => (e?.textContent ?? '').replace(/\s+/g, ' ').trim()
      return {
        meta: [...document.querySelectorAll('#app .gsmeta span')].map(t),
        steps: [...document.querySelectorAll('#app .gssteps span')].map((s) => t(s) + ':' + s.className).join(' '),
        hint: t(document.querySelector('#app .gshint')),
        play: t(document.querySelector('[data-gsplay]')),
        skip: t(document.querySelector('[data-gsskip]')),
        reveal: [...document.querySelectorAll('#app .gsreveal p')].map(t),
        next: t(document.querySelector('[data-gsnext]')),
        result: t(document.querySelector('#app .gswin')),
        resultLede: t(document.querySelector('#app .gs .lede')),
      }
    })
  const songs: { title: string; artist: string }[] = []
  // Spiel 1: jede Runde bis zum Ende überspringen → Auflösung zeigt die Songs
  await app.page.locator('[data-gsplay]').waitFor({ timeout: 60000 })
  for (let r = 0; r < 3; r++) {
    app.record(`spiel1-runde${r}`, await playFacts())
    for (let s = 0; s < 7; s++) await app.click('[data-gsskip]')
    const f = await playFacts()
    app.record(`spiel1-aufloesung${r}`, f)
    songs.push({ title: f.reveal[1], artist: f.reveal[2] })
    await app.click('[data-gsnext]')
  }
  app.record('spiel1-ergebnis', await playFacts())

  // Spiel 2: gleiche Reihenfolge (fester Zufall) – jetzt mit Suchfeld raten
  await app.click('[data-gsagain]')
  await app.page.locator('[data-gsplay]').waitFor({ timeout: 60000 })
  const search = async (q: string) => {
    await app.page.locator('#gsSearch').fill(q)
    await app.page.locator('.gsres-item, .gsres-empty').first().waitFor({ timeout: 15000 })
    await app.page.waitForTimeout(400)
    return app.page.evaluate(() => [...document.querySelectorAll('#gsResults .gsres-item, #gsResults .gsres-empty')].map((e) => (e.textContent ?? '').replace(/\s+/g, ' ').trim()))
  }
  // Runde 1: falscher Treffer, dann überspringen, dann richtig
  await app.click('[data-gsplay]')
  app.record('spiel2-falsch-suche', await search('Bohemian Rhapsody'))
  await app.page.locator('.gsres-item').first().click()
  app.record('spiel2-nach-falsch', await playFacts())
  await app.click('[data-gsskip]')
  app.record('spiel2-richtig-suche', await search(songs[0].title))
  await app.page.locator('.gsres-item').filter({ hasText: songs[0].artist }).first().click()
  app.record('spiel2-richtig', await playFacts())
  await app.click('[data-gsnext]')
  // Runde 2: sofort richtig (volle Punkte)
  app.record('spiel2-r2-suche', await search(songs[1].title + ' ' + songs[1].artist))
  await app.page.locator('.gsres-item').filter({ hasText: songs[1].artist }).first().click()
  app.record('spiel2-r2', await playFacts())
  await app.click('[data-gsnext]')
  // Runde 3: kurze Suche (unter 2 Zeichen) leert die Liste, dann aufgeben
  await app.page.locator('#gsSearch').fill('a')
  app.record('spiel2-r3-kurz', await app.page.locator('#gsResults').innerHTML())
  for (let s = 0; s < 7; s++) await app.click('[data-gsskip]')
  app.record('spiel2-r3', await playFacts())
  await app.click('[data-gsnext]')
  app.record('spiel2-ergebnis', await playFacts())
  app.record('toasts', await app.toasts())
  app.matchGolden('guess')
})

const tlFacts = (app: { page: import('@playwright/test').Page }) =>
  app.page.evaluate(() => {
    const t = (e: Element | null) => (e?.textContent ?? '').replace(/\s+/g, ' ').trim()
    return {
      turn: t(document.querySelector('#app .tlturn')),
      line: [...document.querySelectorAll('#app .tlactive .tlcard')].map((c) => t(c.querySelector('.tlcyear')) + ' ' + t(c.querySelector('.tlct'))),
      gaps: document.querySelectorAll('#app [data-tlgap]').length,
      others: [...document.querySelectorAll('#app .tlmini')].map(t),
      reveal: t(document.querySelector('#app .tlreveal .tlrinfo')),
      ryear: t(document.querySelector('#app .tlreveal .tlryear')),
      tag: t(document.querySelector('#app .tlrtag')),
      help: t(document.querySelector('#app .tlhelp')),
      next: t(document.querySelector('[data-tlnext]')),
      title: t(document.querySelector('#app h2.display')),
      lede: t(document.querySelector('#app .lede')),
      win: [...document.querySelectorAll('#app .tlfield .tlcyear')].map(t),
      dd: t(document.querySelector('#app .ddteams')),
    }
  })

test('Timeline Masters · 2 Spieler · 5 Karten · einsortieren bis zum Sieg', async ({ app }) => {
  await app.open()
  await app.go('timeline')
  await app.click('[data-tlg="d90"]')
  await app.click('[data-tlg="d00"]')
  await app.click('[data-tlp="2"]')
  await app.click('[data-tlt="5"]')
  app.record('setup', await tlFacts(app))
  await app.click('[data-tlstart]')
  await app.page.locator('[data-tlgap].active, [data-tlnext], .tlfield').first().waitFor({ timeout: 120000 })
  for (let step = 0; step < 40; step++) {
    if (await app.page.locator('[data-tlagain]').count()) break
    await app.page.locator('[data-tlgap].active').first().waitFor({ timeout: 10000 })
    const before = await tlFacts(app)
    const g = (step * 3) % before.gaps
    await app.click(`[data-tlgap="${g}"]`)
    app.record(`zug-${step}`, { before, g, after: await tlFacts(app) })
    await app.click('[data-tlnext]')
    await app.page.waitForTimeout(650)
  }
  app.record('sieg', await tlFacts(app))
  app.matchGolden('timeline')
})

test('Jahrzehnt-Duell · 2 Teams · 5 Punkte · raten und klauen', async ({ app }) => {
  await app.open()
  await app.go('timeline')
  await app.click('[data-tlvar="decade"]')
  await app.click('[data-tlg="d80"]')
  await app.click('[data-tlg="d10"]')
  await app.click('[data-tldd="5"]')
  app.record('setup', await tlFacts(app))
  await app.click('[data-tlstart]')
  await app.page.locator('[data-dddec]').first().waitFor({ timeout: 120000 })
  const order = [1980, 2010, 2000, 1990, 2020, 1970]
  for (let step = 0; step < 40; step++) {
    if (await app.page.locator('[data-ddagain]').count()) break
    const a = await tlFacts(app)
    await app.click(`[data-dddec="${order[step % order.length]}"]`)
    const b = await tlFacts(app)
    if (await app.page.locator('[data-dddec]').count()) {
      await app.click(`[data-dddec="${order[(step + 1) % order.length]}"]`)
    }
    app.record(`runde-${step}`, { a, b, c: await tlFacts(app) })
    await app.click('[data-ddnext]')
  }
  app.record('sieg', await tlFacts(app))
  app.matchGolden('jahrzehnt-duell')
})
