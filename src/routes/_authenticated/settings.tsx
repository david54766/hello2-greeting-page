import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { hasAnyAdmin, claimFirstAdmin } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Crown } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — Prima Donna AI™" }] }),
  component: Settings,
});

function Settings() {
  const { user, tier, isAdmin, refresh } = useAuth();
  const [form, setForm] = useState({ full_name: "", business_name: "", state: "", enrollment_size: "", tuition_range: "", staff_count: "" });
  const [saving, setSaving] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const checkAdminFn = useServerFn(hasAnyAdmin);
  const claimFn = useServerFn(claimFirstAdmin);
  const adminCheck = useQuery({
    queryKey: ["has-any-admin"],
    queryFn: () => checkAdminFn(),
    enabled: !!user && !isAdmin,
  });

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) setForm({
        full_name: data.full_name ?? "",
        business_name: data.business_name ?? "",
        state: data.state ?? "",
        enrollment_size: data.enrollment_size?.toString() ?? "",
        tuition_range: data.tuition_range ?? "",
        staff_count: data.staff_count?.toString() ?? "",
      });
    });
  }, [user]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: form.full_name,
      business_name: form.business_name,
      state: form.state,
      enrollment_size: form.enrollment_size ? parseInt(form.enrollment_size) : null,
      tuition_range: form.tuition_range,
      staff_count: form.staff_count ? parseInt(form.staff_count) : null,
    }).eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Business profile updated.");
    await refresh();
  };

  const claim = async () => {
    setClaiming(true);
    const r = await claimFn();
    setClaiming(false);
    if (r.ok) {
      toast.success(r.message);
      await refresh();
      window.location.reload();
    } else {
      toast.error(r.message);
    }
  };

  const showClaim = !isAdmin && adminCheck.data && adminCheck.data.exists === false;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <p className="text-xs uppercase tracking-[0.25em] text-primary">Settings</p>
      <h1 className="mt-2 font-display text-4xl">Business profile</h1>
      <p className="mt-2 text-sm text-muted-foreground">This context personalizes every coaching response.</p>

      <form onSubmit={save} className="mt-8 grid sm:grid-cols-2 gap-5">
        <Field label="Your name"><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
        <Field label="Center name"><Input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} /></Field>
        <Field label="State"><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="e.g. TX" /></Field>
        <Field label="Enrollment count"><Input type="number" value={form.enrollment_size} onChange={(e) => setForm({ ...form, enrollment_size: e.target.value })} /></Field>
        <Field label="Tuition range"><Input value={form.tuition_range} onChange={(e) => setForm({ ...form, tuition_range: e.target.value })} placeholder="e.g. $1200-1800/mo" /></Field>
        <Field label="Staff count"><Input type="number" value={form.staff_count} onChange={(e) => setForm({ ...form, staff_count: e.target.value })} /></Field>
        <div className="sm:col-span-2">
          <Button type="submit" className="rounded-full" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </div>
      </form>

      <div className="gold-divider mt-12" />

      <section className="mt-10">
        <h2 className="font-display text-2xl">Membership</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Current tier: <span className="capitalize text-primary font-medium">{tier}</span>
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          Tier upgrades are managed by the platform owner during launch. Stripe self-serve billing wires up next.
        </p>
      </section>

      {showClaim && (
        <>
          <div className="gold-divider mt-12" />
          <section className="mt-10 rounded-2xl border border-elite/40 bg-gradient-to-br from-elite/10 to-transparent p-8">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-elite-foreground">
              <Crown className="size-3 text-elite" /> Founding admin
            </div>
            <h2 className="mt-2 font-display text-2xl">Claim platform admin</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              No admin exists yet. As the platform owner, claim the admin role to unlock the Admin portal, manage members, and upload knowledge documents.
            </p>
            <Button onClick={claim} disabled={claiming} className="mt-5 rounded-full">
              {claiming ? "Claiming…" : "Claim admin access"}
            </Button>
          </section>
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
