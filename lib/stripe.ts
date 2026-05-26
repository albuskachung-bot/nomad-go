import Stripe from "stripe";

export function createStripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) {
    return null;
  }

  return new Stripe(process.env.STRIPE_SECRET_KEY);
}
