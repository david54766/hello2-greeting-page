import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getStripe, priceIdFor, type Tier } from "./stripe.server";

const APP_URL = "https://app.thepreschoolprimadonna.com";

async function getOrCreateCustomer(userId: string, email: string): Promise<string> {
  const { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (sub?.stripe_customer_id) return sub.stripe_customer_id;

  const customer = await getStripe().customers.create({
    email,
    metadata: { user_id: userId },
  });
  await supabaseAdmin
    .from("subscriptions")
    .update({ stripe_customer_id: customer.id })
    .eq("user_id", userId);
  return customer.id;
}

export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ tier: z.enum(["essentials", "pro", "elite"]) }).parse(d),
  )
  .handler(async ({ data, context }): Promise<{ url: string | null; error: string | null }> => {
    const { userId, claims } = context;
    const email = (claims as { email?: string }).email;
    if (!email) return { url: null, error: "Missing account email." };

    // Elite gating: require an approved application.
    if (data.tier === "elite") {
      const { data: app } = await supabaseAdmin
        .from("elite_applications")
        .select("status")
        .eq("user_id", userId)
        .eq("status", "approved")
        .maybeSingle();
      if (!app) {
        return { url: null, error: "Elite Circle requires an approved application." };
      }
    }

    try {
      const customerId = await getOrCreateCustomer(userId, email);
      const session = await getStripe().checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [{ price: priceIdFor(data.tier as Tier), quantity: 1 }],
        success_url: `${APP_URL}/billing?checkout=success`,
        cancel_url: `${APP_URL}/billing?checkout=cancelled`,
        allow_promotion_codes: true,
        metadata: { user_id: userId, tier: data.tier },
        subscription_data: { metadata: { user_id: userId, tier: data.tier } },
      });
      return { url: session.url, error: null };
    } catch (e) {
      console.error("[billing] checkout error", e);
      return { url: null, error: e instanceof Error ? e.message : "Checkout failed" };
    }
  });

export const createBillingPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ url: string | null; error: string | null }> => {
    const { userId } = context;
    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!sub?.stripe_customer_id) {
      return { url: null, error: "No active billing account. Start a subscription first." };
    }
    try {
      const portal = await getStripe().billingPortal.sessions.create({
        customer: sub.stripe_customer_id,
        return_url: `${APP_URL}/billing`,
      });
      return { url: portal.url, error: null };
    } catch (e) {
      console.error("[billing] portal error", e);
      return { url: null, error: e instanceof Error ? e.message : "Portal failed" };
    }
  });

export const getBillingStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data } = await supabaseAdmin
      .from("subscriptions")
      .select("tier, status, current_period_end, stripe_customer_id, stripe_subscription_id")
      .eq("user_id", userId)
      .maybeSingle();
    return {
      tier: (data?.tier ?? "essentials") as Tier,
      status: data?.status ?? "inactive",
      currentPeriodEnd: data?.current_period_end ?? null,
      hasCustomer: !!data?.stripe_customer_id,
      hasSubscription: !!data?.stripe_subscription_id,
    };
  });
