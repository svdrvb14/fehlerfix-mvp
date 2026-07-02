-- FehlerFix – Datenbank-Schema (Migration 0001)
--
-- Ausführen im Supabase SQL-Editor (Dashboard → SQL Editor → New query → einfügen → Run).
--
-- Sicherheitskonzept:
--   Nur der Express-Backend spricht mit der DB (über den service_role-Key,
--   der Row-Level-Security umgeht). RLS ist auf allen Tabellen AKTIV, ohne
--   Policies für anon/authenticated → falls der öffentliche anon-Key jemals
--   geleakt wird, ist trotzdem KEIN Zugriff auf Schülerdaten möglich.

-- Extensions
create extension if not exists "pgcrypto";  -- für gen_random_uuid()

-- ─────────────────────────────────────────────────────────────
-- TEACHERS (Struktur schon angelegt, Login-Aktivierung folgt später)
-- ─────────────────────────────────────────────────────────────
create table if not exists teachers (
  id            uuid primary key default gen_random_uuid(),
  email         text unique not null,
  password_hash text not null,
  display_name  text,
  created_at    timestamptz not null default now(),
  last_login    timestamptz
);

-- ─────────────────────────────────────────────────────────────
-- CLASSES (Klassenräume; class_code für Schüler-Beitritt)
--   teacher_id ist NULLABLE, damit Klassencodes auch ohne aktive
--   Lehrer-Rolle existieren können (z.B. Demo-Codes / Admin-erzeugt).
-- ─────────────────────────────────────────────────────────────
create table if not exists classes (
  id          uuid primary key default gen_random_uuid(),
  class_code  text unique not null,          -- z.B. "ABCD12"
  name        text,                          -- z.B. "6b Musterschule"
  teacher_id  uuid references teachers(id) on delete set null,
  -- Vor-Einstellung des Profils für Schüler dieser Klasse (spart Onboarding-Klicks)
  state       text,                          -- Bundesland-Code, z.B. "HE"
  school_type text,
  grade       int,
  language    text not null default 'de',
  created_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- STUDENTS (zwei Auth-Wege: 'email' oder 'class_code')
-- ─────────────────────────────────────────────────────────────
create table if not exists students (
  id            uuid primary key default gen_random_uuid(),
  auth_method   text not null check (auth_method in ('email','class_code')),

  -- E-Mail-Weg (ältere Schüler)
  email         text unique,
  password_hash text,

  -- Klassencode-Weg (jüngere Schüler): Name + PIN innerhalb einer Klasse
  class_id      uuid references classes(id) on delete set null,
  display_name  text,
  pin_hash      text,

  -- Gemeinsames Profil (Bundesland, Klassenstufe, Schulform, Sprache)
  profile       jsonb not null default '{}'::jsonb,

  -- Für spätere Wochen-Reports an Eltern (kein Eltern-Login)
  parent_email  text,

  created_at    timestamptz not null default now(),
  last_login    timestamptz
);

-- Name muss innerhalb einer Klasse eindeutig sein (für class_code-Login)
create unique index if not exists students_class_name_uidx
  on students (class_id, lower(display_name))
  where auth_method = 'class_code';

create index if not exists students_class_idx on students (class_id);

-- ─────────────────────────────────────────────────────────────
-- STUDENT_STATE (die persistente "Session": Fehlerprofil + Fortschritt)
--   Spiegelt exakt das bisherige in-memory Session-Objekt wider.
-- ─────────────────────────────────────────────────────────────
create table if not exists student_state (
  student_id                 uuid primary key references students(id) on delete cascade,
  feature_table              jsonb not null default '[]'::jsonb,   -- Fehlerprofil (unsichtbar fürs Kind)
  level                      int not null default 1,
  points                     int not null default 0,
  exercises_completed        int not null default 0,
  last_exercise_performance  text,
  last_focus_feature         text,
  last_exercise              jsonb,                                -- aktive Übung (damit submit nach Reload geht)
  exercise_history           jsonb not null default '[]'::jsonb,   -- rollierend letzte N
  updated_at                 timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- EXERCISE_LOG (append-only; für Lehrer-Dashboard + Eltern-Report)
-- ─────────────────────────────────────────────────────────────
create table if not exists exercise_log (
  id            bigint generated always as identity primary key,
  student_id    uuid not null references students(id) on delete cascade,
  feature       text,
  exercise_type text,
  topic         text,
  score         int,                    -- 0-100
  created_at    timestamptz not null default now()
);

create index if not exists exercise_log_student_idx on exercise_log (student_id, created_at desc);

-- ─────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY: alles an, keine Policies → nur service_role kommt ran
-- ─────────────────────────────────────────────────────────────
alter table teachers        enable row level security;
alter table classes         enable row level security;
alter table students        enable row level security;
alter table student_state   enable row level security;
alter table exercise_log    enable row level security;

-- ─────────────────────────────────────────────────────────────
-- DEMO-KLASSENCODE (damit Klassencode-Login sofort testbar ist,
--   auch bevor die Lehrer-Rolle aktiv ist). Kann später gelöscht werden.
-- ─────────────────────────────────────────────────────────────
insert into classes (class_code, name, state, school_type, grade, language)
values ('DEMO01', 'Demo-Klasse', 'HE', 'Gymnasium', 6, 'de')
on conflict (class_code) do nothing;
