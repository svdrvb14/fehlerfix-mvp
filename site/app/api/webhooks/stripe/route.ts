import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

function planFromPriceId(priceId?: string | null): string | null {
  if (!priceId) return null;
  if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY) return "monthly";
  if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY) return "yearly";
  return priceId;
}

async function upsertSubscription(params: {
  email: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  status: string;
  plan: string | null;
  currentPeriodEnd: number;
}) {
  const { error } = await supabaseAdmin.from("subscriptions").upsert(
    {
      email: params.email,
      stripe_customer_id: params.stripeCustomerId,
      stripe_subscription_id: params.stripeSubscriptionId,
      status: params.status,
      plan: params.plan,
      current_period_end: new Date(params.currentPeriodEnd * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "email" }
  );

  if (error) {
    throw new Error(`Supabase upsert fehlgeschlagen: ${error.message}`);
  }
}

export async function POST(request: NextRequest) {
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET ist nicht konfiguriert." },
      { status: 500 }
    );
  }

  const signature = request.headers.get("stripe-signature");
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature ?? "", webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unbekannter Fehler";
    return NextResponse.json(
      { error: `Webhook-Signatur ungültig: ${message}` },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const email = session.customer_details?.email ?? session.customer_email;

        if (email && session.subscription && session.customer) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );
          await upsertSubscription({
            email,
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: subscription.id,
            status: subscription.status,
            plan: planFromPriceId(subscription.items.data[0]?.price?.id),
            currentPeriodEnd: subscription.current_period_end,
          });
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customer = await stripe.customers.retrieve(
          subscription.customer as string
        );
        const email = !customer.deleted ? customer.email : null;

        if (email) {
          await upsertSubscription({
            email,
            stripeCustomerId: subscription.customer as string,
            stripeSubscriptionId: subscription.id,
            status:
              event.type === "customer.subscription.deleted"
                ? "canceled"
                : subscription.status,
            plan: planFromPriceId(subscription.items.data[0]?.price?.id),
            currentPeriodEnd: subscription.current_period_end,
          });
        }
        break;
      }

      default:
        break;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "unbekannter Fehler";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
