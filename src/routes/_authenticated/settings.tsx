import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { hasAnyAdmin, claimFirstAdmin } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Bell, Crown, Mail, Plus, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings - Prima Donna AI" }] }),
  component: Settings,
});

const NOTIFICATION_STORAGE_KEY = "prima-donna-notification-settings";
const DEFAULT_NOTIFICATIONS = {
  emailBrief: true,
  eliteReminders: true,
  aiProductUpdates: false,
  pushAlerts: true,
};

function Settings() {
  const { user, tier, isAdmin, refresh } = useAuth();
  const [form, setForm] = useState({
    full_name: "",
    business_name: "",
    state: "",
    timezone: "America/New_York",
  });
  const [notifications, setNotifications] = useState(DEFAULT_NOTIFICATIONS);
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
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data)
          setForm({
            full_name: data.full_name ?? "",
            business_name: data.business_name ?? "",
            state: data.state ?? "",
            timezone: (data as any).timezone ?? "America/New_York",
          });
      });

    void loadNotificationPreferences(user.id);
  }, [user]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name,
        business_name: form.business_name,
        state: form.state,
        timezone: form.timezone,
      })
      .eq("id", user.id);
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
    } else {
      toast.error(r.message);
    }
  };

  const loadNotificationPreferences = async (userId: string) => {
    const { data, error } = await (supabase as any)
      .from("notification_preferences")
      .select("email_brief,elite_reminders,ai_product_updates,push_alerts")
      .eq("user_id", userId)
      .maybeSingle();

    if (!error && data) {
      setNotifications({
        emailBrief: data.email_brief ?? true,
        eliteReminders: data.elite_reminders ?? true,
        aiProductUpdates: data.ai_product_updates ?? false,
        pushAlerts: data.push_alerts ?? true,
      });
      return;
    }

    const raw = window.localStorage.getItem(`${NOTIFICATION_STORAGE_KEY}:${userId}`);
    if (!raw) {
      setNotifications(DEFAULT_NOTIFICATIONS);
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      setNotifications({
        ...DEFAULT_NOTIFICATIONS,
        ...parsed,
        pushAlerts: parsed.pushAlerts ?? parsed.browserAlerts ?? DEFAULT_NOTIFICATIONS.pushAlerts,
      });
    } catch {
      setNotifications(DEFAULT_NOTIFICATIONS);
    }
  };

  const saveNotifications = async () => {
    if (!user) return;
    const { error } = await (supabase as any).from("notification_preferences").upsert(
      {
        user_id: user.id,
        email_brief: notifications.emailBrief,
        elite_reminders: notifications.eliteReminders,
        ai_product_updates: notifications.aiProductUpdates,
        push_alerts: notifications.pushAlerts,
      },
      { onConflict: "user_id" },
    );

    if (error) {
      window.localStorage.setItem(
        `${NOTIFICATION_STORAGE_KEY}:${user.id}`,
        JSON.stringify(notifications),
      );
      return toast.error(
        `${error.message}. Saved locally until the notification migration is applied.`,
      );
    }

    toast.success("Notification preferences saved.");
  };

  const showClaim = !isAdmin && adminCheck.data && adminCheck.data.exists === false;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <p className="text-xs uppercase tracking-[0.25em] text-primary">Settings</p>
      <h1 className="mt-2 font-display text-4xl">Workspace settings</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Manage membership, notifications, business context, and centers.
      </p>

      <MembershipCard tier={tier} />

      <div className="gold-divider mt-12" />

      <section className="mt-10 rounded-2xl border border-border/60 bg-card p-6">
        <h2 className="font-display text-2xl">Business profile</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This context personalizes every coaching response.
        </p>

        <form onSubmit={save} className="mt-6 grid sm:grid-cols-2 gap-5">
          <Field label="Your name">
            <Input
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </Field>
          <Field label="Business name">
            <Input
              value={form.business_name}
              onChange={(e) => setForm({ ...form, business_name: e.target.value })}
              placeholder="Your company or brand"
            />
          </Field>
          <Field label="State">
            <Input
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
              placeholder="e.g. TX"
            />
          </Field>
          <Field label="Timezone (for daily AI brief)">
            <select
              value={form.timezone}
              onChange={(e) => setForm({ ...form, timezone: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-10"
            >
              <option value="America/New_York">Eastern (New York)</option>
              <option value="America/Chicago">Central (Chicago)</option>
              <option value="America/Denver">Mountain (Denver)</option>
              <option value="America/Phoenix">Mountain - no DST (Phoenix)</option>
              <option value="America/Los_Angeles">Pacific (Los Angeles)</option>
              <option value="America/Anchorage">Alaska (Anchorage)</option>
              <option value="Pacific/Honolulu">Hawaii (Honolulu)</option>
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit" className="rounded-full" disabled={saving}>
              {saving ? "Saving..." : "Save profile"}
            </Button>
          </div>
        </form>
      </section>

      <div className="gold-divider mt-12" />

      <NotificationSettings
        settings={notifications}
        setSettings={setNotifications}
        onSave={saveNotifications}
      />

      <div className="gold-divider mt-12" />

      <section className="mt-10 rounded-2xl border border-border/60 bg-card p-6">
        <h2 className="font-display text-2xl">Legal and privacy</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Review the policies that govern this account and manage website cookie preferences.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/terms" target="_blank">
              Terms
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/privacy" target="_blank">
              Privacy
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/cookies" target="_blank">
              Cookies
            </Link>
          </Button>
        </div>
      </section>

      <div className="gold-divider mt-12" />

      <CentersManager userId={user?.id} />

      {showClaim && (
        <>
          <div className="gold-divider mt-12" />
          <section className="mt-10 rounded-2xl border border-elite/40 bg-gradient-to-br from-elite/10 to-transparent p-8">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-elite-foreground">
              <Crown className="size-3 text-elite" /> Founding admin
            </div>
            <h2 className="mt-2 font-display text-2xl">Claim platform admin</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              No admin exists yet. As the platform owner, claim the admin role to unlock the Admin
              portal, manage members, and upload knowledge documents.
            </p>
            <Button onClick={claim} disabled={claiming} className="mt-5 rounded-full">
              {claiming ? "Claiming..." : "Claim admin access"}
            </Button>
          </section>
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function MembershipCard({ tier }: { tier: string }) {
  return (
    <section className="mt-8 rounded-2xl border border-elite/50 bg-gradient-to-br from-elite/15 via-card to-card p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-elite-foreground">
            <Crown className="size-4 text-elite" /> Membership
          </div>
          <h2 className="mt-3 font-display text-2xl capitalize">{tier} plan</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your plan controls coaching depth, Elite Circle access, and premium workspace features.
          </p>
        </div>
        <span className="rounded-full bg-elite/20 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-elite-foreground">
          Active
        </span>
      </div>
      <p className="mt-5 text-xs text-muted-foreground">
        Stripe self-serve billing is next in the rollout; launch memberships are managed by the
        platform owner.
      </p>
    </section>
  );
}

function NotificationSettings({
  settings,
  setSettings,
  onSave,
}: {
  settings: typeof DEFAULT_NOTIFICATIONS;
  setSettings: (settings: typeof DEFAULT_NOTIFICATIONS) => void;
  onSave: () => void;
}) {
  const update = (key: keyof typeof DEFAULT_NOTIFICATIONS, value: boolean) =>
    setSettings({ ...settings, [key]: value });

  return (
    <section className="mt-10 rounded-2xl border border-border/60 bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl">Notifications</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose which alerts and reminders should reach this workspace.
          </p>
        </div>
        <Bell className="size-5 text-primary" />
      </div>

      <div className="mt-6 space-y-4">
        <ToggleRow
          icon={<Mail className="size-4" />}
          label="Daily AI brief"
          hint="Allow daily center snapshots and recommendations."
          checked={settings.emailBrief}
          onChange={(v) => update("emailBrief", v)}
        />
        <ToggleRow
          icon={<Crown className="size-4" />}
          label="Elite reminders"
          hint="Notify you about Elite sessions, application status, and premium events."
          checked={settings.eliteReminders}
          onChange={(v) => update("eliteReminders", v)}
        />
        <ToggleRow
          icon={<Sparkles className="size-4" />}
          label="AI product updates"
          hint="Occasional announcements when new AI tools are released."
          checked={settings.aiProductUpdates}
          onChange={(v) => update("aiProductUpdates", v)}
        />
        <ToggleRow
          icon={<Bell className="size-4" />}
          label="App push alerts"
          hint="Allow Android app notifications for this account."
          checked={settings.pushAlerts}
          onChange={(v) => update("pushAlerts", v)}
        />
      </div>

      <Button onClick={onSave} className="mt-6 rounded-full">
        Save notification settings
      </Button>
    </section>
  );
}

function ToggleRow({
  icon,
  label,
  hint,
  checked,
  onChange,
}: {
  icon: ReactNode;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border/50 bg-background/60 p-4">
      <div className="flex min-w-0 gap-3">
        <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          {icon}
        </span>
        <div>
          <div className="font-medium">{label}</div>
          <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
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

const EMPTY_CENTER = {
  name: "",
  city: "",
  state: "",
  enrollment_size: "",
  capacity: "",
  tuition_range: "",
  staff_count: "",
  ages_served: "",
  notes: "",
};

function CentersManager({ userId }: { userId?: string }) {
  const [centers, setCenters] = useState<Center[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState(EMPTY_CENTER);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("centers")
      .select("*")
      .eq("user_id", userId)
      .order("created_at");
    setLoading(false);
    if (error) return toast.error(error.message);
    setCenters((data ?? []) as Center[]);
  };

  useEffect(() => {
    void load();
  }, [userId]);

  const openAdd = () => {
    setEditingId(null);
    setDraft(EMPTY_CENTER);
    setDialogOpen(true);
  };

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
    setDialogOpen(true);
  };

  const resetDraft = () => {
    setEditingId(null);
    setDraft(EMPTY_CENTER);
    setDialogOpen(false);
  };

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
    resetDraft();
    void load();
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this center?")) return;
    const { error } = await supabase.from("centers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Center removed.");
    void load();
  };

  return (
    <section className="mt-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl">Your centers</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Add every center you operate. The AI uses this portfolio to tailor recommendations.
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-3">
          <span className="text-xs uppercase tracking-[0.2em] text-primary">
            {centers.length} on file
          </span>
          <Button type="button" onClick={openAdd} className="rounded-full">
            <Plus className="size-4 mr-2" /> Add center
          </Button>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
        {!loading && centers.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No centers yet. Add your first center from the button above.
          </p>
        )}
        {centers.map((c) => (
          <div
            key={c.id}
            className="rounded-xl border border-border/60 bg-card p-5 flex justify-between items-start gap-4"
          >
            <div className="min-w-0">
              <div className="font-display text-lg">{c.name}</div>
              <div className="mt-1 text-sm text-muted-foreground">
                {[c.city, c.state].filter(Boolean).join(", ") || "Location not set"} -{" "}
                {c.enrollment_size ?? "?"}/{c.capacity ?? "?"} enrolled -{" "}
                {c.tuition_range ?? "tuition n/a"} - {c.staff_count ?? "?"} staff
                {c.ages_served ? ` - ages ${c.ages_served}` : ""}
              </div>
              {c.notes && <p className="mt-2 text-sm">{c.notes}</p>}
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="ghost" size="sm" onClick={() => startEdit(c)}>
                Edit
              </Button>
              <Button variant="ghost" size="sm" onClick={() => remove(c.id)}>
                Remove
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetDraft();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {editingId ? "Edit center" : "Add a center"}
            </DialogTitle>
            <DialogDescription>
              Add the center details Raven should use for coaching, revenue, and operational
              guidance.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
            <Field label="Center name">
              <Input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                required
              />
            </Field>
            <Field label="City">
              <Input
                value={draft.city}
                onChange={(e) => setDraft({ ...draft, city: e.target.value })}
              />
            </Field>
            <Field label="State">
              <Input
                value={draft.state}
                onChange={(e) => setDraft({ ...draft, state: e.target.value })}
                placeholder="e.g. TX"
              />
            </Field>
            <Field label="Ages served">
              <Input
                value={draft.ages_served}
                onChange={(e) => setDraft({ ...draft, ages_served: e.target.value })}
                placeholder="e.g. 6wks-5yrs"
              />
            </Field>
            <Field label="Enrollment">
              <Input
                type="number"
                value={draft.enrollment_size}
                onChange={(e) => setDraft({ ...draft, enrollment_size: e.target.value })}
              />
            </Field>
            <Field label="Licensed capacity">
              <Input
                type="number"
                value={draft.capacity}
                onChange={(e) => setDraft({ ...draft, capacity: e.target.value })}
              />
            </Field>
            <Field label="Tuition range">
              <Input
                value={draft.tuition_range}
                onChange={(e) => setDraft({ ...draft, tuition_range: e.target.value })}
                placeholder="$1200-1800/mo"
              />
            </Field>
            <Field label="Staff count">
              <Input
                type="number"
                value={draft.staff_count}
                onChange={(e) => setDraft({ ...draft, staff_count: e.target.value })}
              />
            </Field>
            <div className="sm:col-span-2">
              <Label>Notes / context for AI</Label>
              <textarea
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                rows={4}
                placeholder="Differentiators, current challenges, goals, market conditions..."
                className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2 mt-2 flex flex-wrap gap-2">
              <Button type="submit" disabled={busy} className="rounded-full">
                {busy ? "Saving..." : editingId ? "Save changes" : "Add center"}
              </Button>
              <Button type="button" variant="ghost" onClick={resetDraft}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
