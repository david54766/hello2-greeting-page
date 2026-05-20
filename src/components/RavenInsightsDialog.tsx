import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Play, Video as VideoIcon } from "lucide-react";

type RavenVideo = {
  id: string;
  title: string;
  description: string | null;
  storage_path: string;
  thumbnail_path: string | null;
  duration_seconds: number | null;
  sort_order: number;
  category: string;
};

export function RavenInsightsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [videos, setVideos] = useState<RavenVideo[]>([]);
  const [selected, setSelected] = useState<RavenVideo | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    supabase
      .from("raven_videos")
      .select("id,title,description,storage_path,thumbnail_path,duration_seconds,sort_order,category")
      .eq("published", true)
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true })
      .then(async ({ data }) => {
        const list = (data ?? []) as RavenVideo[];
        setVideos(list);
        if (list.length && !selected) setSelected(list[0]);

        const map: Record<string, string> = {};
        await Promise.all(
          list
            .filter((v) => v.thumbnail_path)
            .map(async (v) => {
              const { data: s } = await supabase.storage
                .from("raven-videos")
                .createSignedUrl(v.thumbnail_path!, 3600);
              if (s?.signedUrl) map[v.id] = s.signedUrl;
            }),
        );
        setThumbUrls(map);
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

  const grouped = useMemo(() => {
    const map = new Map<string, RavenVideo[]>();
    videos.forEach((v) => {
      const arr = map.get(v.category) ?? [];
      arr.push(v);
      map.set(v.category, arr);
    });
    return Array.from(map.entries());
  }, [videos]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="font-display text-lg">Daily Insights from Raven</DialogTitle>
          <DialogDescription className="text-xs">Premade strategy tips curated for childcare operators.</DialogDescription>
        </DialogHeader>
        <div className="grid md:grid-cols-[220px_1fr] gap-0 border-t border-border/60">
          <aside className="border-r border-border/60 max-h-[460px] overflow-y-auto">
            {loading && <div className="p-3 text-xs text-muted-foreground">Loading…</div>}
            {!loading && videos.length === 0 && (
              <div className="p-4 text-xs text-muted-foreground">
                <VideoIcon className="size-5 mb-2 text-primary" />
                No insight videos yet. Check back soon.
              </div>
            )}
            {grouped.map(([cat, list]) => (
              <div key={cat}>
                <div className="px-2.5 py-1.5 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground bg-muted/40 border-b border-border/40 sticky top-0">
                  {cat}
                </div>
                <ul>
                  {list.map((v) => {
                    const thumb = thumbUrls[v.id];
                    return (
                      <li key={v.id}>
                        <button
                          onClick={() => setSelected(v)}
                          className={`w-full text-left px-2.5 py-2 border-b border-border/40 hover:bg-primary/5 transition flex items-center gap-2.5 ${
                            selected?.id === v.id ? "bg-primary/10" : ""
                          }`}
                        >
                          <div className="w-10 h-14 shrink-0 rounded overflow-hidden bg-muted grid place-items-center">
                            {thumb ? (
                              <img src={thumb} alt="" className="w-full h-full object-cover" loading="lazy" />
                            ) : (
                              <Play className="size-3.5 text-primary" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium truncate leading-tight">{v.title}</div>
                            {v.duration_seconds ? (
                              <div className="text-[11px] text-muted-foreground">{formatDuration(v.duration_seconds)}</div>
                            ) : null}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </aside>
          <div className="p-3 bg-card flex flex-col items-center">
            {selected ? (
              <>
                <div className="aspect-[9/16] w-full max-w-[240px] bg-black rounded-md overflow-hidden">
                  {signedUrl ? (
                    <video
                      key={signedUrl}
                      src={signedUrl}
                      poster={thumbUrls[selected.id]}
                      controls
                      autoPlay
                      playsInline
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-muted-foreground text-xs">Loading video…</div>
                  )}
                </div>
                <h3 className="mt-2.5 font-display text-base text-center leading-tight">{selected.title}</h3>
                {selected.description && <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap text-center max-w-sm line-clamp-3">{selected.description}</p>}
              </>
            ) : (
              <div className="aspect-[9/16] w-full max-w-[240px] bg-muted rounded-md grid place-items-center text-muted-foreground text-xs">
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
