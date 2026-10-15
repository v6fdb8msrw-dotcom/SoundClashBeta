# Sound Clash – Hinweise für Claude

Partyspiel rund um Musik (Sound Clash: Künstler blind ranken, Song-Duelle). React 19, TypeScript,
Vite 8, PWA auf GitHub Pages unter `/SoundClashBeta/`. Tim spricht Deutsch, ist kein Programmierer,
nimmt Vorgaben wörtlich und will bei Unklarheiten gefragt werden.

## Oberste Regel: Mechanik unverändert

Die Spielmechanik ist 1:1 aus der alten Ein-Datei-Fassung übernommen (`legacy/index.html`, nie ändern).
Regeln, Abläufe, Wertungen, Ranglisten, Texte der Bildschirme, Einstellungen, gespeicherte Daten und
Deezer-Aufrufe dürfen sich **nicht** ändern – auch nicht „nebenbei verbessert“. Auffälligkeiten und
Fehler des Originals sind in `docs/MECHANIK.md` aufgelistet und bleiben, bis Tim etwas anderes sagt.
Gestaltung und Animationen dürfen sich ändern.

Ausnahme: Die von Tim freigegebenen Korrekturen in `docs/MECHANIK.md` §9 (Turnier-Topf, Punkte nach
Sudden Death, gespeicherter Pick-Timer usw.). Weitere Abweichungen nur nach ausdrücklicher Freigabe.

Prüfen: Die Verhaltenstests (`tests/*.spec.ts`) spielen dieselben Abläufe gegen Original und neue
Fassung. Das Original wird mit `tests/golden` verglichen, die neue Fassung mit `tests/golden/neu`.
Diese Referenzen unterscheiden sich vom Original nur durch die freigegebenen Korrekturen. Jede
Änderung muss danach weiterhin grün sein.

Nur **Sound Clash** ist sichtbar (Tims Wunsch): Start direkt in der Einrichtung. Guess the Song,
Timeline, Jahrzehnt-Duell und Sing it Back sind ausgeblendet (Logik in `src/core`, Bildschirme ungenutzt
in `src/screens`, Tests dafür nur gegen das Original). Das Interface soll schlicht bleiben (wie Muscle
Studio): wenige Knöpfe, Menü oben rechts, seltene Optionen unter „Mehr Optionen“.

## Aufbau

```
legacy/index.html     Original (Referenz, unverändert)
src/core/             reine Spiellogik: Zustand + Aktionen (game.ts), Konstanten, Farben, Typen
src/services/         Deezer (JSONP), Katalog, Audio + Analyse, Klänge, Speicher, Rivalität
src/app/              Laufzeit: Store/dispatch + Effekte, Rad-Animation, Künstlerliste, Ereignis-Bus
src/screens/          Bildschirme (Home, Setup, Draft/Wheel, Pick, Songs, Duel, Round, Final, Minispiele)
src/ui/               Bausteine: Kopfleiste, Hintergrund, Partikel, Toast, Splash, Spielstand-Dialog
src/styles/           themes.css (Album-Themes), base, background, components, screens, games
src/data/             catalog.json (Genres + Künstler-Cache), avatars.ts (eingebaute Avatare)
src/remote/           Handy-Begleiter: host.ts (Hauptgerät), client.ts + RemoteApp.tsx (Handy), protocol.ts
src/ui/Vinyl.tsx      realistische Schallplatte (Cover als Etikett); Hintergrund-Mosaik in Background.tsx
tests/                Playwright-Verhaltenstests, aufgezeichnete Deezer-Antworten, Referenzen
docs/                 MECHANIK.md, HANDY-BEGLEITER.md, BERICHT.md, screenshots/
```

Logik-Fluss: Oberfläche → `dispatch(action)` → `reduce()` in `src/core/game.ts` (immer, mit
`env.rng`/`env.now`) → neuer Zustand + Effektliste → `runFx()` in `src/app/store.ts`.
Damit die Tests beide Fassungen bedienen können, behält die neue Oberfläche die ids, `data-*`-Attribute
und Klassennamen des Originals für Bedienelemente und Ergebnisanzeigen (z. B. `#startBtn`, `data-pl`,
`.recap .rrow`). Diese nicht umbenennen. Der Testtreiber öffnet Menü, „Mehr Optionen“ und
Avatar-Auswahl bei Bedarf selbst (`reveal()` in `tests/helpers/driver.ts`), ebenso die eingeklappte
Regel-Zeile der Startseite (`#rulesToggle`, `.rules-body`).

Startseite (Tims Vorgabe): ① Spieler und ② Künstler-Topf immer sichtbar, Regeln als eine Zeile zum
Aufklappen mit Schnellstart-Standard. Fernseher-Modus: `src/services/display.ts` setzt `--tvz`, CSS
zoomt `.wrap` (nicht die ganze Seite, sonst laufen `vw`-Maße über). Überblendungen zwischen den
Spielphasen: `src/ui/SceneCut.tsx` (normaler Modus: Wisch von links nach rechts, Handy-Modus: Kino-Blenden).
Spielbildschirme ohne Scrollen: `src/ui/Fit.tsx` (setzt `data-fit` am html und `--fitH`, verkleinert bei
Bedarf per `zoom`); die Reihenfolge der `.pcluster` im DOM bleibt P1…Pn (Vergleichstests), angeordnet
wird beim Ziehen nur per CSS-Raster (`--gc`/`--gr`).

## Befehle

```bash
npm run dev          # Entwicklung auf http://127.0.0.1:5175 (5173 gehört Tims eigenem Server – nie beenden)
npm run build        # Typprüfung + Build nach dist/
npm test             # Unit-Tests (Vitest)
npm run test:e2e     # baut mit Basis /SoundClashBeta/ und startet alle Verhaltenstests
npx playwright test --project=legacy   # nur gegen das Original
npx playwright test --project=neu      # nur gegen die neue Fassung
npx playwright test --project=pwa      # Service Worker, Manifest, Offline-Start
SHOTS=1 npx playwright test tests/screenshots.spec.ts --project=neu   # Bildschirmfotos nach docs/screenshots
UPDATE_GOLDEN=1 npx playwright test --project=legacy                  # Referenzen neu aus dem Original
UPDATE_GOLDEN_NEU=1 npx playwright test --project=neu                 # Referenzen der neuen Fassung (nur nach Freigabe!)
npm run icons        # App-Icons aus public/logo.svg
```

Tests nutzen echtes Chrome (`channel: 'chrome'`). Deezer-Antworten kommen aus `tests/fixtures/deezer`
(fehlende werden einmal live geholt). `tests/live.spec.ts` spielt eine echte Deezer-Hörprobe.
Der eingebaute Browser-Pane blockiert Service Worker – PWA nur mit Headless-Chrome prüfen.

## Handy-Begleiter

Tims Vorgabe: Gespielt wird lokal auf einem Hauptgerät; Multiplayer gibt es nicht und ist nicht geplant.
Handys koppeln sich optional per QR-Code
(`?join=CODE`, Trystero/WebRTC, kostenlose Nostr-Relays, nichts gespeichert) und können abstimmen,
ihr Line-up sehen und – wenn sie dran sind – drehen, setzen und Songs wählen. Das Handy löst nur
dieselben Aktionen aus wie ein Tippen am Hauptgerät (`src/remote/host.ts` prüft, wer dran ist).
Alles muss kostenlos nutzbar bleiben (kein bezahlter Dienst, kein eigener Server). Details:
`docs/HANDY-BEGLEITER.md`, Tests: `tests/begleiter.spec.ts`, `tests/handymodus.spec.ts`.

**Handy-Modus** (Einrichtung → „Wie wird gesteuert? 📱 Mit den Handys“, `S.phoneMode`, Tims Vorgabe,
MECHANIK §11): Spieler steuern alles am Handy, das Hauptgerät ist die Bühne – `CineDraft` in
`Draft.tsx` (Spielfeld groß, Rad als Einblendung), `src/screens/PhoneMode.tsx` (Kacheln bei der
Songwahl, Bildschirm `listen` = Aufdecken Spieler für Spieler mit `listenPlay`/`listenNext`),
Versus in `Duel.tsx` (ohne Links, mit „wer hat wofür gestimmt“ aus `voterRoles()` in `host.ts`),
Kino-Überblendungen in `src/ui/SceneCut.tsx`. Die Wertung ist dieselbe wie im klassischen Modus.
„An diesem Gerät“ bleibt exakt wie das Original. Klassennamen `.remote`/`.r-*` gehören der Handy-Seite –
am Hauptgerät nicht verwenden.

## Speicher (nur lokal, kein Server)

Die Herkunft `v6fdb8msrw-dotcom.github.io` teilen sich Sound Clash und **Muscle Studio**
(`/muskelaufbau-tracker/`, Schlüssel `ms.*`). Muscle-Studio-Schlüssel nie lesen oder schreiben.

| Schlüssel | Inhalt |
|---|---|
| `soundclash.app.settings` | Einstellungen, Namen, Avatare, Topf, Turnier-Kader (Format wie `save()` im Original, plus `pickSec`, `autoScroll`, `phoneMode`) |
| `soundclash.app.rivalry` | Ewige Rivalität `{ "a|b": {a,b,aw,bw,draws,last} }` |
| `soundclash.v5`, `soundclash.rivalry` | alte Schlüssel des Originals – nur lesen (einmalige Übernahme), nie ändern |
| `soundclash.app.display` | Bildschirm „laptop“ oder „tv“ (nur dieses Gerät, nicht im Spielstand/Backup) |
| `soundclash.app.pair` (sessionStorage) | Spielcode der Handy-Kopplung am Hauptgerät |
| `soundclash.app.role.<CODE>` (sessionStorage) | gewählte Rolle auf dem Handy |

Export/Import als Datei (`sound-clash-spielstand-JJJJ-MM-TT.json`, Teilen-Menü/AirDrop) im Dialog
„Spielstand“. Service-Worker-Scope ist `/SoundClashBeta/`.

## Git und Veröffentlichung

- Arbeiten auf einem Feature-Branch, danach `main` per Fast-Forward nachziehen. Pushen kann nur Tim
  (GitHub Desktop, „Push origin“); Terminal-Push gibt 403.
- Veröffentlichung: Jeder Push auf `main` startet `.github/workflows/deploy.yml` (Tests, Build,
  GitHub Pages). Pages steht auf „GitHub Actions“. Browser-Cache 10 Min – zum Prüfen `?neu=1` anhängen.
- Commit-Nachrichten auf Deutsch, Ende: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
