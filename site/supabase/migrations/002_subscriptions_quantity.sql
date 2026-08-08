-- ============================================================================
-- FehlerFix Abo-Verwaltung: Nutzeranzahl (Familienabo)
-- ============================================================================
-- WICHTIG: Diese Datei wird NICHT automatisch ausgeführt.
-- Bitte öffne dein Supabase-Projekt -> SQL Editor -> "New query" und führe
-- den kompletten Inhalt dieser Datei einmalig manuell aus (nachdem
-- 001_subscriptions.sql bereits ausgeführt wurde).
-- ============================================================================

alter table public.subscriptions
  add column if not exists quantity integer not null default 1;
