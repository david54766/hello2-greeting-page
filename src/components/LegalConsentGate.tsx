import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PRIVACY_VERSION, TERMS_VERSION } from "@/lib/legal";

type GateState = "loading" | "accepted" | "required" | "error";

export function LegalConsentGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GateState>("loading");
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data, error: queryError } = await supabase
        .from("legal_acceptances")
        .select("id")
        .eq("user_id", userData.user.id)
        .eq("terms_version", TERMS_VERSION)
        .eq("privacy_version", PRIVACY_VERSION)
        .maybeSingle();
      if (!active) return;
      if (queryError) {
        setError("Legal consent is temporarily unavailable. Please try again.");
        setState("error");
      } else {
        setState(data ? "accepted" : "required");
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  const accept = async () => {
    if (!checked) return;
    setSaving(true);
    setError("");
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setSaving(false);
      setError("Your session expired. Please sign in again.");
      return;
    }
    const { error: insertError } = await supabase.from("legal_acceptances").upsert(
      {
        user_id: userData.user.id,
        terms_version: TERMS_VERSION,
        privacy_version: PRIVACY_VERSION,
        platform: "web",
        app_version: "web",
        user_agent: navigator.userAgent.slice(0, 500),
      },
      { onConflict: "user_id,terms_version,privacy_version" },
    );
    setSaving(false);
    if (insertError) {
      setError("We could not save your acceptance. Please try again.");
      return;
    }
    setState("accepted");
  };

  if (state === "accepted") return <>{children}</>;

  return (
    <main className="min-h-screen bg-background px-6 py-12 flex items-center justify-center">
      <section className="w-full max-w-lg rounded-xl border border-border bg-card p-7 shadow-lg">
        <p className="text-xs uppercase tracking-[0.2em] text-primary">Legal agreement</p>
        <h1 className="mt-2 font-display text-4xl">Before you continue.</h1>
        {state === "loading" ? (
          <p className="mt-5 text-sm text-muted-foreground">Checking your account...</p>
        ) : state === "error" ? (
          <>
            <p className="mt-5 text-sm text-destructive">{error}</p>
            <Button className="mt-6 rounded-full" onClick={() => window.location.reload()}>
              Try again
            </Button>
          </>
        ) : (
          <>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Review the current{" "}
              <Link to="/terms" target="_blank" className="text-primary underline">
                Terms of Use
              </Link>{" "}
              and{" "}
              <Link to="/privacy" target="_blank" className="text-primary underline">
                Privacy Policy
              </Link>
              .
            </p>
            <div className="mt-6 flex items-start gap-3 rounded-lg border border-border p-4">
              <Checkbox
                id="legal-acceptance"
                checked={checked}
                onCheckedChange={(value) => setChecked(value === true)}
              />
              <Label htmlFor="legal-acceptance" className="text-sm leading-5 cursor-pointer">
                I have read and agree to the Terms of Use and acknowledge the Privacy Policy.
              </Label>
            </div>
            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
            <Button
              className="mt-6 h-11 w-full rounded-full"
              disabled={!checked || saving}
              onClick={accept}
            >
              {saving ? "Saving..." : "Agree and continue"}
            </Button>
          </>
        )}
      </section>
    </main>
  );
}
