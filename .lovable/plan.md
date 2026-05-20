# ElevenLabs custom voice fix

## What I found

The plumbing is already correct:
- `src/routes/api/tts-stream.ts` (used by the coach) and `src/lib/tts.functions.ts` both POST to `https://api.elevenlabs.io/v1/text-to-speech/{voiceId}/stream?output_format=mp3_44100_128` with the voice ID in the URL path.
- The voice ID `EcNmy6NxONUCla9ZNPCn` is wired in correctly (env override `ELEVENLABS_RAVEN_VOICE_ID`, fallback to that exact ID).
- The API key is read from `process.env.ELEVENLABS_API_KEY` server-side only — never exposed to the frontend.
- The response is consumed as a stream / `blob()` (not `response.json()`), returned with `Content-Type: audio/mpeg`, and played via `new Audio()` + `URL.createObjectURL` inside the click gesture.
- Server logs show recent `/api/tts-stream` calls returning **HTTP 200** — so ElevenLabs is accepting the request and returning audio.

## The actual bug

Both files send `model_id: "eleven_turbo_v2_5"` with `style: 0.35`.

- `eleven_turbo_v2_5` does NOT faithfully reproduce many cloned/custom voices — ElevenLabs effectively renders them with a generic-sounding fallback timbre on Turbo. That matches the symptom: "voice is not speaking correctly" while the request still succeeds with 200.
- The `style` parameter is also only meaningful on the multilingual v2 family; on Turbo it's ignored/clamped, which further pushes the output toward a default delivery.

This is why nothing in logs looks broken but the voice sounds wrong.

## Fix

Switch both server entry points to `eleven_multilingual_v2` and align `voice_settings` to the spec you provided (`similarity_boost: 0.85`, `style: 0.2`). Also add a safe, non-secret-leaking error log so future issues surface in worker logs.

### Files to change

1. **`src/routes/api/tts-stream.ts`** (the one the coach UI actually calls)
   - `model_id: "eleven_multilingual_v2"`
   - `voice_settings: { stability: 0.5, similarity_boost: 0.85, style: 0.2, use_speaker_boost: true }`
   - On `!upstream.ok`, log `console.error("ElevenLabs TTS error:", upstream.status, errText.slice(0, 300))` before returning (no key in the message).

2. **`src/lib/tts.functions.ts`** (kept in sync so any other caller behaves identically)
   - Same `model_id` and `voice_settings` change.
   - Same safe error log.

3. **No env var changes required.** `ELEVENLABS_API_KEY` is already set; `ELEVENLABS_RAVEN_VOICE_ID` is optional and the hardcoded fallback is already `EcNmy6NxONUCla9ZNPCn`. The frontend never reads either — confirmed (no `VITE_ELEVENLABS_*` anywhere).

### Things intentionally NOT changed

- Endpoint URL, path-parameter voice ID, `output_format`, response handling (`blob()` / streamed body), `Content-Type: audio/mpeg`, and the auth gate on the server route — all already correct.
- The `/stream` suffix on `tts-stream.ts` stays (it streams MP3 chunks; the client buffers via `res.blob()` which works identically to non-stream for `audio/mpeg`).

## Test after the change

1. Open `/coach`, submit any prompt, click **Speak**.
2. Expect: audible Raven voice (custom clone), not the generic default.
3. Check worker logs: `POST /api/tts-stream → 200`. If it ever fails, you'll now see `ElevenLabs TTS error: <status> <body excerpt>` in logs (no key leaked).

If the voice still sounds wrong after this fix, the most likely remaining cause is that the voice ID `EcNmy6NxONUCla9ZNPCn` doesn't exist in the ElevenLabs account that owns the `ELEVENLABS_API_KEY` secret — verify the key and the cloned voice live in the same ElevenLabs workspace.
