# Wie das Fehlerprofil entsteht

Das Fehlerprofil ist das Herz von FehlerFix. Dieses Dokument erklärt genau,
woher die Zahlen kommen – vor allem die Prozentwerte.

## Die wichtigste Einsicht vorweg

**Die KI zählt. Der Code rechnet.**

| Wer | Macht was |
|---|---|
| **Claude (KI)** | Liefert Beobachtungen: „Kategorie X kam 6× vor, 4× davon falsch" |
| **Unser Code** | Berechnet daraus den Lernstand – deterministisch, nachvollziehbar |

Die KI vergibt **keine** Prozentwerte mehr. Sie macht das, was ein Sprachmodell
zuverlässig kann: Text lesen, Fehler erkennen, Kategorien zuordnen, zählen.
Die Bewertung übernimmt ein Modell in `lib/mastery.js`.

Warum das wichtig ist: Ein von der KI geschätzter Prozentwert ist eine Meinung –
bei gleichem Input mal 25%, mal 40%, ohne dass man es prüfen könnte. Gezählte
Vorkommen sind überprüfbare Fakten, und aus Fakten lässt sich reproduzierbar
rechnen. Dieselben Zahlen ergeben immer denselben Lernstand.

## Die Datenstruktur

Pro Schüler eine Liste („Feature-Table"), ein Eintrag je Fehler-Kategorie:

```js
{
  name:     "ie/i-Schreibung",
  mastery:  39,                        // 0–100, der Balken im Dashboard
  evidence: { correct: 2.4, total: 6 },// gewichtete Datengrundlage (intern)
  right:    2,                         // Historie: insgesamt richtig
  wrong:    4,                         // Historie: insgesamt falsch
  observations: 6,                     // Gelegenheiten insgesamt
  lastSeen: "2026-08-18"               // für die Vergessenskurve
}
```

`mastery` ist berechnet – niedrig heißt großer Übungsbedarf.
`evidence` ist der eigentliche Zustand, aus dem gerechnet wird.

Gespeichert in Supabase, `student_state.feature_table` (JSON).

---

## Das Rechenmodell (`lib/mastery.js`)

Der Lernstand ist eine **zeitgewichtete, rate-korrigierte Trefferquote**.
Fünf Bestandteile:

### 1. Rate-Korrektur

Nicht jeder Treffer ist gleich viel wert. Bei „Komma ja/nein" trifft man mit
Raten schon 50%, bei einem Diktatwort praktisch nie. Also wird der Rateanteil
herausgerechnet:

```
können = (Trefferquote − Ratechance) / (1 − Ratechance)
```

| Aufgabentyp | Ratechance |
|---|---|
| Audio-Diktat | 0,05 |
| Lückentext | 0,12 |
| Fehlertext | 0,18 |
| Zeichensetzung (überall) | 0,45 |

Konkret: 2 von 4 Komma-Entscheidungen richtig ist praktisch Zufall und ergibt
im Gleichgewicht ~14%. Dieselbe Quote im Diktat ergibt ~48%.

### 2. Zeitgewichtung

Bei jeder neuen Übung behält die alte Evidenz 80% ihres Gewichts
(`RECENCY = 0.8`). Aktuelles zählt mehr, Historie verschwindet aber nicht.

### 3. Glättung

Laplace-Glättung mit neutralem Vorwissen (Gewicht 3, Wert 0,5). Verhindert,
dass eine einzelne Beobachtung 0% oder 100% erzeugt.

```
mastery = (gewichteteTreffer + 1,5) / (gewichteteGelegenheiten + 3)
```

### 4. Schrittbegrenzung

Eine einzelne Übung darf den Wert höchstens **15 Punkte** bewegen – wie der
K-Faktor beim Elo-System. Ein Lernstand baut sich über mehrere Übungen auf.

### 5. Vergessen

Ohne Übung sinkt der Wert Richtung Boden (25%): erste Woche unverändert,
danach Halbwertszeit 45 Tage.

**Grenzen:** Der Wert bleibt immer zwischen 5% und 95% – intern, nicht nur in
der Anzeige. Bei 100% würde das Modell jeden Fehler als Ausrutscher abtun und
nicht mehr reagieren.

### Was dabei herauskommt

Wer dauerhaft eine bestimmte Quote trifft, landet ungefähr dort:

| Trefferquote | Lernstand im Gleichgewicht |
|---|---|
| 0 von 4 | 7% |
| 1 von 4 | 19% |
| 2 von 4 | 44% |
| 3 von 4 | 69% |
| 4 von 4 | 93% |

Nachprüfbar mit `npm test`.

---

## Phase 1 – Entstehung (`/api/analyze`)

Die Bilder gehen mit Kontext an Claude: Profil (Bundesland, Klasse, Schulform),
Curriculum und FRESCH-Methodik.

**Die KI zählt** pro Kategorie zwei Zahlen:

```json
{ "name": "ie/i-Schreibung", "occurrences": 6, "errors": 4 }
```

- `occurrences` – wie oft im Text die **Gelegenheit** bestand, die Regel
  anzuwenden (richtig *und* falsch)
- `errors` – wie viele davon falsch waren

Zusätzlich 1–2 lehrplanrelevante Kategorien, die fehlerfrei waren
(`errors: 0`) – sonst gäbe es nichts zu üben, wenn ein Kind kaum Fehler macht.

**Der Code rechnet** daraus (`initialFromCounts`) die geglättete Trefferquote:

| Beobachtung | Startwert |
|---|---|
| 6× vorgekommen, 4 Fehler | 39% |
| 6× vorgekommen, 2 Fehler | 61% |
| 6× vorgekommen, 0 Fehler | 83% |
| 3× vorgekommen, 3 Fehler | 25% |
| kam nicht vor | 60% (neutral) |

Danach aufsteigend sortiert – größte Schwäche oben.

---

## Phase 2 – Welche Übung kommt als nächste? (`/api/next-exercise`)

Reine Rechnung, keine KI:

```js
practice_weight = max(1, 100 − mastery)
```

mastery 39 → Gewicht 61 (dringend). mastery 93 → Gewicht 7.
Das `max(1, …)` sorgt dafür, dass kein Thema ganz verschwindet.

**Themenwahl:**

```js
if (Übungen < 3)                     → höchstes Gewicht
else if (letzte Übung war "poor")    → beim Thema bleiben und vertiefen
else                                 → höchstes Gewicht
```

Der Aufgaben**typ** rotiert fest: Lückentext → Fehlertext → Audio-Diktat.

---

## Phase 3 – Update nach der Übung (`/api/submit-exercise`)

Das Foto der Lösung geht an Claude, zusammen mit der erwarteten Lösung und der
aktuellen Feature-Table. **Die KI zählt wieder:**

```json
{
  "overall_score": 70,
  "results": [
    { "feature": "ie/i-Schreibung", "total": 4, "correct": 3 }
  ]
}
```

**Der Code verrechnet** (`applyGradingResults`):

1. Vergessen anrechnen (Tage seit `lastSeen`)
2. Ratechance aus Aufgabentyp + Kategorie bestimmen
3. Beobachtung durch das Modell schicken (`mastery.observe`)
4. `right` / `wrong` / `observations` als Historie fortschreiben
5. `lastSeen` aktualisieren

### Neue Schwächen

Die KI darf Kategorien vorschlagen, die noch nicht in der Tabelle stehen –
ebenfalls mit `total` und `correct`. `similarFeatureExists` verhindert
Duplikate („ie/i" vs. „ie/i-Schreibung").

### Wenn die KI ausfällt

Kein Grading (Netzfehler, kaputtes JSON) → `ratio = 0.5` für die Punkte, aber
**der Lernstand bleibt unverändert**. Lieber kein Update als ein falsches.

---

## Punkte, Level, Streak

```js
ratio  = overall_score / 100
points = round(ratio * 10)              // max. 10 pro Übung
level  = floor(gesamtpunkte / 100) + 1
performance = ratio >= 0.8 ? "good" : ratio >= 0.5 ? "medium" : "poor"
```

`performance` steuert Phase 2. Streak: `bumpStreak` in `lib/store.js`,
Tagesgrenze in Europa/Berlin.

---

## Beispiel: ein Durchlauf

**Onboarding.** Claude zählt: „ie/i" 6× vorgekommen, 4 Fehler; „ss/ß" 5×, 2 Fehler.

| Kategorie | mastery | Grundlage | Gewicht |
|---|---|---|---|
| ie/i-Schreibung | 39% | 2 von 6 | **61** |
| ss/ß | 56% | 3 von 5 | 44 |

**Übung 1** → höchstes Gewicht → „ie/i", Typ Lückentext (Ratechance 0,12).
Claude zählt: 4 Gelegenheiten, 3 richtig.

Modell: Quote 0,75 → rate-korrigiert 0,716 → neue Evidenz → **47%**
(Sprung auf +8 Punkte, unter der 15-Punkte-Grenze).

| Kategorie | mastery | Gewicht |
|---|---|---|
| ie/i-Schreibung | 47% | **53** |
| ss/ß | 56% | 44 |

Punkte: `round(0.75 × 10)` = **8**.
„ie/i" bleibt vorne – ab Übung 4 würde nach Gewicht gewechselt.

---

## Was das Modell nicht kann

1. **Es hängt an den Zählungen der KI.** Zählt Claude die Gelegenheiten
   falsch, rechnet das Modell sauber mit falschen Zahlen. Das ist aber ein
   deutlich kleineres und besser prüfbares Risiko als eine frei geschätzte
   Prozentzahl – Zählungen kann man im Log gegenlesen.

2. **Es braucht Daten.** Ein Wert aus 3 Gelegenheiten ist grob. Deshalb steht
   die Zahl der Gelegenheiten in beiden Ansichten mit dabei.

3. **Kalibrierung ist eine Entscheidung.** `RECENCY`, `MAX_STEP_PER_EXERCISE`,
   die Ratechancen und die Vergessenskurve sind gesetzte Werte. Sie stehen alle
   oben in `lib/mastery.js` – geändert wird dort, nicht im Prompt. `npm test`
   zeigt sofort, ob das Modell danach noch sinnvoll rechnet.

---

## Wo im Code was steht

| Was | Datei | Funktion |
|---|---|---|
| **Rechenmodell** | `lib/mastery.js` | `observe`, `initialFromCounts`, `applyDecay` |
| Prüfungen dazu | `test/mastery.test.js` | `npm test` |
| Profil-Entstehung | `server.js` | `detectFeaturesFromImages` |
| Update nach Übung | `server.js` | `applyGradingResults` |
| Neue Kategorien | `server.js` | `addNewFeatures`, `similarFeatureExists` |
| Nachträgliche Texte | `server.js` | `mergeDetectedFeatures` |
| Gewichtung | `server.js` | `weightedFeatures` |
| Themen-/Typwahl | `server.js` | Route `/api/next-exercise` |
| Laden/Speichern | `lib/store.js` | `loadStudentState`, `saveStudentState` |
| Curriculum-Kontext | `lib/curriculum.js` | `curriculumPromptBlock` |
| FRESCH-Methodik | `lib/methods/fresch.js` | `freschMethodPromptBlock` |
