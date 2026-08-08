import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import type { Billing, Language, UserCount } from "@/lib/pricing";

// Basispreis pro Nutzer (Einzelabo-Preis) - Menge (quantity) macht daraus
// den Gesamtbetrag für 1-4 Nutzer. Der Familienrabatt kommt NICHT aus
// einer Mengenstaffel, sondern aus einem separat hinterlegten
// Prozent-Gutschein, der beim Checkout automatisch angewendet wird. Siehe
// .env.local.example für die genaue Einrichtung in Stripe.
const PRICE_IDS: Record<Language, Record<Billing, string | undefined>> = {
  single: {
    monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_SINGLE_MONTHLY,
    yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_SINGLE_YEARLY,
  },
  combo: {
    monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_COMBO_MONTHLY,
    yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_COMBO_YEARLY,
  },
};

// Gutschein-IDs für die Familienabo-Stufen (-11 %/-22 %/-33 %). Gilt
// sprach- und laufzeitunabhängig, da ein Prozent-Gutschein unabhängig vom
// zugrunde liegenden Preis wirkt.
const FAMILY_COUPON_IDS: Partial<Record<UserCount, string | undefined>> = {
  2: process.env.STRIPE_COUPON_ID_2_USERS,
  3: process.env.STRIPE_COUPON_ID_3_USERS,
  4: process.env.STRIPE_COUPON_ID_4_USERS,
};

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const plan: unknown = body?.plan;
  const language: unknown = body?.language;
  const users: unknown = body?.users;
  const singleLanguage: unknown = body?.singleLanguage;

  if (plan !== "monthly" && plan !== "yearly") {
    return NextResponse.json(
      { error: "Ungültiger Plan. Erwartet: 'monthly' oder 'yearly'." },
      { status: 400 }
    );
  }

  if (language !== "single" && language !== "combo") {
    return NextResponse.json(
      { error: "Ungültige Sprachauswahl. Erwartet: 'single' oder 'combo'." },
      { status: 400 }
    );
  }

  // Beim Einzelabo (nicht beim Deutsch+Englisch-Paket) muss festgelegt sein,
  // welche der beiden Sprachen der Kunde bekommt - beeinflusst nicht den
  // Preis, wird aber als Metadaten am Abo hinterlegt.
  if (language === "single" && singleLanguage !== "de" && singleLanguage !== "en") {
    return NextResponse.json(
      { error: "Ungültige Sprachauswahl fürs Einzelabo. Erwartet: 'de' oder 'en'." },
      { status: 400 }
    );
  }

  if (typeof users !== "number" || !Number.isInteger(users) || users < 1 || users > 4) {
    return NextResponse.json(
      { error: "Ungültige Nutzeranzahl. Erwartet: eine ganze Zahl von 1 bis 4." },
      { status: 400 }
    );
  }

  const priceId = PRICE_IDS[language][plan];
  if (!priceId) {
    return NextResponse.json(
      { error: "Für diese Kombination ist keine Stripe-Preis-ID konfiguriert." },
      { status: 500 }
    );
  }

  const userCount = users as UserCount;
  let couponId: string | undefined;
  if (userCount > 1) {
    couponId = FAMILY_COUPON_IDS[userCount];
    if (!couponId) {
      return NextResponse.json(
        { error: `Für ${userCount} Nutzer ist kein Familienabo-Gutschein konfiguriert.` },
        { status: 500 }
      );
    }
  }

  const origin = request.headers.get("origin") ?? new URL(request.url).origin;

  // Optional: falls der Nutzer aus der App heraus mit bekannter E-Mail zum
  // Checkout geleitet wird, kann diese vorab in Stripe Checkout eingetragen
  // werden.
  const email =
    typeof body?.email === "string" && body.email.includes("@")
      ? body.email
      : undefined;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: userCount }],
      success_url: `${origin}/konto?checkout=success`,
      cancel_url: `${origin}/#preise`,
      customer_email: email,
      // Sprachwahl beim Einzelabo hat keinen Einfluss auf den Preis, wird
      // aber am Abo hinterlegt, damit klar ist, welche Sprachversion der
      // Kunde bekommen soll.
      subscription_data: {
        metadata: {
          single_language: language === "single" ? (singleLanguage as string) : "both",
        },
      },
      // Stripe erlaubt "discounts" und "allow_promotion_codes" nicht
      // gleichzeitig auf einer Checkout Session: das Einzelabo lässt den
      // Kunden einen eigenen Aktionscode eingeben, das Familienabo hat den
      // Rabatt bereits fest über den passenden Gutschein hinterlegt.
      ...(couponId
        ? { discounts: [{ coupon: couponId }] }
        : { allow_promotion_codes: true }),
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
