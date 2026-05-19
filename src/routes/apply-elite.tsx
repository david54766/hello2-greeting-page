import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/apply-elite")({
  head: () => ({
    meta: [
      { title: "Apply for Elite Circle — Prima Donna AI™" },
      {
        name: "description",
        content:
          "Elite Circle membership is invitation-only. Submit an application to be considered for the next cohort.",
      },
    ],
  }),
  component: ApplyElite,
});

function ApplyElite() {
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    business_name: "",
    state: "",
    role: "",
    centers_count: "",
    annual_revenue: "",
    goals: "",
    referral: "",
  });

  const update = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const payload: any = {
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      business_name: form.business_name.trim(),
      goals: form.goals.trim(),
    };
    if (form.state) payload.state = form.state.trim();
    if (form.role) payload.role = form.role.trim();
    if (form.centers_count) payload.centers_count = Number(form.centers_count);
    if (form.annual_revenue) payload.annual_revenue = form.annual_revenue;
    if (form.referral) payload.referral = form.referral.trim();

    const res = await fetch("/api/public/elite-apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({ ok: false, message: "Network error" }));
    setBusy(false);
    if (!res.ok || !json.ok) return toast.error(json.message ?? "Failed to submit");
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-primary/5 via-rose-soft/10 to-background">
        <div className="max-w-lg text-center space-y-4">
          <p className="text-xs uppercase tracking-[0.25em] text-primary">Application received</p>
          <h1 className="font-display text-4xl">Thank you.</h1>
          <p className="text-muted-foreground">
            Our team reviews every Elite Circle application personally. If approved, you'll receive
            an invitation email with a secure signup link to complete your registration at the Elite
            tier.
          </p>
          <Link to="/" className="inline-block text-primary underline">
            Return home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-rose-soft/10 to-background py-16 px-6">
      <div className="mx-auto max-w-2xl">
        <Link to="/" className="font-display text-2xl">
          Prima Donna AI™
        </Link>
        <div className="mt-10">
          <p className="text-xs uppercase tracking-[0.25em] text-primary">Invitation only</p>
          <h1 className="mt-2 font-display text-4xl">Apply for the Elite Circle</h1>
          <p className="mt-3 text-muted-foreground">
            Elite Circle is our highest tier of membership — reserved for owners running serious
            operations. Submit your application below; if approved, we'll email you a registration
            link.
          </p>
        </div>

        <form onSubmit={submit} className="mt-10 space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Full name" required>
              <Input value={form.full_name} onChange={(e) => update("full_name", e.target.value)} required />
            </Field>
            <Field label="Email" required>
              <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required />
            </Field>
            <Field label="Business name" required>
              <Input value={form.business_name} onChange={(e) => update("business_name", e.target.value)} required />
            </Field>
            <Field label="Your role">
              <Input value={form.role} onChange={(e) => update("role", e.target.value)} placeholder="Owner, CEO, Director…" />
            </Field>
            <Field label="State">
              <Input value={form.state} onChange={(e) => update("state", e.target.value)} />
            </Field>
            <Field label="# of centers">
              <Input
                type="number"
                min={1}
                value={form.centers_count}
                onChange={(e) => update("centers_count", e.target.value)}
              />
            </Field>
            <Field label="Annual revenue">
              <select
                value={form.annual_revenue}
                onChange={(e) => update("annual_revenue", e.target.value)}
                className="w-full rounded-md border border-input bg-background h-10 px-3 text-sm"
              >
                <option value="">Select…</option>
                <option value="under_250k">Under $250k</option>
                <option value="250k_1m">$250k – $1M</option>
                <option value="1m_5m">$1M – $5M</option>
                <option value="over_5m">$5M+</option>
              </select>
            </Field>
            <Field label="How did you hear about us?">
              <Input value={form.referral} onChange={(e) => update("referral", e.target.value)} />
            </Field>
          </div>
          <Field label="What outcomes are you looking for?" required>
            <Textarea
              rows={5}
              minLength={20}
              maxLength={2000}
              value={form.goals}
              onChange={(e) => update("goals", e.target.value)}
              required
              placeholder="Tell us about your business, your goals, and where you need strategic support."
            />
          </Field>
          <Button type="submit" disabled={busy} className="w-full rounded-full h-11">
            {busy ? "Submitting…" : "Submit application"}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Already approved? <Link to="/login" className="text-primary underline">Sign in</Link>.
            Want Essentials or Pro instead?{" "}
            <Link to="/signup" className="text-primary underline">Self-serve signup</Link>.
          </p>
        </form>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>
        {label} {required && <span className="text-primary">*</span>}
      </Label>
      {children}
    </div>
  );
}
