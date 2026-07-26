import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

const PRICE_IDS = {
  monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY,
  yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY,
} as const;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const plan: unknown = body?.plan;

  if (plan !== "monthly" && plan !== "yearly") {
    return NextResponse.json(
      { error: "Ungültiger Plan. Erwartet: 'monthly' oder 'yearly'." },
      { status: 400 }
    );
  }

  const priceId = PRICE_IDS[plan];
  if (!priceId) {
    return NextResponse.json(
      { error: "Für diesen Plan ist keine Stripe-Preis-ID konfiguriert." },
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
      line_items: [{ price: priceId, quantity: 1 }],
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
