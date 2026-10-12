# Sound Clash – Hinweise für Claude

Partyspiel rund um Musik (Blind ranken, Guess the Song, Timeline Masters). React 19, TypeScript,
Vite 8, PWA auf GitHub Pages unter `/SoundClashBeta/`. Tim spricht Deutsch, ist kein Programmierer,
nimmt Vorgaben wörtlich und will bei Unklarheiten gefragt werden.

## Oberste Regel: Mechanik unverändert

Die Spielmechanik ist 1:1 aus der alten Ein-Datei-Fassung übernommen (`legacy/index.html`, nie ändern).
Regeln, Abläufe, Wertungen, Ranglisten, Texte der Bildschirme, Einstellungen, gespeicherte Daten und
Deezer-Aufrufe dürfen sich **nicht** ändern – auch nicht „nebenbei verbessert“. Auffälligkeiten und
Fehler des Originals sind in `docs/MECHANIK.md` aufgelistet und bleiben, bis Tim etwas anderes sagt.
Gestaltung und Animationen dürfen sich ändern.

Prüfen: Die Verhaltenstests (`tests/*.spec.ts`) spielen dieselben Abläufe gegen Original und neue
Fassung und vergleichen mit den Referenzen in `tests/golden` (erzeugt vom Original). Jede Änderung
muss danach weiterhin grün sein.

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
tests/                Playwright-Verhaltenstests, aufgezeichnete Deezer-Antworten, Referenzen
docs/                 MECHANIK.md, HANDY-BEGLEITER.md, BERICHT.md, screenshots/
```

Logik-Fluss: Oberfläche → `dispatch(action)` → `reduce()` in `src/core/game.ts` (immer, mit
`env.rng`/`env.now`) → neuer Zustand + Effektliste → `runFx()` in `src/app/store.ts`.
Damit die Tests beide Fassungen bedienen können, behält die neue Oberfläche die ids, `data-*`-Attribute
und Klassennamen des Originals für Bedienelemente und Ergebnisanzeigen (z. B. `#startBtn`, `data-pl`,
`.recap .rrow`). Diese nicht umbenennen.

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
`docs/HANDY-BEGLEITER.md`, Test: `tests/begleiter.spec.ts`.

## Speicher (nur lokal, kein Server)

Die Herkunft `v6fdb8msrw-dotcom.github.io` teilen sich Sound Clash und **Muscle Studio**
(`/muskelaufbau-tracker/`, Schlüssel `ms.*`). Muscle-Studio-Schlüssel nie lesen oder schreiben.

| Schlüssel | Inhalt |
|---|---|
| `soundclash.app.settings` | Einstellungen, Namen, Avatare, Topf, Turnier-Kader (Format wie `save()` im Original) |
| `soundclash.app.rivalry` | Ewige Rivalität `{ "a|b": {a,b,aw,bw,draws,last} }` |
| `soundclash.v5`, `soundclash.rivalry` | alte Schlüssel des Originals – nur lesen (einmalige Übernahme), nie ändern |
| `soundclash.app.pair` (sessionStorage) | Spielcode der Handy-Kopplung am Hauptgerät |
| `soundclash.app.role.<CODE>` (sessionStorage) | gewählte Rolle auf dem Handy |

Export/Import als Datei (`sound-clash-spielstand-JJJJ-MM-TT.json`, Teilen-Menü/AirDrop) im Dialog
„Spielstand“. Service-Worker-Scope ist `/SoundClashBeta/`.

## Git und Veröffentlichung

- Arbeitsbranch `react-umbau`. Pushen kann nur Tim (GitHub Desktop); Terminal-Push gibt 403.
- Veröffentlichung über `.github/workflows/deploy.yml` (GitHub Actions → Pages). Solange Pages noch
  „Deploy from branch“ nutzt, darf der Vite-Quellcode nicht auf `main`.
- Commit-Nachrichten auf Deutsch, Ende: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
