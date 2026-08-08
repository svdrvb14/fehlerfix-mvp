# FehlerFix – Marketing- & Checkout-Website

Die "richtige" Produktseite von FehlerFix (Next.js 14, App Router,
TypeScript, Tailwind CSS): Marketing-Inhalte, Preise mit Stripe-Checkout und
Kontoverwaltung – alles auf einer durchgehenden Scroll-Seite (`/`), plus ein
paar funktional getrennte Routen (`/konto`, Rechtstexte).

> Diese Seite ist unabhängig von `../landing` (Warteliste vor dem Launch)
> und vom MVP im Repo-Root (`/server.js`). Sie lässt sich eigenständig
> entwickeln und deployen, z.B. als eigenes Vercel-Projekt mit Root
> Directory `site/`.

## 1. Installation

```bash
cd site
npm install
```

## 2. Umgebungsvariablen

```bash
cp .env.local.example .env.local
```

Trage ein:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` – Supabase
  Dashboard → Project Settings → API
- `SUPABASE_SERVICE_ROLE_KEY` – ebenfalls dort (**geheim**, nur serverseitig
  verwenden, niemals ins Frontend geben)
- `STRIPE_SECRET_KEY` – Stripe Dashboard → Developers → API keys
- `STRIPE_WEBHOOK_SECRET` – siehe Abschnitt 5 (lokales Webhook-Testen)
- `NEXT_PUBLIC_STRIPE_PRICE_ID_SINGLE_MONTHLY`,
  `NEXT_PUBLIC_STRIPE_PRICE_ID_SINGLE_YEARLY`,
  `NEXT_PUBLIC_STRIPE_PRICE_ID_COMBO_MONTHLY`,
  `NEXT_PUBLIC_STRIPE_PRICE_ID_COMBO_YEARLY` – siehe Abschnitt 4

## 3. Supabase-Migrationen ausführen

Die Tabelle `subscriptions` wird **nicht automatisch** angelegt.

1. Supabase-Projekt öffnen → **SQL Editor** → **New query**
2. Inhalt von [`supabase/migrations/001_subscriptions.sql`](./supabase/migrations/001_subscriptions.sql)
   komplett hineinkopieren, **Run** klicken
3. Danach genauso mit [`supabase/migrations/002_subscriptions_quantity.sql`](./supabase/migrations/002_subscriptions_quantity.sql)
   (fügt die Spalte `quantity` für die gebuchte Nutzeranzahl hinzu)

Das legt die Tabelle `subscriptions` an, aktiviert Row Level Security (jede
Nutzerin/jeder Nutzer darf nur die eigene Zeile lesen) und richtet einen
Trigger ein, der `user_id` automatisch verknüpft, sobald sich jemand mit
einer E-Mail-Adresse registriert, die bereits in `subscriptions` existiert
(z.B. weil vorher schon über Stripe abonniert wurde).

## 4. Stripe-Produkte &amp; Preise verknüpfen

Das Preismodell hat zwei Dimensionen - Sprachumfang (Einzelsprache oder
Deutsch+Englisch) und Abrechnung (monatlich/jährlich) - macht also vier
Preise. Das Familienabo (2-4 Nutzer, -11 %/-22 %/-33 %) läuft dabei **nicht**
über eigene Preise, sondern über eine Stripe-Mengenstaffel (volume tiering)
auf jedem der vier Preise: die Website schickt die Nutzeranzahl als
`quantity` mit, Stripe wendet automatisch den passenden Rabatt-Tier an.

1. Stripe Dashboard → **Product catalog** → Produkt "FehlerFix Abo" anlegen
2. Vier wiederkehrende Preise anlegen (je mit "Pricing model" → **Volume**
   und aktiviertem "Customer chooses quantity", mit 4 Tiers für 1-4 Nutzer)
   – die exakten Beträge pro Tier stehen in
   [`.env.local.example`](./.env.local.example)
3. Die vier Preis-IDs (`price_...`) in `.env.local` eintragen (siehe oben)
4. Im Stripe Dashboard unter **Settings → Billing → Customer portal** das
   Kundenportal aktivieren (wird von `/api/portal` verwendet)

## 5. Lokales Webhook-Testen mit der Stripe CLI

```bash
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Die CLI gibt dabei ein `whsec_...`-Secret aus – das trägst du als
`STRIPE_WEBHOOK_SECRET` in `.env.local` ein. Zum Testen einzelner Events:

```bash
stripe trigger checkout.session.completed
```

Im produktiven Betrieb legst du den Webhook-Endpunkt stattdessen unter
**Stripe Dashboard → Developers → Webhooks** an (Ziel-URL:
`https://deine-domain.tld/api/webhooks/stripe`, Events:
`checkout.session.completed`, `customer.subscription.updated`,
`customer.subscription.deleted`) und trägst das dort erzeugte Signing
Secret ein.

## 6. Entwickeln

```bash
npm run dev
```

Öffne [http://localhost:3000](http://localhost:3000).

## 7. Deployment mit Vercel

```bash
npm install -g vercel
vercel
vercel --prod
```

Wichtig beim Einrichten in Vercel:

- **Root Directory** auf `site` setzen (falls das Vercel-Projekt das
  gesamte Repo `fehlerfix-mvp` einbindet).
- Alle Variablen aus `.env.local` unter **Settings → Environment
  Variables** eintragen, danach ein Redeploy auslösen.
- Den Stripe-Webhook-Endpunkt (siehe Abschnitt 5) auf die
  Produktions-URL zeigen lassen.

## Tech-Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Framer Motion (`useScroll` + `useTransform`) für den kontinuierlich
  bewegten Hintergrund; respektiert `prefers-reduced-motion`
- Supabase (`@supabase/supabase-js`) für Auth (Magic Link) und die
  `subscriptions`-Tabelle
- Stripe (`stripe`) für Checkout und Billing Portal

## Offene Platzhalter – vor dem Live-Gang ersetzen

- **Bilder** (`public/`): siehe [`public/PLATZHALTER-BILDER.md`](./public/PLATZHALTER-BILDER.md)
  – `logo.png`, `team-foto.png` sind generierte Platzhalter,
  `business-school-1.jpg` bis `business-school-6.jpg` fehlen noch komplett.
- **LinkedIn-URLs**: `components/TeamSection.tsx` – Konstanten
  `TEAM_LINKEDIN` (Mariam, Salvador, Blanca) und `FEHLERFIX_LINKEDIN_URL`
  sind aktuell `"#"`.
- **Presse-Zitate**: `components/PressCarousel.tsx` – `PRESS_ITEMS` enthält
  Platzhaltertexte, klar mit `TODO` markiert.
- **Rechtstexte**: `app/impressum`, `app/datenschutz`, `app/agb`,
  `app/widerruf` – alle mit `[PLATZHALTER]`/`TODO` markierten Stellen
  (Anschrift, Handelsregisternummer sobald die GmbH eingetragen ist,
  USt-IdNr., Aufbewahrungsfristen). **AGB und Widerrufsbelehrung sind
  Muster und müssen vor dem Live-Gang anwaltlich geprüft werden.**
- **Stripe/Supabase-Konfiguration**: siehe Abschnitte 3–5 oben.
