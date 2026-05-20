import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Pencil, Trash2, Upload, Check, X, Image as ImageIcon, GripVertical, Play } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Row = {
  id: string;
  title: string;
  description: string | null;
  storage_path: string;
  thumbnail_path: string | null;
  duration_seconds: number | null;
  published: boolean;
  sort_order: number;
  category: string;
};

const DEFAULT_CATEGORIES = ["General", "Hiring", "Enrollment", "Operations", "Finance", "Leadership"];

export function RavenVideosAdmin() {
  const [rows, setRows] = useState<Row[]>([]);
  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({});
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");
  const [newCategory, setNewCategory] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("General");
  const [savingEdit, setSavingEdit] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [previewRow, setPreviewRow] = useState<Row | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const replaceThumbInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = async () => {
    const { data } = await supabase
      .from("raven_videos")
      .select("id,title,description,storage_path,thumbnail_path,duration_seconds,published,sort_order,category")
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true });
    const list = (data ?? []) as Row[];
    setRows(list);

    const map: Record<string, string> = {};
    await Promise.all(
      list
        .filter((r) => r.thumbnail_path)
        .map(async (r) => {
          const { data: s } = await supabase.storage
            .from("raven-videos")
            .createSignedUrl(r.thumbnail_path!, 3600);
          if (s?.signedUrl) map[r.id] = s.signedUrl;
        }),
    );
    setThumbUrls(map);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!previewRow) {
      setPreviewUrl(null);
      return;
    }
    supabase.storage
      .from("raven-videos")
      .createSignedUrl(previewRow.storage_path, 3600)
      .then(({ data }) => setPreviewUrl(data?.signedUrl ?? null));
  }, [previewRow]);

  const categories = useMemo(() => {
    const set = new Set<string>(DEFAULT_CATEGORIES);
    rows.forEach((r) => r.category && set.add(r.category));
    return Array.from(set);
  }, [rows]);

  const grouped = useMemo(() => {
    const map = new Map<string, Row[]>();
    rows.forEach((r) => {
      const arr = map.get(r.category) ?? [];
      arr.push(r);
      map.set(r.category, arr);
    });
    return Array.from(map.entries());
  }, [rows]);

  const uploadFileTo = async (f: File, userId: string | undefined, kind: "video" | "image") => {
    const ext = f.name.split(".").pop() || (kind === "video" ? "mp4" : "jpg");
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("raven-videos").upload(path, f, {
      contentType: f.type || (kind === "video" ? "video/mp4" : "image/jpeg"),
    });
    if (error) throw error;
    return path;
  };

  const upload = async () => {
    if (!file || !title.trim()) {
      toast.error("Title and video file are required");
      return;
    }
    const finalCategory = (newCategory.trim() || category || "General").trim();
    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      const videoPath = await uploadFileTo(file, userId, "video");

      let thumbPath: string | null = null;
      const thumb = thumbFile ?? (await captureThumbnail(file).catch(() => null));
      if (thumb) {
        try {
          thumbPath = await uploadFileTo(thumb, userId, "image");
        } catch {
          /* non-blocking */
        }
      }

      const duration = await readDuration(file).catch(() => null);

      const { error: insErr } = await supabase.from("raven_videos").insert({
        title: title.trim(),
        description: description.trim() || null,
        storage_path: videoPath,
        thumbnail_path: thumbPath,
        duration_seconds: duration,
        category: finalCategory,
        // sort_order omitted — trigger assigns next within category
        published: true,
        created_by: userId,
      });
      if (insErr) throw insErr;

      toast.success("Video uploaded");
      setTitle("");
      setDescription("");
      setNewCategory("");
      setFile(null);
      setThumbFile(null);
      const vEl = document.getElementById("raven-file-input") as HTMLInputElement | null;
      if (vEl) vEl.value = "";
      const tEl = document.getElementById("raven-thumb-input") as HTMLInputElement | null;
      if (tEl) tEl.value = "";
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const replaceThumbnail = async (row: Row, f: File) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const newPath = await uploadFileTo(f, userData.user?.id, "image");
      const { error } = await supabase
        .from("raven_videos")
        .update({ thumbnail_path: newPath })
        .eq("id", row.id);
      if (error) throw error;
      if (row.thumbnail_path) {
        supabase.storage.from("raven-videos").remove([row.thumbnail_path]).catch(() => {});
      }
      toast.success("Thumbnail updated");
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Thumbnail upload failed");
    }
  };

  const startEdit = (row: Row) => {
    setEditingId(row.id);
    setEditTitle(row.title);
    setEditDescription(row.description ?? "");
    setEditCategory(row.category);
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditDescription("");
  };
  const saveEdit = async (row: Row) => {
    const t = editTitle.trim();
    if (!t) return toast.error("Title is required");
    setSavingEdit(true);
    const movingCategory = editCategory !== row.category;
    let newSort = row.sort_order;
    if (movingCategory) {
      const { data: maxRow } = await supabase
        .from("raven_videos")
        .select("sort_order")
        .eq("category", editCategory)
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      newSort = ((maxRow?.sort_order as number | undefined) ?? 0) + 1;
    }
    const { error } = await supabase
      .from("raven_videos")
      .update({
        title: t,
        description: editDescription.trim() || null,
        category: editCategory,
        sort_order: newSort,
      })
      .eq("id", row.id);
    setSavingEdit(false);
    if (error) return toast.error(error.message);
    toast.success("Updated");
    cancelEdit();
    load();
  };

  const togglePublished = async (row: Row) => {
    const { error } = await supabase.from("raven_videos").update({ published: !row.published }).eq("id", row.id);
    if (error) toast.error(error.message);
    else load();
  };

  const remove = async (row: Row) => {
    if (!confirm(`Delete "${row.title}"?`)) return;
    const paths = [row.storage_path, row.thumbnail_path].filter(Boolean) as string[];
    if (paths.length) await supabase.storage.from("raven-videos").remove(paths);
    const { error } = await supabase.from("raven_videos").delete().eq("id", row.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      load();
    }
  };

  const reorderWithin = async (cat: string, sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    const list = rows.filter((r) => r.category === cat);
    const srcIdx = list.findIndex((r) => r.id === sourceId);
    const tgtIdx = list.findIndex((r) => r.id === targetId);
    if (srcIdx === -1 || tgtIdx === -1) return;
    const reordered = [...list];
    const [moved] = reordered.splice(srcIdx, 1);
    reordered.splice(tgtIdx, 0, moved);

    // Optimistic UI
    const newRows = rows.map((r) => {
      if (r.category !== cat) return r;
      const idx = reordered.findIndex((x) => x.id === r.id);
      return { ...r, sort_order: idx + 1 };
    });
    setRows(newRows);

    // Persist
    await Promise.all(
      reordered.map((r, idx) =>
        supabase.from("raven_videos").update({ sort_order: idx + 1 }).eq("id", r.id),
      ),
    );
  };

  return (
    <section className="rounded-2xl border border-border/60 bg-card p-6">
      <h3 className="font-display text-xl">Raven Insight Videos</h3>
      <p className="text-sm text-muted-foreground mt-1">
        Upload premade tip videos. Order is auto-assigned — drag the handle to reorder within a category.
      </p>

      <div className="mt-5 grid md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">Category</label>
              <select
                className="w-full h-9 rounded-md border border-border bg-background px-2 text-sm"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Or new category</label>
              <Input placeholder="e.g. Marketing" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Video file</label>
            <Input
              id="raven-file-input"
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Thumbnail (optional)</label>
            <Input
              id="raven-thumb-input"
              type="file"
              accept="image/*"
              onChange={(e) => setThumbFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <Button onClick={upload} disabled={uploading || !file || !title.trim()} className="gap-2">
            <Upload className="size-4" /> {uploading ? "Uploading…" : "Upload video"}
          </Button>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        {rows.length === 0 && <div className="text-sm text-muted-foreground">No videos yet.</div>}
        {grouped.map(([cat, list]) => (
          <div key={cat}>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-display text-sm uppercase tracking-wider text-muted-foreground">{cat}</h4>
              <span className="text-xs text-muted-foreground">{list.length} video{list.length === 1 ? "" : "s"}</span>
            </div>
            <div className="space-y-2">
              {list.map((r) => {
                const isEditing = editingId === r.id;
                const thumb = thumbUrls[r.id];
                const isDragging = dragId === r.id;
                return (
                  <div
                    key={r.id}
                    draggable={!isEditing}
                    onDragStart={() => setDragId(r.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragId) reorderWithin(cat, dragId, r.id);
                      setDragId(null);
                    }}
                    onDragEnd={() => setDragId(null)}
                    className={`flex items-start gap-3 rounded-lg border border-border/60 p-3 transition ${
                      isDragging ? "opacity-50" : ""
                    }`}
                  >
                    <button
                      type="button"
                      className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
                      title="Drag to reorder"
                    >
                      <GripVertical className="size-4" />
                    </button>
                    <div className="relative w-14 h-20 shrink-0 rounded-md overflow-hidden bg-muted grid place-items-center">
                      {thumb ? (
                        <img src={thumb} alt="" className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <ImageIcon className="size-5 text-muted-foreground" />
                      )}
                      <input
                        ref={(el) => {
                          replaceThumbInputs.current[r.id] = el;
                        }}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) replaceThumbnail(r, f);
                          e.target.value = "";
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => replaceThumbInputs.current[r.id]?.click()}
                        className="absolute inset-0 bg-black/0 hover:bg-black/40 text-white opacity-0 hover:opacity-100 text-[10px] font-medium transition"
                        title="Replace thumbnail"
                      >
                        Replace
                      </button>
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      {isEditing ? (
                        <>
                          <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Title" />
                          <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Description (optional)" rows={2} />
                          <div>
                            <label className="text-xs text-muted-foreground">Category</label>
                            <select
                              className="w-full h-9 rounded-md border border-border bg-background px-2 text-sm"
                              value={editCategory}
                              onChange={(e) => setEditCategory(e.target.value)}
                            >
                              {categories.map((c) => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="font-medium truncate">{r.title}</div>
                          {r.description && <div className="text-xs text-muted-foreground line-clamp-2">{r.description}</div>}
                          <div className="text-xs text-muted-foreground truncate">
                            #{r.sort_order}{r.duration_seconds ? ` · ${r.duration_seconds}s` : ""}
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
                      <>
                        <Button variant="ghost" size="icon" onClick={() => setPreviewRow(r)} title="Preview">
                          <Play className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => startEdit(r)} title="Edit">
                          <Pencil className="size-4" />
                        </Button>
                      </>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => remove(r)} disabled={isEditing}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!previewRow} onOpenChange={(o) => !o && setPreviewRow(null)}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="font-display text-lg">{previewRow?.title}</DialogTitle>
          </DialogHeader>
          <div className="p-6 pt-4 flex flex-col items-center">
            <div className="aspect-[9/16] w-full max-w-[320px] bg-black rounded-lg overflow-hidden">
              {previewUrl ? (
                <video
                  key={previewUrl}
                  src={previewUrl}
                  poster={previewRow ? thumbUrls[previewRow.id] : undefined}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full grid place-items-center text-muted-foreground text-sm">Loading…</div>
              )}
            </div>
            {previewRow?.description && (
              <p className="mt-3 text-sm text-muted-foreground text-center whitespace-pre-wrap">{previewRow.description}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
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

function captureThumbnail(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "auto";
    v.muted = true;
    v.playsInline = true;
    v.crossOrigin = "anonymous";
    const cleanup = () => URL.revokeObjectURL(url);
    v.onloadedmetadata = () => {
      v.currentTime = Math.min(1, (v.duration || 1) / 2);
    };
    v.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = v.videoWidth;
        canvas.height = v.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("no ctx");
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            cleanup();
            if (!blob) return reject(new Error("blob failed"));
            resolve(new File([blob], "thumbnail.jpg", { type: "image/jpeg" }));
          },
          "image/jpeg",
          0.85,
        );
      } catch (e) {
        cleanup();
        reject(e);
      }
    };
    v.onerror = () => {
      cleanup();
      reject(new Error("video load failed"));
    };
    v.src = url;
  });
}
