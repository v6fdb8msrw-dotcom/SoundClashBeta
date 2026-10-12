import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { test as base, expect, type Page, type TestInfo } from '@playwright/test'
import { mockNetwork } from './net'

/**
 * Gemeinsame Steuerung für Original und neue Fassung.
 * Die neue Oberfläche behält bewusst dieselben ids, data-Attribute und Klassennamen
 * für Bedienelemente und Ergebnisanzeigen. So läuft exakt derselbe Ablauf gegen beide.
 *
 * Zufall: Math.random liefert eine feste Zahl (Standard 0,5). Damit hängt das Ergebnis
 * nicht davon ab, wie oft eine Fassung Math.random aufruft (z. B. für Deko-Animationen),
 * sondern nur von der Spiellogik selbst. Mit setRandom() lässt sich der Wert zwischendurch ändern.
 */

export type Target = 'legacy' | 'neu'

const INIT = `
(() => {
  window.__rnd = 0.5;
  Math.random = () => window.__rnd;
  window.__toasts = [];
  window.__media = [];
  const origPlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () { if (!window.__media.includes(this)) window.__media.push(this); return origPlay.apply(this, arguments); };
  try { navigator.vibrate = () => true; } catch (e) {}
  const watch = () => {
    const mo = new MutationObserver(() => {
      const t = document.getElementById('toast');
      const s = t && t.textContent && t.textContent.trim();
      if (s && window.__toasts[window.__toasts.length - 1] !== s) window.__toasts.push(s);
    });
    mo.observe(document.documentElement, { subtree: true, childList: true, characterData: true });
  };
  if (document.documentElement) watch(); else document.addEventListener('DOMContentLoaded', watch);
})();
`

export const FIXED_TIME = new Date('2026-05-01T12:00:00Z')

export const test = base.extend<{ app: App; target: Target }>({
  target: async ({}, use, info) => {
    await use(info.project.name as Target)
  },
  app: async ({ page, target, context }, use, info) => {
    await mockNetwork(context)
    await context.addInitScript(INIT)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.clock.setFixedTime(FIXED_TIME)
    await use(new App(page, target, info))
  },
})
export { expect }

const norm = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim()

/** Lange data-URLs (Avatare) durch einen kurzen Fingerabdruck ersetzen, damit Referenzen lesbar bleiben. */
function shrink(v: unknown): unknown {
  if (typeof v === 'string' && v.startsWith('data:')) return 'data:' + createHash('sha1').update(v).digest('hex').slice(0, 10)
  if (Array.isArray(v)) return v.map(shrink)
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, shrink(x)]))
  return v
}

export class App {
  readonly trace: unknown[] = []
  constructor(
    readonly page: Page,
    readonly target: Target,
    readonly info: TestInfo,
  ) {}

  async open() {
    await this.page.goto('')
    await this.page.locator('[data-go="setup"]').waitFor()
    // Startbild abwarten (Original: 1 s bei reduzierter Bewegung)
    await this.page.waitForFunction(() => !document.getElementById('splash'), null, { timeout: 8000 }).catch(() => undefined)
  }

  async setRandom(v: number) {
    await this.page.evaluate((x) => ((window as unknown as { __rnd: number }).__rnd = x), v)
  }

  async click(sel: string, nth = 0) {
    await this.page.locator(sel).nth(nth).click()
  }

  async go(where: string) {
    await this.click(`[data-go="${where}"]`)
  }

  /** Auswahlfeld öffnen und Wert wählen (Original: .sel mit data-tg/data-op). */
  async select(id: string, value: string | number) {
    await this.page.locator(`[data-tg="${id}"]`).first().click()
    await this.page.locator(`[data-op="${id}"][data-v="${value}"]`).first().click()
  }

  /** Die ersten n Künstler aus der aktuellen Genre-Liste in den Topf legen. */
  async addArtists(n: number) {
    for (let i = 0; i < n; i++) {
      const btn = this.page.locator('#alist [data-add]').filter({ hasText: '+' }).first()
      await btn.click()
    }
  }

  async start() {
    await this.click('#startBtn')
  }

  /** Einmal drehen und warten, bis der Künstler aufgedeckt ist. Gibt Name + Empfänger zurück. */
  async spin(): Promise<{ artist: string; to: string }> {
    await this.page.locator('#spinBtn').click()
    const name = this.page.locator('.reveal .rname')
    await name.waitFor({ timeout: 15000 })
    return { artist: norm(await name.textContent()), to: norm(await this.page.locator('.reveal .rto').textContent()) }
  }

  /** Gezogenen Künstler auf den k-ten freien Platz des aktiven Spielers setzen. */
  async place(k = 0) {
    const slots = this.page.locator('[data-pl]')
    await slots.first().waitFor()
    const n = await slots.count()
    await slots.nth(Math.min(k, n - 1)).click()
  }

  async draftFacts() {
    return this.page.evaluate(() => {
      const t = (e: Element | null) => (e?.textContent ?? '').replace(/\s+/g, ' ').trim()
      return {
        pills: [...document.querySelectorAll('#app .dhead .pill')].map(t),
        clusters: [...document.querySelectorAll('#app .pcluster')].map((c) => ({
          name: t(c.querySelector('.pch .nm')),
          st: t(c.querySelector('.pch .st')),
          on: c.classList.contains('on'),
          taken: [...c.querySelectorAll('.slot')].map((s) => (s.classList.contains('taken') ? 1 : 0)).join(''),
          two: [...c.querySelectorAll('.slot')].map((s) => (s.classList.contains('two') ? 1 : 0)).join(''),
        })),
        ask: t(document.querySelector('#app .askplace')),
        spinLabel: t(document.querySelector('#spinBtn')),
      }
    })
  }

  /** Kompletter Draft: drehen, Platz wählen nach Strategie, bis alle Plätze voll sind. */
  async draftAll(choose: (step: number) => number = () => 0, randoms?: (step: number) => number) {
    const log: unknown[] = []
    for (let step = 0; step < 200; step++) {
      if (!(await this.page.locator('#wheel').count())) break
      if (randoms) await this.setRandom(randoms(step))
      const before = await this.draftFacts()
      const r = await this.spin()
      await this.place(choose(step))
      log.push({ step, before, reveal: r })
      await this.page.waitForTimeout(30)
    }
    await this.setRandom(0.5)
    return log
  }

  async pickFacts() {
    return this.page.evaluate(() => {
      const t = (e: Element | null) => (e?.textContent ?? '').replace(/\s+/g, ' ').trim()
      return {
        pills: [...document.querySelectorAll('#app .dhead .pill')].map(t),
        chips: [...document.querySelectorAll('#app .pchip')].map((c) => t(c) + (c.classList.contains('on') ? ' [on]' : '')),
        who: t(document.querySelector('#app h2.display')),
        artist: t(document.querySelector('#app .pcol .ph .nm')),
        badge: t(document.querySelector('#app .pcol .ph .badge')),
        tlabel: t(document.querySelector('#app .tlabel')),
        tracks: [...document.querySelectorAll('#app [data-pick] .tt')].slice(0, 5).map(t),
        next: t(document.querySelector('#pickNext')),
      }
    })
  }

  /** Wartet, bis die Trackliste geladen ist. Gibt die Anzahl der Treffer zurück (0 = nichts gefunden). */
  async waitTracks(): Promise<number> {
    await this.page.locator('[data-pick], .tracks .hint:has-text("Nichts gefunden")').first().waitFor({ timeout: 30000 })
    return this.page.locator('[data-pick]').count()
  }

  /** Songwahl im Modus „Vor jedem Duell“: jeder nimmt den Track an Position idx(p). */
  async pickForDuel(choice: (pickIdx: number) => number | 'skip' | string) {
    const out: unknown[] = []
    for (let k = 0; k < 10; k++) {
      if (!(await this.page.locator('#pickNext').count())) break
      const c = choice(k)
      if (c === 'skip') {
        out.push({ k, facts: await this.pickFacts(), action: 'skip' })
        await this.click('#pickSkip')
        continue
      }
      if (typeof c === 'string') {
        await this.page.locator('details.manual > summary').first().click()
        await this.page.locator('[data-mq]').first().fill(c)
        await this.page.locator('[data-madd]').first().click()
      } else {
        const n = await this.waitTracks()
        if (!n) {
          out.push({ k, facts: await this.pickFacts(), action: 'keine-tracks' })
          await this.click('#pickSkip')
          continue
        }
        await this.page.locator('[data-pick]').nth(Math.min(c, n - 1)).click()
      }
      out.push({ k, facts: await this.pickFacts() })
      await this.click('#pickNext')
    }
    return out
  }

  async duelFacts() {
    return this.page.evaluate(() => {
      const t = (e: Element | null) => (e?.textContent ?? '').replace(/\s+/g, ' ').trim()
      return {
        pills: [...document.querySelectorAll('#app .dhead .pill')].map(t),
        big: t(document.querySelector('#app .duelhead .big')),
        lede: t(document.querySelector('#app .duelhead .lede')),
        cards: [...document.querySelectorAll('#app .dcard')].map((c) => ({
          artist: t(c.querySelector('.dart .nm')),
          song: t(c.querySelector('.dsong .tt')),
          dur: t(c.querySelector('.dsong .td')),
          links: [...c.querySelectorAll('a.lnk')].map((a) => (a as HTMLAnchorElement).href),
          pct: t(c.querySelector('.vpct')),
          res: t(c.querySelector('.vresult')),
          win: t(c.querySelector('[data-win]')),
        })),
        rowButtons: [...document.querySelectorAll('#app .row button')].map(t),
      }
    })
  }

  /** Ein Duell entscheiden. votes: Stimmen pro Spieler (Publikum) oder Gewinner direkt (gemeinsam). */
  async decideDuel(opts: { votes?: Record<number, number>; winner?: number; tieWinner?: number }) {
    const facts: unknown[] = [await this.duelFacts()]
    if (opts.votes) {
      for (const [p, n] of Object.entries(opts.votes)) {
        for (let i = 0; i < n; i++) await this.click(`[data-bump="${p}"][data-d="1"]`)
      }
      facts.push(await this.duelFacts())
      await this.click('#voteClose')
      facts.push(await this.duelFacts())
      const w = opts.tieWinner
      if (w) await this.click(`[data-vwin="${w}"]`)
      else await this.page.locator('[data-vwin]').first().click()
    } else if (opts.winner) {
      await this.click(`[data-win="${opts.winner}"]`)
    }
    await this.page.waitForTimeout(60)
    return facts
  }

  async roundFacts() {
    return this.page.evaluate(() => {
      const t = (e: Element | null) => (e?.textContent ?? '').replace(/\s+/g, ' ').trim()
      return {
        kicker: t(document.querySelector('#app > .kicker, #app .kicker')),
        title: t(document.querySelector('#app h2.display')),
        stats: [...document.querySelectorAll('#app .statcard')].map((c) => ({
          nm: t(c.querySelector('.top .nm')),
          lead: c.classList.contains('lead'),
          v: [...c.querySelectorAll('.stats .v')].map((v) => v.getAttribute('data-cnt') ?? t(v)),
        })),
        recap: recap(),
        buttons: [...document.querySelectorAll('#app .row button')].map(t),
      }
      function recap() {
        return [...document.querySelectorAll('#app .recap')].map((r) => ({
          nm: t(r.querySelector('.rh .nm')),
          tot: t(r.querySelector('.rh .tot')),
          rows: [...r.querySelectorAll('.rrow')].map(
            (x) => `${t(x.querySelector('.rp'))}|${t(x.querySelector('.rn'))}|${t(x.querySelector('.rs'))}|${t(x.querySelector('.rw'))}|${x.classList.contains('won') ? 'won' : 'lost'}`,
          ),
        }))
      }
    })
  }

  async finalFacts() {
    return this.page.evaluate(() => {
      const t = (e: Element | null) => (e?.textContent ?? '').replace(/\s+/g, ' ').trim()
      return {
        kicker: t(document.querySelector('#app .final .kicker')),
        win: t(document.querySelector('#app .final .win')),
        ranks: [...document.querySelectorAll('#app .final .rank')].map(t),
        crate: [...document.querySelectorAll('#app .lp .cap')].map(t),
        crateHint: t(document.querySelector('#app .crate .hint')),
        rivalry: t(document.querySelector('#app .rivalry')),
        rivalrySummary: t(document.querySelector('#app .rivwrap > summary')),
        recap: [...document.querySelectorAll('#app .recap')].map((r) =>
          [...r.querySelectorAll('.rrow')].map((x) => `${t(x.querySelector('.rp'))}|${t(x.querySelector('.rn'))}|${t(x.querySelector('.rs'))}|${t(x.querySelector('.rw'))}`),
        ),
        buttons: [...document.querySelectorAll('#app .final .row button, #app .row button')].map(t),
      }
    })
  }

  async toasts(): Promise<string[]> {
    return this.page.evaluate(() => (window as unknown as { __toasts: string[] }).__toasts.slice())
  }

  /** Gespeicherte Daten lesen. Original: soundclash.v5 / soundclash.rivalry. Neu: präfixierte Schlüssel. */
  async stored(): Promise<{ settings: unknown; rivalry: unknown; keys: string[] }> {
    return this.page.evaluate((target) => {
      const keys = Object.keys(localStorage).sort()
      const get = (k: string) => {
        const v = localStorage.getItem(k)
        return v == null ? null : JSON.parse(v)
      }
      return target === 'legacy'
        ? { settings: get('soundclash.v5'), rivalry: get('soundclash.rivalry'), keys }
        : {
            settings: get('soundclash.app.settings'),
            rivalry: get('soundclash.app.rivalry'),
            // neue Schlüssel für den Vergleich auf die alten Namen abbilden; alles andere bleibt sichtbar
            keys: keys.map((k) => ({ 'soundclash.app.settings': 'soundclash.v5', 'soundclash.app.rivalry': 'soundclash.rivalry' })[k] ?? k).sort(),
          }
    }, this.target)
  }

  record(label: string, data: unknown) {
    this.trace.push({ label, data: shrink(data) })
  }

  /**
   * Ablauf mit der Referenz vergleichen. Das Original schreibt die Referenz beim ersten Lauf
   * (oder mit UPDATE_GOLDEN=1). Die neue Fassung muss exakt dieselbe Referenz erfüllen.
   */
  matchGolden(name: string) {
    const file = new URL(`../golden/${name}.json`, import.meta.url)
    const json = JSON.stringify(this.trace, null, 1)
    mkdirSync(new URL('../golden/', import.meta.url), { recursive: true })
    const outDir = new URL(`../../test-results/traces/${this.target}/`, import.meta.url)
    mkdirSync(outDir, { recursive: true })
    writeFileSync(new URL(`${name}.json`, outDir), json)
    if (this.target === 'legacy' && (process.env.UPDATE_GOLDEN || !existsSync(file))) {
      writeFileSync(file, json)
      return
    }
    expect(existsSync(file), `Referenz ${name} fehlt – zuerst gegen das Original laufen lassen`).toBe(true)
    const golden = JSON.parse(readFileSync(file, 'utf8'))
    expect(JSON.parse(json)).toEqual(golden)
  }
}
