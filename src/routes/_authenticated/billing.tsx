import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, ExternalLink, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import {
  createBillingPortalSession,
  createCheckoutSession,
  getBillingStatus,
} from "@/lib/billing.functions";

export const Route = createFileRoute("/_authenticated/billing")({
  head: () => ({ meta: [{ title: "Billing — Prima Donna AI™" }] }),
  component: Billing,
});

type TierDef = {
  id: "essentials" | "pro" | "elite";
  name: string;
  price: string;
  tagline: string;
  features: string[];
  eliteOnly?: boolean;
};

const TIERS: TierDef[] = [
  {
    id: "essentials",
    name: "Essentials",
    price: "$97/mo",
    tagline: "Daily strategy + AI coach across all 5 modes.",
    features: ["AI Coach (all modes)", "Daily 3 AM recommendations", "Raven voice replies", "Centers manager"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$197/mo",
    tagline: "Everything in Essentials + the full Template Vault.",
    features: ["Everything in Essentials", "Full Template Vault", "Visual examples in coach", "Priority responses"],
  },
  {
    id: "elite",
    name: "Elite Circle",
    price: "$497/mo",
    tagline: "Invitation only. Live 1:1 with Raven + private community.",
    features: ["Everything in Pro", "1:1 scheduling with Raven", "Elite Vault content", "Conversations Board access"],
    eliteOnly: true,
  },
];

function Billing() {
  const statusFn = useServerFn(getBillingStatus);
  const checkoutFn = useServerFn(createCheckoutSession);
  const portalFn = useServerFn(createBillingPortalSession);
  const [pending, setPending] = useState<string | null>(null);

  const status = useQuery({
    queryKey: ["billing-status"],
    queryFn: () => statusFn(),
  });

  const handleSubscribe = async (tier: "essentials" | "pro" | "elite") => {
    setPending(tier);
    const res = await checkoutFn({ data: { tier } });
    setPending(null);
    if (res.error || !res.url) return toast.error(res.error ?? "Could not start checkout");
    window.location.href = res.url;
  };

  const handlePortal = async () => {
    setPending("portal");
    const res = await portalFn();
    setPending(null);
    if (res.error || !res.url) return toast.error(res.error ?? "Could not open billing portal");
    window.location.href = res.url;
  };

  const currentTier = status.data?.tier ?? "essentials";
  const isActive = status.data?.status === "active" || status.data?.status === "trialing";

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6">
        <ArrowLeft className="size-4" /> Back to dashboard
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-4xl">Billing</h1>
          <p className="mt-2 text-muted-foreground">
            All plans are monthly subscriptions. Upgrade, downgrade, or cancel anytime.
          </p>
        </div>
        {status.data?.hasCustomer && (
          <Button variant="outline" onClick={handlePortal} disabled={pending === "portal"}>
            {pending === "portal" ? "Opening…" : "Manage billing"}
            <ExternalLink className="size-4 ml-2" />
          </Button>
        )}
      </div>

      <Card className="p-5 mb-8 bg-primary/5 border-primary/20">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-muted-foreground">Current plan:</span>
          <Badge variant="secondary" className="capitalize text-base">{currentTier}</Badge>
          <Badge variant={isActive ? "default" : "outline"} className="capitalize">
            {status.data?.status ?? "—"}
          </Badge>
          {status.data?.currentPeriodEnd && (
            <span className="text-xs text-muted-foreground">
              Renews {new Date(status.data.currentPeriodEnd).toLocaleDateString()}
            </span>
          )}
        </div>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        {TIERS.map((t) => {
          const isCurrent = currentTier === t.id && isActive;
          return (
            <Card key={t.id} className={`p-6 flex flex-col ${isCurrent ? "ring-2 ring-primary" : ""}`}>
              <div className="flex items-center justify-between">
                <h3 className="font-display text-2xl">{t.name}</h3>
                {isCurrent && <Badge>Current</Badge>}
              </div>
              <p className="text-primary font-medium mt-1">{t.price}</p>
              <p className="text-sm text-muted-foreground mt-2 mb-4">{t.tagline}</p>
              <ul className="space-y-2 text-sm flex-1">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="size-4 text-primary shrink-0 mt-0.5" /> {f}
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                {t.eliteOnly ? (
                  <div className="space-y-2">
                    <Button
                      className="w-full"
                      disabled={isCurrent || pending === t.id}
                      onClick={() => handleSubscribe(t.id)}
                    >
                      {isCurrent ? "Active" : pending === t.id ? "Loading…" : "Subscribe — approved members"}
                    </Button>
                    <Link to="/apply-elite" className="block text-xs text-center text-primary underline">
                      Not approved yet? Apply →
                    </Link>
                  </div>
                ) : (
                  <Button
                    className="w-full"
                    variant={isCurrent ? "outline" : "default"}
                    disabled={isCurrent || pending === t.id}
                    onClick={() => handleSubscribe(t.id)}
                  >
                    {isCurrent ? "Active" : pending === t.id ? "Loading…" : `Subscribe to ${t.name}`}
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
