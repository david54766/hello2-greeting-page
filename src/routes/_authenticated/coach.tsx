import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { runCoaching, getCoachingHistory } from "@/lib/coaching.functions";
import { synthesizeSpeech } from "@/lib/tts.functions";
import { transcribeAudio } from "@/lib/stt.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Loader2, Sparkles, Copy, History, Volume2, Square, Mic, MicOff } from "lucide-react";

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
type Resp = { insight: string; recommendation: string; action_steps: string[] };

function Coach() {
  const { tier, user } = useAuth();
  const [mode, setMode] = useState<Mode>("ceo");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<Resp | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const run = useServerFn(runCoaching);
  const tts = useServerFn(synthesizeSpeech);
  const stt = useServerFn(transcribeAudio);
  const historyFn = useServerFn(getCoachingHistory);
  const qc = useQueryClient();

  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    if (recording || transcribing) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        if (blob.size < 1000) {
          setRecording(false);
          return toast.error("Recording too short.");
        }
        setTranscribing(true);
        try {
          const buf = await blob.arrayBuffer();
          const bytes = new Uint8Array(buf);
          let bin = "";
          const CHUNK = 0x8000;
          for (let i = 0; i < bytes.length; i += CHUNK) bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
          const b64 = btoa(bin);
          const result = await stt({ data: { audioBase64: b64, mimeType: mr.mimeType || "audio/webm" } });
          if (result.error || !result.text) {
            toast.error(result.error || "Could not transcribe.");
          } else {
            setPrompt((prev) => (prev ? prev.trimEnd() + " " + result.text : result.text!));
            toast.success("Transcribed.");
          }
        } catch (e: any) {
          toast.error(e?.message ?? "Transcription failed");
        } finally {
          setTranscribing(false);
          setRecording(false);
        }
      };
      recorderRef.current = mr;
      mr.start();
      setRecording(true);
    } catch (e: any) {
      toast.error(e?.message ?? "Microphone unavailable");
      setRecording(false);
    }
  };

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    setSpeaking(false);
  };

  const speak = async (r: Resp) => {
    stopAudio();
    const text = `Insight. ${r.insight} Recommendation. ${r.recommendation} Action steps. ${r.action_steps.map((s, i) => `Step ${i + 1}. ${s}`).join(" ")}`;
    setSpeaking(true);
    try {
      const result = await tts({ data: { text } });
      if (result.error || !result.audio) {
        toast.error(result.error || "Voice unavailable");
        setSpeaking(false);
        return;
      }
      const audio = new Audio(`data:audio/mpeg;base64,${result.audio}`);
      audioRef.current = audio;
      audio.onended = () => setSpeaking(false);
      audio.onerror = () => setSpeaking(false);
      await audio.play();
    } catch (e: any) {
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
        setResponse(result.response);
        qc.invalidateQueries({ queryKey: ["coaching-history", user?.id] });
        speak(result.response);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Strategist unavailable");
    }
    setLoading(false);
  };

  const loadFromHistory = (s: any) => {
    setMode(s.mode);
    setPrompt(s.prompt);
    setResponse(s.response as Resp);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const copyPlan = () => {
    if (!response) return;
    const text = `INSIGHT\n${response.insight}\n\nRECOMMENDATION\n${response.recommendation}\n\nACTION STEPS\n${response.action_steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}`;
    navigator.clipboard.writeText(text);
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
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="What's the situation? Be specific. The more context, the sharper the move."
            rows={5}
            className="text-base"
          />
          <div className="mt-3 flex justify-end">
            <Button onClick={submit} disabled={loading || prompt.trim().length < 3} className="rounded-full px-6">
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
                {speaking ? (
                  <Button variant="ghost" size="sm" onClick={stopAudio}>
                    <Square className="size-3 mr-2" /> Stop
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => speak(response)}>
                    <Volume2 className="size-3 mr-2" /> Speak
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={copyPlan}>
                  <Copy className="size-3 mr-2" /> Copy plan
                </Button>
              </div>
            </div>
            <Section label="Insight">{response.insight}</Section>
            <Section label="Recommendation">{response.recommendation}</Section>
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
            <button
              key={s.id}
              onClick={() => loadFromHistory(s)}
              className="w-full text-left rounded-lg border border-border/60 bg-card p-3 hover:border-primary/40 transition"
            >
              <div className="flex justify-between items-baseline">
                <span className="text-xs uppercase tracking-wider text-primary">{s.mode}</span>
                <span className="text-[10px] text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</span>
              </div>
              <p className="mt-2 text-sm line-clamp-2">{s.response?.insight ?? s.prompt}</p>
            </button>
          ))}
        </div>
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
