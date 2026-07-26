-- ============================================================================
-- FehlerFix Abo-Verwaltung (subscriptions)
-- ============================================================================
-- WICHTIG: Diese Datei wird NICHT automatisch ausgeführt.
-- Bitte öffne dein Supabase-Projekt -> SQL Editor -> "New query" und führe
-- den kompletten Inhalt dieser Datei einmalig manuell aus.
-- ============================================================================

create extension if not exists "pgcrypto";

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id),
  email text not null,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text not null default 'inactive',
  plan text,
  current_period_end timestamptz,
  updated_at timestamptz not null default now(),
  constraint subscriptions_email_key unique (email)
);

-- Row Level Security aktivieren
alter table public.subscriptions enable row level security;

-- Ein eingeloggter Nutzer darf ausschließlich seine eigene Zeile lesen.
-- Schreibzugriffe laufen ausschließlich serverseitig über den Stripe-Webhook
-- mit dem Service-Role-Key, der RLS ohnehin umgeht.
create policy "select"
  on public.subscriptions
  for select
  to authenticated
  using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Trigger: sobald sich ein neuer auth.users-Eintrag registriert (Magic Link),
-- wird automatisch subscriptions.user_id befüllt, falls die E-Mail bereits in
-- subscriptions existiert (z.B. weil vorher schon über Stripe abonniert
-- wurde, ohne dass zu dem Zeitpunkt ein Supabase-Auth-Konto bestand).
-- ----------------------------------------------------------------------------
create or replace function public.link_subscription_to_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.subscriptions
  set user_id = new.id
  where email = new.email
    and user_id is null;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_link_subscription on auth.users;

create trigger on_auth_user_created_link_subscription
  after insert on auth.users
  for each row
  execute function public.link_subscription_to_new_user();
