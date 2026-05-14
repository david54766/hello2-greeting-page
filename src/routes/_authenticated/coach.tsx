import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { runCoaching } from "@/lib/coaching.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/coach")({
  head: () => ({ meta: [{ title: "AI Coaching — Prima Donna AI™" }] }),
  component: Coach,
});

const MODES = [
  { id: "ceo" as const, label: "CEO" },
  { id: "revenue" as const, label: "Revenue" },
  { id: "marketing" as const, label: "Marketing" },
  { id: "compliance" as const, label: "Compliance" },
  { id: "systems" as const, label: "Systems" },
];

type Mode = (typeof MODES)[number]["id"];
type Resp = { insight: string; recommendation: string; action_steps: string[] };

function Coach() {
  const { tier } = useAuth();
  const [mode, setMode] = useState<Mode>("ceo");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<Resp | null>(null);
  const run = useServerFn(runCoaching);

  const submit = async () => {
    if (prompt.trim().length < 3) return;
    setLoading(true);
    setResponse(null);
    try {
      const result = await run({ data: { mode, prompt } });
      if (result.error) toast.error(result.error);
      else setResponse(result.response);
    } catch (e: any) {
      toast.error(e?.message ?? "Strategist unavailable");
    }
    setLoading(false);
  };

  const isElite = tier === "elite";

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
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
          {isElite && (
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-elite-foreground mb-4">
              <Sparkles className="size-3" /> Elite Circle response
            </div>
          )}
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
