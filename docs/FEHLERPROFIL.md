# Wie das Fehlerprofil entsteht

Das Fehlerprofil ist das Herz von FehlerFix. Dieses Dokument erklärt genau,
woher die Zahlen kommen – vor allem die Prozentwerte.

## Die wichtigste Einsicht vorweg

**Die Prozentwerte werden nicht ausgerechnet, sondern von der KI vergeben.**

Es gibt keine Formel wie „richtig ÷ gesamt". Stattdessen:

| Wer | Macht was |
|---|---|
| **Claude (KI)** | Vergibt die Prozentwerte – nach Regeln, die im Prompt stehen |
| **Unser Code** | Prüft, begrenzt, verrechnet, sortiert und wählt daraus die nächste Übung |

Genau **eine** Zahl im System ist eine echte Formel: das `practice_weight`
(siehe Phase 2). Alles andere ist KI-Einschätzung innerhalb enger Leitplanken.

## Die Datenstruktur

Pro Schüler gibt es eine Liste („Feature-Table"). Jeder Eintrag:

```js
{
  name:    "ie/i-Schreibung",  // die Fehler-Kategorie
  mastery: 25,                 // 0–100: wie sicher beherrscht der Schüler das?
  right:   3,                  // wie oft seither richtig gemacht
  wrong:   4                   // wie oft falsch gemacht
}
```

`mastery` ist die Zahl, die im Dashboard als Balken erscheint.
**Niedrig = großer Übungsbedarf.**

Gespeichert in Supabase, Tabelle `student_state`, Spalte `feature_table`
(als JSON). Code: `lib/store.js`.

---

## Phase 1 – Entstehung (`/api/analyze`)

Beim Onboarding gehen die Bilder (abfotografierte Texte und/oder die drei
handschriftlichen Texte) zusammen mit dem Kontext an Claude.

**Der Kontext**, den die KI mitbekommt (`buildContextBlock`):
- Schüler-Profil: Bundesland, Klassenstufe, Schulform
- Curriculum: bei Hessen die echten Lehrplan-Themen, sonst der Lehrplan-Name
- FRESCH-Methodik: die vier Strategien

**Die Regeln für den Prozentwert** stehen wörtlich im Prompt
(`server.js`, Funktion `detectFeaturesFromImages`):

```
4+ Fehler in der Kategorie  → mastery 15–25
2–3 Fehler                  → mastery 25–40
1 Fehler                    → mastery 40–55
kein Fehler, aber typisch
für die Klassenstufe        → mastery 70–85
```

Die letzte Zeile ist wichtig: Auch ohne gefundene Fehler bekommt der Schüler
Kategorien – sonst gäbe es nichts zu üben.

**Was der Code danach macht:**

```js
mastery: clamp(f.initialMastery, 0, 100)   // hart auf 0–100 begrenzen
wrong:   clamp(f.wrong || 1, 1, 99)        // mindestens 1
right:   0                                 // noch nichts richtig gemacht
```

Dann: nach `mastery` aufsteigend sortieren – die größte Schwäche steht oben.
Liefert die KI gar nichts, greift ein Notfall-Profil
(Groß-/Kleinschreibung 60, das/dass 65, Kommasetzung 55).

---

## Phase 2 – Welche Übung kommt als nächste? (`/api/next-exercise`)

Hier rechnet der Code, nicht die KI:

```js
practice_weight = max(1, 100 - mastery)
```

Also: **mastery 20 → Gewicht 80** (dringend üben),
**mastery 90 → Gewicht 10** (läuft schon).
Das `max(1, …)` sorgt dafür, dass selbst ein perfektes Thema nie ganz
verschwindet.

**Die Auswahl des Themas** (`server.js`, `/api/next-exercise`):

```js
if (exercisesCompleted < 3)          → Thema mit dem höchsten Gewicht
else if (letzte Übung war "poor")    → beim selben Thema bleiben
else                                 → wieder das Thema mit dem höchsten Gewicht
```

Die ersten drei Übungen bleiben also bewusst bei der größten Schwäche.
Danach: Bei schlechtem Ergebnis wird nicht gewechselt, sondern vertieft.

Der Übungs**typ** rotiert stur der Reihe nach – Lückentext, Fehlertext,
Audio-Diktat – damit alle drei vorkommen.

---

## Phase 3 – Update nach der Übung (`/api/submit-exercise`)

Das Foto der handschriftlichen Lösung geht an Claude, zusammen mit der
erwarteten Lösung und der aktuellen Feature-Table. Die KI liefert zurück:

```json
{
  "overall_score": 70,
  "results": [
    { "feature": "ie/i-Schreibung", "right": 3, "wrong": 1, "new_mastery": 45 }
  ],
  "new_features_detected": [ … ],
  "word_corrections": [ … ]
}
```

**Die Regel für die neue mastery** steht wieder im Prompt:

```
alles richtig    → +15 bis +25 Punkte
viele Fehler     → −15 bis −25 Punkte
teilweise        → moderat anpassen
```

**Was der Code damit macht** (`applyGradingResults`):

```js
match.right  += clamp(r.right, 0, 99)     // aufaddieren
match.wrong  += clamp(r.wrong, 0, 99)     // aufaddieren
match.mastery = clamp(r.new_mastery, 0, 100)  // ERSETZEN, nicht addieren
```

Wichtig: `right` und `wrong` wachsen als Historie an, `mastery` wird jedes Mal
komplett neu gesetzt.

Zuordnung der Kategorie: erst exakter Namensvergleich, sonst Teilwort-Treffer –
weil die KI Namen leicht unterschiedlich schreibt.

### Neue Schwächen entdecken

Die KI darf Kategorien vorschlagen, die noch nicht in der Tabelle stehen
(`addNewFeatures`):

```js
wrong   = clamp(nf.wrong || 1, 1, 99)
mastery = nf.initial_mastery ?? (wrong >= 2 ? 30 : 40)
```

Vorher der Duplikat-Schutz `similarFeatureExists`: Ein Vorschlag wird
verworfen, wenn ein bestehender Name ihn enthält oder umgekehrt – damit nicht
„ie/i" und „ie/i-Schreibung" nebeneinander stehen.

### Wenn die KI ausfällt

Kein Grading (Netzfehler, kaputtes JSON) → `ratio = 0.5`, es gibt Punkte, aber
**die mastery-Werte bleiben unverändert**. Lieber kein Update als ein falsches.

---

## Was daraus Punkte und Level macht

```js
ratio  = overall_score / 100
points = round(ratio * 10)              // max. 10 Punkte pro Übung
level  = floor(gesamtpunkte / 100) + 1  // alle 100 Punkte ein Level
performance = ratio >= 0.8 ? "good"
            : ratio >= 0.5 ? "medium"
            : "poor"                    // steuert Phase 2
```

---

## Beispiel: ein kompletter Durchlauf

**Onboarding.** Claude findet 4× „ie/i" und 2× „ss/ß":

| Kategorie | mastery | right | wrong | Gewicht |
|---|---|---|---|---|
| ie/i-Schreibung | 20 | 0 | 4 | **80** |
| ss/ß | 32 | 0 | 2 | 68 |

**Übung 1** → höchstes Gewicht → „ie/i-Schreibung".
Schüler macht 3 von 4 richtig, Claude gibt `overall_score: 75`,
`new_mastery: 42`:

| Kategorie | mastery | right | wrong | Gewicht |
|---|---|---|---|---|
| ss/ß | 32 | 0 | 2 | **68** |
| ie/i-Schreibung | 42 | 3 | 1 | 58 |

Punkte: `round(0.75 × 10)` = **8**. Performance „medium".

**Übung 2** – aber: Übung < 3, deshalb weiter „ie/i", nicht „ss/ß".
Ab Übung 4 würde nach Gewicht gewählt, also „ss/ß".

---

## Grenzen (wichtig zu wissen)

1. **Nicht deterministisch.** Dieselben Bilder können leicht andere Werte
   ergeben – es ist eine KI-Einschätzung, keine Messung. Die Prompt-Regeln
   halten die Streuung klein, beseitigen sie aber nicht.

2. **Abhängig von der Lesbarkeit.** Was die KI nicht entziffert, kann sie nicht
   bewerten.

3. **Kalibrierung liegt im Prompt.** Wenn die Werte zu streng oder zu milde
   wirken, ändert man die Zahlen in den Prompt-Regeln – nicht den Code.

4. **Die Sortierung ist die eigentliche Intelligenz.** Selbst wenn ein
   einzelner Prozentwert um ±10 danebenliegt, stimmt die *Reihenfolge*
   meistens – und die entscheidet, was geübt wird.

## Wo im Code was steht

| Was | Datei | Funktion |
|---|---|---|
| Profil-Entstehung | `server.js` | `detectFeaturesFromImages` |
| Nachträgliche Texte einmischen | `server.js` | `mergeDetectedFeatures` |
| Gewichtung | `server.js` | `weightedFeatures` |
| Themen-/Typ-Wahl | `server.js` | Route `/api/next-exercise` |
| Update nach Übung | `server.js` | `applyGradingResults` |
| Neue Kategorien | `server.js` | `addNewFeatures`, `similarFeatureExists` |
| Laden/Speichern | `lib/store.js` | `loadStudentState`, `saveStudentState` |
| Curriculum-Kontext | `lib/curriculum.js` | `curriculumPromptBlock` |
| FRESCH-Methodik | `lib/methods/fresch.js` | `freschMethodPromptBlock` |
