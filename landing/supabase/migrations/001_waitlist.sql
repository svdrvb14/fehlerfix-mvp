-- ============================================================================
-- FehlerFix Warteliste
-- ============================================================================
-- WICHTIG: Diese Datei wird NICHT automatisch ausgeführt.
-- Bitte öffne dein Supabase-Projekt -> SQL Editor -> "New query" und führe
-- den kompletten Inhalt dieser Datei einmalig manuell aus.
-- ============================================================================

create extension if not exists "pgcrypto";

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamptz not null default now()
);

-- Row Level Security aktivieren
alter table public.waitlist enable row level security;

-- Nur INSERT für die anon-Rolle erlauben. Kein select/update/delete von außen,
-- damit niemand über den öffentlichen anon-Key die Warteliste auslesen,
-- verändern oder löschen kann.
create policy "Anon kann sich in die Warteliste eintragen"
  on public.waitlist
  for insert
  to anon
  with check (true);
