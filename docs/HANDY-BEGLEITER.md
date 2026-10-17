# Handy-Begleiter

Gespielt wird lokal auf **einem** Hauptgerät, z. B. einem Laptop in der Mitte: Dort sieht man alles,
und dort laufen die Songs. Einen Multiplayer gibt es nicht und ist auch nicht geplant.
Auf Tims Wunsch können sich Mitspieler zusätzlich mit dem Handy per QR-Code an das Hauptgerät koppeln.
Das ist eine Fernbedienung, kein eigenes Spiel. Alles bleibt kostenlos: kein eigener Server, kein Konto,
keine gespeicherten Daten im Netz.

## Zwei Spielweisen

In der Einrichtung unter **„Wie wird gesteuert?“**:

- **🖥 An diesem Gerät:** alles wie bisher. Handys können trotzdem über das Handy-Symbol oben gekoppelt
  werden (Abstimmen, Line-up, selbst drehen/setzen/wählen, wenn man dran ist).
- **📱 Mit den Handys (Handy-Modus):** Die Spieler steuern alles am Handy, das Hauptgerät ist die große
  Bühne. QR-Code, Verbindungslink und „verbunden/wartet“ pro Spieler stehen direkt in der Einrichtung.
  Ablauf: drehen am Handy (Rad nur groß am Hauptgerät, danach Künstler groß am Handy) → setzen am Handy → alle wählen
  ihren Song **gleichzeitig** und tippen „Fertig“ → **Spieler für Spieler aufdecken**: Play am Handy,
  der Song läuft am Hauptgerät (30 Sek, „Weiter“ geht früher; Reihenfolge rückt pro Duell um eins
  weiter) → **Versus**: jetzt am Handy abstimmen, am Hauptgerät sieht man, wer wofür gestimmt hat.
  Zwischen den Szenen dieselbe Wisch-Überblendung wie im normalen Modus. Details in `docs/MECHANIK.md` §11.

## Was der Handy-Begleiter kann

Am Hauptgerät oben **„📱 Handys“** (oder im Handy-Modus direkt in der Einrichtung) → QR-Code und
Spielcode (5 Zeichen). Handy-Kamera scannen → das Handy öffnet `…/SoundClashBeta/?join=CODE` und fragt
„Wer bist du?“ (Spieler P1–P6 oder Publikum). Zuschauer können jederzeit dazukommen – während einer
Runde zeigt das Hauptgerät dafür unten rechts einen kleinen QR-Code „Mit abstimmen“.

- **Abstimmen:** Im Duell („Publikum stimmt ab“) tippt jeder am eigenen Handy den besseren Song an.
  Jede Karte zeigt deutlich, **wer** den Song gewählt hat (Avatar, Name, „hat gewählt“), dazu Cover,
  Titel, Künstler und wer schon dafür gestimmt hat. Im Handy-Modus geht das erst im Versus-Screen.
  Eine Stimme pro Handy und Duell, Wechsel jederzeit möglich. Für den eigenen Song kann ein Spieler
  nicht stimmen (Karte ausgegraut, „dein Song“). Am Hauptgerät zählt das genau wie
  „+1 Stimme“ (bzw. „−“ beim Wechsel). Abstimmung schließen und Sieger bestätigen bleibt am Hauptgerät.
- **Eigenes Line-up:** Plätze, gezogene Künstler, gewählte Songs, ×2-Plätze und „jetzt“ – steht
  immer unten auf dem Handy.
- **Selbst spielen, wenn man dran ist:** Rad drehen, den gezogenen Künstler blind auf einen Platz
  setzen, den eigenen Song wählen (Top-Tracks, Suche, „von Hand“), Hörprobe leise am eigenen Handy,
  bestätigen oder überspringen. Bei „Alle vorab“ wählt man alle eigenen Songs am Handy.
- Am Hauptgerät funktioniert weiterhin alles wie vorher. Wer kein Handy koppelt, merkt keinen Unterschied.

**Regeln unverändert:** Das Handy schickt nur Wünsche. Das Hauptgerät prüft, ob der Spieler gerade dran
ist, und führt dann exakt die Aktion aus, die auch ein Tippen am Hauptgerät auslöst (`spin`, `place`,
`pickSong`, `manualSong`, `pickNext`, `bump`; im Handy-Modus zusätzlich `phoneReady` für „Fertig“,
`listenPlay` für Play/Pause beim Aufdecken und `listenNext` für „Weiter“).
Siehe `src/remote/host.ts`.

## Technik

```
 Handy (P1)               Hauptgerät (Laptop)                Handy (Publikum)
 Ansicht + Wünsche  ◀───▶  Spiel, Musik, reduce()   ◀───▶   Ansicht + Stimme
                  WebRTC-Datenkanal, Ende-zu-Ende verschlüsselt
```

- **Trystero** (`trystero`, MIT): WebRTC direkt zwischen den Geräten. Für den Verbindungsaufbau dienen
  kostenlose öffentliche **Nostr-Relays**. Dort laufen nur kurze, verschlüsselte Verbindungsangebote,
  keine Spieldaten. Raum `room-<CODE>`, Passwort aus dem Code, App-Kennung `sound-clash-begleiter-v1`.
- **Hauptgerät** (`src/remote/host.ts`): sendet bei jeder Änderung eine schlanke Ansicht (`buildView`
  in `src/remote/protocol.ts`), Avatare nur bei Änderung; merkt sich die Stimme jedes Handys pro Duell.
  Die Kopplung übersteht ein Neuladen (Code in `sessionStorage`).
- **Handy** (`src/remote/client.ts`, `src/remote/RemoteApp.tsx`): eigene, leichte Seite; lädt
  Top-Tracks selbst bei Deezer (wie das Hauptgerät), speichert nur die gewählte Rolle (`sessionStorage`).
- **QR-Code** lokal erzeugt (`qrcode`, MIT), kein externer Dienst.
- **Grenzen:** Am zuverlässigsten im selben WLAN. In seltenen Netzen (z. B. strenge Firmen-WLANs
  oder manche Mobilfunk-NATs) klappt eine direkte WebRTC-Verbindung nicht. Dann hilft ein kostenloser
  TURN-Dienst (Trystero `turnConfig`), der aber ein Konto braucht. Deshalb ist er nicht eingebaut.
- **Tests:** `tests/begleiter.spec.ts` koppelt Hauptgerät und zwei Handys über die echten Relays,
  dreht und setzt vom Handy, wählt einen Song und stimmt ab (inkl. Stimme ändern).
  `tests/handymodus.spec.ts` spielt den Handy-Modus: zwei Spieler-Handys drehen und setzen alles,
  ein Zuschauer kommt mitten in der Runde dazu, beide wählen gleichzeitig und tippen „Fertig“, jeder
  deckt per Play am Handy auf (inkl. Pause, weiter abspielen, „Weiter“), Abstimmen ist erst im Versus
  möglich, und das Hauptgerät zeigt, wer wofür gestimmt hat.
- **Ton am iPhone:** Musik spielt nur das Hauptgerät. Die Hörprobe am Handy ist nur zum Reinhören
  beim Aussuchen. Damit Safari am Hauptgerät abspielen darf, wird der Ton beim ersten Tippen entsperrt.
