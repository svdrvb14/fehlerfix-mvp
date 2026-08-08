import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error("STRIPE_SECRET_KEY muss gesetzt sein.");
}

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2026-07-29.dahlia",
});
