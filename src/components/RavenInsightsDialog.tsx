import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Play, Video as VideoIcon } from "lucide-react";

type RavenVideo = {
  id: string;
  title: string;
  description: string | null;
  storage_path: string;
  duration_seconds: number | null;
  sort_order: number;
};

export function RavenInsightsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [videos, setVideos] = useState<RavenVideo[]>([]);
  const [selected, setSelected] = useState<RavenVideo | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    supabase
      .from("raven_videos")
      .select("id,title,description,storage_path,duration_seconds,sort_order")
      .eq("published", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const list = (data ?? []) as RavenVideo[];
        setVideos(list);
        if (list.length && !selected) setSelected(list[0]);
        setLoading(false);
      });
  }, [open]);

  useEffect(() => {
    if (!selected) {
      setSignedUrl(null);
      return;
    }
    supabase.storage.from("raven-videos").createSignedUrl(selected.storage_path, 3600).then(({ data }) => {
      setSignedUrl(data?.signedUrl ?? null);
    });
  }, [selected]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="font-display text-2xl">Daily Insights from Raven</DialogTitle>
          <DialogDescription>Premade strategy tips curated for childcare operators.</DialogDescription>
        </DialogHeader>
        <div className="grid md:grid-cols-[280px_1fr] gap-0 border-t border-border/60 mt-4">
          <aside className="border-r border-border/60 max-h-[500px] overflow-y-auto">
            {loading && <div className="p-4 text-sm text-muted-foreground">Loading…</div>}
            {!loading && videos.length === 0 && (
              <div className="p-6 text-sm text-muted-foreground">
                <VideoIcon className="size-6 mb-2 text-primary" />
                No insight videos yet. Check back soon.
              </div>
            )}
            <ul>
              {videos.map((v) => (
                <li key={v.id}>
                  <button
                    onClick={() => setSelected(v)}
                    className={`w-full text-left px-4 py-3 border-b border-border/40 hover:bg-primary/5 transition ${
                      selected?.id === v.id ? "bg-primary/10" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <Play className="size-4 text-primary mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium truncate">{v.title}</div>
                        {v.duration_seconds ? (
                          <div className="text-xs text-muted-foreground">{formatDuration(v.duration_seconds)}</div>
                        ) : null}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </aside>
          <div className="p-6 bg-card flex flex-col items-center">
            {selected ? (
              <>
                <div className="aspect-[9/16] w-full max-w-[320px] bg-black rounded-lg overflow-hidden">
                  {signedUrl ? (
                    <video key={signedUrl} src={signedUrl} controls autoPlay playsInline className="w-full h-full object-contain" />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-muted-foreground text-sm">Loading video…</div>
                  )}
                </div>
                <h3 className="mt-4 font-display text-xl text-center">{selected.title}</h3>
                {selected.description && <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap text-center max-w-md">{selected.description}</p>}
              </>
            ) : (
              <div className="aspect-[9/16] w-full max-w-[320px] bg-muted rounded-lg grid place-items-center text-muted-foreground text-sm">
                Select a video to play
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatDuration(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}
