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

- `NEXT_PUBLIC_SUPABASE_URL` – Supabase Dashboard → Project Settings → API
- `SUPABASE_SERVICE_ROLE_KEY` – ebenfalls dort (**geheim**, nur serverseitig
  verwenden, niemals ins Frontend geben). Wird nur vom Stripe-Webhook
  benutzt, um den Abo-Status in `subscriptions` zu schreiben – die Website
  selbst hat kein eigenes Login mehr.
- `STRIPE_SECRET_KEY` – Stripe Dashboard → Developers → API keys
- `STRIPE_WEBHOOK_SECRET` – siehe Abschnitt 5 (lokales Webhook-Testen)
- `NEXT_PUBLIC_STRIPE_PRICE_ID_SINGLE_MONTHLY`,
  `NEXT_PUBLIC_STRIPE_PRICE_ID_SINGLE_YEARLY`,
  `NEXT_PUBLIC_STRIPE_PRICE_ID_COMBO_MONTHLY`,
  `NEXT_PUBLIC_STRIPE_PRICE_ID_COMBO_YEARLY` – siehe Abschnitt 4
- `STRIPE_COUPON_ID_2_USERS`, `STRIPE_COUPON_ID_3_USERS`,
  `STRIPE_COUPON_ID_4_USERS` – ebenfalls Abschnitt 4 (Familienabo-Rabatt)
- `NEXT_PUBLIC_STRIPE_PORTAL_LOGIN_URL` – siehe Abschnitt 4 (login-freier
  Self-Service-Link für "Abo verwalten")

## 3. Supabase-Migrationen ausführen

Die Tabelle `subscriptions` wird **nicht automatisch** angelegt.

1. Supabase-Projekt öffnen → **SQL Editor** → **New query**
2. Inhalt von [`supabase/migrations/001_subscriptions.sql`](./supabase/migrations/001_subscriptions.sql)
   komplett hineinkopieren, **Run** klicken
3. Danach genauso mit [`supabase/migrations/002_subscriptions_quantity.sql`](./supabase/migrations/002_subscriptions_quantity.sql)
   (fügt die Spalte `quantity` für die gebuchte Nutzeranzahl hinzu)
4. Danach genauso mit [`supabase/migrations/003_subscriptions_single_language.sql`](./supabase/migrations/003_subscriptions_single_language.sql)
   (fügt die Spalte `single_language` hinzu - welche Sprache beim
   Einzelabo gewählt wurde: "de", "en" oder "both" beim Kombi-Paket)

Das legt die Tabelle `subscriptions` an, aktiviert Row Level Security (jede
Nutzerin/jeder Nutzer darf nur die eigene Zeile lesen) und richtet einen
Trigger ein, der `user_id` automatisch verknüpft, sobald sich jemand mit
einer E-Mail-Adresse registriert, die bereits in `subscriptions` existiert
(z.B. weil vorher schon über Stripe abonniert wurde).

## 4. Stripe-Produkte, Preise &amp; Familienrabatt-Gutscheine verknüpfen

Das Preismodell hat zwei Dimensionen - Sprachumfang (Einzelsprache oder
Deutsch+Englisch) und Abrechnung (monatlich/jährlich) - macht also vier
**normale** Preise, je für einen Nutzer. Das Familienabo (2-4 Nutzer) nutzt
denselben Preis mit `quantity` = 2/3/4 im Checkout; der Rabatt (-11 %/-22 %/
-33 %) kommt separat aus drei Prozent-Gutscheinen, die automatisch
angewendet werden.

1. Stripe Dashboard → **Product catalog** → Produkt "FehlerFix Abo" anlegen
2. Vier wiederkehrende Standard-Preise anlegen (11,99 €/Monat, 89,99 €/Jahr,
   14,99 €/Monat, 112,49 €/Jahr - siehe [`.env.local.example`](./.env.local.example))
   und deren Preis-IDs (`price_...`) in `.env.local` eintragen
3. Unter **Product catalog → Coupons** drei "Percent off"-Gutscheine
   anlegen (11 %, 22 %, 33 %) - **keine** Promotion Codes dazu erstellen,
   die Gutschein-IDs direkt in `.env.local` eintragen
   (`STRIPE_COUPON_ID_2_USERS` etc.)
4. Im Stripe Dashboard unter **Settings → Billing → Customer portal**:
   Branding (Logo, Farbe, Firmenname) hinterlegen, dann im Abschnitt
   "Self-service" den Link aktivieren ("Enable link") und die generierte
   URL (`billing.stripe.com/p/login/...`) als
   `NEXT_PUBLIC_STRIPE_PORTAL_LOGIN_URL` eintragen. Kunden bestätigen dort
   selbst ihre E-Mail per Code, den Stripe verschickt – die Seite
   `/konto` verlinkt nur dorthin, ein eigenes Login-System ist nicht
   nötig.

Die drei zusätzlichen "Familienabo"-Preis-Objekte (2/3/4 Nutzer), die beim
Ausprobieren mit demselben Betrag wie das Einzelabo entstanden sein
könnten, werden vom Code nicht verwendet - der Rabatt läuft komplett über
die Gutscheine, nicht über eigene Preise. Können bestehen bleiben oder
gelöscht werden.

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
- Supabase (`@supabase/supabase-js`, serverseitig) für die
  `subscriptions`-Tabelle
- Stripe (`stripe`) für Checkout und den login-freien Self-Service-Link
  zur Abo-Verwaltung (Billing Portal)

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
