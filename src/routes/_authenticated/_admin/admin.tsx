import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listAllUsers,
  setUserTier,
  listEliteRequests,
  updateEliteRequestStatus,
  deleteRagDocument,
} from "@/lib/admin.functions";
import {
  listEliteApplications,
  decideEliteApplication,
} from "@/lib/elite-application.functions";
import {
  listEliteSignupRequests,
  decideEliteSignupRequest,
} from "@/lib/elite-signup.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Trash2, CheckCircle2, XCircle } from "lucide-react";
import { RavenVideosAdmin } from "@/components/admin/RavenVideosAdmin";
import { TemplateVaultManager } from "@/components/admin/TemplateVaultManager";


export const Route = createFileRoute("/_authenticated/_admin/admin")({
  head: () => ({ meta: [{ title: "Admin — Prima Donna AI™" }] }),
  component: Admin,
});

function Admin() {
  const [counts, setCounts] = useState({ essentials: 0, pro: 0, elite: 0, sessions: 0 });
  const [docs, setDocs] = useState<{ id: string; title: string; status: string }[]>([]);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const usersFn = useServerFn(listAllUsers);
  const tierFn = useServerFn(setUserTier);
  const eliteFn = useServerFn(listEliteRequests);
  const eliteUpdateFn = useServerFn(updateEliteRequestStatus);
  const deleteDocFn = useServerFn(deleteRagDocument);
  const listAppsFn = useServerFn(listEliteApplications);
  const decideAppFn = useServerFn(decideEliteApplication);
  const listSignupReqFn = useServerFn(listEliteSignupRequests);
  const decideSignupReqFn = useServerFn(decideEliteSignupRequest);
  const qc = useQueryClient();

  const users = useQuery({ queryKey: ["admin-users"], queryFn: () => usersFn() });
  const eliteReqs = useQuery({ queryKey: ["admin-elite-requests"], queryFn: () => eliteFn() });
  const eliteApps = useQuery({ queryKey: ["admin-elite-applications"], queryFn: () => listAppsFn() });
  const signupReqs = useQuery({ queryKey: ["admin-elite-signup-requests"], queryFn: () => listSignupReqFn() });

  const loadStats = async () => {
    const [s, sessions, d] = await Promise.all([
      supabase.from("subscriptions").select("tier"),
      supabase.from("coaching_sessions").select("id", { count: "exact", head: true }),
      supabase.from("rag_documents").select("id,title,status").order("created_at", { ascending: false }),
    ]);
    const tally = { essentials: 0, pro: 0, elite: 0, sessions: 0 };
    s.data?.forEach((r: any) => { tally[r.tier as keyof typeof tally]++; });
    tally.sessions = sessions.count ?? 0;
    setCounts(tally);
    setDocs((d.data ?? []) as any);
  };

  useEffect(() => { loadStats(); }, []);

  const upload = async () => {
    if (!file || !title) return;
    setUploading(true);
    const { data: u } = await supabase.auth.getUser();
    const path = `${Date.now()}-${file.name}`;
    const up = await supabase.storage.from("rag-docs").upload(path, file);
    if (up.error) { toast.error(up.error.message); setUploading(false); return; }
    const { error } = await supabase.from("rag_documents").insert({ title, storage_path: path, uploaded_by: u.user?.id });
    setUploading(false);
    if (error) return toast.error(error.message);
    toast.success("Document uploaded.");
    setTitle(""); setFile(null);
    loadStats();
  };

  const removeDoc = async (id: string) => {
    const r = await deleteDocFn({ data: { id } });
    if (r.ok) { toast.success(r.message); loadStats(); } else toast.error(r.message);
  };

  const changeTier = async (uid: string, tier: "essentials" | "pro" | "elite") => {
    const r = await tierFn({ data: { targetUserId: uid, tier } });
    if (r.ok) {
      toast.success("Tier updated.");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      loadStats();
    } else toast.error(r.message);
  };

  const setReqStatus = async (id: string, status: "pending" | "scheduled" | "completed" | "declined") => {
    await eliteUpdateFn({ data: { id, status } });
    qc.invalidateQueries({ queryKey: ["admin-elite-requests"] });
  };

  const decideApp = async (id: string, decision: "approved" | "declined", admin_notes?: string) => {
    const r = await decideAppFn({ data: { id, decision, admin_notes } });
    if (r.ok) {
      toast.success(r.message);
      qc.invalidateQueries({ queryKey: ["admin-elite-applications"] });
      // Approved applicants will need their tier upgraded — surface a hint.
      if (decision === "approved") {
        toast.message("Set the member's tier to Elite once they complete checkout.");
      }
    } else {
      toast.error(r.message);
    }
  };

  const decideSignupReq = async (id: string, decision: "approved" | "declined", admin_notes?: string) => {
    const r = await decideSignupReqFn({ data: { id, decision, admin_notes } });
    if (r.ok) {
      toast.success(r.message);
      qc.invalidateQueries({ queryKey: ["admin-elite-signup-requests"] });
    } else toast.error(r.message);
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-primary">Admin</p>
          <h1 className="mt-2 font-display text-4xl">Platform overview</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin-cookie-log" className="text-sm rounded-md border border-border px-3 py-1.5 hover:bg-muted">
            Cookie log →
          </Link>
          <Link to="/admin-analytics" className="text-sm rounded-md border border-border px-3 py-1.5 hover:bg-muted">
            View analytics →
          </Link>
        </div>
      </div>

      <section className="mt-10 grid sm:grid-cols-4 gap-4">
        <Stat label="Essentials" value={counts.essentials} />
        <Stat label="Pro" value={counts.pro} />
        <Stat label="Elite" value={counts.elite} />
        <Stat label="Total sessions" value={counts.sessions} />
      </section>

      <div className="gold-divider mt-12" />

      <section className="mt-10">
        <h2 className="font-display text-2xl">Members</h2>
        <p className="mt-2 text-sm text-muted-foreground">Promote members to Pro or Elite to unlock gated content.</p>
        <div className="mt-6 overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Center</th>
                <th className="px-4 py-3 font-medium">Tier</th>
                <th className="px-4 py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.isLoading && <tr><td className="px-4 py-3" colSpan={5}>Loading…</td></tr>}
              {users.data?.users?.map((u: any) => (
                <tr key={u.id}>
                  <td className="px-4 py-3">{u.full_name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3">{u.business_name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <select
                      value={u.tier}
                      onChange={(e) => changeTier(u.id, e.target.value as any)}
                      className="rounded-md border border-border bg-background px-2 py-1 text-sm capitalize"
                    >
                      <option value="essentials">Essentials</option>
                      <option value="pro">Pro</option>
                      <option value="elite">Elite</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="gold-divider mt-12" />

      <section className="mt-10">
        <h2 className="font-display text-2xl">Elite Circle signup requests</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Public applications from prospects without an account yet. Approving sends them an invitation email; on first sign-in they're provisioned at the Elite tier automatically.
        </p>
        <div className="mt-6 space-y-3">
          {signupReqs.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {signupReqs.data?.requests?.length === 0 && (
            <p className="text-sm text-muted-foreground">No signup requests yet.</p>
          )}
          {signupReqs.data?.requests?.map((a: any) => (
            <ApplicationCard key={a.id} app={a} onDecide={decideSignupReq} approveLabel="Approve & invite" />
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl">Elite Circle applications</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Review and approve applicants. Approval triggers a confirmation email with final registration steps.
        </p>
        <div className="mt-6 space-y-3">
          {eliteApps.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {eliteApps.data?.applications?.length === 0 && (
            <p className="text-sm text-muted-foreground">No applications yet.</p>
          )}
          {eliteApps.data?.applications?.map((a: any) => (
            <ApplicationCard key={a.id} app={a} onDecide={decideApp} />
          ))}
        </div>
      </section>

      <div className="gold-divider mt-12" />

      <section className="mt-10">
        <h2 className="font-display text-2xl">Elite session requests</h2>
        <div className="mt-6 space-y-3">
          {eliteReqs.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {eliteReqs.data?.requests?.length === 0 && <p className="text-sm text-muted-foreground">No requests yet.</p>}
          {eliteReqs.data?.requests?.map((r: any) => (
            <div key={r.id} className="rounded-xl border border-border/60 bg-card p-5">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <div className="text-xs uppercase tracking-wider text-primary">{r.full_name ?? "Member"} · {r.business_name ?? ""}</div>
                  <p className="mt-2">{r.topic}</p>
                  {r.preferred_times && <p className="text-xs text-muted-foreground mt-1">Preferred: {r.preferred_times}</p>}
                  <p className="text-[11px] text-muted-foreground mt-2">{new Date(r.created_at).toLocaleString()}</p>
                </div>
                <select
                  value={r.status}
                  onChange={(e) => setReqStatus(r.id, e.target.value as any)}
                  className="rounded-md border border-border bg-background px-2 py-1 text-sm capitalize"
                >
                  <option value="pending">Pending</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="declined">Declined</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="gold-divider mt-12" />

      <section className="mt-10">
        <h2 className="font-display text-2xl">Knowledge base (RAG)</h2>
        <p className="mt-2 text-sm text-muted-foreground">Upload training documents. Retrieval activates in the next release.</p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <Input placeholder="Document title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <Button onClick={upload} disabled={uploading || !file || !title} className="rounded-full">
            {uploading ? "Uploading…" : "Upload"}
          </Button>
        </div>

        <div className="mt-8">
          {docs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents yet.</p>
          ) : (
            <ul className="divide-y divide-border border border-border rounded-xl">
              {docs.map((d) => (
                <li key={d.id} className="px-4 py-3 flex items-center justify-between">
                  <span>{d.title}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs uppercase text-muted-foreground">{d.status}</span>
                    <Button variant="ghost" size="sm" onClick={() => removeDoc(d.id)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <div className="gold-divider mt-12" />

      <section className="mt-10">
        <TemplateVaultManager />
      </section>

      <div className="gold-divider mt-12" />

      <section className="mt-10">
        <RavenVideosAdmin />
      </section>

    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2 font-display text-3xl">{value}</div>
    </div>
  );
}

function ApplicationCard({
  app,
  onDecide,
  approveLabel = "Approve",
}: {
  app: any;
  onDecide: (id: string, decision: "approved" | "declined", admin_notes?: string) => Promise<void>;
  approveLabel?: string;
}) {
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const isPending = app.status === "pending";

  const act = async (decision: "approved" | "declined") => {
    setBusy(true);
    await onDecide(app.id, decision, notes.trim() || undefined);
    setBusy(false);
    setNotes("");
  };

  const revenueLabel: Record<string, string> = {
    under_250k: "Under $250k",
    "250k_1m": "$250k–$1M",
    "1m_5m": "$1M–$5M",
    over_5m: "$5M+",
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card p-5">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider text-primary">
            {app.full_name} · {app.business_name}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{app.email}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {app.role ? `${app.role} · ` : ""}
            {app.state ? `${app.state} · ` : ""}
            {app.centers_count ? `${app.centers_count} center${app.centers_count > 1 ? "s" : ""} · ` : ""}
            {app.annual_revenue ? revenueLabel[app.annual_revenue] : ""}
          </p>
          <p className="mt-3 whitespace-pre-line text-sm">{app.goals}</p>
          {app.referral && (
            <p className="mt-2 text-xs text-muted-foreground">Referral: {app.referral}</p>
          )}
          <p className="mt-3 text-[11px] text-muted-foreground">
            Submitted {new Date(app.created_at).toLocaleString()}
            {app.decided_at && ` · Decided ${new Date(app.decided_at).toLocaleString()}`}
          </p>
        </div>
        <span
          className={`text-xs uppercase tracking-wider capitalize rounded-full px-3 py-1 ${
            app.status === "approved"
              ? "bg-elite/15 text-elite-foreground"
              : app.status === "declined"
                ? "bg-muted text-muted-foreground"
                : "bg-primary/15 text-primary"
          }`}
        >
          {app.status}
        </span>
      </div>

      {isPending && (
        <div className="mt-4 space-y-3 border-t border-border/60 pt-4">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Optional notes — included in decline emails, kept internal otherwise."
            maxLength={2000}
          />
          <div className="flex gap-2">
            <Button size="sm" disabled={busy} className="rounded-full" onClick={() => act("approved")}>
              <CheckCircle2 className="size-4 mr-2" /> {approveLabel}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              className="rounded-full"
              onClick={() => act("declined")}
            >
              <XCircle className="size-4 mr-2" /> Decline
            </Button>
          </div>
        </div>
      )}

      {!isPending && app.admin_notes && (
        <p className="mt-3 text-xs text-muted-foreground border-t border-border/60 pt-3">
          Notes: {app.admin_notes}
        </p>
      )}
    </div>
  );
}
