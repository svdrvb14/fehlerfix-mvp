-- FehlerFix – Migration 0002: Streaks (Übungstage in Folge)
--
-- Im Supabase SQL-Editor ausführen (nach 0001_init.sql).

alter table student_state
  add column if not exists streak_days       int  not null default 0,
  add column if not exists best_streak        int  not null default 0,
  add column if not exists last_practice_date date;
