# Übungsbank – echtes Lehrmaterial statt KI-Neuerzeugung

Ausgangslage: es gibt ~500 Seiten geprüftes Übungsmaterial für Klasse 2–4,
1–3 Übungen pro Seite – schätzungsweise 800–1500 einzelne Übungen. Die sind
schon gut. Die KI soll sie nicht neu erfinden, sondern daraus die passende
für den jeweiligen Lernstand auswählen und in FehlerFix-Form ausgeben.

## Architektur

```
/api/next-exercise
  │
  ├─ 1) Fokus-Feature + Format wie bisher bestimmen
  │     (weightedFeatures + exercises.pickType – unverändert)
  │
  ├─ 2) ZUERST: exercise_bank nach passendem, ungesehenem Eintrag fragen
  │     (Format + Feature + Klassenstufe ±1, noch nicht in
  │     exercise_bank_usage für diesen Schüler)
  │     → Treffer? Direkt ausgeben. KEIN KI-Aufruf nötig.
  │
  └─ 3) Kein Treffer → wie bisher: KI generiert die Übung neu
```

Das ist bereits gebaut und läuft automatisch, sobald die Bank Einträge mit
`reviewed = true` enthält:

- [supabase/migrations/0004_exercise_bank.sql](../supabase/migrations/0004_exercise_bank.sql) – die zwei Tabellen
- [lib/exercisebank.js](../lib/exercisebank.js) – Auswahl (`pickFromBank`), Markierung als benutzt (`markUsed`), Umwandlung ins Übungs-JSON (`toExercise`)
- [server.js](../server.js) – `/api/next-exercise` fragt die Bank vor der KI-Generierung

Für Gäste (kein Login) greift die Bank nicht – ohne `studentId` gibt es
keine "schon gesehen"-Historie, und ohne die wären Wiederholungen möglich.
Gäste bekommen weiterhin ausschließlich KI-generierte Übungen; das ist kein
Funktionsverlust, nur ein bewusster Fallback.

## Wie die 500 Seiten reinkommen

### Schritt 1: Dateien bereitlegen

Ein Ordner mit den gescannten Seiten – entweder als Bilder (ein Foto/Scan
pro Seite, jpg/png) oder als PDFs (mehrere Seiten pro Datei, z.B. ein PDF
pro Kapitel). Beides gemischt geht.

> Grenzen der Anthropic-API pro Datei: max. 32 MB, max. 600 Seiten. Bei
> einem sehr großen PDF vorher in Kapitel aufteilen (macOS Vorschau →
> Seiten löschen/exportieren, oder `pdftk in.pdf cat 1-30 output teil1.pdf`).

### Schritt 2: Migration einspielen (einmalig)

```bash
cat supabase/migrations/0004_exercise_bank.sql
```

Inhalt in den Supabase SQL Editor kopieren und ausführen (wie bei den
vorherigen Migrationen auch).

### Schritt 3: Einlesen lassen

```bash
node scripts/ingest-exercise-bank.js /pfad/zum/ordner --grade 3
```

`--grade` ist die Vorgabe für Seiten ohne erkennbare Klassenstufenangabe;
steht die Klasse auf der Seite selbst, wird die erkannte Angabe genutzt.
Mehrere Ordner (z.B. eins pro Klassenstufe) einfach nacheinander laufen
lassen: `node scripts/ingest-exercise-bank.js ordner-klasse2 --grade 2`,
danach `--grade 3`, `--grade 4`.

Was passiert dabei:
1. Jede Datei geht an Claude – **das ist gedruckter Text, kein
   Handschrift-OCR**, also ein für die KI sehr zuverlässiges Problem (siehe
   Abschnitt weiter unten zur Handschrift-Erkennung, die ein anderes,
   deutlich schwereres Problem ist).
2. Claude zieht jede einzelne Übung heraus: Format (eines der zehn
   quellfähigen Formate aus `lib/exercises.js`), Fehlerkategorie(n),
   Aufgabentext, Lösung, Tipps.
3. Jede Extraktion schätzt sich selbst ein (`quality_ok`). Unsichere Fälle
   werden gespeichert, aber mit `reviewed = false` – die tauchen in
   `/api/next-exercise` noch NICHT auf.
4. Am Ende steht eine Zusammenfassung: wie viele gespeichert, wie viele zur
   Kontrolle, wie oft welche Fehlerkategorie vorkam.

### Schritt 4: Die unsicheren Fälle kurz gegenchecken

```sql
select id, source_file, source_page, topic, quality_ok, display_text, correct_text
from exercise_bank where reviewed = false;
```

Pro Zeile: Originalseite danebenlegen, passt es → freigeben:

```sql
update exercise_bank set reviewed = true where id = '...';
```

Passt es nicht → löschen:

```sql
delete from exercise_bank where id = '...';
```

Bei 800–1500 Übungen und einer KI, die gedruckten Text zuverlässig liest,
ist die Kontrollmenge normalerweise klein (die meisten Extraktionen setzen
`quality_ok = true` und sind sofort live).

## Feature-Tags

Die Bank nutzt dieselbe Fehlerkategorie-Sprache wie das Fehlerprofil (z.B.
`"ie/i-schreibung"`, `"auslautverhärtung"`) – normalisiert (klein, ohne
Sonderzeichen-Rauschen). `pickFromBank` matcht das Fokus-Feature aus der
Feature-Table gegen `feature_tags` der Bank-Einträge. Wenn eine Bank-Übung
nie gefunden wird, obwohl sie da sein sollte, ist meist eine
Tag-Formulierung der Grund – dann einfach in der DB nachschärfen:

```sql
update exercise_bank set feature_tags = array_append(feature_tags, 'ie/i-schreibung')
where id = '...';
```

## Was die Bank NICHT abdeckt

`flashcards` (TikTok-Wortkarten) und `audio_dictation` bleiben immer
KI-generiert – die brauchen Laufzeit-Verhalten (Kartenwischen, Sprachausgabe
mit Tempo-Regelung), das sich aus einer Buchseite nicht ableiten lässt. Die
anderen zehn Formate können aus der Bank kommen.
