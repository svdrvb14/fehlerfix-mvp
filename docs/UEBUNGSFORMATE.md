# Übungsformate & Wortliste

Zwei Dinge werden hier beschrieben:

1. **Die 12 Übungsformate** – was sie trainieren, wie sie ausgewählt werden und
   warum jedes eine eigene Ratechance hat.
2. **Die Wortliste** – die Merkwörter im Hintergrund des Fehlerprofils. Sie
   entsteht ausschließlich aus echten, wiederholten Fehlern. Es wird nichts
   erfunden.

Alles Wichtige steht in `lib/exercises.js` und `lib/wordregister.js`.

---

## 1. Die Formate

Jedes Format wird handschriftlich beantwortet. Es gibt kein Multiple Choice und
keine Tastatureingabe – FehlerFix ist eine motorisch fördernde App.

| ID | Name | Antwort | Ratechance | Passt zu |
|---|---|---|---|---|
| `cloze_text` | Lückentext | Canvas | 0,12 | immer |
| `error_text` | Fehlertext | Canvas | 0,18 | immer |
| `audio_dictation` | Audio-Diktat | Canvas | 0,05 | immer |
| `flashcards` | Wortkarten | Karten-Canvas | 0,05 | immer |
| `find_own_errors` | Eigene Fehler finden | Canvas | 0,15 | immer |
| `find_and_copy` | Wörter finden | Canvas | 0,10 | immer |
| `secret_code` | Geheimschrift | Canvas | 0,05 | immer |
| `word_pyramid` | Wortpyramide | Canvas | 0,08 | Silben, Auslaut |
| `lengthen_word` | Verlängern | Canvas | 0,10 | Auslautverhärtung |
| `word_family` | Wortfamilie | Canvas | 0,08 | Ableiten (ä/äu) |
| `sort_words` | Sortieren | Canvas | 0,45 | binäre Entscheidungen |
| `sentence_from_words` | Satz bauen | Canvas | 0,08 | immer |

### Was die einzelnen Formate trainieren

**Lückentext** – Ein zusammenhängender Text mit mehreren Lücken. Der Schüler
schreibt den ganzen Text ab und füllt dabei die Lücken. Trainiert das Zielmuster
im Satzzusammenhang.

**Fehlertext** – Ein Text mit eingebauten Fehlern. Der Schüler schreibt ihn
korrigiert ab. Trainiert das Erkennen, nicht nur das Produzieren.

**Audio-Diktat** – Vorgelesener Text, abspielbar in 0,5×/0,75×/1×, mit Timeline
zum Zurückspulen. Das schwerste Format – deshalb die niedrigste Ratechance.

**Wortkarten** – Das TikTok-artige Format: eine Karte pro Bildschirm, Hinweis
oben, Satz mit Lücke, darunter die Schreibfläche. Nach „Überprüfen" kommt sofort
die Rückmeldung mit der FRESCH-Strategie; danach wischt man zur nächsten Karte.
Kurze Einheiten, schnelle Wiederholung – gut für die Wörter aus der Wortliste.

**Eigene Fehler finden** – Der Text enthält genau die Fehler, die dieser Schüler
selbst schon gemacht hat (aus der Wortliste). Trainiert Selbstkontrolle.

**Wörter finden** – Aus einem Text alle Wörter mit dem Zielmuster heraussuchen
und abschreiben. Trainiert gezieltes Suchen.

**Geheimschrift** – Ein Satz ist verschlüsselt (z. B. rückwärts oder mit
verschobenen Buchstaben). Entschlüsseln und richtig abschreiben. Macht Spaß und
erzwingt buchstabengenaues Lesen.

**Wortpyramide** – Ein Wort wird Silbe für Silbe aufgebaut, jede Zeile eine
Silbe mehr. Direkt am FRESCH-Schwingen.

**Verlängern** – Zu jedem Wort die verlängerte Form schreiben (Hund → Hunde), um
den Auslaut hörbar zu machen. FRESCH-Verlängern.

**Wortfamilie** – Zum Wort das Verwandte finden (Bäume → Baum). FRESCH-Ableiten.

**Sortieren** – Wörter in zwei Gruppen einteilen und in zwei Spalten schreiben.
Nur bei binären Entscheidungen (das/dass, ss/ß, …). Weil zwei Gruppen faktisch
ein Münzwurf sind, liegt die Ratechance mit 0,45 sehr hoch – das Modell rechnet
Treffer hier stark ab.

**Satz bauen** – Aus vorgegebenen Wörtern einen richtigen Satz bilden.
Trainiert Groß-/Kleinschreibung und Zeichensetzung nebenbei.

### Wie ausgewählt wird

`pickType(featureName, recentIds)` in `lib/exercises.js`:

1. **Filtern.** Nur Formate, deren `suits(featureName)` zutrifft. „Verlängern"
   erscheint nie bei Groß-/Kleinschreibung.
2. **Abwechseln.** Aus den passenden Formaten wird das am längsten nicht
   genutzte gewählt (`state.recentTypes`, die letzten 8).

Damit kann kein Format zweimal hintereinander kommen, solange es Alternativen
gibt – und es kommt trotzdem nie ein Format, das zum Thema nicht passt.

### Warum jedes Format eine eigene Ratechance hat

Die Ratechance geht direkt in das Messmodell ein (`lib/mastery.js`,
`correctForGuessing`). 8 von 10 richtig sind beim Diktat (Rate 0,05) deutlich
mehr wert als 8 von 10 beim Sortieren (Rate 0,45), wo man auch durch Raten auf
etwa die Hälfte kommt. Ohne diese Korrektur würden leichte Formate das
Fehlerprofil künstlich nach oben ziehen.

---

## 2. Die Wortliste

Die Wortliste (`state.wordRegister`) ist die zweite Erinnerung neben der
Feature-Table: nicht *welches Muster* schwach ist, sondern *welche konkreten
Wörter* dieser Schüler wiederholt falsch schreibt.

### Regeln

| Regel | Wert | Bedeutung |
|---|---|---|
| `MIN_WRONG_TO_LIST` | 2 | Ein einzelner Fehler landet nicht auf der Liste – erst der zweite. |
| `CORRECT_STREAK_TO_CLEAR` | 3 | Nach 3 richtigen Schreibungen in Folge fällt das Wort wieder heraus. |
| `MAX_ENTRIES` | 60 | Die Liste bleibt begrenzt; die ältesten erledigten Einträge gehen zuerst. |

### Was gespeichert wird

Pro Wort: die **richtige Schreibweise**, die **tatsächlichen Fehlschreibungen**
des Schülers, wie oft falsch, wie oft danach richtig, und wann zuletzt.

### Wo sie herkommt

Ausschließlich aus `word_corrections` der Korrektur – also aus Wörtern, die der
Schüler wirklich geschrieben hat. `recordMistakes()` nimmt nur auf, was in einer
Übung tatsächlich falsch war; `recordCorrect()` zählt hoch, was richtig war.
Es gibt keinen Weg, auf dem ein Wort ohne echten Fehler auf die Liste kommt –
`test/exercises.test.js` prüft das („erfindet keine Wörter").

### Wofür sie benutzt wird

- **Wortkarten** und **Eigene Fehler finden** ziehen ihre Wörter von hier.
- Der Übungs-Prompt bekommt die aktiven Wörter über `wordsForPrompt()` mit, damit
  Claude sie einbauen kann.
- Die Lehrkraft sieht sie im Schülerdetail (`getStudentDetail`).

---

## Wo im Code was steht

| Was | Datei | Funktion |
|---|---|---|
| Format-Register | `lib/exercises.js` | `TYPES`, `pickType`, `guessRateFor` |
| Wortliste | `lib/wordregister.js` | `recordMistakes`, `recordCorrect`, `activeWords`, `wordsForPrompt` |
| Prüfungen | `test/exercises.test.js` | `npm test` |
| Typwahl in der Route | `server.js` | `/api/next-exercise` |
| Karten-Prüfung | `server.js` | `/api/card/check` |
| Karten-UI | `public/app.js` | `renderCardsExercise`, `showCardFeedback` |
| Speicherung | `lib/store.js` | `word_register`, `recent_types` |
| Migration | `supabase/migrations/0003_word_register.sql` | – |
