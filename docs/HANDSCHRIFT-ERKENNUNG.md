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

## Hebel 3 (nicht umgesetzt – eigene Entscheidung nötig): Stroke-Daten statt Bild

Das ist der eigentlich große Hebel, und er verändert die Architektur:
**FehlerFix zeichnet die Handschrift bereits als Stift-Striche auf dem
Canvas** (Punkt für Punkt, mit Bézier-Glättung fürs Aussehen) – aber diese
Rohdaten werden aktuell verworfen. Am Ende wird nur ein flaches JPEG-Bild
an Claude geschickt, und Claude erkennt Buchstaben wie bei einem Foto von
Papier: aus Pixeln, ohne zu wissen, in welcher Reihenfolge und mit welcher
Bewegung die Striche entstanden sind.

**Online-Handwriting-Recognition** (Erkennung direkt aus den Stift-Koordinaten
über die Zeit, nicht aus dem fertigen Bild) ist in der Forschung und in der
Praxis deutlich zuverlässiger als Bild-OCR – genau deshalb funktioniert z.B.
handschriftliche Texteingabe auf dem iPad/in Gboard so gut: die Engines
sehen die Schreibbewegung, nicht nur das Ergebnis.

Zwei konkrete, einsetzbare Optionen:

| Option | Kosten | Eignung |
|---|---|---|
| **Google ML Kit – Digital Ink Recognition** | Kostenlos, offline, unterstützt Deutsch | Native Capacitor-Plugin-Integration nötig (iOS + Android). Kein Cloud-Aufruf, läuft auf dem Gerät. |
| **MyScript (iink SDK)** | Kommerziell (Lizenzkosten), aber die Referenz für Handschrift-Erkennung, auch bei Kinderschrift | Ebenfalls native Integration; für den App-Store-Launch ggf. die höhere Genauigkeit wert |

Beide brauchen: die rohen Stroke-Punkte (x, y, Zeitstempel – die entstehen
sowieso schon beim Zeichnen in `createCanvasEngine`, siehe
[public/app.js](../public/app.js)) statt/zusätzlich zum flachen Bild, plus ein
natives Plugin für Capacitor. Das ist ein eigenständiges Stück Arbeit mit
einer echten Kosten-/Aufwandsentscheidung (kostenlos + Aufwand vs. bezahlt +
vermutlich beste Genauigkeit) – deshalb hier nur dokumentiert, nicht
stillschweigend gebaut.

**Realistischer Zwischenschritt ohne native SDKs:** die Stroke-Daten (Punkte,
Geschwindigkeit, Stift-Auf/Ab) zusätzlich zum Bild mitschicken und Claude im
Prompt beschreiben – bringt einen Teil des Signals (z.B. "wurde in einem Zug
geschrieben" hilft bei zusammengeschriebenen Buchstaben), aber nicht die
Zuverlässigkeit einer echten Ink-Recognition-Engine, die dafür trainiert ist.

## Wo das für die Wortauswahl schon eingebaut ist

Die Bewertungs-Prompts (`/api/submit-exercise`, `/api/card/check`) und die
Antwortstruktur inklusive `unsure_words` sind fertig. `applyGradingResults`
und `wordRegister` verarbeiten weiterhin nur `results` / `word_corrections`
/ `register_correct` – unsichere Wörter erscheinen dort gar nicht, es war
also keine Änderung an [lib/mastery.js](../lib/mastery.js) oder
[lib/wordregister.js](../lib/wordregister.js) nötig, um sie fernzuhalten.
