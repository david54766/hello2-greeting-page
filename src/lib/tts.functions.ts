import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// "Raven" voice. If you have a custom Raven voice cloned in your ElevenLabs
// account, replace this ID. Default falls back to "Brian" — deep, grounded.
const RAVEN_VOICE_ID = process.env.ELEVENLABS_RAVEN_VOICE_ID || "EcNmy6NxONUCla9ZNPCn";

const Schema = z.object({
  text: z.string().min(1).max(5000),
  voiceId: z.string().min(1).max(100).optional(),
});

export const synthesizeSpeech = createServerFn({ method: "POST" })
  .inputValidator((input) => Schema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) return { audio: null as string | null, error: "ElevenLabs API key not configured" };

    const voiceId = data.voiceId || RAVEN_VOICE_ID;

    try {
      const res = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
        {
          method: "POST",
          headers: {
            "xi-api-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: data.text,
            model_id: "eleven_multilingual_v2",
            voice_settings: { stability: 0.5, similarity_boost: 0.85, style: 0.2, use_speaker_boost: true },
          }),
        }
      );
      if (!res.ok) {
        const errText = await res.text();
        console.error("ElevenLabs TTS error:", res.status, errText.slice(0, 300));
        return { audio: null, error: errText.slice(0, 200) || `TTS failed (${res.status})` };
      }
      const buf = await res.arrayBuffer();
      const audio = Buffer.from(buf).toString("base64");
      return { audio, error: null };
    } catch (e: any) {
      return { audio: null, error: e?.message ?? "TTS unavailable" };
    }
  });
