import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PRIVACY_VERSION, TERMS_VERSION } from "@/lib/legal-consent";

type ConsentState = "loading" | "required" | "accepted" | "error";

export function LegalConsentGate({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const userId = user?.id;
  const [state, setState] = useState<ConsentState>("loading");
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    if (!userId) {
      setState("loading");
      return () => {
        active = false;
      };
    }

    setState("loading");
    // The generated client types will include this table after the live migration is applied.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("legal_acceptances")
      .select("id")
      .eq("user_id", userId)
      .eq("terms_version", TERMS_VERSION)
      .eq("privacy_version", PRIVACY_VERSION)
      .maybeSingle()
      .then(
        ({
          data,
          error: queryError,
        }: {
          data: { id: string } | null;
          error: { message: string } | null;
        }) => {
          if (!active) return;
          if (queryError) {
            setError(queryError.message);
            setState("error");
            return;
          }
          setState(data ? "accepted" : "required");
        },
      );

    return () => {
      active = false;
    };
  }, [userId]);

  const accept = async () => {
    if (!user || !agreed) return;
    setSaving(true);
    setError("");
    // The generated client types will include this table after the live migration is applied.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertError } = await (supabase as any).from("legal_acceptances").upsert(
      {
        user_id: user.id,
        terms_version: TERMS_VERSION,
        privacy_version: PRIVACY_VERSION,
        platform: "web",
        app_version: null,
        user_agent: navigator.userAgent.slice(0, 500),
      },
      { onConflict: "user_id,terms_version,privacy_version", ignoreDuplicates: true },
    );
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setState("accepted");
  };

  if (state === "accepted") return <>{children}</>;

  return (
    <main className="flex min-h-[calc(100vh-5rem)] items-center justify-center bg-background px-5 py-10">
      <section className="w-full max-w-lg rounded-2xl border border-border/70 bg-card p-6 shadow-xl shadow-primary/10 sm:p-8">
        <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ShieldCheck className="size-5" aria-hidden="true" />
        </div>
        <p className="mt-5 text-xs font-semibold uppercase text-primary">Legal update</p>
        <h1 className="mt-2 font-display text-4xl">Review and continue.</h1>

        {state === "loading" ? (
          <p className="mt-4 text-sm text-muted-foreground">Checking your account acceptance...</p>
        ) : state === "error" ? (
          <>
            <p className="mt-4 text-sm leading-relaxed text-destructive">
              We could not verify the legal agreement for this account. Please try again after the
              consent migration is applied.
            </p>
            {error && <p className="mt-2 break-words text-xs text-muted-foreground">{error}</p>}
            <Button
              variant="outline"
              className="mt-6 w-full rounded-full"
              onClick={() => void signOut()}
            >
              Sign out
            </Button>
          </>
        ) : (
          <>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Before using Prima Donna AI, review the current legal terms and privacy practices.
              Optional website cookies are managed separately and are not required for account
              access.
            </p>
            <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-sm">
              <Link
                to="/terms"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-primary underline underline-offset-4"
              >
                Terms of Service
              </Link>
              <Link
                to="/privacy"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-primary underline underline-offset-4"
              >
                Privacy Policy
              </Link>
              <Link
                to="/cookies"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-primary underline underline-offset-4"
              >
                Cookie Policy
              </Link>
            </div>
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-border/60 bg-background p-4">
              <Checkbox
                id="legal-acceptance"
                checked={agreed}
                onCheckedChange={(value) => setAgreed(value === true)}
              />
              <Label
                htmlFor="legal-acceptance"
                className="cursor-pointer text-sm font-normal leading-relaxed"
              >
                I agree to the Terms of Service and acknowledge the Privacy Policy.
              </Label>
            </div>
            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
            <Button
              className="mt-6 h-11 w-full rounded-full"
              disabled={!agreed || saving}
              onClick={accept}
            >
              {saving ? "Saving acceptance..." : "Agree and continue"}
            </Button>
            <Button
              variant="ghost"
              className="mt-2 w-full rounded-full"
              onClick={() => void signOut()}
            >
              Decline and sign out
            </Button>
          </>
        )}
      </section>
    </main>
  );
}
