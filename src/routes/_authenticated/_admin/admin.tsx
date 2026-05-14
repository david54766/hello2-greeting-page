import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

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

  const loadAll = async () => {
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

  useEffect(() => { loadAll(); }, []);

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
    loadAll();
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <p className="text-xs uppercase tracking-[0.25em] text-primary">Admin</p>
      <h1 className="mt-2 font-display text-4xl">Platform overview</h1>

      <section className="mt-10 grid sm:grid-cols-4 gap-4">
        <Stat label="Essentials" value={counts.essentials} />
        <Stat label="Pro" value={counts.pro} />
        <Stat label="Elite" value={counts.elite} />
        <Stat label="Total sessions" value={counts.sessions} />
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
                  <span className="text-xs uppercase text-muted-foreground">{d.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
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
