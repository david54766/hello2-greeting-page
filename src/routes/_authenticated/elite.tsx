import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { submitEliteRequest, getMyEliteRequests } from "@/lib/elite.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Link } from "@tanstack/react-router";
import { Crown, Calendar } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/elite")({
  head: () => ({ meta: [{ title: "Elite Circle — Prima Donna AI™" }] }),
  component: Elite,
});

function Elite() {
  const { tier, user } = useAuth();
  const isElite = tier === "elite";
  const [topic, setTopic] = useState("");
  const [times, setTimes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submitFn = useServerFn(submitEliteRequest);
  const listFn = useServerFn(getMyEliteRequests);
  const qc = useQueryClient();
  const myReqs = useQuery({
    queryKey: ["my-elite-requests", user?.id],
    queryFn: () => listFn(),
    enabled: !!user && isElite,
  });

  if (!isElite) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-20 text-center">
        <Crown className="size-10 text-elite mx-auto" />
        <h1 className="mt-6 font-display text-5xl">The Elite Circle is by invitation.</h1>
        <p className="mt-4 text-muted-foreground">
          Live coaching, vault content reserved for the Circle, priority response styling. The room where decisions are made.
        </p>
        <Button asChild className="mt-8 rounded-full"><Link to="/settings">Apply for Elite</Link></Button>
      </div>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (topic.trim().length < 5) return;
    setSubmitting(true);
    const r = await submitFn({ data: { topic, preferred_times: times || undefined } });
    setSubmitting(false);
    if (r.ok) {
      toast.success(r.message);
      setTopic(""); setTimes("");
      qc.invalidateQueries({ queryKey: ["my-elite-requests", user?.id] });
    } else {
      toast.error(r.message);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-elite-foreground">
        <Crown className="size-3 text-elite" /> Elite Circle
      </div>
      <h1 className="mt-2 font-display text-4xl md:text-5xl">Welcome to the room.</h1>

      <div className="gold-divider mt-8" />

      <section className="mt-10 rounded-2xl border border-elite/40 bg-gradient-to-br from-elite/10 to-transparent p-8">
        <div className="flex items-center gap-3">
          <Calendar className="size-5 text-elite-foreground" />
          <h2 className="font-display text-2xl">Request a 1:1 strategy session</h2>
        </div>
        <p className="mt-3 text-muted-foreground">Tell us the situation. The Circle team will follow up within 1 business day.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label>What do you want to work on?</Label>
            <Textarea value={topic} onChange={(e) => setTopic(e.target.value)} rows={3} placeholder="e.g. Building a 90-day enrollment plan for my second location." />
          </div>
          <div className="space-y-2">
            <Label>Preferred times (optional)</Label>
            <Input value={times} onChange={(e) => setTimes(e.target.value)} placeholder="e.g. Weekday mornings CT" />
          </div>
          <Button type="submit" disabled={submitting || topic.trim().length < 5} className="rounded-full">
            {submitting ? "Submitting…" : "Request session"}
          </Button>
        </form>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl">Your requests</h2>
        <div className="mt-4 space-y-3">
          {myReqs.data?.requests?.length === 0 && <p className="text-sm text-muted-foreground">No requests yet.</p>}
          {myReqs.data?.requests?.map((r: any) => (
            <div key={r.id} className="rounded-xl border border-border/60 bg-card p-5 flex justify-between items-start gap-4">
              <div>
                <p className="text-sm">{r.topic}</p>
                {r.preferred_times && <p className="text-xs text-muted-foreground mt-1">Preferred: {r.preferred_times}</p>}
                <p className="text-[11px] text-muted-foreground mt-2">{new Date(r.created_at).toLocaleString()}</p>
              </div>
              <span className="text-xs uppercase tracking-wider text-elite-foreground capitalize">{r.status}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl">Circle Vault</h2>
        <p className="mt-2 text-muted-foreground">Curated content reserved for Elite members lives in the <Link to="/templates" className="text-primary underline">Template Vault</Link> — Elite-only items unlock automatically.</p>
      </section>
    </div>
  );
}
