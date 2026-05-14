import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth, tierAtLeast } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Lock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/templates")({
  head: () => ({ meta: [{ title: "Template Vault — Prima Donna AI™" }] }),
  component: Templates,
});

type Tpl = { id: string; title: string; description: string | null; category: string; tier_required: "essentials" | "pro" | "elite"; storage_path: string };

function Templates() {
  const { tier } = useAuth();
  const [items, setItems] = useState<Tpl[]>([]);
  const canAccess = tierAtLeast(tier, "pro");

  useEffect(() => {
    supabase.from("templates").select("*").order("category").then(({ data }) => setItems((data ?? []) as Tpl[]));
  }, []);

  const download = async (path: string) => {
    const { data, error } = await supabase.storage.from("templates").createSignedUrl(path, 60);
    if (error || !data) return toast.error("Could not generate download link.");
    window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <p className="text-xs uppercase tracking-[0.25em] text-primary">Template Vault</p>
      <h1 className="mt-2 font-display text-4xl md:text-5xl">The systems behind the strategy.</h1>

      {!canAccess && (
        <div className="mt-8 rounded-xl border border-primary/30 bg-primary/5 p-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="font-display text-xl">The Vault opens at Pro.</div>
            <p className="text-sm text-muted-foreground mt-1">Hiring playbooks, enrollment scripts, operational SOPs.</p>
          </div>
          <Button asChild className="rounded-full"><Link to="/settings">Upgrade</Link></Button>
        </div>
      )}

      {items.length === 0 ? (
        <p className="mt-12 text-muted-foreground">The Vault is being curated. New templates land regularly.</p>
      ) : (
        <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((t) => {
            const locked = !tierAtLeast(tier, t.tier_required);
            return (
              <div key={t.id} className={`rounded-xl border p-6 ${locked ? "border-border/60 opacity-70" : "border-border/60 bg-card hover:border-primary/40"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">{t.category}</span>
                  <span className="text-xs uppercase tracking-wider text-primary capitalize">{t.tier_required}</span>
                </div>
                <h3 className="mt-3 font-display text-xl">{t.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t.description}</p>
                <Button
                  className="mt-4 rounded-full w-full"
                  variant={locked ? "outline" : "default"}
                  disabled={locked}
                  onClick={() => download(t.storage_path)}
                >
                  {locked ? <><Lock className="size-3 mr-2" /> Locked</> : <><FileText className="size-3 mr-2" /> Download</>}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
