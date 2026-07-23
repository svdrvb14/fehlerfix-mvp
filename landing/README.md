# FehlerFix – Landing Page & Warteliste

Marketing-Landingpage für FehlerFix (Next.js 14, App Router, TypeScript,
Tailwind CSS). Sammelt E-Mail-Adressen für die Warteliste über Supabase,
bevor die App startet.

> Diese Landingpage ist bewusst getrennt vom bestehenden FehlerFix-MVP im
> Repo-Root (`/server.js`, `/public`, ...). Sie lässt sich unabhängig
> entwickeln und deployen, z.B. als eigenes Vercel-Projekt mit Root
> Directory `landing/`.

## 1. Installation

```bash
cd landing
npm install
```

## 2. Umgebungsvariablen

```bash
cp .env.local.example .env.local
```

Trage in `.env.local` deine Supabase-Projektdaten ein (Supabase Dashboard →
Project Settings → API):

```
NEXT_PUBLIC_SUPABASE_URL=https://dein-projekt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=dein-anon-public-key
```

## 3. Supabase-Migration ausführen

Die Tabelle `waitlist` wird **nicht automatisch** angelegt. Führe die
Migration einmalig manuell aus:

1. Supabase-Projekt öffnen → **SQL Editor** → **New query**
2. Inhalt von [`supabase/migrations/001_waitlist.sql`](./supabase/migrations/001_waitlist.sql)
   komplett hineinkopieren
3. **Run** klicken

Das legt die Tabelle `waitlist` (Spalten `id`, `email`, `created_at`) an,
aktiviert Row Level Security und erlaubt der `anon`-Rolle ausschließlich
`insert` – also können Besucher:innen sich eintragen, aber niemand kann die
Liste über den öffentlichen Key auslesen, verändern oder löschen.

## 4. Bilder ersetzen

`public/logo.png` und `public/team-foto.png` sind aktuell generierte
Platzhalter. Siehe [`public/PLATZHALTER-BILDER.md`](./public/PLATZHALTER-BILDER.md)
für Details – einfach mit den echten Dateien überschreiben.

## 5. Entwickeln

```bash
npm run dev
```

Öffne [http://localhost:3000](http://localhost:3000).

## 6. Deployment mit Vercel

```bash
npm install -g vercel   # falls noch nicht installiert
vercel                  # einmalig einrichten, Fragen beantworten
vercel --prod           # Produktions-Deployment
```

Wichtig beim Einrichten in Vercel:

- **Root Directory** auf `landing` setzen (falls das Vercel-Projekt das
  gesamte Repo `fehlerfix-mvp` einbindet).
- Unter **Settings → Environment Variables** die beiden Variablen
  `NEXT_PUBLIC_SUPABASE_URL` und `NEXT_PUBLIC_SUPABASE_ANON_KEY` eintragen
  (gleiche Werte wie in `.env.local`).
- Nach dem Setzen der Env-Variablen ein Redeploy auslösen.

## Rechtliches

`app/impressum/page.tsx` und `app/datenschutz/page.tsx` enthalten sinnvolle
Platzhalter (§5 TMG, DSGVO-Hinweise zur Supabase-Warteliste). Alle mit
`[PLATZHALTER]` markierten Stellen (Anschrift, Handelsregister sobald die
GmbH eingetragen ist, USt-IdNr.) müssen vor dem Live-Gang durch echte Daten
ersetzt werden. Eine anwaltliche Prüfung vor Launch wird empfohlen.

## Tech-Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Framer Motion (Scroll-Animationen, respektiert `prefers-reduced-motion`)
- Supabase (`@supabase/supabase-js`) für die Warteliste
- Google Font Poppins über `next/font/google`
