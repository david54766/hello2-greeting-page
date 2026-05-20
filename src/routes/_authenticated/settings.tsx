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
  const [form, setForm] = useState({ full_name: "", business_name: "", state: "", timezone: "America/New_York" });
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
        timezone: (data as any).timezone ?? "America/New_York",
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
      timezone: form.timezone,
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
        <Field label="Timezone (for daily AI brief)">
          <select
            value={form.timezone}
            onChange={(e) => setForm({ ...form, timezone: e.target.value })}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-10"
          >
            <option value="America/New_York">Eastern (New York)</option>
            <option value="America/Chicago">Central (Chicago)</option>
            <option value="America/Denver">Mountain (Denver)</option>
            <option value="America/Phoenix">Mountain — no DST (Phoenix)</option>
            <option value="America/Los_Angeles">Pacific (Los Angeles)</option>
            <option value="America/Anchorage">Alaska (Anchorage)</option>
            <option value="Pacific/Honolulu">Hawaii (Honolulu)</option>
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Button type="submit" className="rounded-full" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </div>
      </form>

      <div className="gold-divider mt-12" />

      <CentersManager userId={user?.id} />

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

type Center = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  enrollment_size: number | null;
  capacity: number | null;
  tuition_range: string | null;
  staff_count: number | null;
  ages_served: string | null;
  notes: string | null;
};

const EMPTY_CENTER = { name: "", city: "", state: "", enrollment_size: "", capacity: "", tuition_range: "", staff_count: "", ages_served: "", notes: "" };

function CentersManager({ userId }: { userId?: string }) {
  const [centers, setCenters] = useState<Center[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState(EMPTY_CENTER);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await supabase.from("centers").select("*").eq("user_id", userId).order("created_at");
    setLoading(false);
    if (error) return toast.error(error.message);
    setCenters((data ?? []) as Center[]);
  };

  useEffect(() => { load(); }, [userId]);

  const startEdit = (c: Center) => {
    setEditingId(c.id);
    setDraft({
      name: c.name ?? "",
      city: c.city ?? "",
      state: c.state ?? "",
      enrollment_size: c.enrollment_size?.toString() ?? "",
      capacity: c.capacity?.toString() ?? "",
      tuition_range: c.tuition_range ?? "",
      staff_count: c.staff_count?.toString() ?? "",
      ages_served: c.ages_served ?? "",
      notes: c.notes ?? "",
    });
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  };

  const cancel = () => { setEditingId(null); setDraft(EMPTY_CENTER); };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!userId || !draft.name.trim()) return;
    setBusy(true);
    const payload = {
      user_id: userId,
      name: draft.name.trim(),
      city: draft.city || null,
      state: draft.state || null,
      enrollment_size: draft.enrollment_size ? parseInt(draft.enrollment_size) : null,
      capacity: draft.capacity ? parseInt(draft.capacity) : null,
      tuition_range: draft.tuition_range || null,
      staff_count: draft.staff_count ? parseInt(draft.staff_count) : null,
      ages_served: draft.ages_served || null,
      notes: draft.notes || null,
    };
    const { error } = editingId
      ? await supabase.from("centers").update(payload).eq("id", editingId)
      : await supabase.from("centers").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(editingId ? "Center updated." : "Center added.");
    cancel();
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this center?")) return;
    const { error } = await supabase.from("centers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Center removed.");
    load();
  };

  return (
    <section className="mt-10">
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="font-display text-2xl">Your centers</h2>
          <p className="mt-2 text-sm text-muted-foreground">Add every center you operate. The AI uses this portfolio to tailor recommendations.</p>
        </div>
        <span className="text-xs uppercase tracking-[0.2em] text-primary">{centers.length} on file</span>
      </div>

      <div className="mt-6 space-y-3">
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!loading && centers.length === 0 && <p className="text-sm text-muted-foreground">No centers yet. Add your first below.</p>}
        {centers.map((c) => (
          <div key={c.id} className="rounded-xl border border-border/60 bg-card p-5 flex justify-between items-start gap-4">
            <div className="min-w-0">
              <div className="font-display text-lg">{c.name}</div>
              <div className="mt-1 text-sm text-muted-foreground">
                {[c.city, c.state].filter(Boolean).join(", ") || "—"} · {c.enrollment_size ?? "?"}/{c.capacity ?? "?"} enrolled · {c.tuition_range ?? "tuition n/a"} · {c.staff_count ?? "?"} staff
                {c.ages_served ? ` · ages ${c.ages_served}` : ""}
              </div>
              {c.notes && <p className="mt-2 text-sm">{c.notes}</p>}
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="ghost" size="sm" onClick={() => startEdit(c)}>Edit</Button>
              <Button variant="ghost" size="sm" onClick={() => remove(c.id)}>Remove</Button>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={submit} className="mt-6 rounded-2xl border border-border/60 bg-card p-6">
        <h3 className="font-display text-lg">{editingId ? "Edit center" : "Add a center"}</h3>
        <div className="mt-4 grid sm:grid-cols-2 gap-4">
          <Field label="Center name"><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required /></Field>
          <Field label="City"><Input value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} /></Field>
          <Field label="State"><Input value={draft.state} onChange={(e) => setDraft({ ...draft, state: e.target.value })} placeholder="e.g. TX" /></Field>
          <Field label="Ages served"><Input value={draft.ages_served} onChange={(e) => setDraft({ ...draft, ages_served: e.target.value })} placeholder="e.g. 6wks–5yrs" /></Field>
          <Field label="Enrollment"><Input type="number" value={draft.enrollment_size} onChange={(e) => setDraft({ ...draft, enrollment_size: e.target.value })} /></Field>
          <Field label="Licensed capacity"><Input type="number" value={draft.capacity} onChange={(e) => setDraft({ ...draft, capacity: e.target.value })} /></Field>
          <Field label="Tuition range"><Input value={draft.tuition_range} onChange={(e) => setDraft({ ...draft, tuition_range: e.target.value })} placeholder="$1200–1800/mo" /></Field>
          <Field label="Staff count"><Input type="number" value={draft.staff_count} onChange={(e) => setDraft({ ...draft, staff_count: e.target.value })} /></Field>
          <div className="sm:col-span-2">
            <Label>Notes / context for AI</Label>
            <textarea
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              rows={3}
              placeholder="Differentiators, current challenges, goals, market conditions…"
              className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="mt-5 flex gap-2">
          <Button type="submit" disabled={busy} className="rounded-full">{busy ? "Saving…" : editingId ? "Save changes" : "Add center"}</Button>
          {editingId && <Button type="button" variant="ghost" onClick={cancel}>Cancel</Button>}
        </div>
      </form>
    </section>
  );
}
