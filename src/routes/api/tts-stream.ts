import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const RAVEN_VOICE_ID = process.env.ELEVENLABS_RAVEN_VOICE_ID || "EcNmy6NxONUCla9ZNPCn";

const Schema = z.object({
  text: z.string().min(1).max(5000),
  voiceId: z.string().min(1).max(100).optional(),
});

export const Route = createFileRoute("/api/tts-stream")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Require an authenticated Supabase user (server routes bypass auth middleware).
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";
        if (!token) return new Response("Unauthorized", { status: 401 });
        const { data: userData, error: authErr } = await supabaseAdmin.auth.getUser(token);
        if (authErr || !userData?.user) return new Response("Unauthorized", { status: 401 });

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const parsed = Schema.safeParse(body);
        if (!parsed.success) return new Response(parsed.error.issues[0]?.message ?? "Invalid input", { status: 400 });

        const apiKey = process.env.ELEVENLABS_API_KEY;
        if (!apiKey) return new Response("ElevenLabs not configured", { status: 500 });

        const voiceId = parsed.data.voiceId || RAVEN_VOICE_ID;
        const upstream = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=mp3_44100_128`,
          {
            method: "POST",
            headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
            body: JSON.stringify({
              text: parsed.data.text,
              model_id: "eleven_multilingual_v2",
              voice_settings: { stability: 0.5, similarity_boost: 0.85, style: 0.2, use_speaker_boost: true },
            }),
          },
        );

        if (!upstream.ok || !upstream.body) {
          const errText = await upstream.text().catch(() => "");
          console.error("ElevenLabs TTS error:", upstream.status, errText.slice(0, 300));
          return new Response(errText.slice(0, 200) || `TTS upstream failed (${upstream.status})`, {
            status: upstream.status || 502,
          });
        }

        return new Response(upstream.body, {
          status: 200,
          headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "no-store",
            "X-Accel-Buffering": "no",
          },
        });
      },
    },
  },
});
