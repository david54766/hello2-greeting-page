// Server-only Stripe client. Never import from client code.
import Stripe from "stripe";

let _stripe: Stripe | undefined;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
    _stripe = new Stripe(key);
  }
  return _stripe;
}

export type Tier = "essentials" | "pro" | "elite";

const DEFAULT_PRICE_IDS: Record<Tier, string> = {
  essentials: "price_1TZki3Phk6TJdyZVe2ZatPwD",
  pro: "price_1TZki4Phk6TJdyZVrL64llc7",
  elite: "price_1TZki5Phk6TJdyZVb3L7BAcN",
};

export function priceIdFor(tier: Tier): string {
  const envMap: Record<Tier, string | undefined> = {
    essentials: process.env.STRIPE_PRICE_ESSENTIALS,
    pro: process.env.STRIPE_PRICE_PRO,
    elite: process.env.STRIPE_PRICE_ELITE,
  };
  return envMap[tier] || DEFAULT_PRICE_IDS[tier];
}
