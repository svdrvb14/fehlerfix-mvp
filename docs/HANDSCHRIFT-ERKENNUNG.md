# Handschrift-Erkennung: was heute verbessert wurde, und der ehrliche Rest

Ausgangslage: Claude liest die Kinder-Handschrift aktuell zu ~70–80% korrekt.
Für ein Fehlerprofil, dem man vertrauen soll, ist eine Fehlerkennung direkt
ein Fehler im System – ein falsch gelesenes Wort erzeugt einen Fehler, den
das Kind nie gemacht hat.

## Die ehrliche Einordnung zuerst

Es gibt kein GitHub-Repo oder Plugin, das Handschrift-OCR bei Kindern auf
99,99% bringt – das ist in der Forschung bis heute ein ungelöstes, hartes
Problem (auch Menschen lesen krakelige Kinderschrift nicht immer richtig).
Was es gibt, sind drei echte Hebel, von denen zwei heute umgesetzt wurden
und einer eine bewusste Architekturentscheidung ist, die noch ansteht.

## Hebel 1 (umgesetzt): Verankertes Lesen statt freies Raten

FehlerFix kennt bei fast jeder Übung die erwartete Lösung bereits (Cloze-
Text, Fehlertext, Diktat, Karten – überall gibt es ein `correctText`). Der
Prompt in `/api/submit-exercise` und `/api/card/check` nutzt das jetzt
expliziter: **Wort für Wort gegen die erwartete Lösung lesen**, nicht frei
transkribieren und danach vergleichen. Das ist der gleiche Unterschied wie
zwischen "lies diesen Wisch" und "steht hier 'Tier' oder 'Tor'?" – die
zweite Frage ist für ein Vision-Modell deutlich zuverlässiger zu beantworten.

## Hebel 2 (umgesetzt): Ehrliche Unsicherheit statt stiller Fehlentscheidung

Bisher musste die KI jedes Wort als richtig oder falsch einordnen – auch
wenn ein Buchstabe wirklich nicht eindeutig war. Das erzeugt Fehler im
Fehlerprofil, die keine sind. Jetzt gibt es ein drittes Ergebnis:

- Response-Feld `unsure_words`: Wörter, die die KI nicht sicher entziffern
  konnte, werden weder als richtig noch als falsch gezählt – sie fließen
  NICHT in die Feature-Table und NICHT in die Wortliste ein
  ([lib/mastery.js](../lib/mastery.js) bekommt sie also gar nicht erst zu Gesicht).
- Das Kind/die Lehrkraft sieht einen kurzen, unaufdringlichen Hinweis dazu
  (`👀 Bei einem Wort war die Schrift nicht eindeutig lesbar – nicht gewertet`)
  statt dass eine Rate-Entscheidung als Tatsache präsentiert wird.

Das macht die Roherkennung nicht genauer – aber es verhindert, dass eine
unsichere Lesung als falscher Fehler ins Lernmodell einsickert. Für die
Vertrauenswürdigkeit des Fehlerprofils ist das wichtiger als ein paar
Prozentpunkte mehr Rohgenauigkeit.

## Hebel 2b (umgesetzt): Bildqualität – ein sauberer statt zwei kaputte Durchgänge

Bisher lief jedes Bild durch **zwei** verlustbehaftete JPEG-Kompressionen:
einmal beim Export aus dem Canvas (`toJpeg`), dann nochmal beim
Verkleinern vor dem Versand (`downscaleImage`). Zwei JPEG-Durchgänge
nacheinander verwaschen gerade dünne Stift-Striche zusätzlich – genau das,
worauf es bei Handschrift ankommt.

Jetzt macht `toJpeg()` Skalierung und Kodierung in einem Schritt, direkt in
Zielgröße:
- Einzelbilder, die bewertet werden (Übung abgeben, Flashcard prüfen):
  1500px lange Kante, Qualität 0,92 – vorher zwei Durchgänge à 0,85 dann 0,8.
- Die drei Eingangstexte fürs Fehlerprofil (mehrere Bilder auf einmal,
  bewusst kleiner gehalten für stabile Übertragung im WLAN/Hotspot beim
  Wettbewerb): 1000px, Qualität 0,85 – ein Durchgang statt vorher zwei.

Siehe [public/app.js](../public/app.js), Funktionen `toJpeg` und `downscaleImage`.

## Hebel 3 (umgesetzt, Frontend/Backend fertig – natives Setup steht noch aus): Stroke-Daten statt Bild

Das ist der eigentlich große Hebel: **FehlerFix zeichnet die Handschrift
bereits als Stift-Striche auf dem Canvas** (Punkt für Punkt, mit
Bézier-Glättung fürs Aussehen) – bisher wurden diese Rohdaten verworfen und
nur ein flaches JPEG-Bild verschickt. Claude erkannte Buchstaben also wie bei
einem Foto von Papier: aus Pixeln, ohne zu wissen, in welcher Reihenfolge und
mit welcher Bewegung die Striche entstanden sind.

**Online-Handwriting-Recognition** (Erkennung direkt aus den Stift-Koordinaten
über die Zeit) ist deutlich zuverlässiger als Bild-OCR – genau deshalb
funktioniert handschriftliche Texteingabe auf dem iPad/in Gboard so gut: die
Engines sehen die Schreibbewegung, nicht nur das Ergebnis.

Entscheidung: **Google ML Kit – Digital Ink Recognition**
(`@capacitor-mlkit/digital-ink-recognition`, offizielles, gepflegtes Plugin
von [capawesome-team](https://github.com/capawesome-team/capacitor-mlkit)).
Kostenlos, läuft komplett auf dem Gerät (kein Cloud-Aufruf), unterstützt
Deutsch (`de`). MyScript (kommerziell) wäre vermutlich die noch höhere
Genauigkeit, aber mit Lizenzkosten – bei Bedarf später nachrüstbar, das
Plugin-Interface ist dafür ausgetauscht.

### Wie es eingebaut ist

**Hybrid, nicht Ersatz:** ML Kit liest die Stift-Bewegung und liefert bis zu
drei Kandidaten-Texte. Diese Kandidaten werden dem bestehenden
Claude-Bewertungs-Prompt als zusätzlicher Hinweis mitgegeben – Claude macht
weiterhin den semantischen Abgleich, die FRESCH-Erklärung und die
Zählungen fürs Fehlerprofil, hat aber jetzt einen unabhängigen, sehr
zuverlässigen Lese-Hinweis zur Hand statt nur der Pixel.

```
Canvas-Engine (public/app.js, createCanvasEngine)
  └─ inkStrokes: jeder Messpunkt mit Zeitstempel, GETRENNT von den
     geglätteten Zeichen-Punkten. Radiergummi/Rückgängig → inkValid=false
     (Zuordnung zum Bild dann nicht mehr sicher, fällt sauber auf
     Bild-Erkennung zurück, kein Fehlerfall).
  └─ engine.getInk() → { strokes, writingArea } oder null

recognizeInk() (public/app.js)
  └─ nur nativ aktiv (window.FF_IS_NATIVE), sonst/immer sicher [] zurück
  └─ ensureInkModel() lädt das deutsche Modell einmalig beim App-Start
  └─ Zugriff über window.Capacitor.Plugins.DigitalInkRecognition – wie beim
     Camera-Plugin kein <script>-Import nötig, Capacitor registriert
     installierte native Plugins automatisch

/api/submit-exercise, /api/card/check (server.js)
  └─ optionales Feld inkCandidates im Request
  └─ inkCandidatesBlock() hängt die Kandidaten als Hinweis an den
     Grading-Prompt – fehlt das Feld (Web, Modell noch nicht geladen),
     verhält sich alles exakt wie vorher
```

### Was noch fehlt: die native Einrichtung

Das Plugin ist installiert (`@capacitor-mlkit/digital-ink-recognition` in
`package.json`), aber `ios/` und `android/` existieren in diesem Arbeits-
verzeichnis noch nicht (siehe [MOBILE.md](MOBILE.md)). Sobald sie angelegt
sind, braucht es EINMALIG:

**iOS** – `ios/App/Podfile`, Deployment-Target auf mindestens 15.5 setzen:
```
platform :ios, '15.5'
```
Danach `npx cap sync` (installiert den CocoaPod).

**Android** – keine Pflicht-Einstellung; optional in
`android/variables.gradle` eine andere ML-Kit-Version erzwingen
(`mlkitDigitalInkRecognitionVersion`, Default 19.0.0).

Danach: `npm run mobile:build` (oder `mobile:sync`), auf einem Gerät/
Simulator starten, einmal etwas schreiben und prüfen (Konsole zeigt
`[ink] Deutsches Stift-Erkennungsmodell bereit.`, sonst eine Warnung mit
Grund). Ab dann läuft die Stift-Erkennung automatisch mit – ohne, dass sich
am bisherigen Ablauf sonst etwas ändert.

## Wo das für die Wortauswahl schon eingebaut ist

Die Bewertungs-Prompts (`/api/submit-exercise`, `/api/card/check`) und die
Antwortstruktur inklusive `unsure_words` sind fertig. `applyGradingResults`
und `wordRegister` verarbeiten weiterhin nur `results` / `word_corrections`
/ `register_correct` – unsichere Wörter erscheinen dort gar nicht, es war
also keine Änderung an [lib/mastery.js](../lib/mastery.js) oder
[lib/wordregister.js](../lib/wordregister.js) nötig, um sie fernzuhalten.
