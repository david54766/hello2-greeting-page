import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Pencil, Trash2, Upload, Check, X } from "lucide-react";

type Row = {
  id: string;
  title: string;
  description: string | null;
  storage_path: string;
  duration_seconds: number | null;
  published: boolean;
  sort_order: number;
};

export function RavenVideosAdmin() {
  const [rows, setRows] = useState<Row[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const startEdit = (row: Row) => {
    setEditingId(row.id);
    setEditTitle(row.title);
    setEditDescription(row.description ?? "");
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditDescription("");
  };
  const saveEdit = async (row: Row) => {
    const title = editTitle.trim();
    if (!title) return toast.error("Title is required");
    setSavingEdit(true);
    const { error } = await supabase
      .from("raven_videos")
      .update({ title, description: editDescription.trim() || null })
      .eq("id", row.id);
    setSavingEdit(false);
    if (error) return toast.error(error.message);
    toast.success("Updated");
    cancelEdit();
    load();
  };

  const load = async () => {
    const { data } = await supabase
      .from("raven_videos")
      .select("id,title,description,storage_path,duration_seconds,published,sort_order")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    setRows((data ?? []) as Row[]);
  };

  useEffect(() => {
    load();
  }, []);

  const upload = async () => {
    if (!file || !title.trim()) {
      toast.error("Title and video file are required");
      return;
    }
    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const ext = file.name.split(".").pop() || "mp4";
      const path = `${userData.user?.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("raven-videos").upload(path, file, {
        contentType: file.type || "video/mp4",
      });
      if (upErr) throw upErr;

      // Best-effort duration via local metadata
      const duration = await readDuration(file).catch(() => null);

      const { error: insErr } = await supabase.from("raven_videos").insert({
        title: title.trim(),
        description: description.trim() || null,
        storage_path: path,
        duration_seconds: duration,
        sort_order: sortOrder,
        published: true,
        created_by: userData.user?.id,
      });
      if (insErr) throw insErr;

      toast.success("Video uploaded");
      setTitle("");
      setDescription("");
      setSortOrder(0);
      setFile(null);
      (document.getElementById("raven-file-input") as HTMLInputElement | null)?.value && ((document.getElementById("raven-file-input") as HTMLInputElement).value = "");
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const togglePublished = async (row: Row) => {
    const { error } = await supabase.from("raven_videos").update({ published: !row.published }).eq("id", row.id);
    if (error) toast.error(error.message);
    else load();
  };

  const remove = async (row: Row) => {
    if (!confirm(`Delete "${row.title}"?`)) return;
    await supabase.storage.from("raven-videos").remove([row.storage_path]);
    const { error } = await supabase.from("raven_videos").delete().eq("id", row.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      load();
    }
  };

  return (
    <section className="rounded-2xl border border-border/60 bg-card p-6">
      <h3 className="font-display text-xl">Raven Insight Videos</h3>
      <p className="text-sm text-muted-foreground mt-1">
        Upload premade tip videos. Published videos appear in the Command Center library.
      </p>

      <div className="mt-5 grid md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Sort order</label>
            <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)} className="w-24" />
          </div>
        </div>
        <div className="space-y-3">
          <Input
            id="raven-file-input"
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <Button onClick={upload} disabled={uploading || !file || !title.trim()} className="gap-2">
            <Upload className="size-4" /> {uploading ? "Uploading…" : "Upload video"}
          </Button>
        </div>
      </div>

      <div className="mt-6 space-y-2">
        {rows.length === 0 && <div className="text-sm text-muted-foreground">No videos yet.</div>}
        {rows.map((r) => {
          const isEditing = editingId === r.id;
          return (
            <div key={r.id} className="flex items-start gap-3 rounded-lg border border-border/60 p-3">
              <div className="flex-1 min-w-0 space-y-2">
                {isEditing ? (
                  <>
                    <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Title" />
                    <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Description (optional)" rows={2} />
                  </>
                ) : (
                  <>
                    <div className="font-medium truncate">{r.title}</div>
                    {r.description && <div className="text-xs text-muted-foreground line-clamp-2">{r.description}</div>}
                    <div className="text-xs text-muted-foreground truncate">
                      Order {r.sort_order}{r.duration_seconds ? ` · ${r.duration_seconds}s` : ""}
                    </div>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Published</span>
                <Switch checked={r.published} onCheckedChange={() => togglePublished(r)} />
              </div>
              {isEditing ? (
                <>
                  <Button variant="ghost" size="icon" onClick={() => saveEdit(r)} disabled={savingEdit}>
                    <Check className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={cancelEdit} disabled={savingEdit}>
                    <X className="size-4" />
                  </Button>
                </>
              ) : (
                <Button variant="ghost" size="icon" onClick={() => startEdit(r)}>
                  <Pencil className="size-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => remove(r)} disabled={isEditing}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function readDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Math.round(v.duration));
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to read duration"));
    };
    v.src = url;
  });
}
