// Server-only Elite Circle moderation helpers (web/iOS parity with mobile-api).

export const MODERATION_SAFE_MESSAGE =
  "This post could not be published because it may violate our community guidelines. Please remove any hateful, harassing, sexual, violent, or abusive language and try again.";

const BANNED_PATTERNS: RegExp[] = [
  /\b(n[i1]gg(?:er|a)s?|f[a@]gg?[o0]ts?|k[i1]kes?|ch[i1]nks?|tr[a@]nn(?:y|ies))\b/i,
  /\b(porn(?:hub|o)?|c[u@]nts?|blowjobs?|dildos?|rape|molest(?:s|ed|ing)?|pedo(?:phile)?)\b/i,
  /\b(kill\s+your\s?self|kys|you\s+should\s+die|i(?:'m| am)\s+going\s+to\s+(?:kill|hurt)\s+you)\b/i,
  /\b(shoot\s+(?:up|them|him|her)|bomb\s+the|behead|lynch)\b/i,
  /\b(wh[o0]res?|sluts?|bitch(?:es)?)\b/i,
];

function screenLocally(text: string): boolean {
  const value = (text ?? "").normalize("NFKC");
  return !BANNED_PATTERNS.some((pattern) => pattern.test(value));
}

// Fails open so a moderation outage never blocks legitimate posting.
async function screenRemote(text: string): Promise<boolean> {
  const apiKey = process.env["OPENAI_API_KEY"] ?? process.env["OPEN_API_KEY"];
  if (!apiKey || !text.trim()) return true;
  try {
    const res = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "omni-moderation-latest", input: text.slice(0, 4000) }),
    });
    if (!res.ok) return true;
    const json = (await res.json()) as any;
    const result = json?.results?.[0];
    if (!result?.flagged) return true;
    const categories = result.categories ?? {};
    const blocking = [
      "sexual", "sexual/minors", "hate", "hate/threatening", "harassment",
      "harassment/threatening", "violence", "violence/graphic", "self-harm",
      "self-harm/intent", "self-harm/instructions",
    ];
    return !blocking.some((key) => categories[key] === true);
  } catch (error) {
    console.error("moderation error", error);
    return true;
  }
}

export async function moderateElitePost(parts: Array<string | null | undefined>): Promise<boolean> {
  const text = parts.filter(Boolean).join("\n\n");
  if (!screenLocally(text)) return false;
  return await screenRemote(text);
}

export async function loadBlockedIds(supabase: any): Promise<Set<string>> {
  const { data, error } = await supabase.rpc("elite_blocked_user_ids");
  if (error) {
    console.error("elite_blocked_user_ids error", error.message);
    return new Set<string>();
  }
  return new Set<string>(((data as string[] | null) ?? []).filter(Boolean));
}
