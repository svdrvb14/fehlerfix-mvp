-- Grund, warum eine Übung als quality_ok=false markiert wurde – fehlte bisher,
-- dadurch zeigte das Konzept-Dokument bei zur Kontrolle markierten Einträgen
-- nur "kein Grund angegeben" statt der tatsächlichen Begründung.
alter table exercise_bank add column if not exists quality_reason text;
