import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Trash2, Download, Pencil, Save, X } from "lucide-react";

type Tier = "essentials" | "pro" | "elite";
type Category = "hiring" | "enrollment" | "operations";

type Tpl = {
  id: string;
  title: string;
  description: string | null;
  storage_path: string;
  category: Category;
  tier_required: Tier;
  is_elite: boolean;
  created_at: string;
};

const TIER_LABEL: Record<Tier, string> = {
  essentials: "Essentials",
  pro: "Pro",
  elite: "Elite Circle",
};

const TIER_BADGE: Record<Tier, string> = {
  essentials: "bg-muted text-muted-foreground",
  pro: "bg-primary/15 text-primary",
  elite: "bg-elite/15 text-elite-foreground",
};

const CATEGORIES: Category[] = ["hiring", "enrollment", "operations"];

export function TemplateVaultManager() {
  const [items, setItems] = useState<Tpl[]>([]);
  const [loading, setLoading] = useState(false);

  // Upload form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("hiring");
  const [tier, setTier] = useState<Tier>("pro");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("templates")
      .select("*")
      .order("category")
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) return toast.error(error.message);
    setItems((data ?? []) as Tpl[]);
  };

  useEffect(() => {
    load();
  }, []);

  const upload = async () => {
    if (!file || !title.trim()) {
      return toast.error("Title and file are required.");
    }
    setUploading(true);
    const safeName = file.name.replace(/[^\w.\-]+/g, "_");
    const path = `${category}/${crypto.randomUUID()}-${safeName}`;
    const up = await supabase.storage.from("templates").upload(path, file);
    if (up.error) {
      setUploading(false);
      return toast.error(up.error.message);
    }
    const { error } = await supabase.from("templates").insert({
      title: title.trim(),
      description: description.trim() || null,
      category,
      tier_required: tier,
      is_elite: tier === "elite",
      storage_path: path,
    });
    setUploading(false);
    if (error) {
      await supabase.storage.from("templates").remove([path]);
      return toast.error(error.message);
    }
    toast.success("Template uploaded.");
    setTitle("");
    setDescription("");
    setFile(null);
    load();
  };

  const remove = async (t: Tpl) => {
    if (!confirm(`Delete "${t.title}"? This cannot be undone.`)) return;
    const { error } = await supabase.from("templates").delete().eq("id", t.id);
    if (error) return toast.error(error.message);
    await supabase.storage.from("templates").remove([t.storage_path]);
    toast.success("Deleted.");
    setItems((prev) => prev.filter((i) => i.id !== t.id));
  };

  const download = async (t: Tpl) => {
    const { data, error } = await supabase.storage
      .from("templates")
      .createSignedUrl(t.storage_path, 60);
    if (error || !data) return toast.error(error?.message ?? "Failed to fetch link.");
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const saveEdit = async (id: string, patch: Partial<Tpl>) => {
    const update = { ...patch } as any;
    if (update.tier_required) update.is_elite = update.tier_required === "elite";
    const { error } = await supabase.from("templates").update(update).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Updated.");
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...update } : i)));
  };

  const grouped = CATEGORIES.map((c) => ({
    cat: c,
    rows: items.filter((i) => i.category === c),
  }));

  return (
    <div>
      <h2 className="font-display text-2xl">Template Vault</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Upload templates and assign access by subscription tier. Essentials items
        are visible to all members; Pro requires Pro or Elite; Elite is reserved
        for the Elite Circle.
      </p>

      {/* Upload form */}
      <div className="mt-6 rounded-xl border border-border/60 bg-card p-5">
        <h3 className="font-display text-lg">Add a template</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Input
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <Textarea
            className="sm:col-span-2"
            placeholder="Short description (optional)"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm capitalize"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              Required tier
            </label>
            <div className="mt-1 flex gap-2">
              {(Object.keys(TIER_LABEL) as Tier[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTier(t)}
                  className={`flex-1 rounded-full border px-3 py-1.5 text-xs uppercase tracking-wider ${
                    tier === t
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {TIER_LABEL[t]}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button
            onClick={upload}
            disabled={uploading || !file || !title.trim()}
            className="rounded-full"
          >
            {uploading ? "Uploading…" : "Upload template"}
          </Button>
        </div>
      </div>

      {/* List */}
      <div className="mt-8 space-y-8">
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!loading && items.length === 0 && (
          <p className="text-sm text-muted-foreground">No templates yet.</p>
        )}
        {grouped.map(({ cat, rows }) =>
          rows.length === 0 ? null : (
            <div key={cat}>
              <h3 className="font-display text-lg capitalize">{cat}</h3>
              <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
                {rows.map((t) => (
                  <TemplateRow
                    key={t.id}
                    tpl={t}
                    onSave={saveEdit}
                    onDelete={remove}
                    onDownload={download}
                  />
                ))}
              </ul>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

function TemplateRow({
  tpl,
  onSave,
  onDelete,
  onDownload,
}: {
  tpl: Tpl;
  onSave: (id: string, patch: Partial<Tpl>) => Promise<void>;
  onDelete: (t: Tpl) => void;
  onDownload: (t: Tpl) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(tpl.title);
  const [description, setDescription] = useState(tpl.description ?? "");
  const [category, setCategory] = useState<Category>(tpl.category);
  const [tier, setTier] = useState<Tier>(tpl.tier_required);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    await onSave(tpl.id, {
      title: title.trim(),
      description: description.trim() || null,
      category,
      tier_required: tier,
    });
    setBusy(false);
    setEditing(false);
  };

  const cancel = () => {
    setTitle(tpl.title);
    setDescription(tpl.description ?? "");
    setCategory(tpl.category);
    setTier(tpl.tier_required);
    setEditing(false);
  };

  return (
    <li className="px-4 py-3">
      {!editing ? (
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium">{tpl.title}</span>
              <span
                className={`text-[10px] uppercase tracking-wider rounded-full px-2 py-0.5 ${TIER_BADGE[tpl.tier_required]}`}
              >
                {TIER_LABEL[tpl.tier_required]}
              </span>
            </div>
            {tpl.description && (
              <p className="mt-1 text-sm text-muted-foreground">{tpl.description}</p>
            )}
            <p className="mt-1 text-[11px] text-muted-foreground">
              {new Date(tpl.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="sm" onClick={() => onDownload(tpl)}>
              <Download className="size-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="size-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDelete(tpl)}>
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Description"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm capitalize"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value as Tier)}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              {(Object.keys(TIER_LABEL) as Tier[]).map((t) => (
                <option key={t} value={t}>
                  {TIER_LABEL[t]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={cancel} disabled={busy}>
              <X className="size-4 mr-1" /> Cancel
            </Button>
            <Button size="sm" onClick={save} disabled={busy} className="rounded-full">
              <Save className="size-4 mr-1" /> Save
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}
