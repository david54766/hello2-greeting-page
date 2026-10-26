// Server-only Elite Circle moderation helpers (web/iOS parity with mobile-api).

export const MODERATION_SAFE_MESSAGE =
  "This post could not be published because it may violate our community guidelines. Please remove any hateful, harassing, sexual, violent, or abusive language and try again.";

export const MODERATION_RETRY_MESSAGE =
  "Content review is temporarily unavailable. Please try again in a moment.";

export const MODERATION_IMAGE_MESSAGE =
  "One or more images could not be verified. Please re-upload them and try again.";

const BANNED_PATTERNS: RegExp[] = [
  /\b(n[i1]gg(?:er|a)s?|f[a@]gg?[o0]ts?|k[i1]kes?|ch[i1]nks?|tr[a@]nn(?:y|ies))\b/i,
  /\b(porn(?:hub|o)?|c[u@]nts?|blowjobs?|dildos?|rape|molest(?:s|ed|ing)?|pedo(?:phile)?)\b/i,
  /\b(kill\s+your\s?self|kys|you\s+should\s+die|i(?:'m| am)\s+going\s+to\s+(?:kill|hurt)\s+you)\b/i,
  /\b(shoot\s+(?:up|them|him|her)|bomb\s+the|behead|lynch)\b/i,
  /\b(wh[o0]res?|sluts?|bitch(?:es)?)\b/i,
];

const BLOCKING_CATEGORIES = [
  "sexual", "sexual/minors", "hate", "hate/threatening", "harassment",
  "harassment/threatening", "violence", "violence/graphic", "self-harm",
  "self-harm/intent", "self-harm/instructions",
];

// Posts accept up to 10,000 characters; the provider is called with every
// chunk and every result is validated — nothing past the first chunk is
// skipped.
export const MODERATION_MAX_TEXT = 10_000;
export const MODERATION_CHUNK_SIZE = 4_000;
const MODERATION_TIMEOUT_MS = 10_000;

export type ModerationResult = { allowed: boolean; message: string | null };
export type ModerationContext = { userId: string; admin: any };

function screenLocally(text: string): boolean {
  const value = (text ?? "").normalize("NFKC");
  return !BANNED_PATTERNS.some((pattern) => pattern.test(value));
}

export function chunkText(text: string, size: number = MODERATION_CHUNK_SIZE): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size) chunks.push(text.slice(i, i + size));
  return chunks;
}

// The provider returns ONE aggregated result per request (the whole input
// array — every text chunk and every image — is evaluated together). Strict
// validation: empty/missing results, a non-object entry, a
// missing/non-boolean `flagged`, or a missing/non-object `categories` all
// fail CLOSED (retryable) — unchecked content is never published.
export function evaluateModerationResponse(json: unknown): ModerationResult {
  const results = (json as any)?.results;
  if (!Array.isArray(results) || results.length === 0) {
    return { allowed: false, message: MODERATION_RETRY_MESSAGE };
  }
  for (const result of results) {
    if (!result || typeof result !== "object" || Array.isArray(result)) {
      return { allowed: false, message: MODERATION_RETRY_MESSAGE };
    }
    if (typeof result.flagged !== "boolean") {
      return { allowed: false, message: MODERATION_RETRY_MESSAGE };
    }
    const categories = result.categories;
    if (!categories || typeof categories !== "object" || Array.isArray(categories)) {
      return { allowed: false, message: MODERATION_RETRY_MESSAGE };
    }
    if (result.flagged && BLOCKING_CATEGORIES.some((key) => categories[key] === true)) {
      return { allowed: false, message: MODERATION_SAFE_MESSAGE };
    }
  }
  return { allowed: true, message: null };
}

function storageHost(): string | null {
  const url = process.env["SUPABASE_URL"];
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

// Canonical storage path check: exact https host, exact public elite-images
// prefix, no traversal, no surprises. Returns the object path
// ("<userId>/<file>") or null. This also keeps the moderation call from
// becoming an arbitrary server-side fetch (SSRF).
export function parseEliteImagePath(item: string, host: string | null): string | null {
  try {
    const u = new URL(item);
    if (u.protocol !== "https:" || host === null || u.host !== host) return null;
    const prefix = "/storage/v1/object/public/elite-images/";
    if (!u.pathname.startsWith(prefix)) return null;
    const path = decodeURIComponent(u.pathname.slice(prefix.length));
    if (!path || path.includes("..") || path.startsWith("/") || path.endsWith("/")) return null;
    if (!/^[A-Za-z0-9._/-]+$/.test(path)) return null;
    return path;
  } catch {
    return null;
  }
}

export function isAllowedImageUrl(item: string, host: string | null): boolean {
  return parseEliteImagePath(item, host) !== null;
}

// Ownership + existence: every image must live at "<userId>/<file>" (the
// established Android/web upload naming) and must actually exist in the
// elite-images bucket. Verified with the privileged client so a forged URL
// pointing at someone else's upload — or at nothing — is rejected.
async function verifyImages(
  admin: any,
  imageUrls: string[],
  host: string | null,
  userId: string,
): Promise<boolean> {
  const paths = imageUrls.map((url) => parseEliteImagePath(url, host));
  if (paths.some((p) => p === null)) return false;
  const names: string[] = [];
  for (const p of paths as string[]) {
    const segments = p.split("/");
    if (segments.length !== 2 || segments[0] !== userId) return false;
    names.push(segments[1]);
  }
  if (!names.length) return true;
  const { data, error } = await admin.storage
    .from("elite-images")
    .list(userId, { limit: 1000 });
  if (error) {
    console.error("elite image listing error", error.message ?? error);
    return false;
  }
  const existing = new Set((data ?? []).map((f: any) => f?.name).filter(Boolean));
  return names.every((name) => existing.has(name));
}

// Fails closed: a moderation outage, missing key, timeout (including while
// decoding the response body), or malformed provider response must never
// publish unchecked content. Callers surface the retryable message so
// legitimate members can try again.
async function screenRemote(text: string, imageUrls: string[]): Promise<ModerationResult> {
  const apiKey = process.env["OPENAI_API_KEY"] ?? process.env["OPEN_API_KEY"];
  if (!apiKey) return { allowed: false, message: MODERATION_RETRY_MESSAGE };

  const input: Array<Record<string, unknown>> = [];
  for (const chunk of chunkText(text.slice(0, MODERATION_MAX_TEXT))) {
    if (chunk.trim()) input.push({ type: "text", text: chunk });
  }
  for (const url of imageUrls) input.push({ type: "image_url", image_url: { url } });
  if (!input.length) return { allowed: true, message: null };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), MODERATION_TIMEOUT_MS);
    let json: unknown;
    try {
      const res = await fetch("https://api.openai.com/v1/moderations", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "omni-moderation-latest", input }),
        signal: controller.signal,
      });
      if (!res.ok) return { allowed: false, message: MODERATION_RETRY_MESSAGE };
      json = await res.json();
    } finally {
      clearTimeout(timer);
    }
    return evaluateModerationResponse(json);
  } catch (error) {
    console.error("moderation error", error);
    return { allowed: false, message: MODERATION_RETRY_MESSAGE };
  }
}

export async function moderateElitePost(
  parts: Array<string | null | undefined>,
  imageUrls: string[] = [],
  ctx?: ModerationContext,
): Promise<ModerationResult> {
  const host = storageHost();
  if (!host) return { allowed: false, message: MODERATION_RETRY_MESSAGE };
  if (imageUrls.length) {
    if (!ctx?.admin || !ctx?.userId) {
      // Images cannot be verified without the privileged client: fail closed.
      return { allowed: false, message: MODERATION_IMAGE_MESSAGE };
    }
    const ok = await verifyImages(ctx.admin, imageUrls, host, ctx.userId);
    if (!ok) return { allowed: false, message: MODERATION_IMAGE_MESSAGE };
  }
  const text = parts.filter(Boolean).join("\n\n");
  if (!screenLocally(text)) return { allowed: false, message: MODERATION_SAFE_MESSAGE };
  return await screenRemote(text, imageUrls);
}

export async function loadBlockedIds(supabase: any): Promise<Set<string>> {
  const { data, error } = await supabase.rpc("elite_blocked_user_ids");
  if (error) {
    console.error("elite_blocked_user_ids error", error.message);
    return new Set<string>();
  }
  return new Set<string>(((data as string[] | null) ?? []).filter(Boolean));
}

export async function isAdminUser(supabase: any, userId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) {
    console.error("has_role error", error.message);
    return false;
  }
  return data === true;
}
