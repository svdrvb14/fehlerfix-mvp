// Gemeinsames Preismodell für PricingSection (Anzeige) und die Checkout-API.
// Der Familienrabatt läuft über einen bei Stripe hinterlegten Prozent-
// Gutschein, der beim Checkout automatisch auf Menge × Basispreis
// angewendet wird (siehe app/api/checkout/route.ts und
// .env.local.example) - die Beträge hier bilden also exakt nach, was
// Stripe am Ende tatsächlich berechnet.

export type Language = "single" | "combo";
export type Billing = "monthly" | "yearly";
export type UserCount = 1 | 2 | 3 | 4;

export const USER_COUNTS: UserCount[] = [1, 2, 3, 4];

// Rabattstufen des Familienabos: der Gesamtbetrag für alle Nutzer wird um
// diesen Prozentsatz reduziert, sobald mehr als 1 Nutzer gebucht wird.
export const FAMILY_DISCOUNT: Record<UserCount, number> = {
  1: 0,
  2: 0.11,
  3: 0.22,
  4: 0.33,
};

// Basispreis für einen einzelnen Nutzer, in Cent - identisch mit dem
// unit_amount des jeweiligen Stripe-Preises.
const BASE_PRICE_CENTS: Record<Language, Record<Billing, number>> = {
  single: { monthly: 1199, yearly: 8999 },
  combo: { monthly: 1499, yearly: 11249 },
};

// Gesamtbetrag (Cent) für eine bestimmte Nutzeranzahl: Menge × Basispreis,
// abzüglich des Familienrabatts - genau die Rechnung, die Stripe beim
// Checkout durchführt, wenn der passende Gutschein automatisch greift.
export function totalPriceCents(language: Language, billing: Billing, users: UserCount): number {
  const base = BASE_PRICE_CENTS[language][billing];
  return Math.round(base * users * (1 - FAMILY_DISCOUNT[users]));
}

// Nur zur Anzeige ("X € pro Nutzer") - rechnerisch aus dem Gesamtbetrag
// abgeleitet, keine eigene Stripe-Größe.
export function perUserPriceCents(language: Language, billing: Billing, users: UserCount): number {
  return Math.round(totalPriceCents(language, billing, users) / users);
}

export function formatEuro(cents: number): string {
  return (cents / 100).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " €";
}
