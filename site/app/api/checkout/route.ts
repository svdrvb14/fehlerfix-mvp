import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import type { Billing, Language } from "@/lib/pricing";

// Jeder Preis hier ist in Stripe als Mengenstaffel (volume tiering)
// hinterlegt: die Nutzeranzahl wird als "quantity" mitgeschickt, und Stripe
// bestimmt daraus automatisch den passenden Rabatt-Tier. Siehe
// .env.local.example für die genaue Einrichtung dieser vier Preise.
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

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const plan: unknown = body?.plan;
  const language: unknown = body?.language;
  const users: unknown = body?.users;

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
      line_items: [{ price: priceId, quantity: users }],
      success_url: `${origin}/konto?checkout=success`,
      cancel_url: `${origin}/#preise`,
      customer_email: email,
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
