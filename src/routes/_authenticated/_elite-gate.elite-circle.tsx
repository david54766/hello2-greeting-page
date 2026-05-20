import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listThreads,
  createThread,
  getThread,
  replyToThread,
  deleteThread,
} from "@/lib/elite-circle.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Crown, MessageSquare, Calendar, Trash2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { EliteSubNav } from "@/components/EliteSubNav";

export const Route = createFileRoute("/_authenticated/_elite-gate/elite-circle")({
  head: () => ({ meta: [{ title: "Elite Circle Conversations — Prima Donna AI™" }] }),
  component: EliteCircleBoard,
});

function EliteCircleBoard() {
  const { user } = useAuth();
  return <Board userId={user?.id} />;
}

function Board({ userId }: { userId?: string }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  if (activeId) return <ThreadView id={activeId} onBack={() => setActiveId(null)} userId={userId} />;
  return <ThreadList onOpen={setActiveId} userId={userId} />;
}

function ThreadList({ onOpen, userId }: { onOpen: (id: string) => void; userId?: string }) {
  const listFn = useServerFn(listThreads);
  const createFn = useServerFn(createThread);
  const deleteFn = useServerFn(deleteThread);
  const qc = useQueryClient();
  const threads = useQuery({ queryKey: ["elite-threads"], queryFn: () => listFn() });

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!title.trim() || !body.trim()) return;
    setBusy(true);
    const r = await createFn({ data: { title: title.trim(), body: body.trim() } });
    setBusy(false);
    if (!r.ok) return toast.error(r.message);
    toast.success("Conversation started.");
    setTitle(""); setBody(""); setShowForm(false);
    qc.invalidateQueries({ queryKey: ["elite-threads"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this thread?")) return;
    const r = await deleteFn({ data: { id } });
    if (!r.ok) return toast.error(r.message);
    qc.invalidateQueries({ queryKey: ["elite-threads"] });
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-6"><EliteSubNav /></div>
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-primary">Elite Circle</p>
          <h1 className="mt-2 font-display text-4xl">Conversations</h1>
          <p className="mt-2 text-muted-foreground">A private board for members. Share wins, ask questions, swap playbooks.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/elite-schedule"><Calendar className="size-4 mr-2" /> Schedule with Raven</Link>
          </Button>
          <Button onClick={() => setShowForm((s) => !s)} className="rounded-full">
            {showForm ? "Cancel" : "Start a conversation"}
          </Button>
        </div>
      </div>

      {showForm && (
        <div className="mt-6 rounded-xl border border-border bg-card p-5 space-y-3">
          <Input placeholder="Title" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
          <Textarea placeholder="What's on your mind?" rows={5} value={body} maxLength={10000} onChange={(e) => setBody(e.target.value)} />
          <div className="flex justify-end">
            <Button onClick={submit} disabled={busy || !title.trim() || !body.trim()} className="rounded-full">
              {busy ? "Posting…" : "Post"}
            </Button>
          </div>
        </div>
      )}

      <div className="mt-8 space-y-3">
        {threads.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {threads.data?.threads.length === 0 && (
          <p className="text-sm text-muted-foreground">No conversations yet — start the first one.</p>
        )}
        {threads.data?.threads.map((t) => (
          <button
            key={t.id}
            onClick={() => onOpen(t.id)}
            className="w-full text-left rounded-xl border border-border/60 bg-card p-5 hover:border-primary transition group"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {t.pinned && <span className="text-[10px] uppercase tracking-wider text-primary">Pinned</span>}
                  <h3 className="font-display text-xl group-hover:text-primary">{t.title}</h3>
                </div>
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{t.body}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {t.author_name} · {new Date(t.updated_at).toLocaleDateString()} · <MessageSquare className="size-3 inline" /> {t.reply_count}
                </p>
              </div>
              {t.user_id === userId && (
                <span
                  role="button"
                  onClick={(e) => { e.stopPropagation(); remove(t.id); }}
                  className="text-muted-foreground hover:text-destructive p-1"
                >
                  <Trash2 className="size-4" />
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ThreadView({ id, onBack, userId }: { id: string; onBack: () => void; userId?: string }) {
  const getFn = useServerFn(getThread);
  const replyFn = useServerFn(replyToThread);
  const qc = useQueryClient();
  const thread = useQuery({ queryKey: ["elite-thread", id], queryFn: () => getFn({ data: { id } }) });
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!body.trim()) return;
    setBusy(true);
    const r = await replyFn({ data: { thread_id: id, body: body.trim() } });
    setBusy(false);
    if (!r.ok) return toast.error(r.message);
    setBody("");
    qc.invalidateQueries({ queryKey: ["elite-thread", id] });
    qc.invalidateQueries({ queryKey: ["elite-threads"] });
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-2">
        <ArrowLeft className="size-4" /> Back to conversations
      </button>
      {thread.isLoading && <p className="mt-6 text-sm text-muted-foreground">Loading…</p>}
      {thread.data && (
        <>
          <h1 className="mt-4 font-display text-3xl">{thread.data.thread.title}</h1>
          <p className="mt-2 text-xs text-muted-foreground">
            {thread.data.thread.author_name} · {new Date(thread.data.thread.created_at).toLocaleString()}
          </p>
          <div className="mt-6 rounded-xl border border-border bg-card p-5 whitespace-pre-wrap">
            {thread.data.thread.body}
          </div>

          <div className="gold-divider mt-10" />
          <h2 className="mt-6 font-display text-xl">Replies</h2>
          <div className="mt-4 space-y-3">
            {thread.data.replies.length === 0 && <p className="text-sm text-muted-foreground">No replies yet.</p>}
            {thread.data.replies.map((r) => (
              <div key={r.id} className="rounded-lg border border-border/60 bg-card/50 p-4">
                <p className="text-xs text-muted-foreground">{r.author_name} · {new Date(r.created_at).toLocaleString()}</p>
                <p className="mt-2 whitespace-pre-wrap">{r.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-xl border border-border bg-card p-5 space-y-3">
            <Textarea placeholder="Add to the conversation…" rows={4} value={body} onChange={(e) => setBody(e.target.value)} maxLength={10000} />
            <div className="flex justify-end">
              <Button onClick={submit} disabled={busy || !body.trim()} className="rounded-full">
                {busy ? "Posting…" : "Reply"}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
