import { describe, expect, it } from 'vitest'
import catalog from '../data/catalog.json'
import { drawer, initialState, pickOrder, pts, reduce, score, totalPts, type Action, type Env, type Genres } from './game'
import type { State } from './types'

/** Schnelle Prüfungen der reinen Spiellogik (die vollständigen Vergleiche mit dem Original laufen in tests/). */

const GEN = (catalog as unknown as { genres: Genres }).genres
const env = (r = 0.5): Env => ({ rng: () => r, now: () => 0, reduce: true })

function run(S: State, ...actions: Action[]) {
  for (const a of actions) S = reduce(S, a, env(), GEN).state
  return S
}
function started(players: number, size = 5): State {
  let S = run(initialState(), { type: 'load', saved: null }, { type: 'go', to: 'setup' })
  S = run(S, { type: 'pick', id: 'players', v: String(players) }, { type: 'pick', id: 'size', v: String(size) })
  for (const n of GEN.rnb.artists!.slice(0, players * size)) S = run(S, { type: 'poolToggle', name: n })
  return run(S, { type: 'start' })
}

describe('Punkte pro Platz', () => {
  it('doppelte Plätze am Ende wie im Original', () => {
    const S = { ...initialState(), size: 10 }
    expect([1, 8, 9, 10].map((p) => pts(S, p))).toEqual([1, 1, 2, 2])
    expect(totalPts(S)).toBe(12)
    const same = { ...initialState(), size: 7, sameArtist: true }
    expect([5, 6, 7].map((p) => pts(same, p))).toEqual([1, 2, 2])
  })
})

describe('Snake-Draft', () => {
  it('Reihenfolge 1-2-3, 3-2-1, 1-2-3 …', () => {
    let S = started(3)
    const order: number[] = []
    for (let k = 0; k < 9; k++) {
      order.push(drawer(S))
      S = run(S, { type: 'spin' }, { type: 'land' })
      S = run(S, { type: 'place', pos: S.lineup[S.pending!.player].indexOf(null) })
    }
    expect(order).toEqual([1, 2, 3, 3, 2, 1, 1, 2, 3])
  })
})

describe('Songwahl-Reihenfolge pro Duell', () => {
  it('gerade Duelle vorwärts, ungerade rückwärts', () => {
    const S = { ...initialState(), players: 3 }
    expect(pickOrder(S, 0)).toEqual([1, 2, 3])
    expect(pickOrder(S, 1)).toEqual([3, 2, 1])
  })
})

describe('Gleichstand → Sudden Death', () => {
  it('startet Sudden Death nur bei Gleichstand an der Spitze', () => {
    let S = started(2)
    while (S.screen === 'draft') {
      S = run(S, { type: 'spin' }, { type: 'land' })
      S = run(S, { type: 'place', pos: S.lineup[S.pending!.player].indexOf(null) })
    }
    expect(S.screen).toBe('pick')
    S = { ...S, audience: false }
    // P1 gewinnt #1, #2, #3 (3 Punkte), P2 gewinnt #4 und #5 (1 + 2 = 3 Punkte)
    for (const w of [1, 1, 1, 2, 2]) S = run(S, { type: 'pickNext' }, { type: 'pickNext' }, { type: 'win', p: w })
    // Im Sudden Death zählen nur noch SD-Punkte (Sieger zurückgesetzt, siehe MECHANIK.md)
    expect(score(S, 1)).toBe(0)
    expect(S.sd).toBe(true)
    expect(Object.keys(S.sdArt!)).toEqual(['1', '2'])
    expect(S.regularWinners!.map((r) => r.p)).toEqual([1, 1, 1, 2, 2])
  })
})

describe('Turnier (auf Tims Wunsch korrigiert)', () => {
  function tourney(series: string) {
    let S = run(initialState(), { type: 'load', saved: null }, { type: 'go', to: 'setup' }, { type: 'pick', id: 'mode', v: 't4' }, { type: 'pick', id: 'series', v: series })
    for (const n of GEN.uk.artists!.slice(0, 10)) S = run(S, { type: 'poolToggle', name: n })
    return run(S, { type: 'start' })
  }
  function playMatch(S: State, winner: number) {
    S = run(S, { type: 'tGo' })
    while (S.screen === 'draft') {
      S = run(S, { type: 'spin' }, { type: 'land' })
      S = run(S, { type: 'place', pos: S.lineup[S.pending!.player].indexOf(null) })
    }
    for (let d = 0; d < 5; d++) S = run(S, { type: 'pickNext' }, { type: 'pickNext' }, { type: 'win', p: d === 4 ? winner : d % 2 ? 2 : 1 })
    return S
  }
  it('jedes Match zieht aus dem vollen Topf', () => {
    let S = tourney('single')
    expect(S.T!.pool).toHaveLength(10)
    S = playMatch(S, 1)
    expect(S.screen).toBe('round')
    S = run(S, { type: 'tNext' })
    expect(S.screen).toBe('bracket')
    S = run(S, { type: 'tGo' })
    expect(S.pool).toHaveLength(10)
  })
  it('Best of 3 im Turnier spielt die nächste Runde direkt weiter', () => {
    let S = tourney('bo3')
    S = playMatch(S, 1)
    expect(S.screen).toBe('round')
    S = run(S, { type: 'nextRound' })
    expect(S.screen).toBe('draft')
    expect(S.round).toBe(2)
    expect(S.pool).toHaveLength(10)
    expect(S.T!.r).toBe(0)
  })
})
