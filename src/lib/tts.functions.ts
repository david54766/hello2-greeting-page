import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// "Raven" — using ElevenLabs voice ID. Replace if user has a custom Raven voice.
const RAVEN_VOICE_ID = "kPtEHAvRnjUJFv7SK9WI"; // Glitch fallback; override below if Raven exists in account

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
            model_id: "eleven_turbo_v2_5",
            voice_settings: { stability: 0.55, similarity_boost: 0.8, style: 0.35, use_speaker_boost: true },
          }),
        }
      );
      if (!res.ok) {
        const errText = await res.text();
        return { audio: null, error: errText.slice(0, 200) || `TTS failed (${res.status})` };
      }
      const buf = await res.arrayBuffer();
      const audio = Buffer.from(buf).toString("base64");
      return { audio, error: null };
    } catch (e: any) {
      return { audio: null, error: e?.message ?? "TTS unavailable" };
    }
  });
