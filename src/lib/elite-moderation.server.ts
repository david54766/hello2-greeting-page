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

export type ModerationResult = { allowed: boolean; message: string | null };

function screenLocally(text: string): boolean {
  const value = (text ?? "").normalize("NFKC");
  return !BANNED_PATTERNS.some((pattern) => pattern.test(value));
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

// Only images served from our own elite-images storage bucket are accepted.
// Anything else is rejected so the moderation call can never be turned into
// an arbitrary server-side fetch (SSRF).
export function isAllowedImageUrl(item: string, host: string | null): boolean {
  try {
    const u = new URL(item);
    return (
      u.protocol === "https:" &&
      host !== null &&
      u.host === host &&
      u.pathname.startsWith("/storage/v1/object/public/elite-images/")
    );
  } catch {
    return false;
  }
}

// Fails closed: a moderation outage, missing key, or malformed provider
// response must never publish unchecked content. Callers surface the
// retryable message so legitimate members can try again.
async function screenRemote(text: string, imageUrls: string[]): Promise<ModerationResult> {
  const apiKey = process.env["OPENAI_API_KEY"] ?? process.env["OPEN_API_KEY"];
  if (!apiKey) return { allowed: false, message: MODERATION_RETRY_MESSAGE };

  const input: Array<Record<string, unknown>> = [];
  if (text.trim()) input.push({ type: "text", text: text.slice(0, 4000) });
  for (const url of imageUrls) input.push({ type: "image_url", image_url: { url } });
  if (!input.length) return { allowed: true, message: null };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "omni-moderation-latest", input }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return { allowed: false, message: MODERATION_RETRY_MESSAGE };

    const json = (await res.json()) as any;
    const results = json?.results;
    if (!Array.isArray(results)) return { allowed: false, message: MODERATION_RETRY_MESSAGE };

    const flagged = results.some((result: any) => {
      if (!result?.flagged) return false;
      const categories = result.categories ?? {};
      return BLOCKING_CATEGORIES.some((key) => categories[key] === true);
    });
    return flagged
      ? { allowed: false, message: MODERATION_SAFE_MESSAGE }
      : { allowed: true, message: null };
  } catch (error) {
    console.error("moderation error", error);
    return { allowed: false, message: MODERATION_RETRY_MESSAGE };
  }
}

export async function moderateElitePost(
  parts: Array<string | null | undefined>,
  imageUrls: string[] = [],
): Promise<ModerationResult> {
  const host = storageHost();
  if (!host) return { allowed: false, message: MODERATION_RETRY_MESSAGE };
  if (imageUrls.some((url) => !isAllowedImageUrl(url, host))) {
    return { allowed: false, message: MODERATION_IMAGE_MESSAGE };
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
