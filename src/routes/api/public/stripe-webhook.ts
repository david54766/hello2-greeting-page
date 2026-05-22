import { createFileRoute } from "@tanstack/react-router";
import Stripe from "stripe";
import { getStripe, priceIdFor, type Tier } from "@/lib/stripe.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const TIER_BY_PRICE = (): Record<string, Tier> => ({
  [priceIdFor("essentials")]: "essentials",
  [priceIdFor("pro")]: "pro",
  [priceIdFor("elite")]: "elite",
});

function tierFromSubscription(sub: Stripe.Subscription): Tier | null {
  const metaTier = sub.metadata?.tier as Tier | undefined;
  if (metaTier && ["essentials", "pro", "elite"].includes(metaTier)) return metaTier;
  const priceId = sub.items.data[0]?.price.id;
  if (priceId) return TIER_BY_PRICE()[priceId] ?? null;
  return null;
}

async function userIdForCustomer(customerId: string, subMetaUserId?: string): Promise<string | null> {
  if (subMetaUserId) return subMetaUserId;
  const { data } = await supabaseAdmin
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return data?.user_id ?? null;
}

async function syncSubscription(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const userId = await userIdForCustomer(customerId, sub.metadata?.user_id);
  if (!userId) {
    console.error("[stripe-webhook] no user mapped for customer", customerId);
    return;
  }
  const tier = tierFromSubscription(sub);
  const periodEndUnix = (sub as unknown as { current_period_end?: number }).current_period_end;
  const periodEnd = periodEndUnix ? new Date(periodEndUnix * 1000).toISOString() : null;

  let effectiveTier: "essentials" | "pro" | "elite" | undefined;
  if (tier && (sub.status === "active" || sub.status === "trialing")) {
    effectiveTier = tier;
  } else if (sub.status === "canceled" || sub.status === "incomplete_expired" || sub.status === "unpaid") {
    effectiveTier = "essentials";
  }

  await supabaseAdmin
    .from("subscriptions")
    .update({
      status: sub.status,
      stripe_subscription_id: sub.id,
      stripe_customer_id: customerId,
      current_period_end: periodEnd,
      ...(effectiveTier ? { tier: effectiveTier } : {}),
    })
    .eq("user_id", userId);
}

export const Route = createFileRoute("/api/public/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!secret) {
          console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET missing");
          return new Response("Webhook not configured", { status: 500 });
        }
        const signature = request.headers.get("stripe-signature");
        if (!signature) return new Response("Missing signature", { status: 400 });

        const body = await request.text();
        let event: Stripe.Event;
        try {
          event = await getStripe().webhooks.constructEventAsync(body, signature, secret);
        } catch (err) {
          console.error("[stripe-webhook] signature verify failed", err);
          return new Response("Invalid signature", { status: 401 });
        }

        try {
          switch (event.type) {
            case "checkout.session.completed": {
              const session = event.data.object as Stripe.Checkout.Session;
              if (session.subscription) {
                const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
                const sub = await getStripe().subscriptions.retrieve(subId);
                await syncSubscription(sub);
              }
              break;
            }
            case "customer.subscription.created":
            case "customer.subscription.updated":
            case "customer.subscription.deleted": {
              await syncSubscription(event.data.object as Stripe.Subscription);
              break;
            }
            default:
              break;
          }
          return new Response("ok", { status: 200 });
        } catch (err) {
          console.error("[stripe-webhook] handler error", err);
          return new Response("Handler error", { status: 500 });
        }
      },
    },
  },
});
