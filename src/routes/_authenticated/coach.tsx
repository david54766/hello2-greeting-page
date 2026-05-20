import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useScribe, CommitStrategy } from "@elevenlabs/react";
import { runCoaching, getCoachingHistory } from "@/lib/coaching.functions";
import { createScribeToken } from "@/lib/stt.functions";
import { getRevenueProfile } from "@/lib/revenue-profile.functions";
import { supabase } from "@/integrations/supabase/client";
import { RevenueWizard } from "@/components/coach/RevenueWizard";
import { RevenueScopeBar } from "@/components/coach/RevenueScopeBar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";

import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Loader2, Sparkles, Copy, History, Volume2, Square, Mic, MicOff, Download, Printer, Trash2 } from "lucide-react";
import { exportCoachingPlanPDF } from "@/lib/export-pdf";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/coach")({
  head: () => ({ meta: [{ title: "AI Coaching — Prima Donna AI™" }] }),
  component: Coach,
});

const MODES = [
  { id: "ceo" as const, label: "CEO", tag: "Vision · Leadership · Decisions" },
  { id: "revenue" as const, label: "Revenue", tag: "Pricing · Enrollment · Retention" },
  { id: "marketing" as const, label: "Marketing", tag: "Brand · Funnels · Conversion" },
  { id: "compliance" as const, label: "Compliance", tag: "Licensing · Ratios · Policy (per state)" },
  { id: "systems" as const, label: "Systems", tag: "SOPs · Hiring · Operations" },
];

type Mode = (typeof MODES)[number]["id"];
type Resp = {
  diagnosis: string;
  impact: string;
  strategic_move: string;
  elevation: string;
  action_steps: string[];
  // legacy fields for older sessions
  insight?: string;
  recommendation?: string;
};

function normalizeResp(r: any): Resp {
  if (!r) return { diagnosis: "", impact: "", strategic_move: "", elevation: "", action_steps: [] };
  return {
    diagnosis: r.diagnosis ?? r.insight ?? "",
    impact: r.impact ?? "",
    strategic_move: r.strategic_move ?? r.recommendation ?? "",
    elevation: r.elevation ?? "",
    action_steps: Array.isArray(r.action_steps) ? r.action_steps : [],
  };
}

function Coach() {
  const { tier, user } = useAuth();
  const [mode, setMode] = useState<Mode>("ceo");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<Resp | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ttsAbortRef = useRef<AbortController | null>(null);
  const ttsReaderRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const mediaSourceRef = useRef<MediaSource | null>(null);
  const run = useServerFn(runCoaching);
  const mintScribeToken = useServerFn(createScribeToken);
  const historyFn = useServerFn(getCoachingHistory);
  const fetchRevenueProfile = useServerFn(getRevenueProfile);
  const qc = useQueryClient();

  // ---------- Revenue setup wizard ----------
  const [wizardOpen, setWizardOpen] = useState(false);
  const revenueProfileQ = useQuery({
    queryKey: ["revenue-profile", user?.id],
    enabled: !!user,
    queryFn: () => fetchRevenueProfile(),
  });
  const revenueProfile = revenueProfileQ.data?.profile;

  useEffect(() => {
    if (mode !== "revenue") return;
    if (revenueProfileQ.isLoading) return;
    if (!revenueProfile) setWizardOpen(true);
  }, [mode, revenueProfile, revenueProfileQ.isLoading]);

  const refreshRevenue = () =>
    qc.invalidateQueries({ queryKey: ["revenue-profile", user?.id] });

  // ---------- Realtime STT (live dictation) ----------
  const [recording, setRecording] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const promptRef = useRef(prompt);
  useEffect(() => { promptRef.current = prompt; }, [prompt]);

  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    commitStrategy: CommitStrategy.VAD,
    onCommittedTranscript: (data: any) => {
      const text = (data?.text ?? "").trim();
      if (!text) return;
      const base = promptRef.current.trimEnd();
      const next = base ? `${base} ${text}` : text;
      promptRef.current = next;
      setPrompt(next);
    },
  });

  const partial = (scribe as any).partialTranscript as string | undefined;
  const isConnected = (scribe as any).isConnected as boolean;

  const startRecording = useCallback(async () => {
    if (recording || connecting) return;
    setConnecting(true);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const { token, error } = await mintScribeToken();
      if (!token) {
        toast.error(error || "Voice unavailable");
        return;
      }
      await (scribe as any).connect({
        token,
        microphone: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      setRecording(true);
    } catch (e: any) {
      toast.error(e?.message ?? "Microphone unavailable");
    } finally {
      setConnecting(false);
    }
  }, [recording, connecting, mintScribeToken, scribe]);

  const stopRecording = useCallback(async () => {
    try {
      await (scribe as any).disconnect();
    } catch {}
    // Flush any straggling partial
    if (partial && partial.trim()) {
      const base = promptRef.current.trimEnd();
      const next = base ? `${base} ${partial.trim()}` : partial.trim();
      promptRef.current = next;
      setPrompt(next);
    }
    setRecording(false);
  }, [scribe, partial]);

  useEffect(() => {
    return () => {
      try { (scribe as any).disconnect?.(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Streaming TTS ----------
  const stopAudio = () => {
    try { ttsAbortRef.current?.abort(); } catch {}
    ttsAbortRef.current = null;
    try { ttsReaderRef.current?.cancel(); } catch {}
    ttsReaderRef.current = null;
    if (mediaSourceRef.current) {
      try {
        if (mediaSourceRef.current.readyState === "open") mediaSourceRef.current.endOfStream();
      } catch {}
      mediaSourceRef.current = null;
    }
    if (audioRef.current) {
      try { audioRef.current.pause(); } catch {}
      audioRef.current.removeAttribute("src");
      audioRef.current.load();
      audioRef.current = null;
    }
    setSpeaking(false);
  };

  useEffect(() => {
    return () => stopAudio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const speak = async (r: Resp) => {
    stopAudio();
    const text = `Diagnosis. ${r.diagnosis} Impact. ${r.impact} Strategic move. ${r.strategic_move} Elevation. ${r.elevation} Action steps. ${r.action_steps.map((s, i) => `Step ${i + 1}. ${s}`).join(" ")}`;
    setSpeaking(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        toast.error("Sign in to enable voice");
        setSpeaking(false);
        return;
      }

      const abort = new AbortController();
      ttsAbortRef.current = abort;

      const res = await fetch("/api/tts-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ text }),
        signal: abort.signal,
      });
      if (!res.ok || !res.body) {
        const msg = await res.text().catch(() => "");
        toast.error(msg.slice(0, 120) || "Voice unavailable");
        setSpeaking(false);
        return;
      }

      const audio = new Audio();
      audioRef.current = audio;
      audio.onended = () => setSpeaking(false);
      audio.onerror = () => setSpeaking(false);

      const MSE: typeof MediaSource | undefined = (window as any).MediaSource;
      const mime = "audio/mpeg";
      if (MSE && MSE.isTypeSupported(mime)) {
        const ms = new MSE();
        mediaSourceRef.current = ms;
        audio.src = URL.createObjectURL(ms);
        await audio.play().catch(() => { /* will start when buffered */ });
        ms.addEventListener("sourceopen", async () => {
          const sb = ms.addSourceBuffer(mime);
          const reader = res.body!.getReader();
          ttsReaderRef.current = reader;
          const queue: Uint8Array[] = [];
          let done = false;
          const pump = () => {
            if (sb.updating || queue.length === 0 || ms.readyState !== "open") return;
            try { sb.appendBuffer(queue.shift()! as unknown as ArrayBuffer); } catch {}
          };
          sb.addEventListener("updateend", () => {
            pump();
            if (done && queue.length === 0 && !sb.updating) {
              try { ms.endOfStream(); } catch {}
            }
          });
          try {
            // eslint-disable-next-line no-constant-condition
            while (true) {
              const { value, done: d } = await reader.read();
              if (d) { done = true; pump(); break; }
              if (value) { queue.push(value); pump(); }
              if (audio.paused) audio.play().catch(() => {});
            }
          } catch {
            try { ms.endOfStream("network" as any); } catch {}
          }
        });
      } else {
        // Fallback: buffer then play
        const blob = await res.blob();
        audio.src = URL.createObjectURL(blob);
        await audio.play();
      }
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      toast.error(e?.message ?? "Voice unavailable");
      setSpeaking(false);
    }
  };

  const history = useQuery({
    queryKey: ["coaching-history", user?.id],
    queryFn: () => historyFn(),
    enabled: !!user,
  });

  const submit = async () => {
    if (prompt.trim().length < 3) return;
    setLoading(true);
    setResponse(null);
    stopAudio();
    try {
      const result = await run({ data: { mode, prompt } });
      if (result.error) toast.error(result.error);
      else {
        const normalized = normalizeResp(result.response);
        setResponse(normalized);
        qc.invalidateQueries({ queryKey: ["coaching-history", user?.id] });
        speak(normalized);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Strategist unavailable");
    }
    setLoading(false);
  };

  const loadFromHistory = (s: any) => {
    setMode(s.mode);
    setPrompt(s.prompt);
    setResponse(normalizeResp(s.response));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const copyPlan = () => {
    if (!response) return;
    const parts = [
      `DIAGNOSIS\n${response.diagnosis}`,
      response.impact && `IMPACT\n${response.impact}`,
      `STRATEGIC MOVE\n${response.strategic_move}`,
      response.elevation && `ELEVATION\n${response.elevation}`,
      `ACTION STEPS\n${response.action_steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}`,
    ].filter(Boolean);
    navigator.clipboard.writeText(parts.join("\n\n"));
    toast.success("Action plan copied.");
  };

  const isElite = tier === "elite";

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 grid lg:grid-cols-[1fr_280px] gap-10">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-primary">Coaching engine</p>
        <h1 className="mt-2 font-display text-4xl md:text-5xl">Open a strategic session.</h1>

        <div className="mt-8 flex flex-wrap gap-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`rounded-full px-5 py-2 text-sm border transition ${
                mode === m.id ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border/60 hover:border-primary/40"
              }`}
            >
              {m.label} Mode
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {MODES.find((m) => m.id === mode)?.tag}
          {mode === "compliance" && " — answers are tailored to each center's state licensing rules."}
        </p>

        <div className="mt-6 flex items-center gap-2 rounded-full border border-border/60 bg-card px-4 py-2 w-fit">
          <Volume2 className="size-4 text-primary" />
          <span className="text-xs uppercase tracking-[0.2em]">Raven voice · always on</span>
        </div>

        <div className="mt-6">
          <Textarea
            value={recording && partial ? (prompt ? prompt.trimEnd() + " " + partial : partial) : prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="What's the situation? Be specific. The more context, the sharper the move."
            rows={5}
            className="text-base"
            readOnly={recording}
          />

          {(recording || connecting) && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-primary">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-primary" />
                </span>
                {connecting ? "Connecting to Raven…" : partial ? "Transcribing…" : "Listening…"}
              </div>
              <Progress value={connecting ? 15 : partial ? 65 : 35} className="h-1" />
            </div>
          )}

          <div className="mt-3 flex justify-between items-center gap-3">
            <Button
              type="button"
              variant={recording ? "destructive" : "outline"}
              onClick={recording ? stopRecording : startRecording}
              disabled={connecting || loading}
              className="rounded-full"
            >
              {connecting ? (
                <><Loader2 className="size-4 animate-spin mr-2" /> Connecting…</>
              ) : recording ? (
                <><MicOff className="size-4 mr-2" /> Stop</>
              ) : (
                <><Mic className="size-4 mr-2" /> Speak your question</>
              )}
            </Button>
            <Button onClick={submit} disabled={loading || recording || connecting || prompt.trim().length < 3} className="rounded-full px-6">
              {loading ? <><Loader2 className="size-4 animate-spin mr-2" /> Thinking</> : "Get the move"}
            </Button>
          </div>
        </div>

        {response && (
          <article className={`mt-10 rounded-2xl border p-8 ${isElite ? "border-elite bg-gradient-to-br from-elite/10 to-transparent" : "border-border/60 bg-card"}`}>
            <div className="flex items-center justify-between gap-2 mb-2">
              {isElite ? (
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-elite-foreground">
                  <Sparkles className="size-3" /> Elite Circle response
                </div>
              ) : <span />}
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => speak(response)} title={speaking ? "Restart from beginning" : "Speak"}>
                  <Volume2 className="size-3 mr-2" /> {speaking ? "Restart" : "Speak"}
                </Button>
                {speaking && (
                  <Button variant="ghost" size="sm" onClick={stopAudio}>
                    <Square className="size-3 mr-2" /> Stop
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={copyPlan}>
                  <Copy className="size-3 mr-2" /> Copy plan
                </Button>
                <Button variant="ghost" size="sm" onClick={() => exportCoachingPlanPDF(prompt, mode, response)}>
                  <Download className="size-3 mr-2" /> Export PDF
                </Button>
                <Button variant="ghost" size="sm" onClick={() => exportCoachingPlanPDF(prompt, mode, response, { printFriendly: true })}>
                  <Printer className="size-3 mr-2" /> Print-friendly PDF
                </Button>
              </div>
            </div>
            <Section label="Diagnosis">{response.diagnosis}</Section>
            {response.impact && <Section label="Impact">{response.impact}</Section>}
            <Section label="Strategic Move">{response.strategic_move}</Section>
            {response.elevation && <Section label="Elevation">{response.elevation}</Section>}
            <div className="mt-6">
              <div className="text-xs uppercase tracking-[0.2em] text-primary">Action steps</div>
              <ol className="mt-3 space-y-2">
                {response.action_steps.map((s, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="font-display text-xl text-primary leading-none">{i + 1}.</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            </div>
          </article>
        )}
      </div>

      <aside className="lg:sticky lg:top-24 self-start">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          <History className="size-3" /> Recent sessions
        </div>
        <div className="mt-4 space-y-2">
          {history.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {history.data?.sessions?.length === 0 && <p className="text-sm text-muted-foreground">No sessions yet.</p>}
          {history.data?.sessions?.map((s: any) => (
            <div
              key={s.id}
              className="group relative rounded-lg border border-border/60 bg-card hover:border-primary/40 transition"
            >
              <button
                onClick={() => loadFromHistory(s)}
                className="w-full text-left p-3 pr-9"
              >
                <div className="flex justify-between items-baseline">
                  <span className="text-xs uppercase tracking-wider text-primary">{s.mode}</span>
                  <span className="text-[10px] text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</span>
                </div>
                <p className="mt-2 text-sm line-clamp-2">{s.response?.diagnosis ?? s.response?.insight ?? s.prompt}</p>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPendingDelete(s);
                }}
                className="absolute top-2 right-2 p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition"
                aria-label="Delete session"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>

        <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && !deleting && setPendingDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this session?</AlertDialogTitle>
              <AlertDialogDescription>
                {pendingDelete ? (
                  <>
                    This will permanently remove your{" "}
                    <span className="uppercase tracking-wider text-primary">{pendingDelete.mode}</span> session
                    from {new Date(pendingDelete.created_at).toLocaleDateString()}. This cannot be undone.
                  </>
                ) : null}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={async (e) => {
                  e.preventDefault();
                  if (!pendingDelete) return;
                  setDeleting(true);
                  const { error } = await supabase.from("coaching_sessions").delete().eq("id", pendingDelete.id);
                  setDeleting(false);
                  if (error) { toast.error(error.message); return; }
                  toast.success("Session deleted");
                  qc.invalidateQueries({ queryKey: ["coaching-history", user?.id] });
                  setPendingDelete(null);
                }}
              >
                {deleting ? "Deleting…" : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </aside>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-2 first:mt-0">
      <div className="text-xs uppercase tracking-[0.2em] text-primary mt-6 first:mt-0">{label}</div>
      <p className="mt-2 text-lg leading-relaxed">{children}</p>
    </div>
  );
}
