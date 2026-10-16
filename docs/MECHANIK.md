# Sound Clash – Spielmechanik (Stand Original `legacy/index.html`)

Dieses Dokument hält fest, wie das Original funktioniert. Es ist die Vorgabe für den Umbau:
**Regeln, Abläufe, Wertungen, Ranglisten, Bildschirme, Einstellungen, gespeicherte Daten und
Deezer-Aufrufe bleiben exakt so.** Nur Aussehen und Animationen dürfen sich ändern.
Auffälligkeiten des Originals sind am Ende gesammelt; sie bleiben ebenfalls unverändert.

Quelle der Wahrheit bei Zweifeln ist der Code in `legacy/index.html` (Zeilenangaben beziehen sich darauf).

---

## 1. Überblick

Sound Clash ist ein Partyspiel rund um Musik. Startbildschirm „Wähle deinen Modus“ mit drei Kacheln:

| Kachel | Ziel | Spieler | Abzeichen |
|---|---|---|---|
| 🥊 Sound Clash | Blind ranken, Song für Song | 2–6 (Turnier 4/8/16) | (Hauptmodus, hervorgehoben) |
| 🎧 Guess the Song | Song an kurzer Stichprobe erraten | 1 | „⚙ In Production“ |
| 🕰️ Timeline Masters | Songs ins richtige Jahr einsortieren / Jahrzehnt-Duell | 1–6 bzw. 2 Teams | „⚙ In Production“ |

Oben: Logo (Klick → Startbildschirm), „ⓘ Spielanleitung“ (klappt Regeltext auf/zu),
Auswahl **Hintergrund**, Ton an/aus (🔊/🔇), Auswahl **Farbe** (Theme).

---

## 2. Sound Clash (Hauptmodus)

### 2.1 Einstellungen (Setup)

| Feld (`id`) | Optionen | Standard | Wirkung beim Ändern |
|---|---|---|---|
| Spielart (`mode`) | Clash (alle gegen alle) · Turnier 4 · Turnier 8 · Turnier 16 | clash | Farben zurücksetzen (`colors=null`). Turnier: Kader neu (bestehende Einträge bleiben), Spieler = 2, Publikum = aus. Clash: Turnier löschen, Spieler = 2. Danach `resetAll` |
| Spieler (`players`) | 2–6 (im Turnier fest: Kadergröße) | 2 | `resetAll` |
| Songs pro Spieler (`size`) | 5 · 7 · 10 · 15 | 5 | `resetAll` |
| Spielmodus (`series`) | Einzelrunde · Best of 3 · Best of 5 | single | `resetAll` |
| Songwahl (`songMode`) | Alle vorab (`upfront`) · Vor jedem Duell (`perduel`) | perduel | `resetAll` |
| Spielmodus (`sameArtist`) | Normal – jeder eigene Künstler · Gleicher Künstler für alle | aus | `resetAll` |
| Wer entscheidet? (`audience`) | Gemeinsam antippen · Publikum stimmt ab | Publikum | – |
| Pick-Timer (`pickSec`) | Aus · 30 · 45 · 60 Sek | Aus | wird **nicht** gespeichert |
| Album-Wand-Puls (`ambience`) | An · Aus | An | Aus stoppt sofort die Ambience |
| Auto-Scroll (`autoScroll`) | An · Aus | An | wird **nicht** gespeichert (siehe Auffälligkeiten) |
| Genre (`genre`) | 30 Kategorien (s. 2.2) | rnb | lädt die Künstlerliste des Genres |

`resetAll` = Rundensiege löschen, Runde = 1, `resetRound` (Line-ups, Songs, Sieger, Sudden Death leeren).

**Spieler-Karte:** pro Spieler Namensfeld (max. 16 Zeichen; leer → „P<n>“), Avatar-Raster
(eigene Uploads zuerst, dann 11 eingebaute Avatare). Ein Avatar, den ein anderer Spieler hat, ist gesperrt.
„+“ lädt ein eigenes Bild: quadratisch mittig zugeschnitten, 160×160 px, JPEG 0,82, vorn in die
Liste der eigenen Bilder (max. 12, keine Duplikate).
Startwerte der Avatare: Spieler p bekommt `avatarPool[custom.length + p − 1]`.

**Turnier-Kader** (statt Spieler-Karte): 4/8/16 Einträge „Spieler n“ mit Avatar `AVATARS[i % 11]`
und Farbe `themeColors()[i % 16]`. Namen ändern, Avatar wählen (gesperrt, wenn ein anderer Kader-Eintrag
ihn hat – nur wenn es mindestens so viele Avatare wie Kaderplätze gibt), eigenes Bild hochladen.

**Spielerfarben:** 16 Grundfarben (`AV`). Für jedes Theme wird jede Farbe so lange in der Helligkeit
verschoben (Schritte 0,02 in HSL), bis der Kontrast zum Theme-Hintergrund ≥ 3,2 ist (dunkles Theme →
heller, helles Theme → dunkler). Ergebnis wird pro Theme zwischengespeichert.

### 2.2 Künstler-Topf

* Genre-Auswahl: 30 Kategorien aus dem eingebetteten Katalog (`src/data/catalog.json`):
  R&B, Rap USA, Rap USA Nostalgie, Deutschrap, UK, Nostalgie, Modern Country, Old Rock,
  DJ / Electronic, Pop, Banger, Silk & Soul, Reggae / Dancehall, Latin, Afrobeats, K-Pop,
  Indie / Alternative, Metal, Jazz & Soul Classics, House / Techno, Rap Français, Schlager,
  Meine Rotation, 70er, 80er, 90er, 00er, 10er, 20er, Filmmusik.
* Liste: Künstler des Genres, sortiert nach Fans (absteigend), außer „Meine Rotation“ (`keepOrder`)
  und Filmmusik (Filmtitel in Katalogreihenfolge). Erst 30 sichtbar, „Mehr laden“ +30.
* Zeile: Bild, Name (Deezer-Schreibweise), „<Fans/1000>K Fans“ oder „Artist“, Knopf „+“ / „✓“.
  Klick schaltet um (rein/raus, Vergleich ohne Groß-/Kleinschreibung).
* Suche (ab 2 Zeichen): sofort im eingebetteten Katalog (bis 12 Treffer, Teilstring im Schlüssel),
  nach 340 ms zusätzlich live bei Deezer (`search/artist`, 12). Live-Treffer ersetzen die Liste,
  wenn es welche gibt. Unter 2 Zeichen → wieder Genre-Liste.
* „Im Topf · n“: Liste mit „✕“ zum Entfernen.
* **Start** („Match starten →“) erst ab `Spieler × Songs pro Spieler` Künstlern
  (Hinweis „Mindestens N Künstler in den Topf legen.“). Gilt auch bei „Gleicher Künstler für alle“.
  Turnier: Start legt einen neuen Turnierbaum an (Kader bleibt) → Turnierbaum.

### 2.3 Ziehen (Draft)

* Glücksrad mit allen Künstlern im Topf. Drehen per Knopf „Rad drehen · [space]“, Klick auf die Nabe
  „SPIN“ oder Leertaste (nicht in Eingabefeldern/Knöpfen).
* Ziel: zufälliges Segment (`floor(random × n)`); 5 Umdrehungen in 4,2 s (reduzierte Bewegung:
  1 Umdrehung, 0,5 s), Ausrollen kubisch; 30 „Pegs“ erzeugen Ticks. Nach dem Stopp 0,7 s
  (reduziert 0,2 s) Pause, dann wird der Künstler aus dem Topf genommen und aufgedeckt.
* Bei nur 1 Künstler im Topf: kein Drehen („Letzten Künstler ziehen →“), sofort aufgedeckt.
* **Wer zieht (Snake-Draft):** mit m = bereits gesetzte Künstler, P = Spieler, r = ⌊m/P⌋, k = m mod P:
  gerade Runde r → Spieler k+1, ungerade → Spieler P−k (1-2-…-P, P-…-2-1, …).
  Gleicher Künstler: Spieler `(gesetzte Plätze mod P) + 1`.
* Aufdecken: großes Bild, Name, „→ <Spieler>“. Der Spieler setzt den Künstler **sofort** auf einen
  freien Platz seiner Spalte („↓ <Name>, wähle einen Platz in deiner Spalte“).
  Gleicher Künstler: gemeinsames Grid, der Künstler gilt für alle Spieler auf diesem Platz.
* Wenn alle Plätze voll sind: Duell 0, Wahlindex 0 → „Vor jedem Duell“: Songwahl-Bildschirm
  (lädt Top-Tracks der Künstler von Duell 0); „Alle vorab“: Songs-Bildschirm (lädt alle Top-Tracks).
* Anzeige: „Runde r“, „Pick x / N·P“ (gleicher Künstler: „x / N“), „Am Zug: <Name>“; Spalten pro Spieler
  mit „belegt/N Plätze · <Rundensiege> W“. 2 Spieler: Spalten links/rechts vom Rad; 3+ Spieler: Rad oben.

### 2.4 Punkte pro Platz

* N = Songs pro Spieler. Doppelte Plätze: `twoC = gleicher Künstler ? 2 : max(1, round(N/5))`.
* Platz p (1-basiert) zählt **2 Punkte**, wenn `p > N − twoC`, sonst 1.
  → N=5: #5 doppelt; N=7: #7 (gleicher Künstler: #6, #7); N=10: #9, #10; N=15: #13–#15.
* Maximal erreichbar je Runde: `N + twoC`.

### 2.5 Songwahl

**Trackliste je Feld:** Top-Tracks des Künstlers (Deezer `artist/{id}/top`, 50). Ohne Deezer-ID:
Suche `artist:"<Name>"` (50). Filmmusik: Suche mit dem hinterlegten Suchbegriff (25), nur Tracks mit
Vorschau, Titel ohne Duplikate. Zeile: Cover, Titel (`title_short`), Dauer m:ss, (Jahr falls bekannt),
fremder Interpret wird angehängt, ▶/⏸ Vorschau.
**Suchfeld** im Feld: filtert sofort die Top-Tracks (alle Wörter müssen im Titel vorkommen);
nach 380 ms live bei Deezer: `artist:"A" track:"q"` (25) → falls leer `A q` (25) → falls leer `q` (25);
Treffer des richtigen Interpreten zuerst; nur passende Titel werden ergänzt; „· sucht…“ solange veraltet.
Max. 40 Zeilen. Leer → „Nichts gefunden — trag den Song unten von Hand ein.“ (Abschnitt klappt auf).
**Von Hand:** Titel eintippen (Enter oder „+ Übernehmen“) → Song ohne Vorschau (`manual`), Links
„↗ Auf Spotify suchen“ / „↗ Auf YouTube suchen“ mit dem eingetippten Text.

**Alle vorab (`upfront`):** Spalte pro Spieler, Karte pro Platz („#i“, „×2“ bei Doppelplatz, „SD“).
Gewählter Song mit ▶ und „↻“ (zurücksetzen). „Zum Battle →“ erst wenn alle gewählt; sonst
„Ohne Songs weiter“ + Hinweis.

**Vor jedem Duell (`perduel`):** Reihenfolge pro Duell i: gerade i → Spieler 1…P, ungerade → P…1
(nur Teilnehmer; im Sudden Death nur die mit SD-Künstler). Anzeige der Chips („✓ gewählt“, „wählt…“,
sonst Künstlername). Knopf „<Titel> bestätigen →“ (deaktiviert „Erst einen Song wählen“),
„Überspringen“ (ohne Song weiter). Nochmal antippen wechselt den Song.

**Pick-Timer** (nur „Vor jedem Duell“): Balken läuft ab; letzte 25 % farblich anders. Bei 0: falls
noch kein Song gewählt, zufälliger Track mit Vorschau aus der aktuellen Liste (bei Jahrzehnt-Auflage
bevorzugt passende) → Toast „⏱ Zeit um — „<Titel>“ automatisch übernommen.“; dann weiter.
Zeitpunkt pro (Runde, Duell/SD, Wahlindex) einmal festgelegt.

### 2.6 Duell (Battle)

* Kopf: „Runde r“, „Platz #p · ×pt“ (bzw. „Sudden Death“), Punktestand aller Spieler.
  „#p · pt PTS“ bzw. „Sudden Death“ (+ „wer holt den besseren Song?“; gleicher Künstler: „Alle haben X —“).
* Karte pro Spieler: Name, Künstler, Song (oder „Kein Song gewählt“), Dauer,
  „▶ 30 Sek“/„⏸ Pause“, **„↗ Spotify“** = `https://open.spotify.com/search/` + encodeURIComponent(Künstler + " " + Titel),
  **„↗ YouTube“** = `https://www.youtube.com/results?search_query=` + encodeURIComponent(Künstler + " " + Titel).
* **Gemeinsam antippen:** Knopf „<Name> gewinnt →“ je Karte.
* **Publikum stimmt ab:** je Karte Equalizer mit Prozent, „−“ / „+1 Stimme“ (beliebig oft, nicht unter 0).
  „Abstimmung schließen · n Stimme(n) →“ (erst ab 1 Stimme), „↻ Zurücksetzen“.
  Nach Schließen: eindeutige Mehrheit → Sieger mit 👑, Knopf „<Name> holt pt Punkt(e) →“;
  Gleichstand → Toast „Stimmengleichheit — entscheidet gemeinsam.“ und Knöpfe aller Spieler.
  „↻ Nochmal abstimmen“ öffnet die Abstimmung neu.
* Sieg: Sieger des Duells gespeichert, Verlierer-Karten verblassen 0,9 s (reduziert: sofort),
  dann nächstes Duell (bei „Vor jedem Duell“ erst Songwahl, Top-Tracks laden) oder Rundenende.

### 2.7 Rundenende, Gleichstand, Serie

* Punkte je Spieler = Summe der Platzwerte seiner gewonnenen Duelle (Sudden Death: 1).
* **Gleichstand an der Spitze** (und noch kein Sudden Death): Sudden Death.
  Kandidaten = Künstler des Genres, die in keinem Line-up stehen; falls keine: Topf, sonst Genre.
  Gleicher Künstler: ein Zufallskünstler für alle Gleichstehenden; sonst jeder Gleichstehende einen
  eigenen (ohne Zurücklegen, bei Bedarf wird der Beutel neu gefüllt). Toast
  „Gleichstand! Sudden Death: alle bekommen <X>“ bzw. „… jeder kriegt einen Zufalls-Künstler“.
  Sieger und Songs werden auf einen Platz zurückgesetzt, Songwahl wie gewohnt (pick/songs).
  Die regulären Sieger-Songs werden vorher für „Die Platten des Abends“ gesichert.
* Kein Gleichstand: Bester bekommt einen Rundensieg → Rundenbildschirm.
* Rundenbildschirm: „Runde r · Endstand“, Sieger groß, je Spieler „Punkte diese Runde“, „Von“ (N+twoC
  bzw. 1 bei SD), „Rundensiege x/Ziel“. Rückblick (aufklappbar): Plätze, Künstler, Song, „+pt“/„—“.
* Ziel: Einzelrunde 1, Best of 3 → 2, Best of 5 → 3 Rundensiege.
  Einzelrunde oder Ziel erreicht → „Endstand ansehen →“; sonst „Nächste Runde →“:
  Runde+1, alle Line-up-Künstler zurück in den Topf (Duplikate entfernt), neue Runde, Setup,
  Toast „Neue Runde — Topf prüfen und starten.“

### 2.8 Endstand

* Rangliste nach Rundensiegen, dann Punkten der letzten Runde. „Sieger“ groß, Plätze mit
  „x Rundensiege · y pts“.
* **Die Platten des Abends:** alle Sieger-Songs der letzten Runde (bei SD: reguläre + SD-Platte),
  antippen spielt die Vorschau (und schaltet den Hintergrund auf „Mosaik + Plattenspieler“, falls
  kein Plattenspieler sichtbar war).
* **Ewige Rivalität** (nur genau 2 Spieler, verschiedene Namen): beim Öffnen des Endstands wird
  das Ergebnis gezählt (Schlüssel = beide Namen klein, sortiert, „a|b“; Sieg, Niederlage oder
  Remis bei gleichen Siegen und Punkten). Anzeige „Ewige Rivalität · n Duelle“ mit Stand und
  „<Name> führt die Serie an.“ / „Kopf an Kopf — alles offen.“
* Rückblick, „⇪ Teilen“ (Bild 1080×1350 mit Sieger, bis zu 5 Covern, Endstand; Web-Share mit Text
  „🏆 Sound Clash — Endstand …“, sonst Download `sound-clash.png` + Text in die Zwischenablage,
  Toast „Endstand gespeichert.“), „↻ Neues Match“ (Setup, Rundensiege gelöscht).

### 2.9 Turnier (4/8/16)

* Paarungen Runde 1: 1-2, 3-4, … Gewinner steigen auf, nächste Runde paart Gewinner in Reihenfolge.
* Turnierbaum: „Turnier · n Spieler“, Rundenname (Achtelfinale/Viertelfinale/Halbfinale/Finale),
  alle bisherigen Runden, aktuelles Match markiert. „<A> vs <B> starten →“, „Turnier abbrechen“
  (zurück zu Clash, 2 Spieler, Setup).
* Match: die beiden Kontrahenten werden als Spieler 1/2 mit Namen, Avatar, Farbe geladen; Ablauf
  wie Clash (Draft, Songs, Duelle, Runde). Rundenbildschirm: „<Sieger> steigt auf →“ (bei Einzelrunde
  oder erreichtem Ziel). Sieger = höchste Punktzahl (bei Gleichstand der erste – SD greift aber vorher).
* Letztes Match: Turniersieger (Konfetti, Fanfare), Turnierbaum, Platten, Line-up des Finales, „↻ Neues Turnier“.

---

## 3. Guess the Song

* Setup: Genres (mehrere, Chips), Runden 3/5/10 (Standard 5), Schwierigkeit Easy/Medium/Ultra
  (Standard Easy). Start erst mit mind. einem Genre.
* Pool „bekannteste Songs“: pro Genre die Künstler nach Fans (außer `keepOrder`), Konfiguration:
  Easy 14 Künstler × 2 Songs aus Top 0–2; Medium 20 × 3 aus Top 0–6; Ultra 22 × 5 aus Top 3–10;
  (Sing: 22 × 1 aus Top 0–1). Nur Tracks mit Vorschau, keine Duplikate (Interpret|Titel).
  Filmmusik: je Film eine Suche, erster Treffer mit Vorschau, Jahr = Filmjahr.
  Weniger als 6 Songs → Fehlermeldung.
* Ablauf (immer 1 Spieler): Pool zufällig mischen, die ersten `Runden` Songs.
  Stufen (Sekunden → Punkte): 0,2→12 · 0,5→10 · 1→8 · 2→6 · 3→5 · 5→3 · 8→1.
  „▶ Anspielen · s“ spielt die ersten s Sekunden. Eingabe (ab 2 Zeichen, 260 ms) sucht bei Deezer
  (`search`, 8 Treffer). Treffer antippen: richtig, wenn Interpret gleich und ein Titel den anderen
  enthält (ohne Groß-/Kleinschreibung) → Punkte der aktuellen Stufe. Falsch → nächste Stufe,
  Toast „Daneben — hör nochmal rein.“ (letzte Stufe: aufgelöst, 0 Punkte). „Mehr hören / überspringen →“
  = nächste Stufe; letzte Stufe „Aufgeben & auflösen →“.
* Auflösung: „✓ Richtig!“/„✗ Daneben“, Titel, Interpret, „+x Punkte“/„0 Punkte“. Ergebnis: Punkte,
  „n Runden · <Genre bzw. n Kategorien>“, „Nochmal“ (gleiche Einstellungen, neu gemischt).

## 4. Timeline Masters

* Setup: Kategorien (mehrere), Spielart „Einsortieren“ oder „Jahrzehnt-Duell“.
  Einsortieren: Spieler 1–6 (Standard 2), Karten zum Sieg 5/10/15 (Standard 10).
  Jahrzehnt-Duell: Punkte zum Sieg 5/7/10 (Standard 7).
* Pool mit Jahren: Filmmusik wie oben. Künstler-Kategorien: je Kategorie die 22 bekanntesten,
  zusammen ohne Duplikate, gemischt, max. 32. Je Künstler (4 parallel): alle Alben laden
  (frühestes Jahr pro Album), Top 12, die ersten 2 Tracks mit Vorschau und bekanntem Jahr;
  dazu die Originalversion suchen (gleicher Titel und Interpret, frühestes Albumjahr).
  Danach mischen; pro Album und pro **Jahr** nur eine Karte.
* Einsortieren: zu wenige Karten (< Spieler + 3) → Fehlermeldung. Jeder Spieler bekommt eine
  Gratis-Ankerkarte. Ziehen aus einem gemischten Beutel (neu gemischt, wenn leer).
  Am Zug: Vorschau hören, Lücke „+“ wählen. Richtig, wenn linker Nachbar ≤ Jahr ≤ rechter Nachbar
  → Karte bleibt („✓ Richtig einsortiert!“), sonst „✗ Daneben — fliegt raus“.
  Sieg, sobald nach richtigem Einsortieren die Zeitleiste die Zielzahl hat. Sonst nächster Spieler
  (0,52 s Drehanimation). Platzierte Karten antippen spielt ihre Vorschau.
* Jahrzehnt-Duell: Team 1/2 abwechselnd. Jahrzehnte 60er–20er (Jahre < 1960 zählen als 60er,
  > 2029 als 20er). Richtig → Punkt; falsch → anderes Team darf „klauen“ (richtig → Punkt für dieses).
  Auflösung „✓ Team x schnappt sich den Punkt! (90er)“ / „✗ Beide daneben — war 90er“.
  Sieg bei Zielpunkten (bei beiden ≥ Ziel gewinnt Team 1 bei Gleichstand). Zu wenige Karten (< 4) → Fehler.

## 5. Nicht erreichbare Teile im Original

Im Code vorhanden, aber ohne Weg dorthin in der Oberfläche (bleiben unerreichbar):
* **Sing It Back** (Setup, Spiel, Ergebnis; „🚧 Under Construction“) – keine Startkachel.
* „Bald verfügbar“-Bildschirm (`soon`), eigener Jahrzehnt-Duell-Setup (`ddsetup`), Abstimmungs-Bildschirm
  `voteScreen` (das Duell enthält die Abstimmung selbst), Multiple-Choice-Antworten bei Guess.
* **Jahrzehnt-Auflage pro Platz** (`eras`): immer „aus“, es gibt keine Einstellung dafür.
* **Spotify-Vollversion:** Client-ID ist leer, also nie aktiv.
* Spieleranzahl 2 bei Guess / Sing It Back im Setup gibt es nicht (Guess erzwingt 1 Spieler).

## 6. Deezer-Aufrufe (unverändert übernehmen)

Alle Aufrufe als **JSONP** an `https://api.deezer.com/<pfad>?output=jsonp&callback=dz<seq>x<zeit>&…`,
Zeitlimit 9 s. Schlägt ein Aufruf fehl, bevor je einer klappte, erscheint die Warnung „Songsuche gerade blockiert“.

| Zweck | Pfad | Parameter |
|---|---|---|
| Künstler suchen | `search/artist` | `q`, `limit` (1, 10, 12) |
| Top-Tracks | `artist/{id}/top` | `limit` 50 (Guess: max(6, to+1); Timeline: 12) |
| Alben (Jahre) | `artist/{id}/albums` | `limit` 200 |
| Track-Suche | `search` | `q`, `limit` (5, 8, 12, 15, 25, 50) |
| Verbindungstest beim Start | `search/artist` | `q=drake`, `limit=1` |

Künstlerbilder: `https://cdn-images.dzcdn.net/images/artist/<md5>/250x250-000000-80-0-0.jpg`
(groß: 500x500). Hörproben: Feld `preview` der Tracks (MP3, 30 s, CORS erlaubt).
**Spotify** und **YouTube** sind nur Links in deren Suche (Formeln in 2.6).

## 7. Gespeicherte Daten

Original: `localStorage` (bzw. `window.storage`, falls vorhanden), Herkunft
`v6fdb8msrw-dotcom.github.io` – **geteilt mit Muscle Studio**.

| Schlüssel (alt) | Inhalt |
|---|---|
| `soundclash.v5` | JSON: `players, names[6], avatar{1..6}, size, series, muted, ambience, theme, bg, genre, pool[], warnOff, songMode, sameArtist, custom[], audience, mode, roster` (Turnier-Kader oder null) |
| `soundclash.rivalry` | JSON: `{"a|b": {a, b, aw, bw, draws, last}}` |

Gespeichert wird nach fast jeder Änderung (Setup, Draft-Schritte, Theme, Hintergrund, Ton …).
Beim Laden wird geprüft: players 2–6, size ∈ {5,7,10,15}, series/songMode/mode gültig, bg/theme
bekannt (sonst mosaic/silksonic), genre vorhanden, custom max. 12 Strings; Turnier-Kader nur bei
passender Größe. Nicht gespeichert: Pick-Timer, Auto-Scroll, laufende Partie.

**Neu:** eigene Schlüssel mit Präfix `soundclash.app.` (siehe CLAUDE.md). Der neue Handy-Begleiter
(docs/HANDY-BEGLEITER.md) ändert keine Regel: Er löst nur dieselben Aktionen aus wie ein Tippen am Hauptgerät. Alte Werte werden beim
ersten Start übernommen, die alten Schlüssel bleiben unangetastet. Muscle-Studio-Schlüssel werden nie gelesen oder geändert.

## 8. Klänge und Effekte (Teil des Spielgefühls)

Erzeugt per Web Audio (stumm, wenn 🔇): Tick am Rad, Rauschen beim Drehen, „Chime“ beim Stopp,
Reveal-Klang, „Ding“ beim Setzen/Wählen/Sieg, Fanfare + Konfetti beim Rundensieg, Siegfanfare beim
Endstand, Stimmen-Klicks, Abstimmungs-„Ta-Da“. Während eine Hörprobe läuft, pulsiert die Album-Wand
(„Album-Wand-Puls“ an, nicht bei reduzierter Bewegung). Ein Vinyl-Knistern ist im Code vorhanden, wird aber nie gestartet.
Vibration (falls vorhanden) bei Reveal, Setzen, Stimmen, Timeline. Die Vorschau-Wiedergabe ist vom
Ton-Schalter unabhängig. Ohne Vorschau: Toast „Für diesen Song gibt's keine Vorschau — nutz Spotify oder YouTube.“

Hintergründe: Künstler-Mosaik, Plattenspieler, Mosaik + Plattenspieler, Aurora (Beat),
Aurora + Plattenspieler. Themes: Silk Sonic, Graduation, IGOR, SOS, Long. Live. A$AP, After Hours,
Blonde, Currents, Nectar, Warm Lime, Sky Mint, Emerald, Ultra Violet.

## 9. Korrekturen gegenüber dem Original (von Tim freigegeben, 12.10.2026)

Beim Umbau fielen Fehler im Original auf. Tim hat entschieden: Sie sollen **richtig** sein.
Die neue Fassung weicht deshalb genau an diesen Stellen ab. Die Tests vergleichen dort mit eigenen
Referenzen (`tests/golden/neu/`), alles andere weiter mit dem Original.

1. **Turnier-Topf:** Beim Turnierstart wird der Topf gemerkt. Jedes Match startet wieder mit diesem
   vollen Topf. Vorher war er nach dem ersten Match leer und das Rad stand.
2. **Turnier mit Best of 3/5:** „Nächste Runde“ spielt dieselbe Paarung direkt weiter
   (voller Turnier-Topf, Toast „Neue Runde — gleiche Paarung, voller Topf.“). Vorher ging es ins Setup,
   und „Match starten“ legte einen neuen Turnierbaum an.
3. **Punkte nach Sudden Death:** Rundenpunkte = reguläre Punkte + Sudden-Death-Punkt; „Von“ = N + Doppelplätze + 1.
   Das gilt für Duell-Kopf, Rundenbildschirm, Endstand, Teilen-Bild, Rivalität und den Sieger eines
   Turnier-Matches. Der Rückblick zeigt die ganze Runde plus die SD-Zeile. Wer die Runde gewinnt,
   entscheidet weiterhin das Sudden-Death-Duell.
4. **Sudden-Death-Platte:** In „Die Platten des Abends“ steht jetzt der SD-Künstler (vorher „true“).
   Das Teilen-Bild bricht nicht mehr ab.
5. **Pick-Timer und Auto-Scroll** werden gespeichert (`pickSec`, `autoScroll` in den Einstellungen).
6. **Spielanleitung** korrigiert: keine „Respins“, richtige Angaben zu Farbe und Hintergrund, 30 Kategorien,
   die *letzten* Plätze zählen doppelt, Sudden Death wie tatsächlich gespielt.
7. **Hinweistexte** sprechen nicht mehr von „Vorschau im Chat / Datei herunterladen“.
8. **Stimmengleichheit im Sudden Death:** Die Auswahlknöpfe zeigen nur noch die Spieler, die antreten.
9. **Kaderfarben** passen nach dem Laden zum gespeicherten Theme.
10. **Doppeltipp-Schutz:** Nach „… gewinnt →“ sind die Duellkarten während des Ausblendens (0,9 s)
    gesperrt, sodass ein Doppeltipp kein Duell überspringt.

## 10. Oberfläche (Tims Vorgaben, 12.10.2026)

- Es gibt nur noch **Sound Clash**. Die App startet direkt in der Sound-Clash-Einrichtung, das Logo
  führt dorthin zurück. **Guess the Song, Timeline Masters, Jahrzehnt-Duell und Sing it Back** sind
  ausgeblendet: Die Logik bleibt im Code (`src/core/game.ts`), die Bildschirme liegen ungenutzt in `src/screens/`.
- Die Startseite ist minimalistisch (Tims Vorgabe, 15.10.2026): oben „Wie wird gesteuert?“, dann
  **① Spieler** und **② Künstler-Topf** – beide immer sichtbar und immer selbst zu wählen. Die Regeln
  stehen als **eine Zeile** mit dem aktuellen Stand und klappen auf; ab Werk gilt der
  **Schnellstart-Standard** (5 Songs · Einzelrunde · Vor jedem Duell · Publikum stimmt ab). Geänderte Regeln
  werden wie im Original gespeichert; „↺ Auf Schnellstart-Standard zurücksetzen“ stellt sie zurück.
  Seltene Optionen unter „Mehr Optionen“. Farbe, Hintergrund, Bildschirm, Ton, Spielanleitung und
  Spielstand liegen im Menü oben rechts. Alle Funktionen sind erhalten.
- **Bildschirm: Laptop / Fernseher** (Menü): „Fernseher“ vergrößert die ganze Oberfläche, sodass sie wie
  ein Bild mit etwa 1280 × 760 Punkten wirkt – gut lesbar von der Couch. Gemerkt nur auf diesem Gerät
  (`soundclash.app.display`), nicht im Spielstand.
- **Überblendungen zwischen den Spielphasen:** Im normalen Modus gleitet eine Fläche in den Farben des
  gewählten Albums mit leuchtender Kante von links nach rechts durchs Bild, der Titel baut sich Wort
  für Wort auf: „Das Rad entscheidet“ / „Wer zieht wen?“ / „Neue Runde, neues Glück“ (Ziehen),
  „Song Battle 1, 2, 3 …“ (mit „doppelte Punkte“ und „Das letzte Battle“), bei „Vor jedem Duell“
  danach kurz „VS“, „Plattenkiste“ (alle Songs vorab), „Sudden Death“, „Abpfiff“ (Rundenende),
  „Die Krönung“ (Endstand), „Turnierbaum“. Im Handy-Modus bleiben die Kino-Blenden (§11), jetzt im
  dunklen Farbton des Albums. Rein optisch, keine Wartezeit.
- Das Glücksrad ist größer (bis 540 px) und hat einen metallischen Rand in der Album-Farbe, feine helle
  Trennlinien, eine Glas-Kuppel und einen neuen Zeiger.
- **Spielbildschirme ohne Scrollen** (Ziehen, Songwahl, Aufdecken, Duell – beide Modi): Das Spielfeld
  füllt die Bildschirmhöhe, die Felder enden unten bündig. Ist der Inhalt höher als der Bildschirm,
  wird er automatisch passend verkleinert (bis 60 %); Songlisten scrollen nur innerhalb ihres Kastens.
  Start, Rundenende, Endstand und Turnierbaum scrollen normal. Auf schmalen Bildschirmen (Handy
  hochkant, unter 900 px Breite) bleibt alles wie bisher scrollbar.
- **Ziehen am Mac (normaler Modus):** Spielfelder als längliche Felder #1 … #5 untereinander.
  2 Spieler: links und rechts vom Rad, beide groß. Ab 3 Spielern: wer am Zug ist, steht rechts groß;
  die anderen links – bei 3–4 Spielern als kompakte Felder, bei 5–6 als Mini-Leisten mit kleinen
  Kacheln (Künstlerfoto, Platznummer, Name). Rad-Feld und Spielfelder enden unten auf einer Linie.
  Gleicher Künstler für alle: gemeinsames Feld unter dem Rad wie bisher.
- Gestaltung: Die Platten sind echte Schallplatten (Rillen, Glanz, Cover als Etikett mit Mittelloch)
  und drehen ruhiger. Hintergründe: die fünf des Originals (Künstler-Mosaik wie vorher, Plattenspieler
  ohne hellen Sockel, Mosaik + Plattenspieler, Aurora, Aurora + Plattenspieler) plus neu
  **Mosaik (wandernd)**, **Bühne (Lichtkegel)** und **Neon-Horizont**. Die Album-Farbschemas bleiben.

## 11. Handy-Modus (Tims Vorgabe, 12.10.2026)

In der Einrichtung steht **„Wie wird gesteuert?“**: **„🖥 An diesem Gerät“** (alles wie bisher,
Abschnitte 2.1–2.9 unverändert) oder **„📱 Mit den Handys“**. Die Wahl wird mit den Einstellungen
gespeichert (`phoneMode`). Im Handy-Modus steuern die Spieler alles am eigenen Handy, das Hauptgerät
(z. B. MacBook) ist die große, „kinoartige“ Bühne und spielt die Musik. Punkte, Wertung, Sieger,
Sudden Death, Serie und Turnier bleiben genau wie im Original. Zwischen den Szenen gibt es kurze
Kino-Überblendungen (schwarze Blenden mit Titelkarte, z. B. „Runde 1“, „P2 ist dran“, „VS“).

1. **Koppeln:** In der Einrichtung erscheinen QR-Code, Spielcode, der Verbindungslink (kopieren/teilen)
   und pro Spieler „verbunden/wartet“. Zuschauer können jederzeit dazukommen, auch mitten in der Runde
   (kleiner QR-Code unten rechts).
2. **Ziehen:** gleiche Reihenfolge und Regeln wie in 2.3. Am Hauptgerät steht oben groß der Spieler am
   Zug mit seinem Spielfeld, darunter klein die Spielfelder der anderen. Wer dran ist, hat am Handy nur
   den Knopf zum Drehen; dann wird das Rad groß am Hauptgerät eingeblendet. Das Handy zeigt **kein Rad**
   (Tims Vorgabe), nur „… dreht – schau auf den großen Bildschirm“. Steht das Rad, erscheint der gezogene
   Künstler groß oben am Handy (bei allen); der Spieler setzt ihn am Handy.
   Ist sein Handy nicht verbunden, wird wie gewohnt am Hauptgerät gedreht und gesetzt.
3. **Songwahl „Vor jedem Duell“:** Alle Teilnehmer wählen **gleichzeitig** am Handy und tippen
   „Fertig“ (danach noch änderbar). Das Hauptgerät zeigt nur Kacheln „P1 wählt …“ / „✓ bereit“, keine
   Songs. Fallback: „am Hauptgerät wählen“ pro Spieler und „Nicht warten – mit den gewählten Songs weiter“.
   **„Alle vorab“:** Jeder wählt alle seine Songs am Handy und tippt „Fertig“.
4. **Aufdecken (neu):** Wenn alle gewählt haben („Alle haben gewählt“), ist Spieler für Spieler dran.
   Am Hauptgerät steht groß nur dieser Spieler mit Künstler und verdeckter Platte („Noch geheim“).
   Er drückt am Handy **Play**: Titel und Cover erscheinen, der Song läuft am Hauptgerät (30-Sek-Vorschau).
   Am Handy gibt es Pause/weiter abspielen und **„Weiter“**. Nach 30 Sekunden (oder wenn die Vorschau
   endet; ohne Vorschau nach 8 Sekunden) ist automatisch der Nächste dran.
   **Reihenfolge:** Sie rückt mit jedem Duell um eins weiter (Duell 1: P1, P2, P3 · Duell 2: P2, P3, P1 · …).
   Das Hin und Her (Schlange) gibt es im Handy-Modus nur noch beim Ziehen der Künstler.
5. **Versus:** Wenn alle aufgedeckt haben, kommt der Duell-Bildschirm (2.6) – aber nur mit den gewählten
   Songs (ohne „30 Sek“, Spotify und YouTube). **Erst jetzt wird abgestimmt**, am Handy. Unter jedem
   Song steht, wer per Handy dafür gestimmt hat (Spieler mit Bild und Name, Zuschauer als „🙋 n Publikum“,
   Stimmen vom Hauptgerät als „🖥 +n“). Abstimmung schließen, Sieger bestätigen, Stimmengleichheit,
   Sudden Death – alles wie gehabt.
   **Nicht für den eigenen Song (Tims Vorgabe):** Wer als Spieler gekoppelt ist, kann am Handy nicht für
   seinen eigenen Song stimmen – die Karte ist ausgegraut („dein Song“), das Hauptgerät nimmt eine solche
   Stimme auch nicht an. Gilt für jede Handy-Stimme (auch im klassischen Modus mit Handys); Zuschauer und
   „+1 Stimme“ am Hauptgerät sind nicht betroffen.
6. **Handy:** „Dein Line-up“ steht immer unten (Plätze, Künstler, Songs, „jetzt“). Beim Aufdecken sehen
   alle die Reihenfolge, was gerade läuft („läuft gerade“) und welche Songs noch geheim sind.
