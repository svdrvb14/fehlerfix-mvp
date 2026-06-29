# Curriculum-Daten

## Struktur

| Datei | Zweck |
|---|---|
| `_states-meta.js` | Single Source of Truth: Bundesländer, Schulformen je Bundesland, Primarstufen-Grenze, Quellenverweis. Steuert die dynamische Schulform-Auswahl im Frontend. |
| `hessen.js` | Detaillierte Themenlisten pro Schulform und Klassenbereich (Hessisches Kerncurriculum). |
| weitere `<land>.js` | Folgen, sobald die PDFs des jeweiligen Bundeslandes detailliert ausgewertet sind. |

## Quellen (lokal beim Entwickler)

Die offiziellen PDFs der Bundesländer liegen auf dem Entwickler-Rechner unter:

```
/Users/salvadorelsen/Desktop/Kurriculumsdaten/
├── Baden-Württemberg/
├── Bayern/
├── Berlin & Brandenburg/
├── Bremen/
├── Hamburg/
├── Hessen/
├── Mecklenburg-Vorpommern/
├── Niedersachsen/
├── Nordrhein-Westfalen/
├── Rheinland-Pfalz/
├── Saarland/
├── Sachsen/
├── Sachsen-Anhalt/
├── Schleswig-Holstein/
└── Thüringen/
```

PDFs werden **nicht** ins Git-Repo eingecheckt (zu groß, ~100 MB). Stattdessen
werden die relevanten Inhalte als strukturierte JS-Module in `lib/curriculum-data/`
abgelegt – das ist die produktive Form, die der Server lädt.

## Workflow bei Curriculum-Updates

1. Aktualisierte PDF in den entsprechenden Ordner legen
2. Datei `lib/curriculum-data/<land>.js` manuell oder per Skript regenerieren
   (Pfad zur Quelle steht jeweils in der `source`-Konstante des Moduls)
3. In `lib/curriculum.js` ist das Modul bereits registriert – sobald die Datei
   vorhanden ist, fließen die Detail-Daten in den Prompt-Kontext ein
4. `_states-meta.js` ggf. anpassen, falls sich Schulformen ändern
5. Commit + Push → Render redeployed automatisch

## Aktuell mit Detail-Daten ausgestattet

- `HE` (Hessen) – komplett

## Nur Quellen-Verweis (KI nutzt Allgemeinwissen)

Alle anderen 15 Bundesländer. KI bekommt den exakten Lehrplan-Namen aus
`_states-meta.js` als Kontext und arbeitet darauf basierend.

## Partner-Daten (geplant)

Sobald Lizenz-Vereinbarungen mit Cornelsen / Klett etc. stehen, werden die
konkreten Lehrwerke (Schulbücher) als weitere Datenquelle eingebunden. Die
Architektur ist darauf vorbereitet: `lookupCurriculum()` kann zusätzliche
Quellen integrieren, ohne dass die Prompts angepasst werden müssen.
