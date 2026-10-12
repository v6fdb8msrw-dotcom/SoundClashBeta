# Handy-Begleiter

Gespielt wird lokal auf **einem** Hauptgerät, z. B. einem Laptop in der Mitte: Dort sieht man alles,
und dort laufen die Songs. Einen Multiplayer gibt es nicht und ist auch nicht geplant.
Auf Tims Wunsch können sich Mitspieler zusätzlich mit dem Handy per QR-Code an das Hauptgerät koppeln.
Das ist eine Fernbedienung, kein eigenes Spiel. Alles bleibt kostenlos: kein eigener Server, kein Konto,
keine gespeicherten Daten im Netz.

## Was der Handy-Begleiter kann

Am Hauptgerät oben **„📱 Handys“** → QR-Code und Spielcode (5 Zeichen). Handy-Kamera scannen → das
Handy öffnet `…/SoundClashBeta/?join=CODE` und fragt „Wer bist du?“ (Spieler P1–P6 oder Publikum).

- **Abstimmen:** Im Duell („Publikum stimmt ab“) tippt jeder am eigenen Handy den besseren Song an.
  Eine Stimme pro Handy und Duell, Wechsel jederzeit möglich. Am Hauptgerät zählt das genau wie
  „+1 Stimme“ (bzw. „−“ beim Wechsel). Abstimmung schließen und Sieger bestätigen bleibt am Hauptgerät.
- **Eigenes Line-up:** Plätze, gezogene Künstler, gewählte Songs, ×2-Plätze und „als Nächstes“.
- **Selbst spielen, wenn man dran ist:** Rad drehen, den gezogenen Künstler blind auf einen Platz
  setzen, den eigenen Song wählen (Top-Tracks, Suche, „von Hand“), Hörprobe leise am eigenen Handy,
  bestätigen oder überspringen. Bei „Alle vorab“ wählt man alle eigenen Songs am Handy.
- Am Hauptgerät funktioniert weiterhin alles wie vorher. Wer kein Handy koppelt, merkt keinen Unterschied.

**Regeln unverändert:** Das Handy schickt nur Wünsche. Das Hauptgerät prüft, ob der Spieler gerade dran
ist, und führt dann exakt die Aktion aus, die auch ein Tippen am Hauptgerät auslöst (`spin`, `place`,
`pickSong`, `manualSong`, `pickNext`, `bump`). Siehe `src/remote/host.ts`.

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
- **Test:** `tests/begleiter.spec.ts` koppelt Hauptgerät und zwei Handys über die echten Relays,
  dreht und setzt vom Handy, wählt einen Song und stimmt ab (inkl. Stimme ändern).
