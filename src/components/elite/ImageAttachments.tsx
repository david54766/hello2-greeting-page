import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

const MAX_FILES = 8;
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export function ImageAttachments({
  userId,
  value,
  onChange,
  disabled,
}: {
  userId: string;
  value: string[];
  onChange: (urls: string[]) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const pick = () => inputRef.current?.click();

  const handleFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    const remaining = MAX_FILES - value.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${MAX_FILES} images per post.`);
      return;
    }
    const chosen = Array.from(files).slice(0, remaining);
    setBusy(true);
    const next = [...value];
    for (const file of chosen) {
      if (!ALLOWED.includes(file.type)) {
        toast.error(`${file.name}: unsupported file type.`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        toast.error(`${file.name}: must be under 5 MB.`);
        continue;
      }
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("elite-images")
        .upload(path, file, { contentType: file.type, cacheControl: "3600", upsert: false });
      if (error) {
        toast.error(`Upload failed: ${error.message}`);
        continue;
      }
      const { data } = supabase.storage.from("elite-images").getPublicUrl(path);
      next.push(data.publicUrl);
    }
    onChange(next);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const remove = (url: string) => onChange(value.filter((u) => u !== url));

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {value.map((url) => (
            <div key={url} className="relative group rounded-lg overflow-hidden border border-border bg-muted aspect-square">
              <img src={url} alt="attachment" className="size-full object-cover" loading="lazy" />
              <button
                type="button"
                onClick={() => remove(url)}
                className="absolute top-1 right-1 rounded-full bg-background/90 p-1 opacity-0 group-hover:opacity-100 transition"
                aria-label="Remove image"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={pick}
          disabled={disabled || busy || value.length >= MAX_FILES}
        >
          {busy ? <Loader2 className="size-4 mr-2 animate-spin" /> : <ImagePlus className="size-4 mr-2" />}
          {busy ? "Uploading…" : "Add image"}
        </Button>
        <span className="text-xs text-muted-foreground">
          {value.length}/{MAX_FILES} · JPG, PNG, WEBP, GIF · 5 MB max
        </span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED.join(",")}
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}

export function AttachmentGallery({ urls }: { urls: string[] }) {
  if (!urls?.length) return null;
  return (
    <div className={`mt-3 grid gap-2 ${urls.length === 1 ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-3"}`}>
      {urls.map((url) => (
        <a key={url} href={url} target="_blank" rel="noreferrer" className="block rounded-lg overflow-hidden border border-border bg-muted">
          <img src={url} alt="" className="w-full h-auto max-h-80 object-cover hover:opacity-90 transition" loading="lazy" />
        </a>
      ))}
    </div>
  );
}
