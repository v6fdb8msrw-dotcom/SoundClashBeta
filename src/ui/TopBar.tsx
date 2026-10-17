import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { dispatch } from '../app/store'
import { BG_DECK, BGS, THEMES, bgBase, bgHasDeck } from '../core/constants'
import type { State } from '../core/types'
import { BackupDialog } from './BackupDialog'
import { PairDialog, useHost } from './PairDialog'
import { Sel } from './primitives'
import { getScreen, setScreen, subscribeScreen } from '../services/display'

/**
 * Kopfleiste, bewusst schlicht: Logo (→ Sound-Clash-Start), Handys koppeln und ein Menü.
 * Im Menü: Farbe, Hintergrund, Bildschirm (Laptop/Fernseher), Ton, Spielanleitung, Spielstand. Alle Funktionen bleiben erhalten.
 */
export function TopBar({ S, shrink }: { S: State; shrink: boolean }) {
  const [menu, setMenu] = useState(false)
  const [rules, setRules] = useState(false)
  const [backup, setBackup] = useState(false)
  const [pair, setPair] = useState(false)
  const host = useHost()
  useEffect(() => {
    if (!menu) return
    const close = () => setMenu(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false)
    document.addEventListener('click', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('click', close)
      document.removeEventListener('keydown', esc)
    }
  }, [menu])
  return (
    <>
      <header className={'brand' + (shrink ? ' shrink' : '')} role="banner">
        <div className="brand-home" onClick={() => dispatch({ type: 'go', to: 'setup' })} title="Zum Start">
          <div className="logo" aria-hidden>
            <span className="logo-disc" />
            <span className="logo-bolt" />
          </div>
          <div className="brand-text">
            <h1>
              Sound <em>Clash</em>
            </h1>
          </div>
        </div>
        <nav className="topbar" aria-label="Werkzeuge">
          <div className="tools">
            <button className={'tool' + (host.code ? ' on' : '')} id="pairBtn" onClick={() => setPair(true)} title="Handys per QR-Code koppeln">
              <svg className="ico" viewBox="0 0 24 24" aria-hidden>
                <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <path d="M10.5 18.5h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              {host.code ? <span className="tool-n">{host.phones.length}</span> : null}
            </button>
            <button className={'tool' + (menu ? ' on' : '')} id="menuBtn" aria-expanded={menu} aria-controls="menuSheet" onClick={(e) => (e.stopPropagation(), setMenu((m) => !m))} title="Menü">
              <span className="burger" aria-hidden>
                <i />
                <i />
                <i />
              </span>
            </button>
          </div>
        </nav>
        <div className={'menusheet' + (menu ? ' open' : '')} id="menuSheet" onClick={(e) => e.stopPropagation()} aria-hidden={!menu}>
          <div className="ms-row">
            <span className="ms-l">Farbe</span>
            <Sel id="theme" value={S.theme} opts={THEMES.map(([v, t]) => ({ v, t }))} onPick={(v) => dispatch({ type: 'pick', id: 'theme', v })} />
          </div>
          <div className="ms-row">
            <span className="ms-l">Hintergrund</span>
            <Sel id="bg" value={bgBase(S.bg)} opts={BGS.filter(([v]) => BG_DECK[v]).map(([v, t]) => ({ v, t }))} onPick={(v) => dispatch({ type: 'pick', id: 'bg', v: bgHasDeck(S.bg) ? BG_DECK[v] : v })} />
          </div>
          <div className="ms-row">
            <span className="ms-l">Plattenspieler</span>
            <button
              className={'tool' + (bgHasDeck(S.bg) ? ' on' : '')}
              id="deckBtn"
              aria-pressed={bgHasDeck(S.bg)}
              onClick={() => {
                const base = bgBase(S.bg)
                dispatch({ type: 'pick', id: 'bg', v: bgHasDeck(S.bg) ? base : BG_DECK[base] || 'deck' })
              }}
            >
              💿 {bgHasDeck(S.bg) ? 'an' : 'aus'}
            </button>
          </div>
          <div className="ms-row">
            <span className="ms-l">Bildschirm</span>
            <ScreenSwitch />
          </div>
          <div className="ms-row">
            <span className="ms-l">Ton</span>
            <button className="tool" id="soundBtn" title="Ton" onClick={() => dispatch({ type: 'toggleMute' })}>
              {S.muted ? '🔇' : '🔊'}
            </button>
          </div>
          <div className="ms-btns">
            <button className={'tool' + (rules ? ' on' : '')} id="rulesBtn" onClick={() => (setRules((r) => !r), setMenu(false))} aria-expanded={rules}>
              ⓘ Spielanleitung
            </button>
            <button className="tool" id="backupBtn" onClick={() => (setBackup(true), setMenu(false))} title="Spielstand sichern oder übernehmen">
              ⇅ Spielstand
            </button>
          </div>
        </div>
      </header>
      <AnimatePresence initial={false}>
        {rules ? (
          <motion.section
            className="rules open"
            id="rules"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 28 }}
          >
            <Rules />
          </motion.section>
        ) : null}
      </AnimatePresence>
      <AnimatePresence>{backup ? <BackupDialog onClose={() => setBackup(false)} /> : null}</AnimatePresence>
      <AnimatePresence>{pair ? <PairDialog onClose={() => setPair(false)} /> : null}</AnimatePresence>
    </>
  )
}

/** Regeltext wie im Original. */
function Rules() {
  return (
    <div className="card rules-card">
      <div className="quickstart">
        <h3 style={{ marginTop: 0 }}>⚡ In 10 Sekunden</h3>
        <ol>
          <li>
            <b>Spieler &amp; Genre</b> wählen, Künstler in den Topf.
          </li>
          <li>
            Reihum <b>Rad drehen</b> → Künstler <b>blind</b> auf einen Platz setzen.
          </li>
          <li>
            Pro Platz euren <b>besten Song</b> wählen, reinhören, <b>Sieger tippen</b>.
          </li>
          <li>
            Meiste Punkte = <b>Clash gewonnen</b> 🏆
          </li>
        </ol>
        <p className="qs-note">Reicht zum Loslegen — die Details stehen unten.</p>
      </div>
      <h3>Ziel</h3>
      <p>
        Jeder baut eine Aufstellung aus ausgelosten Künstlern. Danach tretet ihr Platz für Platz an: Jeder wählt seinen besten Song des jeweiligen Künstlers, ihr hört rein und kürt den Sieger. Wer die
        meisten Punkte hat, gewinnt den Clash.
      </p>
      <h3>1 · Einrichten</h3>
      <p>
        <b>Spieler:</b> 2–6, je mit Avatar und Farbe — über <b>+</b> lädst du eigene Bilder hoch. <b>Songs pro Spieler:</b> 5, 7, 10 oder 15. <b>Spielmodus:</b> Einzelrunde, Best of 3 oder Best of 5.{' '}
        <b>Songwahl:</b> alle vorab oder vor jedem Duell. Unter „Mehr Optionen“: Turnier, gleicher Künstler für alle, Pick-Timer.
      </p>
      <p>
        Im Menü oben rechts: <b>Farbe</b> im Stil berühmter Alben (Silk Sonic, Graduation, IGOR, SOS …) und der <b>Hintergrund</b> (Künstler-Mosaik, Plattenspieler, Aurora).
      </p>
      <h3>2 · Künstler-Topf</h3>
      <p>
        Wähl ein <b>Genre</b> — 30 Kategorien, von R&amp;B über Deutschrap bis Schlager und Jahrzehnten. Ein Klick auf <b>+</b> legt den Künstler in den Topf. Über die Suche findest du jeden weiteren Künstler.
      </p>
      <h3>3 · Ziehen</h3>
      <p>
        Reihum am Rad drehen (oder <b>Leertaste</b>). Die Reihenfolge ist ein <b>Snake-Draft</b> (1-2…2-1), damit niemand bevorteilt wird.
      </p>
      <h3>4 · Blind ranken</h3>
      <p>
        Setz jeden gezogenen Künstler <b>sofort</b> auf einen freien Platz — ohne zu wissen, was noch kommt. Die <b>letzten Plätze zählen doppelt</b> (×2).
      </p>
      <h3>5 · Songs wählen</h3>
      <p>
        Zwei Modi: <b>„Alle vorab"</b> — jeder wählt alle Songs auf einmal. Oder <b>„Vor jedem Duell"</b> — direkt vor jedem Battle wählt einer nach dem anderen, und die Reihenfolge dreht sich jedes Mal
        um (erst P1, dann P2 → Battle → dann P2, dann P1 → Battle …). Das bringt Taktik rein: Wer zuletzt wählt, weiß, was er schlagen muss.
      </p>
      <p>
        Bis zu 50 Top-Tracks stehen bereit, jeder mit <b>30-Sek-Vorschau</b>. Die Suche fragt live bei Deezer nach — findet also auch Deep Cuts. Und wenn ein Song gar nicht auffindbar ist:{' '}
        <b>„Song nicht dabei? Von Hand eintragen"</b> — Titel eintippen, fertig. Ohne Vorschau, aber Spotify und YouTube führen im Battle direkt hin.
      </p>
      <h3>6 · Battle</h3>
      <p>
        Platz gegen Platz. Beide Songs anhören — als Vorschau, oder in voller Länge über die <b>Spotify</b>- und <b>YouTube</b>-Links. Dann tippt ihr, wer gewinnt.
      </p>
      <h3>7 · Gleichstand</h3>
      <p>
        Steht es unentschieden, gibt es <b>Sudden Death</b>: Jeder Gleichstehende bekommt einen zufälligen Künstler aus dem Genre (bei „Gleicher Künstler für alle“ denselben). Wer den besseren Song holt, bekommt einen Punkt dazu und gewinnt die Runde.
      </p>
      <h3>8 · Serie &amp; Teilen</h3>
      <p>
        Bei Best of 3/5 zählt jeder Rundensieg. Der Endstand lässt sich als Bild <b>teilen</b>.
      </p>
    </div>
  )
}

/** Laptop / Fernseher: Fernseher vergrößert alles für die Couch (wird auf diesem Gerät gemerkt). */
function ScreenSwitch() {
  const m = useSyncExternalStore(subscribeScreen, getScreen, getScreen)
  return (
    <div className="seg ms-seg" role="radiogroup" aria-label="Bildschirm">
      {(
        [
          ['laptop', '💻 Laptop'],
          ['tv', '📺 Fernseher'],
        ] as const
      ).map(([v, t]) => (
        <button key={v} type="button" role="radio" id={'screen-' + v} aria-checked={m === v} className={m === v ? 'on' : ''} onClick={() => setScreen(v)}>
          {m === v ? <span className="seg-ind" /> : null}
          <span className="seg-t">{t}</span>
        </button>
      ))}
    </div>
  )
}
