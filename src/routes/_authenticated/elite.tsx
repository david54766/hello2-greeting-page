import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, type FormEvent } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  submitEliteApplication,
  getMyEliteApplication,
} from "@/lib/elite-application.functions";
import { checkEliteAccess } from "@/lib/elite-access.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Link } from "@tanstack/react-router";
import { Crown, CheckCircle2, Clock, XCircle, MessageSquare, FileText, ArrowRight } from "lucide-react";
import { EliteSubNav } from "@/components/EliteSubNav";
import { toast } from "sonner";
import founderPortrait from "@/assets/prima-donna-founder.jpeg";


export const Route = createFileRoute("/_authenticated/elite")({
  head: () => ({ meta: [{ title: "Elite Circle — Prima Donna AI™" }] }),
  component: Elite,
});

function Elite() {
  const { user } = useAuth();
  const accessFn = useServerFn(checkEliteAccess);
  const access = useQuery({
    queryKey: ["elite-access", user?.id],
    queryFn: () => accessFn(),
    enabled: !!user,
    staleTime: 60_000,
  });

  if (access.isLoading || !access.data) {
    return <div className="mx-auto max-w-2xl px-6 py-20 text-center text-sm text-muted-foreground">Loading…</div>;
  }
  if (!access.data.allowed) return <ApplicationFlow />;
  return <EliteMemberView userId={user?.id} />;
}

// ---------------------------------------------------------------------------
// Application flow for non-Elite users
// ---------------------------------------------------------------------------
function ApplicationFlow() {
  const { user } = useAuth();
  const getAppFn = useServerFn(getMyEliteApplication);
  const qc = useQueryClient();

  const myApp = useQuery({
    queryKey: ["my-elite-application", user?.id],
    queryFn: () => getAppFn(),
    enabled: !!user,
    staleTime: 60_000,
  });

  const app = myApp.data?.application;

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="text-center">
        <Crown className="size-10 text-elite mx-auto" />
        <h1 className="mt-6 font-display text-4xl md:text-5xl">The Elite Circle is by application.</h1>
        <div className="mx-auto mt-10 w-56 md:w-64 aspect-[3/4] overflow-hidden rounded-[2rem] shadow-2xl shadow-primary/10">
          <img
            src={founderPortrait}
            alt="Founder of Prima Donna AI™"
            className="size-full object-cover"
            loading="eager"
          />
        </div>
        <p className="mt-8 text-muted-foreground max-w-xl mx-auto">
          Live coaching, vault content reserved for the Circle, and priority strategic guidance. Tell us
          where you are and where you're going — we review every application personally.
        </p>
      </div>

      <div className="gold-divider mt-10" />

      {myApp.isLoading && !app ? (
        <p className="mt-12 text-center text-sm text-muted-foreground">Loading your status…</p>
      ) : app?.status === "pending" ? (
        <StatusCard
          icon={<Clock className="size-5 text-elite-foreground" />}
          title="Your application is under review"
          body={`Submitted ${new Date(app.created_at).toLocaleDateString()}. The Circle team reviews each application personally — we'll email ${user?.email ?? "you"} as soon as a decision is made.`}
        />
      ) : app?.status === "approved" ? (
        <StatusCard
          icon={<CheckCircle2 className="size-5 text-elite" />}
          title="You're approved — welcome to the Circle"
          body="The final step is confirming your membership in Settings. Once you finalize, every Elite feature unlocks immediately."
          action={
            <Button asChild className="rounded-full mt-4">
              <Link to="/settings">Confirm & complete registration</Link>
            </Button>
          }
        />
      ) : app?.status === "declined" ? (
        <StatusCard
          icon={<XCircle className="size-5 text-muted-foreground" />}
          title="Not the right fit right now"
          body={
            app.admin_notes
              ? `Notes from the review team: ${app.admin_notes}`
              : "We aren't able to offer membership at this time. You're welcome to keep building inside Pro and reapply when your goals evolve."
          }
          action={
            <Button
              variant="outline"
              className="rounded-full mt-4"
              onClick={() => qc.invalidateQueries({ queryKey: ["my-elite-application", user?.id] })}
            >
              Refresh status
            </Button>
          }
        />
      ) : (
        <ApplicationForm
          defaultEmail={user?.email ?? ""}
          onSubmitted={() =>
            qc.invalidateQueries({ queryKey: ["my-elite-application", user?.id] })
          }
        />
      )}
    </div>
  );
}

type ApplicationFormState = {
  full_name: string;
  email: string;
  business_name: string;
  state: string;
  role: string;
  centers_count: string;
  annual_revenue: "" | "under_250k" | "250k_1m" | "1m_5m" | "over_5m";
  goals: string;
  referral: string;
};

const EMPTY_FORM: ApplicationFormState = {
  full_name: "",
  email: "",
  business_name: "",
  state: "",
  role: "",
  centers_count: "",
  annual_revenue: "",
  goals: "",
  referral: "",
};

const STORAGE_KEY = "elite-application-draft-v1";

function ApplicationForm({
  defaultEmail,
  onSubmitted,
}: {
  defaultEmail: string;
  onSubmitted: () => void;
}) {
  const submitFn = useServerFn(submitEliteApplication);
  const [submitting, setSubmitting] = useState(false);

  // Initialize from localStorage so the draft survives any remount/refetch.
  const [form, setForm] = useState<ApplicationFormState>(() => {
    if (typeof window === "undefined") return { ...EMPTY_FORM, email: defaultEmail };
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<ApplicationFormState>;
        return { ...EMPTY_FORM, email: defaultEmail, ...parsed };
      }
    } catch {}
    return { ...EMPTY_FORM, email: defaultEmail };
  });

  // Seed the email once it loads (without clobbering a user-edited value).
  const seededEmail = useRef(form.email.length > 0);
  useEffect(() => {
    if (!seededEmail.current && defaultEmail) {
      setForm((s) => ({ ...s, email: defaultEmail }));
      seededEmail.current = true;
    }
  }, [defaultEmail]);

  // Persist on every change.
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    } catch {}
  }, [form]);

  const update = <K extends keyof ApplicationFormState>(k: K, v: ApplicationFormState[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.goals.trim().length < 20) {
      toast.error("Tell us a bit more about your goals (at least 20 characters).");
      return;
    }
    setSubmitting(true);
    const r = await submitFn({
      data: {
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        business_name: form.business_name.trim(),
        state: form.state.trim() || undefined,
        role: form.role.trim() || undefined,
        centers_count: form.centers_count ? Number(form.centers_count) : undefined,
        annual_revenue: form.annual_revenue || undefined,
        goals: form.goals.trim(),
        referral: form.referral.trim() || undefined,
      },
    });
    setSubmitting(false);
    if (r.ok) {
      toast.success(r.message);
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {}
      onSubmitted();
    } else {
      toast.error(r.message);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="mt-10 rounded-2xl border border-elite/40 bg-gradient-to-br from-elite/5 to-transparent p-8 space-y-5"
    >
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Full name" required>
          <Input
            value={form.full_name}
            onChange={(e) => update("full_name", e.target.value)}
            required
            maxLength={120}
            autoComplete="name"
          />
        </Field>
        <Field label="Email" required>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            required
            maxLength={255}
            autoComplete="email"
          />
        </Field>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Business name" required>
          <Input
            value={form.business_name}
            onChange={(e) => update("business_name", e.target.value)}
            required
            maxLength={160}
            autoComplete="organization"
          />
        </Field>
        <Field label="Your role">
          <Input
            value={form.role}
            onChange={(e) => update("role", e.target.value)}
            placeholder="Owner, Director, COO…"
            maxLength={120}
            autoComplete="organization-title"
          />
        </Field>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Field label="State">
          <Input
            value={form.state}
            onChange={(e) => update("state", e.target.value)}
            placeholder="TX"
            maxLength={60}
            autoComplete="address-level1"
          />
        </Field>
        <Field label="Number of centers">
          <Input
            type="number"
            min={1}
            max={500}
            value={form.centers_count}
            onChange={(e) => update("centers_count", e.target.value)}
          />
        </Field>
        <Field label="Annual revenue">
          <select
            value={form.annual_revenue}
            onChange={(e) =>
              update("annual_revenue", e.target.value as ApplicationFormState["annual_revenue"])
            }
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Select…</option>
            <option value="under_250k">Under $250k</option>
            <option value="250k_1m">$250k – $1M</option>
            <option value="1m_5m">$1M – $5M</option>
            <option value="over_5m">$5M+</option>
          </select>
        </Field>
      </div>

      <Field label="What do you want to accomplish in the Circle?" required>
        <Textarea
          rows={4}
          value={form.goals}
          onChange={(e) => update("goals", e.target.value)}
          placeholder="The one transformation you want this year, the bottleneck blocking it, and where you need a higher-altitude perspective."
          required
          maxLength={2000}
        />
      </Field>

      <Field label="How did you hear about us? (optional)">
        <Input
          value={form.referral}
          onChange={(e) => update("referral", e.target.value)}
          maxLength={500}
        />
      </Field>

      <div className="pt-2">
        <Button type="submit" disabled={submitting} className="rounded-full">
          {submitting ? "Submitting…" : "Submit application"}
        </Button>
        <p className="mt-3 text-xs text-muted-foreground">
          Your draft auto-saves as you type. We review every application personally — you'll receive an
          email decision typically within 2 business days.
        </p>
      </div>
    </form>
  );
}


function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>
        {label} {required && <span className="text-elite">*</span>}
      </Label>
      {children}
    </div>
  );
}

function StatusCard({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mt-10 rounded-2xl border border-elite/40 bg-gradient-to-br from-elite/10 to-transparent p-8">
      <div className="flex items-center gap-3">
        {icon}
        <h2 className="font-display text-2xl">{title}</h2>
      </div>
      <p className="mt-3 text-muted-foreground">{body}</p>
      {action}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Elite member view
// ---------------------------------------------------------------------------
type VaultPick = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  storage_path: string;
};

function EliteMemberView({ userId: _userId }: { userId?: string }) {
  const [picks, setPicks] = useState<VaultPick[] | null>(null);

  useEffect(() => {
    supabase
      .from("templates")
      .select("id,title,description,category,storage_path")
      .eq("tier_required", "elite")
      .order("created_at", { ascending: false })
      .limit(6)
      .then(({ data }) => setPicks((data ?? []) as VaultPick[]));
  }, []);

  const download = async (path: string) => {
    const { data, error } = await supabase.storage.from("templates").createSignedUrl(path, 60);
    if (error || !data) return toast.error("Could not generate download link.");
    window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-elite-foreground">
        <Crown className="size-3 text-elite" /> Elite Circle
      </div>
      <h1 className="mt-2 font-display text-4xl md:text-5xl">Welcome to the room.</h1>

      <div className="mt-6">
        <EliteSubNav />
      </div>

      <div className="mt-8">
        <Link to="/elite-circle" className="group block rounded-2xl border border-elite/40 bg-gradient-to-br from-elite/10 to-transparent p-6 hover:border-elite transition">
          <MessageSquare className="size-6 text-elite-foreground" />
          <h3 className="mt-3 font-display text-xl">Conversations</h3>
          <p className="mt-1 text-sm text-muted-foreground">Private board for members. Share wins, ask questions, swap playbooks.</p>
        </Link>
      </div>

      <div className="gold-divider mt-10" />

      <section className="mt-10">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-elite-foreground">Curated for the Circle</p>
            <h2 className="mt-1 font-display text-2xl">Vault picks</h2>
          </div>
          <Link to="/templates" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
            View full vault <ArrowRight className="size-3" />
          </Link>
        </div>

        {picks === null ? (
          <div className="mt-5 grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-32 rounded-xl border border-border/60 bg-card/40 animate-pulse" />
            ))}
          </div>
        ) : picks.length === 0 ? (
          <p className="mt-5 text-sm text-muted-foreground">
            New Circle-only drops land here weekly.{" "}
            <Link to="/templates" className="text-primary underline">Browse the vault</Link>.
          </p>
        ) : (
          <div className="mt-5 grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {picks.map((p) => (
              <div key={p.id} className="rounded-xl border border-elite/30 bg-gradient-to-br from-elite/5 to-transparent p-5 flex flex-col">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{p.category}</span>
                  <span className="text-[10px] uppercase tracking-wider text-elite-foreground">Elite</span>
                </div>
                <h3 className="mt-2 font-display text-lg leading-tight">{p.title}</h3>
                {p.description && <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">{p.description}</p>}
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-auto pt-3 rounded-full self-start"
                  onClick={() => download(p.storage_path)}
                >
                  <FileText className="size-3 mr-1.5" /> Download
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
