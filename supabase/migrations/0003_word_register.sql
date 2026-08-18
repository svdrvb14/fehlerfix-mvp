-- FehlerFix – Migration 0003: Wortliste ("Merkwörter")
--
-- Im Supabase SQL-Editor ausführen (nach 0002_streaks.sql).
--
-- Sammelt Wörter, die ein Lerner WIEDERHOLT falsch schreibt. Wird
-- ausschließlich aus echten Beobachtungen gefüllt – nie erfunden.

alter table student_state
  add column if not exists word_register jsonb not null default '[]'::jsonb;

-- Zuletzt genutzte Übungsformate – sorgt für Abwechslung bei der Auswahl
alter table student_state
  add column if not exists recent_types jsonb not null default '[]'::jsonb;
