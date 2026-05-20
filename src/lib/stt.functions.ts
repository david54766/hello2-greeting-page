import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Schema = z.object({
  audioBase64: z.string().min(1).max(20_000_000), // ~15MB encoded
  mimeType: z.string().min(3).max(100).default("audio/webm"),
  languageCode: z.string().min(2).max(10).optional(),
});

export const transcribeAudio = createServerFn({ method: "POST" })
  .inputValidator((input) => Schema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) return { text: null as string | null, error: "ElevenLabs API key not configured" };

    try {
      const bytes = Buffer.from(data.audioBase64, "base64");
      const blob = new Blob([bytes], { type: data.mimeType });
      const form = new FormData();
      form.append("file", blob, "recording.webm");
      form.append("model_id", "scribe_v2");
      if (data.languageCode) form.append("language_code", data.languageCode);

      const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
        method: "POST",
        headers: { "xi-api-key": apiKey },
        body: form,
      });
      if (!res.ok) {
        const errText = await res.text();
        return { text: null, error: errText.slice(0, 200) || `STT failed (${res.status})` };
      }
      const json = (await res.json()) as { text?: string };
      return { text: json.text?.trim() ?? "", error: null };
    } catch (e: any) {
      return { text: null, error: e?.message ?? "STT unavailable" };
    }
  });
