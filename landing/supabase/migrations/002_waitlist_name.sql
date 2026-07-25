-- ============================================================================
-- FehlerFix Warteliste – Vor- und Nachname ergänzen
-- ============================================================================
-- WICHTIG: Diese Datei wird NICHT automatisch ausgeführt.
-- Bitte öffne dein Supabase-Projekt -> SQL Editor -> "New query" und führe
-- den kompletten Inhalt dieser Datei einmalig manuell aus (nach 001_waitlist.sql).
-- ============================================================================

alter table public.waitlist
  add column if not exists first_name text,
  add column if not exists last_name text;
