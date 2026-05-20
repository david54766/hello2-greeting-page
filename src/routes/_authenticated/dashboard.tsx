import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getTodayRecommendation } from "@/lib/coaching.functions";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { MessageSquare, FileText, TrendingUp, Sparkles, Play } from "lucide-react";
import { RavenInsightsDialog } from "@/components/RavenInsightsDialog";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Command Center — Prima Donna AI™" }] }),
  component: Dashboard,
});

type Profile = {
  full_name: string | null;
  business_name: string | null;
  enrollment_size: number | null;
  tuition_range: string | null;
  staff_count: number | null;
};

function Dashboard() {
  const { user, tier } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const dailyFn = useServerFn(getTodayRecommendation);
  const daily = useQuery({ queryKey: ["daily", user?.id], queryFn: () => dailyFn(), enabled: !!user, staleTime: 60 * 60 * 1000 });

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name,business_name,enrollment_size,tuition_range,staff_count").eq("id", user.id).maybeSingle().then(({ data }) => setProfile(data as Profile));
  }, [user]);

  const enrollment = profile?.enrollment_size ?? 0;
  const tuitionMid = parseTuition(profile?.tuition_range);
  const monthlyRev = enrollment * tuitionMid;
  const staff = profile?.staff_count ?? 0;
  const ratio = enrollment && staff ? (enrollment / staff).toFixed(1) : "—";

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <div className="flex items-baseline justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-primary">Command Center</p>
          <h1 className="mt-2 font-display text-4xl md:text-5xl">
            Welcome back, {profile?.full_name?.split(" ")[0] ?? "operator"}.
          </h1>
          <p className="mt-2 text-muted-foreground">
            {profile?.business_name ?? "Your center"} · <span className="capitalize text-primary">{tier} tier</span>
          </p>
        </div>
        <Link to="/settings" className="text-sm text-muted-foreground hover:text-primary">Update business profile →</Link>
      </div>

      <div className="gold-divider mt-8" />

      {/* Snapshot */}
      <section className="mt-10">
        <h2 className="font-display text-2xl">Center snapshot</h2>
        <div className="mt-5 grid sm:grid-cols-3 gap-4">
          <SnapshotCard label="Enrollment" value={enrollment ? String(enrollment) : "Set in profile"} />
          <SnapshotCard label="Est. monthly revenue" value={monthlyRev ? `$${monthlyRev.toLocaleString()}` : "—"} />
          <SnapshotCard label="Children per staff" value={ratio} />
        </div>
      </section>

      {/* Daily recommendation */}
      <section className="mt-10 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 via-rose-soft/10 to-transparent p-8">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-primary">
          <Sparkles className="size-3" /> Today's strategic recommendation
        </div>
        <p className="mt-4 font-display text-2xl md:text-3xl leading-snug">
          {daily.isLoading ? "Drawing today's move…" : daily.data?.recommendation ?? "—"}
        </p>
        {daily.data?.created_at && (
          <p className="mt-4 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Generated {new Date(daily.data.created_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })} · refreshes daily at 3 AM your time
          </p>
        )}
      </section>

      {/* Quick actions */}
      <section className="mt-10">
        <h2 className="font-display text-2xl">Take action</h2>
        <div className="mt-5 grid md:grid-cols-3 gap-4">
          <ActionCard to="/coach" icon={<MessageSquare className="size-5" />} title="Ask the strategist" desc="Open a structured coaching session." />
          <ActionCard to="/templates" icon={<FileText className="size-5" />} title="Open the Vault" desc="Hiring, enrollment, operations templates." />
          <ActionCard to="/coach" icon={<TrendingUp className="size-5" />} title="Build a growth plan" desc="Run Revenue Mode for a 90-day move." />
        </div>
      </section>
    </div>
  );
}

function SnapshotCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-6">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-3 font-display text-3xl">{value}</div>
    </div>
  );
}

function ActionCard({ to, icon, title, desc }: { to: string; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <Link to={to as any} className="group rounded-xl border border-border/60 bg-card p-6 hover:border-primary/50 transition block">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-full bg-primary/10 text-primary grid place-items-center">{icon}</div>
        <div className="font-display text-xl">{title}</div>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{desc}</p>
      <Button variant="link" className="mt-2 px-0 text-primary">Open →</Button>
    </Link>
  );
}

function parseTuition(range: string | null | undefined): number {
  if (!range) return 0;
  const nums = range.match(/\d+/g)?.map(Number) ?? [];
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
