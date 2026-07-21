import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import signupPortrait from "@/assets/prima-donna-signup.jpeg";
import logoImg from "@/assets/prima-donna-logo.png";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { PRIVACY_VERSION, TERMS_VERSION } from "@/lib/legal-consent";

type SelectableTier = "essentials" | "pro";

const TIERS: { id: SelectableTier; name: string; price: string; tagline: string }[] = [
  {
    id: "essentials",
    name: "Essentials",
    price: "$97/mo",
    tagline: "Daily strategy + AI coach across all 5 modes.",
  },
  {
    id: "pro",
    name: "Pro",
    price: "$197/mo",
    tagline: "Everything in Essentials + the full Template Vault.",
  },
];

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Apply — Prima Donna AI™" }] }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  component: Signup,
});

function Signup() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [tier, setTier] = useState<SelectableTier>("essentials");
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!legalAccepted)
      return toast.error("Please agree to the Terms of Service before creating an account.");
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          intended_tier: tier,
          accepted_terms_version: TERMS_VERSION,
          acknowledged_privacy_version: PRIVACY_VERSION,
        },
        emailRedirectTo: `https://app.thepreschoolprimadonna.com/dashboard`,
      },
    });
    if (error) {
      setLoading(false);
      return toast.error(error.message);
    }
    if (data.user) {
      await supabase
        .from("profiles")
        .update({ business_name: businessName, full_name: fullName })
        .eq("id", data.user.id);
      if (data.session) {
        // The generated client types will include this table after the live migration is applied.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from("legal_acceptances").upsert(
          {
            user_id: data.user.id,
            terms_version: TERMS_VERSION,
            privacy_version: PRIVACY_VERSION,
            platform: "web",
            user_agent: navigator.userAgent.slice(0, 500),
          },
          { onConflict: "user_id,terms_version,privacy_version", ignoreDuplicates: true },
        );
      }
    }
    setLoading(false);
    toast.success("Welcome to Prima Donna AI.");
    nav({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="hidden md:flex flex-col justify-between p-12 bg-gradient-to-br from-primary/10 via-rose-soft/20 to-background">
        <Link to="/" className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <img
            src={logoImg}
            alt="The Preschool Prima Donna"
            width={64}
            height={64}
            className="h-12 sm:h-14 md:h-16 w-auto aspect-square"
          />
          <span className="font-display text-lg sm:text-xl text-primary self-end pb-1.5 sm:pb-2">
            AI™
          </span>
        </Link>
        <div className="mx-auto w-full max-w-xs aspect-[3/4] overflow-hidden rounded-[2rem] shadow-2xl shadow-primary/20">
          <img
            src={signupPortrait}
            alt="Founder of Prima Donna AI™"
            className="size-full object-cover"
            loading="eager"
          />
        </div>
        <blockquote className="font-display text-2xl leading-tight max-w-md text-center italic">
          "You don't need another chatbot. You need a strategist who already knows your room."
        </blockquote>
      </div>
      <div className="flex items-center justify-center p-8">
        <form onSubmit={submit} className="w-full max-w-md space-y-5">
          <div>
            <h1 className="font-display text-4xl">Apply</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Already a member?{" "}
              <Link to="/login" className="text-primary underline">
                Sign in
              </Link>
            </p>
          </div>

          <div className="space-y-2">
            <Label>Choose your tier</Label>
            <div className="grid sm:grid-cols-2 gap-2">
              {TIERS.map((t) => {
                const active = tier === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTier(t.id)}
                    className={`text-left rounded-xl border p-3 transition ${
                      active
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-display text-lg">{t.name}</span>
                      {active && <Check className="size-4 text-primary" />}
                    </div>
                    <div className="text-xs text-primary font-medium">{t.price}</div>
                    <p className="mt-1 text-xs text-muted-foreground leading-snug">{t.tagline}</p>
                  </button>
                );
              })}
            </div>
            <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-display text-sm">Elite Circle · $497/mo</span>
                <Link to="/apply-elite" className="text-primary underline">
                  Apply →
                </Link>
              </div>
              <p className="mt-1 text-muted-foreground leading-snug">
                Invitation only. Requires application + approval before signup.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Your name</Label>
            <Input
              id="name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="biz">Center name</Label>
            <Input
              id="biz"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-card p-4">
            <Checkbox
              id="signup-legal"
              checked={legalAccepted}
              onCheckedChange={(value) => setLegalAccepted(value === true)}
            />
            <Label
              htmlFor="signup-legal"
              className="cursor-pointer text-sm font-normal leading-relaxed"
            >
              I agree to the{" "}
              <Link
                to="/terms"
                target="_blank"
                className="text-primary underline underline-offset-4"
              >
                Terms of Service
              </Link>{" "}
              and acknowledge the{" "}
              <Link
                to="/privacy"
                target="_blank"
                className="text-primary underline underline-offset-4"
              >
                Privacy Policy
              </Link>
              . Website cookie choices are managed separately.
            </Label>
          </div>
          <Button
            type="submit"
            className="w-full rounded-full h-11"
            disabled={loading || !legalAccepted}
          >
            {loading
              ? "Creating your seat…"
              : `Take my seat — ${TIERS.find((t) => t.id === tier)?.name}`}
          </Button>
          <p className="text-xs text-muted-foreground text-center">Upgrade or downgrade anytime.</p>
        </form>
      </div>
    </div>
  );
}
