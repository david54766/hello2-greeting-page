// Server-only Stripe client. Never import from client code.
import Stripe from "stripe";

let _stripe: Stripe | undefined;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
    _stripe = new Stripe(key, { apiVersion: "2024-12-18.acacia" as Stripe.LatestApiVersion });
  }
  return _stripe;
}

export type Tier = "essentials" | "pro" | "elite";

export function priceIdFor(tier: Tier): string {
  const map: Record<Tier, string | undefined> = {
    essentials: process.env.STRIPE_PRICE_ESSENTIALS,
    pro: process.env.STRIPE_PRICE_PRO,
    elite: process.env.STRIPE_PRICE_ELITE,
  };
  const id = map[tier];
  if (!id) throw new Error(`Missing Stripe price ID for tier "${tier}". Set STRIPE_PRICE_${tier.toUpperCase()} in secrets.`);
  return id;
}
