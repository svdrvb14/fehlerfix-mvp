-- Kennzeichnet, wie eine Bank-Übung entstanden ist:
--   'transcribed' = Inhalt direkt aus der Quelle gelesen (scripts/ingest-exercise-bank.js)
--   'inspired'    = nur die Struktur aus der Quelle, der Inhalt komplett neu erzeugt,
--                    OHNE dass der Erzeugungs-Schritt die Quelle je gesehen hat
--                    (scripts/inspire-exercise-bank.js)
-- Wichtig für die Nachvollziehbarkeit bei urheberrechtlich sensiblem Quellmaterial.
alter table exercise_bank add column if not exists generation_method text;
alter table exercise_bank add column if not exists structure_source jsonb;
