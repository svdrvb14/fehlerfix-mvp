-- ============================================================================
-- FehlerFix Abo-Verwaltung: Sprachwahl beim Einzelabo
-- ============================================================================
-- WICHTIG: Diese Datei wird NICHT automatisch ausgeführt.
-- Bitte öffne dein Supabase-Projekt -> SQL Editor -> "New query" und führe
-- den kompletten Inhalt dieser Datei einmalig manuell aus (nachdem
-- 001_subscriptions.sql und 002_subscriptions_quantity.sql bereits
-- ausgeführt wurden).
-- ============================================================================

-- "de", "en" beim Einzelabo, "both" beim Deutsch+Englisch-Paket.
alter table public.subscriptions
  add column if not exists single_language text;
