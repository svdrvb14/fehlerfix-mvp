# FehlerFix als native App (App Store / Google Play)

Die App läuft als **eine Codebasis in drei Umgebungen**: Web-Browser, iOS-App,
Android-App. Die Oberfläche ist dieselbe – nur verpackt wird sie unterschiedlich.

```
public/            ← die App (HTML/CSS/JS). Wird im Web ausgeliefert
                     UND ins native App-Bundle kopiert.
server.js + lib/   ← Backend (bleibt immer im Netz, auf Render)
capacitor.config.json ← Konfiguration der nativen Hülle
```

## Warum das funktioniert

Capacitor legt die Dateien aus `public/` als lokale Web-Oberfläche in eine
native App und stellt Brücken zu Kamera, Dateien, Statusleiste usw. bereit.
Für die Stores ist das eine normale native App.

## Die drei Dinge, die nativ anders sind

| Thema | Web | Nativ | Gelöst durch |
|---|---|---|---|
| Wo liegt die API? | gleiche Herkunft (`/api/…`) | Oberfläche lokal, API im Netz | `public/config.js` → `apiBase` |
| Anmeldung | httpOnly-Cookie | Cookies in WebViews unzuverlässig | zusätzlich **Bearer-Token** |
| Fremde Herkunft | – | Browser blockt ohne CORS | CORS-Middleware in `server.js` |

Der Server akzeptiert **beides**: Cookie (Web) und `Authorization: Bearer …`
(nativ). Das Token kommt bei Login/Registrierung im Antwort-Body mit und wird
lokal gespeichert.

## Einmalige Einrichtung

Voraussetzungen: **Xcode** (für iOS, nur auf macOS) bzw. **Android Studio**.

```bash
npm install
npm run mobile:add:ios       # legt ios/ an
npm run mobile:add:android   # legt android/ an
```

## Bei jeder Änderung an der App

```bash
npm run mobile:build   # setzt die Backend-URL + kopiert public/ in die Projekte
npm run mobile:open:ios       # öffnet Xcode
npm run mobile:open:android   # öffnet Android Studio
```

`mobile:build` trägt `https://fehlerfix.onrender.com` als Backend ein. Für ein
anderes Backend:

```bash
npm run mobile:api -- https://mein-backend.example.com
npm run mobile:sync
```

Zurück in den Web-Modus (relative Pfade):

```bash
npm run mobile:api -- ""
```

> **Wichtig:** `public/config.js` nach einem nativen Build nicht mit gesetzter
> URL ins Web deployen – sonst ruft die Web-Version die API über Umwege auf.
> Der Web-Wert ist immer der leere String.

## Was vor dem Store-Launch noch fehlt

- [ ] Apple Developer Account (99 $/Jahr), Google Play Developer (25 $ einmalig)
- [ ] App-Icons und Startbildschirm in allen Größen (`@capacitor/assets`)
- [ ] Datenschutzerklärung (Pflicht in beiden Stores, besonders bei Minderjährigen)
- [ ] Apple: Angaben zur Datennutzung („App Privacy"), Altersfreigabe
- [ ] Google Play: Data Safety Formular, Angaben zu Kindern („Families Policy")
- [ ] Test über TestFlight bzw. Play Internal Testing
- [ ] AVV mit Anthropic, Supabase und Render (Auftragsverarbeitung)

## Hinweis zu Kinder-Apps

Beide Stores prüfen Apps für Kinder strenger (Apple: „Kids Category",
Google: „Families Policy"). Relevant für uns:
Keine Werbung, keine Tracking-SDKs, Datensparsamkeit (Klassencode-Login ohne
E-Mail ist hier ein Vorteil), klare Datenschutzerklärung.
