// Gemeinsames Preismodell für PricingSection (Anzeige) und die Checkout-API
// (Zuordnung zu Stripe-Preisen). Die Beträge hier MÜSSEN exakt zu den
// unit_amount-Werten der Mengenstaffeln (volume tiers) passen, die in Stripe
// für die vier Preise hinterlegt sind - siehe .env.local.example für die
// genaue Einrichtung.

export type Language = "single" | "combo";
export type Billing = "monthly" | "yearly";
export type UserCount = 1 | 2 | 3 | 4;

export const USER_COUNTS: UserCount[] = [1, 2, 3, 4];

// Rabattstufen des Familienabos: der Gesamtbetrag für alle Nutzer wird um
// diesen Prozentsatz reduziert, sobald mehr als 1 Nutzer gebucht wird.
const FAMILY_DISCOUNT: Record<UserCount, number> = {
  1: 0,
  2: 0.11,
  3: 0.22,
  4: 0.33,
};

// Basispreis für einen einzelnen Nutzer, in Cent.
const BASE_PRICE_CENTS: Record<Language, Record<Billing, number>> = {
  single: { monthly: 1200, yearly: 8999 },
  combo: { monthly: 1500, yearly: 11249 },
};

// Preis pro Nutzer (Cent) bei einer bestimmten Nutzeranzahl. Der
// Gesamtrabatt wird zuerst auf den vollen Betrag gerechnet und danach durch
// die Nutzeranzahl geteilt (auf ganze Cent gerundet) - das ist exakt das
// Verfahren, mit dem auch die unit_amount-Werte der Stripe-Volumenstaffeln
// berechnet wurden.
export function perUserPriceCents(language: Language, billing: Billing, users: UserCount): number {
  const base = BASE_PRICE_CENTS[language][billing];
  const idealTotal = Math.round(base * users * (1 - FAMILY_DISCOUNT[users]));
  return Math.round(idealTotal / users);
}

export function totalPriceCents(language: Language, billing: Billing, users: UserCount): number {
  return perUserPriceCents(language, billing, users) * users;
}

export function formatEuro(cents: number): string {
  return (cents / 100).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " €";
}
