-- Übungsbank: vorgefertigte Übungen aus echtem Lehrmaterial (statt KI-Neuerzeugung).
-- Befüllt durch scripts/ingest-exercise-bank.js, ausgewählt durch lib/exercisebank.js.

create table if not exists exercise_bank (
  id uuid primary key default gen_random_uuid(),
  grade int,                          -- Klassenstufe (1-13), null = klassenstufenübergreifend
  format text not null,               -- eines der 12 IDs aus lib/exercises.js (z.B. 'cloze_text')
  feature_tags text[] not null default '{}',  -- z.B. {'ie/i-schreibung'} – normalisiert (klein, ohne Sonderzeichen-Rauschen)
  topic text,                         -- Überschrift, z.B. "ie/i-Schreibung"
  instruction text,
  tips text[] default '{}',
  display_text text,
  correct_text text,
  cards jsonb,                        -- bei format='flashcards' (Quelle liefert selten passende Karten – meist leer)
  explanation text,
  source_file text,                   -- Rückverfolgung: welche Datei/Seite
  source_page int,
  quality_ok boolean not null default true,   -- von der Extraktion selbst eingeschätzt
  reviewed boolean not null default false,    -- true = von einem Menschen freigegeben ODER quality_ok bei Ingestion
  created_at timestamptz not null default now()
);

create index if not exists exercise_bank_lookup_idx
  on exercise_bank (format, grade) where reviewed = true;
create index if not exists exercise_bank_tags_idx
  on exercise_bank using gin (feature_tags);

-- Welcher Schüler welche Bank-Übung schon hatte (keine Wiederholungen).
create table if not exists exercise_bank_usage (
  student_id uuid not null references students(id) on delete cascade,
  exercise_id uuid not null references exercise_bank(id) on delete cascade,
  used_at timestamptz not null default now(),
  primary key (student_id, exercise_id)
);
